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

/**
 * Resolves the backend origin for Procura AI API calls:
 * 1. Checks VITE_API_URL (set at build-time or in local .env).
 * 2. In production on Render (when running on procura-io.onrender.com),
 *    defaults to the live deployed backend at https://procura-ai-f4eo.onrender.com.
 * 3. In local development on localhost/127.0.0.1, returns '' to leverage Vite proxy,
 *    or fallback to http://localhost:5000.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // Render deployment domain check
    if (
      hostname.includes('procura-io.onrender.com') ||
      (hostname.endsWith('.onrender.com') && !hostname.includes('procura-ai-f4eo'))
    ) {
      return 'https://procura-ai-f4eo.onrender.com';
    }
  }

  // Static production deployments do not have Vite's development proxy. Use
  // the deployed API when a build omitted VITE_API_URL (for example, a Render
  // static-site deployment), rather than accidentally requesting /api from
  // the SPA host.
  if (import.meta.env.PROD) {
    return 'https://procura-ai-f4eo.onrender.com';
  }

  // Local development default: empty string allows Vite dev proxy to route /api -> targetBackend
  return '';
}

/**
 * Builds a fully qualified API URL or relative path if base is empty.
 */
export function buildApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

/**
 * Sanitizes a raw text string for safe logging and error reporting without exposing sensitive data.
 */
