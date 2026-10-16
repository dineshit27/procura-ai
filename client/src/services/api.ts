export interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  paypal?: {
    configured: boolean;
    checkoutEnabled: boolean;
    baseUrl: string;
    statusMessage: string;
  };
  system: {
    nodeVersion: string;
    platform: string;
    memoryMb: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
  };
}

export interface HealthCheckResult {
  data: SystemHealthResponse | null;
  error: string | null;
  latencyMs: number;
}

export async function checkBackendHealth(): Promise<HealthCheckResult> {
  const startTime = performance.now();
  try {
    const response = await fetch('/api/health', {
      headers: {
        'Accept': 'application/json',
      },
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: SystemHealthResponse = await response.json();
    return { data, error: null, latencyMs };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';
    return { data: null, error: errorMessage, latencyMs };
  }
}

export interface AnalyzePurchasePayload {
  prompt: string;
  budget: number;
  quantity: number;
  category?: string;
  preferredSupplier?: string;
  urgency?: 'standard' | 'expedited' | 'flexible';
  constraints?: string;
}

export interface AnalyzePurchaseResult {
  data: {
    options: import('../types').ComparisonOption[];
    summary: string;
    provider: 'gemini' | 'rules-engine';
    model: string;
    timestamp: string;
  } | null;
  error: string | null;
  latencyMs: number;
}

export async function analyzePurchase(payload: AnalyzePurchasePayload): Promise<AnalyzePurchaseResult> {
  const startTime = performance.now();
  try {
    const response = await fetch('/api/ai/analyze-purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      let message = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson.message) {
          message = errorJson.message;
        }
      } catch {
        // use fallback message
      }
      throw new Error(message);
    }

    const json = await response.json();
    return { data: json.data, error: null, latencyMs };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : 'Connection to AI service failed';
    return { data: null, error: errorMessage, latencyMs };
  }
}

export interface EvaluatePolicyPayload {
  catalogItemId: string;
  quantity: number;
  userSpecifiedBudget?: number;
  department?: string;
  urgency?: 'standard' | 'expedited' | 'flexible';
  notes?: string;
}

export interface EvaluatePolicyResult {
  data: import('../types').PolicyEvaluationResult | null;
  error: string | null;
  latencyMs: number;
}

export async function evaluatePurchasePolicy(
  payload: EvaluatePolicyPayload
): Promise<EvaluatePolicyResult> {
  const startTime = performance.now();
  try {
    const response = await fetch('/api/policies/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      let message = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson.message) message = errJson.message;
      } catch {
        // fallback
      }
      throw new Error(message);
    }

    const json = await response.json();
    return { data: json.data, error: null, latencyMs };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : 'Policy service connection failed';
    return { data: null, error: errorMessage, latencyMs };
  }
}

// -----------------------------------------------------------------------------
// PayPal Sandbox Checkout API Client
// -----------------------------------------------------------------------------

export interface PayPalConfigResponse {
  enabled: boolean;
  clientId: string | null;
  baseUrl: string;
  isSandbox: boolean;
  currency?: string;
  payeeEmail?: string | null;
  message: string;
}

export async function getPayPalCheckoutConfig(): Promise<PayPalConfigResponse> {
  const response = await fetch('/api/checkout/config', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch PayPal config (${response.status})`);
  }
  return response.json();
}

export interface CreateOrderResult {
  success: boolean;
  orderId: string;
  status: string;
  purchaseRequestId: string;
  amount: {
    currency: string;
    total: number;
    breakdown: {
      authoritativeUnitPrice: number;
      quantity: number;
    };
  };
  approvalUrl?: string;
  isSandbox: boolean;
  serverCalculated: true;
}

export async function createCheckoutOrder(purchaseRequestId: string): Promise<CreateOrderResult> {
  const response = await fetch('/api/checkout/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ purchaseRequestId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Failed to create PayPal order (${response.status})`);
  }

  return data;
}

export interface CaptureOrderResult {
  success: boolean;
  purchaseRequestId: string;
  orderId: string;
  captureId: string;
  status: 'COMPLETED';
  amount: {
    currency: string;
    total: number;
  };
  capturedAt: string;
  isSandbox: boolean;
  message: string;
  purchase?: import('../types').PurchaseRequest;
}

export async function captureCheckoutOrder(
  purchaseRequestId: string,
  orderId: string
): Promise<CaptureOrderResult> {
  const response = await fetch('/api/checkout/capture-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ purchaseRequestId, orderId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Failed to capture PayPal order (${response.status})`);
  }

  return data;
}

export interface PaymentStatusData {
  purchaseRequestId: string;
  orderId: string;
  status: 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'PENDING' | 'UNKNOWN';
  purchaseStatus: string;
  amount: number;
  currency: string;
  isSandbox: boolean;
  captureId?: string;
  capturedAt?: string;
  notes?: string;
}

