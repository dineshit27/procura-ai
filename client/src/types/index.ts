export type NavigationTab = 'overview' | 'new-request' | 'catalog' | 'history' | 'settings';

export type RequestStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'paid'
  | 'failed'
  | 'cancelled';

export interface CatalogItem {
  id: string;
  name: string;
  category: 'IT & Hardware' | 'Office Ergonomics' | 'Software & Cloud' | 'Facility Supplies';
  supplier: string;
  price: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  deliveryDays: number;
  inStock: boolean;
  stockUnits: number;
  specs: Record<string, string>;
  description: string;
  badge?: string;
}

export interface ComparisonOption {
  catalogItem: CatalogItem;
  matchScore: number;
  reason: string;
  pros: string[];
  cons: string[];
  estimatedTotal: number;
  isRecommended: boolean;
}

export interface AiAnalysisResponse {
  options: ComparisonOption[];
  summary: string;
  provider: 'gemini' | 'rules-engine';
  model: string;
  timestamp: string;
}

export type PolicyDecision = 'ALLOWED' | 'NEEDS_APPROVAL' | 'BLOCKED';

export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  status: 'PASSED' | 'FAILED' | 'FLAGGED';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
}

export interface ItemizedCost {
  catalogItemId: string;
  name: string;
  category: string;
  supplier: string;
  authoritativeUnitPrice: number;
  requestedQuantity: number;
  subtotal: number;
  currency: string;
}

export interface PolicyEvaluationResult {
  decision: PolicyDecision;
  requiresHumanApproval: boolean;
  reasons: string[];
  itemizedCost: ItemizedCost;
  rules: RuleEvaluation[];
  evaluatedAt: string;
  policyVersion: string;
}

export interface PaymentDetails {
  paypalOrderId: string;
  captureId?: string;
  status: 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'PENDING';
  amount: number;
  currency: string;
  capturedAt?: string;
  isSandbox: boolean;
  notes?: string;
}

export interface PurchaseRequest {
  id: string;
  title: string;
  category: string;
  prompt: string;
  budgetLimit: number;
  quantity: number;
  preferredSupplier?: string;
  constraints?: string;
  createdAt: string;
  status: RequestStatus;
  estimatedTotal: number;
  selectedSupplier?: string;
  selectedItemName?: string;
  selectedItemId?: string;
  catalogItemId?: string;        // canonical server field; mirrors selectedItemId
  urgency: 'standard' | 'expedited' | 'flexible';
  complianceNotes?: string;
  policyDecision?: PolicyDecision;
  policyResult?: PolicyEvaluationResult;
  paypalOrderId?: string;
  paymentDetails?: PaymentDetails;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'request_created' | 'approval_granted' | 'catalog_updated' | 'settings_saved' | 'status_changed';
  amount?: number;
}

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

export interface ProcurementSettings {
  departmentName: string;
  defaultBudgetLimit: number;
  cumulativeBudgetLimit?: number;
  spendingPeriod?: 'monthly' | 'quarterly' | 'annual';
  budgetAlertThresholdPercent?: number;
  maxQuantityPerOrder?: number;
  autoApproveThreshold: number;
  currency: string;
  requirePreferredSupplier: boolean;
  approvedSuppliers: string[];
  notificationEmail: string;
}