export function sanitizeResponsePreview(text: string, maxLength = 120): string {
  if (!text) return '';
  // Strip script tags and HTML tags
  const noScripts = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  const noTags = noScripts.replace(/<[^>]+>/g, ' ');
  // Scrub potential sensitive patterns like Authorization, passwords, tokens
  const scrubbed = noTags
    .replace(/(bearer\s+)[A-Za-z0-9._~+/-]+/gi, '$1[REDACTED]')
    .replace(/(token|password|secret|key|client_id)\s*[:=]\s*["']?[^"'\s,}]+/gi, '$1=[REDACTED]');
  const collapsed = scrubbed.replace(/\s+/g, ' ').trim();
  return collapsed.slice(0, maxLength);
}

/**
 * Safe fetch wrapper that:
 * 1. Resolves target backend origin using buildApiUrl(path).
 * 2. Checks HTTP status and Content-Type header before attempting JSON parsing.
 * 3. If the server returned HTML (e.g. Render SPA fallback on the frontend host),
 *    logs a structured warning with the requested URL, status, and sanitized preview
 *    (without leaking credentials or tokens), and throws a descriptive error.
 * 4. Parses error JSON safely to extract backend error messages.
 */
export async function safeRequestJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const fullUrl = buildApiUrl(path);

  const headers = new Headers(init?.headers);
  // Supabase access tokens are the sole credential accepted by the API.
  // Roles are resolved server-side; callers never send a role header.
  const { supabase } = await import('../auth/supabase');
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...init,
      headers,
    });
  } catch (networkErr) {
    const errorMsg = networkErr instanceof Error ? networkErr.message : 'Network request failed';
    console.warn(`[API] Network failure connecting to backend:`, {
      url: fullUrl,
      error: errorMsg,
    });
    throw new Error(`Unable to connect to backend at ${fullUrl}: ${errorMsg}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  if (!isJson) {
    const rawText = await response.text().catch(() => '');
    const preview = sanitizeResponsePreview(rawText);
    const isHtml =
      contentType.toLowerCase().includes('text/html') ||
      rawText.trim().startsWith('<');

    console.warn(`[API] Non-JSON response received:`, {
      url: fullUrl,
      status: response.status,
      contentType: contentType || '(none)',
      preview: preview ? `"${preview}"` : '(empty)',
    });

    if (isHtml) {
      throw new Error(
        `Server returned HTML (HTTP ${response.status}) instead of JSON for ${fullUrl}. ` +
        `This typically indicates the request went to a static SPA host or the route was not found. Preview: "${preview}"`
      );
    }

    throw new Error(
      `Server returned unexpected Content-Type "${contentType}" (HTTP ${response.status}) for ${fullUrl}. Preview: "${preview}"`
    );
  }

  if (!response.ok) {
    const errJson = await response.json().catch(() => null);
    const errorMsg =
      (errJson && (errJson.message || errJson.error)) ||
      `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function checkBackendHealth(): Promise<HealthCheckResult> {
  const startTime = performance.now();
  try {
    const data = await safeRequestJson<SystemHealthResponse>('/api/health');
    const latencyMs = Math.round(performance.now() - startTime);
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
    const json = await safeRequestJson<{ data: any }>('/api/ai/analyze-purchase', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const latencyMs = Math.round(performance.now() - startTime);
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
    const json = await safeRequestJson<{ data: import('../types').PolicyEvaluationResult }>('/api/policies/evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const latencyMs = Math.round(performance.now() - startTime);
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
  return safeRequestJson<PayPalConfigResponse>('/api/checkout/config');
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
  return safeRequestJson<CreateOrderResult>('/api/checkout/create-order', {
    method: 'POST',
    body: JSON.stringify({ purchaseRequestId }),
  });
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
  return safeRequestJson<CaptureOrderResult>('/api/checkout/capture-order', {
    method: 'POST',
    body: JSON.stringify({ purchaseRequestId, orderId }),
  });
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
  return safeRequestJson<PaymentStatusData>(`/api/checkout/status/${encodeURIComponent(orderId)}`);
}

export async function cancelCheckoutOrder(
  purchaseRequestId: string,
  orderId?: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  return safeRequestJson<{ success: boolean; message: string }>('/api/checkout/cancel-order', {
    method: 'POST',
    body: JSON.stringify({ purchaseRequestId, orderId, reason }),
  });
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
  const json = await safeRequestJson<{ success?: boolean; data?: any[] }>('/api/requests');
  const rawList: any[] = json?.data || [];
  return rawList.map(normalizePurchaseRequest);
}

/**
 * Fetches a single purchase request authoritatively by ID.
 */
export async function fetchPurchaseRequestById(id: string): Promise<import('../types').PurchaseRequest> {
  const json = await safeRequestJson<{ success?: boolean; data: any }>(`/api/requests/${encodeURIComponent(id)}`);
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

  const json = await safeRequestJson<{ success?: boolean; data: any }>('/api/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

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
  const json = await safeRequestJson<{ success?: boolean; data: any }>(
    `/api/requests/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );

  return normalizePurchaseRequest(json.data);
}

// -----------------------------------------------------------------------------
// SpendGuard AI Real-Time Financial Intelligence API Client
// -----------------------------------------------------------------------------

/**
 * Fetches authoritative SpendGuard budget overview, utilization, and real-time alerts.
 */
export async function fetchSpendGuardSummary(): Promise<import('../types').SpendGuardSummary> {
  const json = await safeRequestJson<{ success?: boolean; data: import('../types').SpendGuardSummary }>(
    '/api/spendguard/summary'
  );
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
  const json = await safeRequestJson<{
    success?: boolean;
    data: {
      allowed: boolean;
      remainingBudget: number;
      projectedTotal: number;
      limit: number;
      reason?: string;
    };
  }>('/api/spendguard/check-budget', {
    method: 'POST',
    body: JSON.stringify({ amount, excludeRequestId }),
  });

  return json.data;
}

/**
 * Fetches the active server-side procurement policy configuration.
 */
export async function fetchCurrentPolicy(): Promise<any> {
  const json = await safeRequestJson<{ success?: boolean; data: any }>('/api/policies/current');
  return json.data;
}

/**
 * Persists policy updates to the authoritative backend store.
 */
export async function updatePolicySettings(updates: any): Promise<any> {
  const json = await safeRequestJson<{ success?: boolean; data: any }>('/api/policies/current', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  return json.data;
}

/**
 * Resets policy configuration back to factory defaults.
 */
export async function resetPolicySettings(): Promise<any> {
  const json = await safeRequestJson<{ success?: boolean; data: any }>('/api/policies/reset', {
    method: 'POST',
  });

  return json.data;
}

/**
 * Fetches the authoritative product catalog items from the backend API.
 */
export async function fetchCatalogItems(): Promise<import('../types').CatalogItem[]> {
  const json = await safeRequestJson<{ success?: boolean; data: any[] }>('/api/catalog');
  return json.data || [];
}

export interface AssistantChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatResult {
  reply: string;
  provider: 'gemini' | 'deterministic-faq';
  timestamp: string;
}

/**
 * Sends a message to the Procura AI Assistant backend chat endpoint.
 */
export async function sendAssistantChatMessage(payload: {
  message: string;
  history?: AssistantChatMessage[];
}): Promise<AssistantChatResult> {
  const json = await safeRequestJson<{ success?: boolean; data: AssistantChatResult }>('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return json.data;
}
