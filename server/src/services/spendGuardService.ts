import { getAllPurchaseRequests, getPurchaseRequestById, updatePurchaseRequestStatus } from '../data/purchaseRequests.js';
import { getActivePolicy, ServerProcurementPolicy } from '../config/policySettings.js';
import { ServerPurchaseRequest } from '../types/checkout.js';

export interface SpendGuardAlert {
  type: 'APPROACHING_BUDGET' | 'EXCEEDED_LIMIT' | 'APPROVAL_REQUIRED' | 'PURCHASE_BLOCKED' | 'INFO';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  timestamp: string;
}

export interface SpendGuardSummary {
  period: 'monthly' | 'quarterly' | 'annual';
  periodLabel: string;
  configuredBudget: number;
  paidSpending: number;
  reservedSpending: number;
  totalCommitted: number;
  remainingBudget: number;
  utilizationPercent: number;
  pendingApprovalCount: number;
  pendingApprovalTotal: number;
  blockedRequestsCount: number;
  blockedRequests: Array<{
    id: string;
    title: string;
    total: number;
    reasons: string[];
    createdAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    title: string;
    status: string;
    total: number;
    timestamp: string;
    supplier?: string;
  }>;
  alerts: SpendGuardAlert[];
  departmentName: string;
  policyVersion: string;
  autoApproveThreshold: number;
  maxSingleOrderBudget: number;
}

// Transactional lock for atomic state transitions & reservations
let mutexQueue: Promise<void> = Promise.resolve();

/**
 * Execute an operation inside a strict FIFO mutex lock to guarantee
 * concurrency safety and prevent race conditions on cumulative budget reservations.
 */
export async function withStoreLock<T>(fn: () => Promise<T> | T): Promise<T> {
  let release: () => void = () => {};
  const lockWait = new Promise<void>((resolve) => {
    release = resolve;
  });

  const previousLock = mutexQueue;
  mutexQueue = (async () => {
    try {
      await previousLock;
      await lockWait;
    } catch {
      // Ignore previous lock rejections to avoid poisoning the mutex chain
    }
  })();

  await previousLock;
  try {
    return await fn();
  } finally {
    release();
  }
}


/**
 * Returns the period key (e.g. '2026-10') for a given ISO date string.
 */
export function getPeriodKey(dateStr: string, periodType: 'monthly' | 'quarterly' | 'annual' = 'monthly'): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'current';
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    if (periodType === 'quarterly') {
      const q = Math.ceil(month / 3);
      return `${year}-Q${q}`;
    }
    if (periodType === 'annual') {
      return `${year}`;
    }
    return `${year}-${String(month).padStart(2, '0')}`;
  } catch {
    return 'current';
  }
}

/**
 * Filter requests belonging to the active spending period.
 */
export function filterRequestsByPeriod(
  requests: ServerPurchaseRequest[],
  periodType: 'monthly' | 'quarterly' | 'annual' = 'monthly',
  targetDate: string = new Date().toISOString()
): ServerPurchaseRequest[] {
  const targetKey = getPeriodKey(targetDate, periodType);
  return requests.filter((r) => {
    const reqKey = getPeriodKey(r.createdAt, periodType);
    return reqKey === targetKey;
  });
}

/**
 * Computes authoritative cumulative spending metrics across backend records.
 */
