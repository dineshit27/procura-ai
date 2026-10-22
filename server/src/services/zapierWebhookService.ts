import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { PaymentDetails, ServerPurchaseRequest } from '../types/checkout.js';

export type ZapierEventName =
  | 'purchase_request.updated'
  | 'purchase_request.payment_updated'
  | 'spendguard.policy_alert';

export interface ZapierWebhookPayload {
  event: ZapierEventName;
  eventId: string;
  occurredAt: string;
  data: {
    requestId: string;
    title: string;
    category: string;
    quantity: number;
    authoritativeTotal: number;
    currency: string;
    status: ServerPurchaseRequest['status'];
    policyDecision: ServerPurchaseRequest['policyDecision'];
    paymentDetails?: {
      paypalOrderId: string;
      captureId?: string;
      status: PaymentDetails['status'];
      amount: number;
      currency: string;
      capturedAt?: string;
    };
  };
}

type WebhookFetch = (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number }>;

let webhookFetch: WebhookFetch = (url, init) => fetch(url, init);
let webhookUrlForTests: string | undefined | null = null;
const deliveredEventKeys = new Set<string>();
const WEBHOOK_TIMEOUT_MS = 5_000;

export function buildZapierWebhookPayload(event: ZapierEventName, request: ServerPurchaseRequest): ZapierWebhookPayload {
  const payment = request.paymentDetails;
  return {
    event,
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    data: {
      requestId: request.id,
      title: request.title,
      category: request.category,
      quantity: request.quantity,
      authoritativeTotal: request.authoritativeTotal,
      currency: request.currency,
      status: request.status,
      policyDecision: request.policyDecision,
      ...(payment
        ? {
            paymentDetails: {
              paypalOrderId: payment.paypalOrderId,
              ...(payment.captureId ? { captureId: payment.captureId } : {}),
              status: payment.status,
              amount: payment.amount,
              currency: payment.currency,
              ...(payment.capturedAt ? { capturedAt: payment.capturedAt } : {}),
            },
          }
        : {}),
    },
  };
}

/**
 * Best-effort delivery: callers must not await this as part of a procurement mutation.
 * A delivery failure is logged without the configured Catch Hook URL and never retried.
 */
export async function emitZapierWebhook(
  event: ZapierEventName,
  request: ServerPurchaseRequest,
  dedupeKey?: string
): Promise<void> {
  const webhookUrl = webhookUrlForTests === null ? env.ZAPIER_WEBHOOK_URL : webhookUrlForTests;
  if (!webhookUrl) {
    console.info('[Zapier Webhook] Delivery skipped: ZAPIER_WEBHOOK_URL is not configured.');
    return;
  }
  if (dedupeKey) {
    if (deliveredEventKeys.has(dedupeKey)) return;
    deliveredEventKeys.add(dedupeKey);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  const payload = buildZapierWebhookPayload(event, request);
  try {
    const response = await webhookFetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn('[Zapier Webhook] Delivery failed.', { event, eventId: payload.eventId, status: response.status });
      return;
    }
    console.info('[Zapier Webhook] Delivery succeeded.', { event, eventId: payload.eventId, requestId: request.id });
  } catch (error) {
    const reason = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network_error';
    console.warn('[Zapier Webhook] Delivery failed.', { event, eventId: payload.eventId, requestId: request.id, reason });
  } finally {
    clearTimeout(timeout);
  }
}

export function setZapierWebhookFetchForTests(mock?: WebhookFetch): void {
  webhookFetch = mock || ((url, init) => fetch(url, init));
}

export function setZapierWebhookUrlForTests(url: string | undefined): void {
  webhookUrlForTests = url;
}

export function resetZapierWebhookStateForTests(): void {
  deliveredEventKeys.clear();
  webhookUrlForTests = null;
  setZapierWebhookFetchForTests();
}
