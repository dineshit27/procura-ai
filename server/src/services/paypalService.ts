import { env } from '../config/env.js';

export class PayPalError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = 'PayPalError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface PayPalOrderItem {
  name: string;
  unitAmount: number;
  quantity: number;
  currency: string;
}

export interface CreateOrderParams {
  referenceId: string;
  description: string;
  total: number;
  currency: string;
  items: PayPalOrderItem[];
  returnUrl?: string;
  cancelUrl?: string;
  payeeEmail?: string;
}

export interface PayPalCreatedOrder {
  orderId: string;
  status: string;
  approvalUrl?: string;
  raw?: unknown;
}

export interface PayPalCaptureDetails {
  orderId: string;
  status: string;
  captureId?: string;
  capturedAmount?: number;
  currency?: string;
  referenceId?: string;
  raw?: unknown;
}

export type PayPalTransportMock = (
  url: string,
  options: RequestInit
) => Promise<{ status: number; ok: boolean; json: () => Promise<any>; text: () => Promise<string> }>;

let transportMock: PayPalTransportMock | null = null;

export function setPayPalTransportMock(mock: PayPalTransportMock | null): void {
  transportMock = mock;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

export function clearPayPalTokenCache(): void {
  tokenCache = null;
}

/**
 * Extracts a human-readable, actionable message from a PayPal error body.
 * Detects currency restriction errors and surfaces the root cause clearly.
 */
function buildPayPalErrorMessage(status: number, errorBody: Record<string, any>): string {
  const name: string = errorBody?.name || '';
  const details: Array<Record<string, string>> = Array.isArray(errorBody?.details) ? errorBody.details : [];

  // Detect seller currency rejection – most common Sandbox misconfiguration
  const hasCurrencyIssue =
    name === 'UNPROCESSABLE_ENTITY' &&
    details.some(
      (d) =>
        d.issue === 'SELLER_CANNOT_ACCEPT_PAYMENTS_IN_THIS_CURRENCY' ||
        (d.description || '').toLowerCase().includes('currency')
    );

  if (hasCurrencyIssue) {
    const issueDetail = details.find(
      (d) => d.issue === 'SELLER_CANNOT_ACCEPT_PAYMENTS_IN_THIS_CURRENCY'
    );
    return (
      `PayPal Sandbox currency rejection (HTTP ${status}): The seller (merchant) sandbox account ` +
      `does not accept USD payments. This happens when the PayPal Sandbox Business account was created ` +
      `for a non-US country (e.g. India), which restricts the currencies the account can receive. ` +
      `Fix: In the PayPal Developer Dashboard (https://developer.paypal.com/dashboard/accounts), ` +
      `create a new Sandbox Business account with Country = United States, then set ` +
      `PAYPAL_PAYEE_EMAIL=<that account email> in server/.env. ` +
      `Raw issue: ${issueDetail?.issue || 'CURRENCY_RESTRICTION'} – ${issueDetail?.description || JSON.stringify(errorBody)}`
    );
  }

  return `PayPal API error (${status}): ${JSON.stringify(errorBody)}`;
}

async function executeRequest(url: string, options: RequestInit): Promise<any> {
  if (transportMock) {
    const res = await transportMock(url, options);
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      console.error(
        `[PayPal Transport Mock Error] ${options.method || 'GET'} ${url} returned ${res.status}:`,
        JSON.stringify(errorBody)
      );
      throw new PayPalError(
        `PayPal API error (${res.status}): ${JSON.stringify(errorBody)}`,
        res.status,
        errorBody
      );
    }
    return res.json();
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    // Log helpful diagnostic details without logging authorization tokens or secrets
    const sanitizedUrl = url.split('?')[0];
    const humanMessage = buildPayPalErrorMessage(response.status, errorBody);
    console.error(
      `[PayPal API Error] ${options.method || 'GET'} ${sanitizedUrl} returned HTTP ${response.status}:`,
      humanMessage
    );
    throw new PayPalError(humanMessage, response.status, errorBody);
  }
  return response.json();
}

/**
 * Retrieves a valid OAuth2 Bearer token from PayPal Sandbox.
 * Caches token in memory until 60 seconds before expiration.
 */
export async function getPayPalAccessToken(): Promise<string> {
  const clientId = env.PAYPAL_CLIENT_ID;
  const clientSecret = env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new PayPalError(
      'PayPal checkout is disabled: PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing from server/.env.',
      503
    );
  }

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.token;
  }

  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenUrl = `${env.PAYPAL_BASE_URL}/v1/oauth2/token`;

  try {
    const data = await executeRequest(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });

    if (!data.access_token) {
      throw new PayPalError('PayPal OAuth response did not contain an access_token', 502, data);
    }

    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
    tokenCache = {
      token: data.access_token,
      expiresAt: now + expiresIn * 1000,
    };

    return tokenCache.token;
  } catch (err: unknown) {
    if (err instanceof PayPalError) throw err;
    const msg = err instanceof Error ? err.message : 'Unknown OAuth error';
    throw new PayPalError(`Failed to authenticate with PayPal: ${msg}`, 502);
  }
}

/**
 * Creates a PayPal v2 Checkout Order with intent: CAPTURE.
 */