export async function fetchPaymentStatus(orderId: string): Promise<PaymentStatusData> {
  const response = await fetch(`/api/checkout/status/${orderId}`, {
    headers: { Accept: 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Failed to query payment status (${response.status})`);
  }

  return data;
}

export async function cancelCheckoutOrder(
  purchaseRequestId: string,
  orderId?: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/checkout/cancel-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ purchaseRequestId, orderId, reason }),
  });

  return response.json();
}

/**
 * Normalizes backend ServerPurchaseRequest into client-side PurchaseRequest model,
 * guaranteeing authoritative amounts and item IDs are harmonized.
 */
export function normalizePurchaseRequest(serverReq: any): import('../types').PurchaseRequest {
  if (!serverReq) return serverReq;
  return {
    ...serverReq,
    estimatedTotal:
      typeof serverReq.authoritativeTotal === 'number'
        ? serverReq.authoritativeTotal
        : typeof serverReq.estimatedTotal === 'number'
        ? serverReq.estimatedTotal
        : 0,
    selectedItemId: serverReq.catalogItemId || serverReq.selectedItemId,
    catalogItemId: serverReq.catalogItemId || serverReq.selectedItemId,
  };
}

/**
 * Fetches the authoritative purchase requests from the backend API.
 */
export async function fetchPurchaseRequests(): Promise<import('../types').PurchaseRequest[]> {
  const response = await fetch('/api/requests', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch purchase requests (${response.status})`);
  }

  const json = await response.json();
  const rawList: any[] = json.data || [];
  return rawList.map(normalizePurchaseRequest);
}

/**
 * Fetches a single purchase request authoritatively by ID.
 */
export async function fetchPurchaseRequestById(id: string): Promise<import('../types').PurchaseRequest> {
  const response = await fetch(`/api/requests/${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch purchase request "${id}" (${response.status})`);
  }

  const json = await response.json();
  return normalizePurchaseRequest(json.data);
}

/**
 * Persists a new purchase request to the authoritative server store.
 * Must be called before any checkout or approval can proceed.
 * Returns the server-canonical record (with server-computed amounts and ID).
 */
export async function syncPurchaseRequestToServer(
  req: import('../types').PurchaseRequest
): Promise<import('../types').PurchaseRequest> {
  const payload = {
    id: req.id,
    title: req.title,
    category: req.category,
    prompt: req.prompt,
    budgetLimit: req.budgetLimit,
    quantity: req.quantity,
    catalogItemId: req.selectedItemId || req.catalogItemId || '',
    preferredSupplier: req.preferredSupplier,
    constraints: req.constraints,
    urgency: req.urgency || 'standard',
    status: req.status,
  };

  const response = await fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `Failed to persist purchase request to server (${response.status})`);
  }

  const json = await response.json();
  return normalizePurchaseRequest(json.data);
}

/**
 * Updates the status of a persisted purchase request on the authoritative server store.
 * Returns the updated server-canonical record.
 */
export async function updateRequestStatusOnServer(
  id: string,
  status: import('../types').RequestStatus
): Promise<import('../types').PurchaseRequest> {
  const response = await fetch(`/api/requests/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `Failed to update request status on server (${response.status})`);
  }

  const json = await response.json();
  return normalizePurchaseRequest(json.data);
}

// -----------------------------------------------------------------------------
// SpendGuard AI Real-Time Financial Intelligence API Client
// -----------------------------------------------------------------------------

/**
 * Fetches authoritative SpendGuard budget overview, utilization, and real-time alerts.
 */
export async function fetchSpendGuardSummary(): Promise<import('../types').SpendGuardSummary> {
  const response = await fetch('/api/spendguard/summary', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch SpendGuard summary (${response.status})`);
  }

  const json = await response.json();
  return json.data;
}

/**
 * Evaluates whether a proposed order amount would exceed remaining period budget.
 */
export async function checkBudgetHeadroom(
  amount: number,
  excludeRequestId?: string
): Promise<{
  allowed: boolean;
  remainingBudget: number;
  projectedTotal: number;
  limit: number;
  reason?: string;
}> {
  const response = await fetch('/api/spendguard/check-budget', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ amount, excludeRequestId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to evaluate budget headroom (${response.status})`);
  }

  const json = await response.json();
  return json.data;
}

/**
 * Fetches the active server-side procurement policy configuration.
 */
export async function fetchCurrentPolicy(): Promise<any> {
  const response = await fetch('/api/policies/current', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch current policy (${response.status})`);
  }

  const json = await response.json();
  return json.data;
}

/**
 * Persists policy updates to the authoritative backend store.
 */
export async function updatePolicySettings(updates: any): Promise<any> {
  const response = await fetch('/api/policies/current', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-user-role': 'admin',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `Failed to update policy settings (${response.status})`);
  }

  const json = await response.json();
  return json.data;
}

/**
 * Resets policy configuration back to factory defaults.
 */
export async function resetPolicySettings(): Promise<any> {
  const response = await fetch('/api/policies/reset', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'x-user-role': 'admin',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to reset policy settings (${response.status})`);
  }

  const json = await response.json();
  return json.data;
}

/**
 * Fetches the authoritative product catalog items from the backend API.
 */
export async function fetchCatalogItems(): Promise<import('../types').CatalogItem[]> {
  const response = await fetch('/api/catalog', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch product catalog (${response.status})`);
  }

  const json = await response.json();
  return json.data || [];
}