export function computeCumulativeSpendMetrics(
  requests: ServerPurchaseRequest[],
  policy: ServerProcurementPolicy = getActivePolicy(),
  currentDateStr: string = new Date().toISOString()
) {
  const periodRequests = filterRequestsByPeriod(requests, policy.spendingPeriod, currentDateStr);

  // 1. Paid Spending: Authoritative settled records only
  const paidRequests = periodRequests.filter((r) => r.status === 'paid');
  const paidSpending = Number(
    paidRequests.reduce((sum, r) => sum + r.authoritativeTotal, 0).toFixed(2)
  );

  // 2. Reserved Spending: Approved requests awaiting payment (or pending PayPal captures)
  const reservedRequests = periodRequests.filter(
    (r) => r.status === 'approved' || (r.status !== 'cancelled' && r.status !== 'paid' && r.paymentDetails?.status === 'PENDING')
  );
  const reservedSpending = Number(
    reservedRequests.reduce((sum, r) => sum + r.authoritativeTotal, 0).toFixed(2)
  );

  // 3. Pending Approvals: In review pipeline (not yet reserved or paid)
  const pendingApprovalRequests = periodRequests.filter((r) => r.status === 'pending_approval');
  const pendingApprovalTotal = Number(
    pendingApprovalRequests.reduce((sum, r) => sum + r.authoritativeTotal, 0).toFixed(2)
  );

  // 4. Committed Total & Remaining Headroom
  const totalCommitted = Number((paidSpending + reservedSpending).toFixed(2));
  const remainingBudget = Math.max(
    0,
    Number((policy.cumulativeBudgetLimit - totalCommitted).toFixed(2))
  );

  const rawUtilization = (totalCommitted / policy.cumulativeBudgetLimit) * 100;
  const utilizationPercent = Math.min(100, Math.round(rawUtilization));

  // 5. Blocked Requests
  const blockedRequests = periodRequests.filter((r) => r.policyDecision === 'BLOCKED');

  return {
    periodRequests,
    paidRequests,
    paidSpending,
    reservedRequests,
    reservedSpending,
    pendingApprovalRequests,
    pendingApprovalTotal,
    totalCommitted,
    remainingBudget,
    utilizationPercent,
    blockedRequests,
    limit: policy.cumulativeBudgetLimit,
  };
}

/**
 * Checks if a requested spend amount can be committed without exceeding the cumulative budget.
 * Supports excluding a specific request ID (e.g. when an already-approved request is being verified).
 */
export function canCommitSpend(
  amount: number,
  excludeRequestId?: string,
  policy: ServerProcurementPolicy = getActivePolicy()
): {
  allowed: boolean;
  remainingBudget: number;
  projectedTotal: number;
  limit: number;
  reason?: string;
} {
  const allRequests = getAllPurchaseRequests();
  const eligibleRequests = excludeRequestId
    ? allRequests.filter((r) => r.id !== excludeRequestId)
    : allRequests;

  const metrics = computeCumulativeSpendMetrics(eligibleRequests, policy);
  const projectedTotal = Number((metrics.totalCommitted + amount).toFixed(2));
  const allowed = projectedTotal <= policy.cumulativeBudgetLimit;

  let reason: string | undefined;
  if (!allowed) {
    reason = `Cumulative spending limit exceeded: adding $${amount.toFixed(2)} to currently committed $${metrics.totalCommitted.toFixed(2)} ($${metrics.paidSpending.toFixed(2)} paid + $${metrics.reservedSpending.toFixed(2)} reserved) exceeds the ${policy.spendingPeriod} limit of $${policy.cumulativeBudgetLimit.toFixed(2)}. Available budget: $${metrics.remainingBudget.toFixed(2)}.`;
  }

  return {
    allowed,
    remainingBudget: metrics.remainingBudget,
    projectedTotal,
    limit: policy.cumulativeBudgetLimit,
    reason,
  };
}

/**
 * Atomically transitions a request to 'approved' status while verifying cumulative spending.
 * Strictly prevents concurrent requests from bypassing the cumulative budget.
 */
export async function atomicApproveRequest(
  requestId: string,
  extraNotes?: string
): Promise<{ success: boolean; request?: ServerPurchaseRequest; error?: string }> {
  return withStoreLock(async () => {
    const existing = getPurchaseRequestById(requestId);
    if (!existing) {
      return { success: false, error: `Purchase request "${requestId}" not found.` };
    }

    if (existing.status === 'paid') {
      return { success: false, error: `Purchase request "${requestId}" is already paid and settled.` };
    }

    if (existing.status === 'cancelled') {
      return { success: false, error: `Cancelled request "${requestId}" cannot be approved.` };
    }

    if (existing.policyDecision === 'BLOCKED') {
      return {
        success: false,
        error: `Request is BLOCKED by organizational policy: ${(existing.policyResult?.reasons || []).join('; ')}`,
      };
    }

    // If already approved, return without re-reserving
    if (existing.status === 'approved') {
      return { success: true, request: existing };
    }

    // Validate cumulative budget availability (excluding this request's prior state)
    const check = canCommitSpend(existing.authoritativeTotal, requestId);
    if (!check.allowed) {
      return {
        success: false,
        error: check.reason || 'Cumulative spending limit exceeded.',
      };
    }

    const updated = updatePurchaseRequestStatus(requestId, 'approved', {
      complianceNotes: extraNotes
        ? `${existing.complianceNotes || ''} [Approved: ${extraNotes}]`.trim()
        : existing.complianceNotes,
    });

    return { success: true, request: updated };
  });
}