export async function createPayPalOrder(params: CreateOrderParams): Promise<PayPalCreatedOrder> {
  const token = await getPayPalAccessToken();
  const url = `${env.PAYPAL_BASE_URL}/v2/checkout/orders`;

  const formattedTotal = params.total.toFixed(2);
  const defaultReturnUrl = `${env.CLIENT_URL}/?paypal_return=true&purchaseRequestId=${encodeURIComponent(params.referenceId)}`;
  const defaultCancelUrl = `${env.CLIENT_URL}/?paypal_cancel=true&purchaseRequestId=${encodeURIComponent(params.referenceId)}`;
  const payeeEmail = params.payeeEmail || env.PAYPAL_PAYEE_EMAIL;

  const payload: Record<string, unknown> = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: params.referenceId,
        custom_id: params.referenceId,
        description: params.description.slice(0, 127),
        ...(payeeEmail ? { payee: { email_address: payeeEmail } } : {}),
        amount: {
          currency_code: params.currency,
          value: formattedTotal,
          breakdown: {
            item_total: {
              currency_code: params.currency,
              value: formattedTotal,
            },
          },
        },
        items: params.items.map((item) => ({
          name: item.name.slice(0, 127),
          unit_amount: {
            currency_code: item.currency,
            value: item.unitAmount.toFixed(2),
          },
          quantity: String(item.quantity),
        })),
      },
    ],
    application_context: {
      brand_name: 'Procura AI Procurement',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      shipping_preference: 'NO_SHIPPING',
      return_url: params.returnUrl || defaultReturnUrl,
      cancel_url: params.cancelUrl || defaultCancelUrl,
    },
  };

  console.log(
    `[PayPal Service] Creating order: purchaseRequestId=${params.referenceId}, total=$${formattedTotal} ${params.currency}` +
    (payeeEmail ? `, payee=${payeeEmail}` : '')
  );

  const data = await executeRequest(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const approvalLink = Array.isArray(data.links)
    ? data.links.find((l: { rel: string; href: string }) => l.rel === 'approve')?.href
    : undefined;

  const payeeInfo = data.purchase_units?.[0]?.payee;
  const resolvedPayeeEmail = payeeInfo?.email_address || payeeEmail || 'Default (App Owner)';
  const resolvedMerchantId = payeeInfo?.merchant_id || 'N/A';

  console.log(
    `[PayPal Service] Order created: ID=${data.id}, Status=${data.status}, Currency=${params.currency}, ` +
    `Payee=${resolvedPayeeEmail}, MerchantID=${resolvedMerchantId}`
  );

  // Diagnostic: warn if the payee email domain suggests a non-production sandbox account
  // that may have country-based currency restrictions (common cause of USD rejection).
  if (resolvedPayeeEmail.includes('@business.example.com')) {
    console.warn(
      `[PayPal Service] ⚠  CURRENCY RISK: Payee "${resolvedPayeeEmail}" (MerchantID: ${resolvedMerchantId}) ` +
      `is an auto-generated Sandbox Business account. If this account was created for a non-US country ` +
      `(e.g. India), buyers will see "This seller doesn't accept payments in your currency" for USD orders. ` +
      `Fix: Go to https://developer.paypal.com/dashboard/accounts, create a Sandbox Business account ` +
      `with Country = United States, and set PAYPAL_PAYEE_EMAIL=<email> in server/.env.`
    );
  }

  return {
    orderId: data.id,
    status: data.status,
    approvalUrl: approvalLink,
    raw: data,
  };
}

/**
 * Captures an approved PayPal order.
 */
export async function capturePayPalOrder(orderId: string): Promise<PayPalCaptureDetails> {
  const token = await getPayPalAccessToken();
  const url = `${env.PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`;

  console.log(`[PayPal Service] Initiating capture for PayPal order ID: ${orderId}`);

  const data = await executeRequest(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({}),
  });

  const purchaseUnit = data.purchase_units?.[0];
  const capture = purchaseUnit?.payments?.captures?.[0];
  const capturedAmount = capture?.amount?.value ? parseFloat(capture.amount.value) : undefined;
  const capturedCurrency = capture?.amount?.currency_code;

  console.log(
    `[PayPal Service] Order capture completed: OrderID=${data.id || orderId}, Status=${data.status}, CaptureID=${capture?.id || 'none'}, Amount=$${capturedAmount ?? 'N/A'} ${capturedCurrency ?? 'N/A'}`
  );

  return {
    orderId: data.id || orderId,
    status: data.status,
    captureId: capture?.id,
    capturedAmount,
    currency: capturedCurrency,
    referenceId: purchaseUnit?.reference_id || purchaseUnit?.custom_id,
    raw: data,
  };
}

/**
 * Fetches order details directly from PayPal.
 */
export async function getPayPalOrderDetails(orderId: string): Promise<PayPalCaptureDetails> {
  const token = await getPayPalAccessToken();
  const url = `${env.PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`;

  const data = await executeRequest(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  const purchaseUnit = data.purchase_units?.[0];
  const capture = purchaseUnit?.payments?.captures?.[0];

  return {
    orderId: data.id || orderId,
    status: data.status,
    captureId: capture?.id,
    capturedAmount: capture?.amount?.value ? parseFloat(capture.amount.value) : undefined,
    currency: capture?.amount?.currency_code,
    referenceId: purchaseUnit?.reference_id || purchaseUnit?.custom_id,
    raw: data,
  };
}
