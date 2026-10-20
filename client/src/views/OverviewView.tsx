import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  Activity,
  Wallet,
  RefreshCw,
  Ban,
  CheckCircle2,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { PurchaseRequest, ActivityItem, NavigationTab, SpendGuardSummary } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { fetchSpendGuardSummary } from '../services/api';

function formatActivityTime(isoDateStr: string): string {
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return isoDateStr;
    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return isoDateStr;
  }
}

interface OverviewViewProps {
  requests: PurchaseRequest[];
  activity?: ActivityItem[];
  isUsingDemoFallback?: boolean;
  onNavigate: (tab: NavigationTab) => void;
  onSelectRequest: (req: PurchaseRequest) => void;
  onRefreshRequests?: () => Promise<any>;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  requests,
  activity = [],
  isUsingDemoFallback = false,
  onNavigate,
  onSelectRequest,
  onRefreshRequests,
}) => {
  // Authoritative SpendGuard summary state
  const [summary, setSummary] = useState<SpendGuardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const data = await fetchSpendGuardSummary();
      setSummary(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to synchronize with SpendGuard backend engine';
      console.debug('[OverviewView] Failed to load SpendGuard summary, using local fallback:', err);
      setSummaryError(msg);
    } finally {
      setSummaryLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, requests]);

  // Auto-recovery for SpendGuard audit log when in error state
  useEffect(() => {
    if (!summaryError) return;

    const retryTimer = setInterval(() => {
      loadSummary();
      if (onRefreshRequests) {
        onRefreshRequests();
      }
    }, 12000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadSummary();
        if (onRefreshRequests) {
          onRefreshRequests();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(retryTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [summaryError, loadSummary, onRefreshRequests]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadSummary();
    if (onRefreshRequests) {
      onRefreshRequests();
    }
  };

  // Fallback calculations if backend summary is still loading
  const paidRequests = requests.filter((r) => r.status === 'paid');
  const fallbackPaid = paidRequests.reduce((sum, r) => sum + r.estimatedTotal, 0);

  const reservedRequests = requests.filter(
    (r) => r.status === 'approved' || (r.paymentDetails?.status === 'PENDING' && r.status !== 'cancelled' && r.status !== 'paid')
  );
  const fallbackReserved = reservedRequests.reduce((sum, r) => sum + r.estimatedTotal, 0);

  const pendingApprovals = requests.filter((r) => r.status === 'pending_approval');
  const fallbackPendingTotal = pendingApprovals.reduce((sum, r) => sum + r.estimatedTotal, 0);

  const blockedRequestsList = requests.filter((r) => r.policyDecision === 'BLOCKED');

  const configuredLimit = summary?.configuredBudget ?? 20000.0;
  const paidSpending = summary?.paidSpending ?? fallbackPaid;
  const reservedSpending = summary?.reservedSpending ?? fallbackReserved;
  const totalCommitted = summary?.totalCommitted ?? (paidSpending + reservedSpending);
  const remainingBudget = summary?.remainingBudget ?? Math.max(0, configuredLimit - totalCommitted);
  const utilizationPercent = summary?.utilizationPercent ?? Math.min(100, Math.round((totalCommitted / configuredLimit) * 100));

  // Visual bar segments (percentage of configured limit)
  const paidPercent = Math.min(100, (paidSpending / configuredLimit) * 100);
  const reservedPercent = Math.min(100 - paidPercent, (reservedSpending / configuredLimit) * 100);

  const activeAlerts = summary?.alerts || [];

  return (
    <div className="space-y-8">
      {/* Demo Notice Banner */}
      <div className="bg-paper-200 border-2 border-neutral-900 p-4 shadow-brutal-sm flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-neutral-800 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-800 leading-relaxed">
          <strong className="font-bold text-neutral-950 uppercase tracking-wide">
            Demo Environment Disclaimer:
          </strong>{' '}
          All vendor catalogs, order records, and company departments shown are simulated demonstration entities.
          PayPal Sandbox payments run through simulated sandbox credentials with zero real-money movement.
        </div>
      </div>

      {/* Sync Warning if Offline */}
      {summaryError && (
        <div className="bg-amber-50 border-2 border-neutral-900 p-3 shadow-brutal-xs flex items-center justify-between text-xs text-amber-950">
          <span>{summaryError}. Showing local ledger figures (pending approval: ${fallbackPendingTotal.toFixed(2)}).</span>
          <button onClick={handleManualRefresh} className="font-bold underline uppercase">Retry</button>
        </div>
      )}

      {/* SpendGuard AI Active Financial Alerts */}

      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          {activeAlerts.map((alert, index) => {
            const isCritical = alert.severity === 'CRITICAL';
            return (
              <div
                key={index}
                className={`p-4 border-2 border-neutral-900 shadow-brutal-sm flex items-start space-x-3 ${
                  isCritical ? 'bg-rose-50 text-rose-950' : 'bg-amber-50 text-amber-950'
                }`}
              >
                {isCritical ? (
                  <AlertTriangle className="w-5 h-5 text-rose-700 flex-shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold uppercase tracking-wide font-mono">
                      SpendGuard Alert &bull; {alert.title}
                    </span>
                    <span className="font-mono text-[10px] opacity-75">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="leading-relaxed">{alert.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hero Welcome & Primary Call-to-Action */}
      <div className="bg-white border-2 border-neutral-900 p-4 sm:p-8 shadow-brutal flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cobalt-700 bg-cobalt-50 px-2 py-0.5 border border-cobalt-600">
              SpendGuard AI &bull; Autonomous Spend Protection
            </span>
            <span className="bg-emerald-100 border border-emerald-700 text-emerald-900 text-[10px] font-mono font-bold px-1.5 py-0.5">
              ACTIVE
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Backend-Enforced Budget Protection & Procurement Control
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            SpendGuard AI guarantees that all purchasing requests strictly adhere to single-order caps,
            cumulative period allowances, approved vendor directories, and required approval workflows.
          </p>
        </div>

        <button
          onClick={() => onNavigate('new-request')}
          className="inline-flex items-center justify-center space-x-2.5 px-6 py-4 bg-cobalt-700 hover:bg-cobalt-800 text-white font-extrabold text-base border-2 border-neutral-900 shadow-brutal-cobalt brutal-btn whitespace-nowrap"
          id="overview-hero-create-btn"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Create Purchase Request</span>
        </button>
      </div>

      {/* SpendGuard Core Financial Control Center */}
      <div className="bg-white border-2 border-neutral-900 shadow-brutal p-4 sm:p-6 space-y-6">
        {/* Header with Department & Period */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-neutral-900 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Wallet className="w-5 h-5 text-cobalt-700" />
              <h3 className="font-extrabold text-xl text-neutral-900">
                Departmental Budget & Reservation Ledger
              </h3>
            </div>
            <p className="text-xs text-neutral-600 font-mono">
              Department: <strong>{summary?.departmentName || 'Engineering & Operations'}</strong> &bull; Period:{' '}
              <strong>{summary?.periodLabel || 'October 2026 Monthly Allowance'}</strong>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span
              className={`px-2.5 py-1 text-xs font-mono font-bold uppercase border-2 border-neutral-900 shadow-brutal-xs ${
                utilizationPercent >= 100
                  ? 'bg-rose-200 text-rose-950'
                  : utilizationPercent >= 80
                  ? 'bg-amber-200 text-amber-950'
                  : 'bg-emerald-200 text-emerald-950'
              }`}
            >
              {utilizationPercent >= 100
                ? 'Budget Ceiling Reached'
                : utilizationPercent >= 80
                ? 'Warning Threshold'
                : 'Budget Healthy'}
            </span>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-1.5 border-2 border-neutral-900 bg-paper-100 hover:bg-paper-200 shadow-brutal-xs disabled:opacity-50"
              title="Refresh SpendGuard Metrics"
            >
              <RefreshCw className={`w-4 h-4 text-neutral-800 ${isRefreshing ? 'animate-spin text-cobalt-700' : ''}`} />
            </button>
          </div>
        </div>

        {/* Visual Triple-Split Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-neutral-700">
            <span>Period Budget Utilization: {utilizationPercent}%</span>
            <span>
              Total Committed: ${totalCommitted.toLocaleString('en-US', { minimumFractionDigits: 2 })} / $
              {configuredLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="w-full h-5 bg-paper-300 border-2 border-neutral-900 flex overflow-hidden shadow-inner">
            {/* Paid Segment (Dark Emerald) */}
            <div
              style={{ width: `${paidPercent}%` }}
              className="h-full bg-emerald-600 transition-all duration-300 relative group"
              title={`Paid Spend: $${paidSpending.toFixed(2)} (${paidPercent.toFixed(1)}%)`}
            />
            {/* Reserved Segment (Amber) */}
            <div
              style={{ width: `${reservedPercent}%` }}
              className="h-full bg-amber-500 transition-all duration-300 relative group"
              title={`Active Reserved Spend: $${reservedSpending.toFixed(2)} (${reservedPercent.toFixed(1)}%)`}
            />
          </div>

          {/* Breakdown Legend */}
          <div className="flex flex-wrap items-center gap-6 pt-1 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 bg-emerald-600 border border-neutral-900 inline-block" />
              <span className="text-neutral-700 font-semibold">
                Settled / Paid: <strong>${paidSpending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 bg-amber-500 border border-neutral-900 inline-block" />
              <span className="text-neutral-700 font-semibold">
                Active Reserved: <strong>${reservedSpending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 bg-paper-300 border border-neutral-900 inline-block" />
              <span className="text-neutral-700 font-semibold">
                Remaining Headroom: <strong>${remainingBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 4 Core SpendGuard Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Metric 1: Configured Spending Limit */}
          <div className="bg-paper-100 border-2 border-neutral-900 p-4 shadow-brutal-xs space-y-1">
            <div className="text-[11px] font-mono uppercase font-bold text-neutral-600">
              Configured Budget
            </div>
            <div className="text-2xl font-extrabold font-mono text-neutral-900">
              ${configuredLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
              Monthly Department Cap
            </div>
          </div>

          {/* Metric 2: Successfully Paid */}
          <div className="bg-emerald-50 border-2 border-neutral-900 p-4 shadow-brutal-xs space-y-1">
            <div className="text-[11px] font-mono uppercase font-bold text-emerald-900 flex items-center justify-between">
              <span>Settled Spending</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-950">
              ${paidSpending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-emerald-800 font-mono">
              {paidRequests.length} verified PayPal captures
            </div>
          </div>

          {/* Metric 3: Active Reserved */}
          <div className="bg-amber-50 border-2 border-neutral-900 p-4 shadow-brutal-xs space-y-1">
            <div className="text-[11px] font-mono uppercase font-bold text-amber-900 flex items-center justify-between">
              <span>Reserved Commitments</span>
              <Clock className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-950">
              ${reservedSpending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-amber-800 font-mono">
              {reservedRequests.length} approved orders in checkout
            </div>
          </div>

          {/* Metric 4: Remaining Available */}
          <div className="bg-white border-2 border-neutral-900 p-4 shadow-brutal-xs space-y-1">
            <div className="text-[11px] font-mono uppercase font-bold text-neutral-600 flex items-center justify-between">
              <span>Available Budget</span>
              <DollarSign className="w-3.5 h-3.5 text-cobalt-700" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-neutral-900">
              ${remainingBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
              Safe spending headroom
            </div>
          </div>
        </div>
      </div>

      {/* Blocked Requests Section (SpendGuard Compliance Violations) */}
      {blockedRequestsList.length > 0 && (
        <div className="bg-rose-50 border-2 border-neutral-900 shadow-brutal p-5 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-neutral-900 pb-3">
            <div className="flex items-center space-x-2.5">
              <Ban className="w-5 h-5 text-rose-700" />
              <h3 className="font-extrabold text-base text-rose-950">
                Blocked Purchase Attempts ({blockedRequestsList.length})
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-rose-200 border border-neutral-900 px-2 py-0.5 font-bold text-rose-950">
              SpendGuard Enforced
            </span>
          </div>

          <div className="space-y-2.5">
            {blockedRequestsList.map((req) => (
              <div
                key={req.id}
                className="bg-white border-2 border-neutral-900 p-3.5 shadow-brutal-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-neutral-700">{req.id}</span>
                    <span className="font-bold text-sm text-neutral-900">{req.title}</span>
                  </div>
                  <div className="text-xs text-rose-800 font-medium flex items-start gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-600" />
                    <span>
                      {req.policyResult?.reasons?.join('; ') || req.complianceNotes || 'Violated policy rules.'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 sm:flex-shrink-0">
                  <span className="font-mono font-bold text-sm text-neutral-900">
                    ${req.estimatedTotal.toFixed(2)}
                  </span>
                  <button
                    onClick={() => onSelectRequest(req)}
                    className="px-3 py-1 text-xs font-bold border-2 border-neutral-900 bg-paper-100 hover:bg-neutral-900 hover:text-white transition shadow-brutal-xs"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Recent Requests & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3): Recent Purchase Requests Table */}
        <div className="lg:col-span-2 bg-white border-2 border-neutral-900 shadow-brutal flex flex-col justify-between">
          <div>
            <div className="p-5 border-b-2 border-neutral-900 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Receipt className="w-5 h-5 text-cobalt-700" />
                <h3 className="font-extrabold text-lg text-neutral-900">Recent Purchase Requests</h3>
              </div>
              <button
                onClick={() => onNavigate('history')}
                className="text-xs font-bold font-mono text-cobalt-700 hover:text-cobalt-900 flex items-center gap-1 group"
              >
                <span>View All History</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-paper-200 border-b-2 border-neutral-900 text-xs font-mono uppercase tracking-wider text-neutral-700">
                    <th className="py-3 px-4">Request / Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Policy Status</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-neutral-200 text-sm">
                  {requests.slice(0, 5).map((req) => (
                    <tr key={req.id} className="hover:bg-paper-100 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900">{req.title}</div>
                        <div className="text-xs font-mono text-neutral-500 mt-0.5 flex items-center gap-2">
                          <span>{req.id}</span>
                          <span>•</span>
                          <span>Qty: {req.quantity}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-neutral-700">
                        {req.category}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={req.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-900">
                        ${req.estimatedTotal.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onSelectRequest(req)}
                          className="px-2.5 py-1 text-xs font-bold border-2 border-neutral-900 bg-paper-100 hover:bg-neutral-900 hover:text-white transition shadow-brutal-xs"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 bg-paper-100 border-t-2 border-neutral-900 flex items-center justify-between text-xs text-neutral-600">
            <span>Showing recent requests in pipeline</span>
            <button
              onClick={() => onNavigate('new-request')}
              className="font-bold text-cobalt-700 hover:underline"
            >
              + Submit Another Request
            </button>
          </div>
        </div>

        {/* Right Column (1/3): Activity Feed */}
        <div className="bg-white border-2 border-neutral-900 shadow-brutal flex flex-col justify-between">
          <div>
            <div className="p-5 border-b-2 border-neutral-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-cobalt-700" />
                <h3 className="font-extrabold text-lg text-neutral-900">Audit Trail</h3>
              </div>
              {summary ? (
                <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-900 border border-emerald-500 px-2 py-0.5 font-bold flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live Backend Stream
                </span>
              ) : summaryLoading ? (
                <span className="text-[10px] font-mono uppercase bg-blue-50 text-blue-800 border border-blue-400 px-2 py-0.5 font-bold">
                  Connecting...
                </span>
              ) : (
                <span className="text-[10px] font-mono uppercase bg-amber-100 text-amber-900 border border-amber-500 px-2 py-0.5 font-bold">
                  Demo Fallback
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* Loading State */}
              {summaryLoading && !summary && (
                <div className="py-10 text-center text-xs font-mono text-neutral-500 space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-cobalt-700" />
                  <p>Loading live audit log from SpendGuard engine...</p>
                </div>
              )}

              {/* Error State */}
              {summaryError && !summary && (
                <div className="p-3 bg-rose-50 border border-rose-400 text-rose-900 text-xs space-y-2">
                  <div className="font-bold flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>Live Audit Log Unavailable</span>
                    </div>
                    <span className="text-[9px] font-mono text-rose-600 bg-rose-100 px-1 py-0.5 rounded border border-rose-200">
                      Auto-retrying
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-snug break-words">{summaryError}</p>
                  <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold border-2 border-neutral-900 bg-white hover:bg-paper-100 shadow-brutal-xs cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isRefreshing ? 'Reconnecting...' : 'Retry Connection'}</span>
                  </button>
                  {activity.length > 0 && (
                    <div className="pt-2 border-t border-rose-200 flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 border border-amber-300">
                        Demo Fallback Stream
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">
                        Showing simulated sample records
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Live Backend Recent Activity */}
              {summary && summary.recentActivity && summary.recentActivity.length > 0 ? (
                summary.recentActivity.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-paper-100 border border-neutral-900 shadow-brutal-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-neutral-900 truncate" title={item.title}>
                        {item.title}
                      </span>
                      <StatusBadge status={item.status as any} size="sm" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                      <span className="font-bold text-neutral-700">{item.id}</span>
                      <span>{formatActivityTime(item.timestamp)}</span>
                    </div>
                    {item.supplier && (
                      <div className="text-[11px] text-neutral-600 truncate flex items-center gap-1">
                        <span className="text-neutral-400 font-mono">Vendor:</span>
                        <span>{item.supplier}</span>
                      </div>
                    )}
                    <div className="pt-1 text-[11px] font-mono font-bold text-cobalt-700 border-t border-neutral-200 flex justify-between items-center">
                      <span>Authoritative Total:</span>
                      <span>${item.total.toFixed(2)} USD</span>
                    </div>
                  </div>
                ))
              ) : summary && (!summary.recentActivity || summary.recentActivity.length === 0) ? (
                /* Empty State */
                <div className="text-center py-8 text-neutral-500 text-xs font-mono space-y-1">
                  <p className="font-bold text-neutral-700">No activity recorded yet</p>
                  <p className="text-[11px] text-neutral-500">
                    Requests submitted, approved, paid, or blocked will stream here live.
                  </p>
                </div>
              ) : (!summary || isUsingDemoFallback) && activity.length > 0 ? (
                /* Fallback Activity Feed when backend is offline */
                <div className="space-y-3">
                  {activity.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-amber-50/50 border border-amber-200 shadow-brutal-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-neutral-900 truncate" title={item.title}>
                          {item.title}
                        </span>
                        <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded border border-amber-300">
                          Demo
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                        <span className="font-bold text-neutral-700">{item.id}</span>
                        <span>{formatActivityTime(item.timestamp)}</span>
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-neutral-600 truncate">
                          {item.description}
                        </div>
                      )}
                      {typeof item.amount === 'number' && (
                        <div className="pt-1 text-[11px] font-mono font-bold text-amber-800 border-t border-amber-200 flex justify-between items-center">
                          <span>Simulated Total:</span>
                          <span>${item.amount.toFixed(2)} USD</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="p-4 bg-paper-100 border-t-2 border-neutral-900 text-xs text-center text-neutral-600 font-mono">
            {summary ? 'Authoritative SpendGuard audit log (Live)' : 'SpendGuard audit log (Demo Fallback)'}
          </div>
        </div>
      </div>
    </div>
  );
};