/**
 * Build the full SpendGuard dashboard summary.
 */
export function getSpendGuardSummary(): SpendGuardSummary {
  const policy = getActivePolicy();
  const allRequests = getAllPurchaseRequests();
  const metrics = computeCumulativeSpendMetrics(allRequests, policy);

  // Period label
  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const periodLabel =
    policy.spendingPeriod === 'monthly'
      ? monthName
      : policy.spendingPeriod === 'quarterly'
      ? `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`
      : `${now.getFullYear()} Fiscal Year`;

  // Build alerts
  const alerts: SpendGuardAlert[] = [];
  const timestamp = new Date().toISOString();

  if (metrics.totalCommitted >= policy.cumulativeBudgetLimit) {
    alerts.push({
      type: 'EXCEEDED_LIMIT',
      severity: 'CRITICAL',
      title: 'Cumulative Spend Ceiling Reached',
      message: `Committed spend ($${metrics.totalCommitted.toFixed(2)}) has reached 100% of the $${policy.cumulativeBudgetLimit.toLocaleString()} ${policy.spendingPeriod} limit. New purchase orders cannot be approved until budget is increased.`,
      timestamp,
    });
  } else if (metrics.utilizationPercent >= policy.budgetAlertThresholdPercent) {
    alerts.push({
      type: 'APPROACHING_BUDGET',
      severity: 'WARNING',
      title: 'Budget Utilization Warning',
      message: `${metrics.utilizationPercent}% of the $${policy.cumulativeBudgetLimit.toLocaleString()} ${policy.spendingPeriod} spending allowance is committed ($${metrics.paidSpending.toFixed(2)} paid, $${metrics.reservedSpending.toFixed(2)} reserved). Remaining headroom: $${metrics.remainingBudget.toFixed(2)}.`,
      timestamp,
    });
  }

  if (metrics.pendingApprovalRequests.length > 0) {
    alerts.push({
      type: 'APPROVAL_REQUIRED',
      severity: 'WARNING',
      title: 'Purchases Awaiting Manager Review',
      message: `${metrics.pendingApprovalRequests.length} request(s) totaling $${metrics.pendingApprovalTotal.toFixed(2)} are in the queue awaiting signoff.`,
      timestamp,
    });
  }

  if (metrics.blockedRequests.length > 0) {
    alerts.push({
      type: 'PURCHASE_BLOCKED',
      severity: 'CRITICAL',
      title: 'Policy Violations Detected',
      message: `${metrics.blockedRequests.length} purchase attempt(s) were blocked by SpendGuard automated policy enforcement.`,
      timestamp,
    });
  }

  // Recent activity: sort by createdAt descending
  const recentActivity = [...metrics.periodRequests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      total: r.authoritativeTotal,
      timestamp: r.createdAt,
      supplier: r.selectedSupplier,
    }));

  const blockedRequestsSummary = metrics.blockedRequests.map((r) => ({
    id: r.id,
    title: r.title,
    total: r.authoritativeTotal,
    reasons: r.policyResult?.reasons || ['Blocked by policy rule'],
    createdAt: r.createdAt,
  }));

  return {
    period: policy.spendingPeriod,
    periodLabel,
    configuredBudget: policy.cumulativeBudgetLimit,
    paidSpending: metrics.paidSpending,
    reservedSpending: metrics.reservedSpending,
    totalCommitted: metrics.totalCommitted,
    remainingBudget: metrics.remainingBudget,
    utilizationPercent: metrics.utilizationPercent,
    pendingApprovalCount: metrics.pendingApprovalRequests.length,
    pendingApprovalTotal: metrics.pendingApprovalTotal,
    blockedRequestsCount: metrics.blockedRequests.length,
    blockedRequests: blockedRequestsSummary,
    recentActivity,
    alerts,
    departmentName: policy.departmentName,
    policyVersion: policy.policyVersion,
    autoApproveThreshold: policy.autoApproveThreshold,
    maxSingleOrderBudget: policy.maxSingleOrderBudget,
  };
}
