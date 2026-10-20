import { Router, Request, Response, NextFunction } from 'express';
import { env, getPayPalConfig } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createOrderRequestSchema,
  captureOrderRequestSchema,
  cancelOrderRequestSchema,
} from '../types/checkout.js';
import {
  getPurchaseRequestById,
  updatePurchaseRequestStatus,
} from '../data/purchaseRequests.js';
import { CATALOG_ITEMS } from '../data/catalog.js';
import { evaluatePurchasingPolicy } from '../services/policyEngine.js';
import {
  createPayPalOrder,
  capturePayPalOrder,
  getPayPalOrderDetails,
  PayPalError,
} from '../services/paypalService.js';

export const checkoutRouter = Router();
checkoutRouter.use(requireAuth);

// In-flight capture locks to strictly prevent concurrent duplicate captures
const inFlightCaptures = new Set<string>();

/**
 * GET /api/checkout/config
 * Returns public PayPal configuration for the frontend client (NEVER client secret).
 */
checkoutRouter.get('/config', (_req: Request, res: Response) => {
  const config = getPayPalConfig();
  res.status(200).json({
    enabled: config.checkoutEnabled,
    clientId: env.PAYPAL_CLIENT_ID || null,
    baseUrl: config.baseUrl,
    isSandbox: config.baseUrl.includes('sandbox'),
    currency: 'USD',
    payeeEmail: env.PAYPAL_PAYEE_EMAIL || null,
    message: config.message,
  });
});

/**
 * POST /api/checkout/create-order
 * Authoritatively validates purchase request and policy rules, recalculates total,
 * and creates a PayPal order with intent: CAPTURE.
 */
checkoutRouter.post('/create-order', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = getPayPalConfig();
    if (!config.checkoutEnabled) {
      res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'PayPal checkout is disabled: PayPal credentials are not configured in server/.env.',
      });
      return;
    }

    // Validate request body
    const parseResult = createOrderRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Invalid request payload',
        details: parseResult.error.format(),
      });
      return;
    }

    const { purchaseRequestId } = parseResult.data;

    // Load authoritative purchase request from server store (NEVER trust client data)
    const purchase = getPurchaseRequestById(purchaseRequestId);
    if (!purchase) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Purchase request "${purchaseRequestId}" was not found in authoritative records.`,
      });
      return;
    }

    // Status check
    if (purchase.status === 'paid') {
      res.status(400).json({
        success: false,
        error: 'ALREADY_PAID',
        message: `Purchase request ${purchaseRequestId} has already been paid and settled.`,
      });
      return;
    }

    if (purchase.status === 'pending_approval') {
      res.status(400).json({
        success: false,
        error: 'AWAITING_APPROVAL',
        message: `Purchase request ${purchaseRequestId} is awaiting required managerial approval before payment can proceed.`,
      });
      return;
    }

    if (purchase.status === 'draft') {
      res.status(400).json({
        success: false,
        error: 'DRAFT_STATUS',
        message: `Purchase request ${purchaseRequestId} is currently in draft status and must be approved first.`,
      });
      return;
    }

    if (purchase.status === 'cancelled') {
      res.status(400).json({
        success: false,
        error: 'CANCELLED_STATUS',
        message: `Purchase request ${purchaseRequestId} is cancelled and cannot be paid.`,
      });
      return;
    }

    if (purchase.status !== 'approved') {
      res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Purchase request status is "${purchase.status}". Only approved requests can be checked out.`,
      });
      return;
    }

    // Guard: reject if a live PayPal order has already been created for this request.
    // This prevents stale order ID reuse and duplicate order creation on retries.
    if (purchase.paypalOrderId) {
      res.status(409).json({
        success: false,
        error: 'ORDER_ALREADY_EXISTS',
        message:
          `Purchase request "${purchaseRequestId}" already has a PayPal order in progress ` +
          `(orderId: "${purchase.paypalOrderId}"). Use the existing order or cancel checkout first.`,
        orderId: purchase.paypalOrderId,
        purchaseRequestId: purchase.id,
      });
      return;
    }

    // Authoritative Catalog Product & Policy Re-evaluation
    const catalogItem = CATALOG_ITEMS.find((c) => c.id === purchase.catalogItemId);
    if (!catalogItem) {
      res.status(400).json({
        success: false,
        error: 'INVALID_CATALOG_ITEM',
        message: `Catalog item "${purchase.catalogItemId}" does not exist in authoritative catalog.`,
      });
      return;
    }

    const policyResult = evaluatePurchasingPolicy(
      {
        catalogItemId: purchase.catalogItemId,
        quantity: purchase.quantity,
        userSpecifiedBudget: purchase.budgetLimit,
        checkCumulativeSpend: true,
        excludeRequestId: purchase.id,
      },
      undefined,
      { checkCumulativeSpend: true, excludeRequestId: purchase.id }
    );

    if (policyResult.decision === 'BLOCKED') {
      res.status(422).json({
        success: false,
        error: 'POLICY_BLOCKED',
        message: `Purchase is blocked by organizational purchasing policy: ${policyResult.reasons.join('; ')}`,
        reasons: policyResult.reasons,
      });
      return;
    }

    // Authoritative total calculation (strictly ignore any frontend price/total)
    const authoritativeUnitPrice = catalogItem.price;
    const authoritativeTotal = Number((authoritativeUnitPrice * purchase.quantity).toFixed(2));
    const currency = catalogItem.currency || 'USD';

    // Call PayPal service to create order
    const clientUrl = env.CLIENT_URL || 'http://localhost:5173';
    const paypalOrder = await createPayPalOrder({
      referenceId: purchase.id,
      description: `Procura AI: ${purchase.title}`,
      total: authoritativeTotal,
      currency,
      items: [
        {
          name: catalogItem.name,
          unitAmount: authoritativeUnitPrice,
          quantity: purchase.quantity,
          currency,
        },
      ],
      returnUrl: `${clientUrl}/?paypal_return=true&purchaseRequestId=${encodeURIComponent(purchase.id)}`,
      cancelUrl: `${clientUrl}/?paypal_cancel=true&purchaseRequestId=${encodeURIComponent(purchase.id)}`,
      payeeEmail: env.PAYPAL_PAYEE_EMAIL,
    });

    // Record paypalOrderId and set payment pending
    updatePurchaseRequestStatus(purchase.id, 'approved', {
      paypalOrderId: paypalOrder.orderId,
      authoritativeUnitPrice,
      authoritativeTotal,
      currency,
      paymentDetails: {
        paypalOrderId: paypalOrder.orderId,
        status: 'PENDING',
        amount: authoritativeTotal,
        currency,
        isSandbox: true,
      },
    });

    res.status(200).json({
      success: true,
      orderId: paypalOrder.orderId,
      status: paypalOrder.status,
      purchaseRequestId: purchase.id,
      amount: {
        currency,
        total: authoritativeTotal,
        breakdown: {
          authoritativeUnitPrice,
          quantity: purchase.quantity,
        },
      },
      approvalUrl: paypalOrder.approvalUrl,
      isSandbox: true,
      serverCalculated: true,
    });
  } catch (err: unknown) {
    if (err instanceof PayPalError) {
      console.error(`[Checkout Route] PayPal order creation failed: ${err.message}`);
      res.status(err.statusCode).json({
        success: false,
        error: 'PAYPAL_API_ERROR',
        message: err.message,
      });
      return;
    }
    next(err);
  }
});

/**
 * POST /api/checkout/capture-order
 * Captures an approved PayPal order, verifying amount, currency, and purchaseRequestId,
 * with concurrent/duplicate capture prevention.
 */
checkoutRouter.post('/capture-order', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let lockKey: string | null = null;
  try {
    const config = getPayPalConfig();
    if (!config.checkoutEnabled) {
      res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'PayPal checkout is disabled: PayPal credentials are not configured in server/.env.',
      });
      return;
    }

    const parseResult = captureOrderRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Invalid capture payload',
        details: parseResult.error.format(),
      });
      return;
    }

    const { purchaseRequestId, orderId } = parseResult.data;
    lockKey = `${purchaseRequestId}:${orderId}`;

    // Prevent duplicate concurrent captures
    if (inFlightCaptures.has(lockKey) || inFlightCaptures.has(purchaseRequestId) || inFlightCaptures.has(orderId)) {
      res.status(409).json({
        success: false,
        error: 'CONCURRENT_CAPTURE',
        message: 'A capture request for this order is already in progress. Please wait.',
      });
      return;
    }
    inFlightCaptures.add(lockKey);

    // Authoritative purchase lookup
    const purchase = getPurchaseRequestById(purchaseRequestId);
    if (!purchase) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Purchase request "${purchaseRequestId}" was not found.`,
      });
      return;
    }

    // Prevent duplicate capture if already paid
    if (purchase.status === 'paid') {
      res.status(409).json({
        success: false,
        error: 'ALREADY_PAID',
        message: `Purchase request "${purchaseRequestId}" has already been captured and paid. Duplicate capture rejected.`,
      });
      return;
    }

    // Verify PayPal order ID matches what was created for this request
    if (purchase.paypalOrderId && purchase.paypalOrderId !== orderId) {
      res.status(400).json({
        success: false,
        error: 'ORDER_MISMATCH',
        message: `PayPal Order ID "${orderId}" does not belong to purchase request "${purchaseRequestId}". Expected "${purchase.paypalOrderId}".`,
      });
      return;
    }

    // Recheck status and policy
    if (purchase.status !== 'approved') {
      res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Purchase request status is "${purchase.status}". Only approved requests can be captured.`,
      });
      return;
    }

    const policyResult = evaluatePurchasingPolicy(
      {
        catalogItemId: purchase.catalogItemId,
        quantity: purchase.quantity,
        userSpecifiedBudget: purchase.budgetLimit,
        checkCumulativeSpend: true,
        excludeRequestId: purchase.id,
      },
      undefined,
      { checkCumulativeSpend: true, excludeRequestId: purchase.id }
    );

    if (policyResult.decision === 'BLOCKED') {
      res.status(422).json({
        success: false,
        error: 'POLICY_BLOCKED',
        message: 'Purchase policy re-check failed. Refusing to capture order.',
        reasons: policyResult.reasons,
      });
      return;
    }

    // Execute PayPal capture
    const captureResult = await capturePayPalOrder(orderId);

    // Verify capture response
    if (captureResult.status !== 'COMPLETED') {
      // Payment was not completed
      updatePurchaseRequestStatus(purchase.id, purchase.status, {
        paymentDetails: {
          paypalOrderId: orderId,
          status: 'FAILED',
          amount: purchase.authoritativeTotal,
          currency: purchase.currency,
          isSandbox: true,
          notes: `PayPal capture status: ${captureResult.status}`,
        },
      });

      res.status(422).json({
        success: false,
        error: 'CAPTURE_NOT_COMPLETED',
        message: `PayPal order capture did not complete successfully. Status: ${captureResult.status}`,
      });
      return;
    }

    // Verify captured currency matches the authoritative purchase currency
    const capturedCurrency = captureResult.currency;
    const authoritativeCurrency = (purchase.currency || 'USD').toUpperCase();
    if (!capturedCurrency || capturedCurrency.toUpperCase() !== authoritativeCurrency) {
      updatePurchaseRequestStatus(purchase.id, purchase.status, {
        paymentDetails: {
          paypalOrderId: orderId,
          status: 'FAILED',
          amount: captureResult.capturedAmount ?? 0,
          currency: capturedCurrency || 'UNKNOWN',
          isSandbox: true,
          notes: `Currency mismatch. Captured: ${capturedCurrency ?? 'none'}, Authoritative: ${authoritativeCurrency}.`,
        },
      });

      res.status(422).json({
        success: false,
        error: 'CURRENCY_MISMATCH',
        message:
          `Captured currency ("${capturedCurrency ?? 'none'}") does not match the authoritative ` +
          `purchase currency ("${authoritativeCurrency}"). Payment rejected to prevent cross-currency accounting errors.`,
      });
      return;
    }

    // Verify captured amount matches authoritative total
    const capturedAmount = captureResult.capturedAmount;
    if (capturedAmount === undefined || Math.abs(capturedAmount - purchase.authoritativeTotal) > 0.01) {
      updatePurchaseRequestStatus(purchase.id, purchase.status, {
        paymentDetails: {
          paypalOrderId: orderId,
          status: 'FAILED',
          amount: capturedAmount ?? 0,
          currency: authoritativeCurrency,
          isSandbox: true,
          notes: `Amount mismatch. Captured: $${capturedAmount}, Authoritative Total: $${purchase.authoritativeTotal}`,
        },
      });

      res.status(422).json({
        success: false,
        error: 'AMOUNT_MISMATCH',
        message: `Captured amount ($${capturedAmount}) does not match authoritative purchase total ($${purchase.authoritativeTotal}). Payment flagged.`,
      });
      return;
    }

    // MARK PURCHASE AS PAID ONLY AFTER VERIFIED CAPTURE CONFIRMATION
    const capturedAt = new Date().toISOString();
    const updated = updatePurchaseRequestStatus(purchase.id, 'paid', {
      complianceNotes: `${purchase.complianceNotes || ''} [PayPal Sandbox Settlement: Verified captured order ${orderId}, capture ID ${captureResult.captureId || 'N/A'}, total $${purchase.authoritativeTotal.toFixed(2)} USD on ${capturedAt}].`.trim(),
      paymentDetails: {
        paypalOrderId: orderId,
        captureId: captureResult.captureId,
        status: 'COMPLETED',
        amount: purchase.authoritativeTotal,
        currency: purchase.currency,
        capturedAt,
        isSandbox: true,
      },
    });

    res.status(200).json({
      success: true,
      purchaseRequestId: purchase.id,
      orderId,
      captureId: captureResult.captureId || 'N/A',
      status: 'COMPLETED',
      amount: {
        currency: purchase.currency,
        total: purchase.authoritativeTotal,
      },
      capturedAt,
      isSandbox: true,
      message: 'PayPal Sandbox order captured and verified successfully.',
      purchase: updated,
    });
  } catch (err: unknown) {
    if (err instanceof PayPalError) {
      console.error(`[Checkout Route] PayPal capture failed: ${err.message}`);
      res.status(err.statusCode).json({
        success: false,
        error: 'PAYPAL_API_ERROR',
        message: err.message,
      });
      return;
    }
    next(err);
  } finally {
    if (lockKey) {
      inFlightCaptures.delete(lockKey);
    }
  }
});

/**
 * GET /api/checkout/status/:orderId
 * Fetches order and payment status from the backend.
 */
checkoutRouter.get('/status/:orderId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      res.status(400).json({ success: false, message: 'orderId parameter is required' });
      return;
    }

    // Check if any purchase in memory matches this orderId
    const allRequests = (await import('../data/purchaseRequests.js')).getAllPurchaseRequests();
    const purchase = allRequests.find(
      (r) => r.paypalOrderId === orderId || r.paymentDetails?.paypalOrderId === orderId
    );

    if (purchase && purchase.paymentDetails) {
      res.status(200).json({
        success: true,
        purchaseRequestId: purchase.id,
        orderId,
        status: purchase.paymentDetails.status,
        purchaseStatus: purchase.status,
        amount: purchase.paymentDetails.amount,
        currency: purchase.paymentDetails.currency,
        isSandbox: purchase.paymentDetails.isSandbox,
        captureId: purchase.paymentDetails.captureId,
        capturedAt: purchase.paymentDetails.capturedAt,
        notes: purchase.paymentDetails.notes,
      });
      return;
    }

    // If not in local cache or credentials exist, query PayPal directly
    const config = getPayPalConfig();
    if (config.checkoutEnabled) {
      const details = await getPayPalOrderDetails(orderId);
      res.status(200).json({
        success: true,
        purchaseRequestId: details.referenceId || 'UNKNOWN',
        orderId,
        status: details.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        purchaseStatus: purchase ? purchase.status : 'approved',
        amount: details.capturedAmount ?? 0,
        currency: details.currency || 'USD',
        isSandbox: true,
        captureId: details.captureId,
      });
      return;
    }

    res.status(404).json({
      success: false,
      message: `No payment record found for order ${orderId}.`,
    });
  } catch (err: unknown) {
    if (err instanceof PayPalError) {
      res.status(err.statusCode).json({
        success: false,
        error: 'PAYPAL_API_ERROR',
        message: err.message,
      });
      return;
    }
    next(err);
  }
});

/**
 * POST /api/checkout/cancel-order
 * Handles user cancellation in the PayPal approval window safely.
 */
checkoutRouter.post('/cancel-order', (req: Request, res: Response) => {
  const parseResult = cancelOrderRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid cancellation payload',
    });
    return;
  }

  const { purchaseRequestId, orderId, reason } = parseResult.data;
  const purchase = getPurchaseRequestById(purchaseRequestId);
  if (!purchase) {
    res.status(404).json({
      success: false,
      message: `Purchase request "${purchaseRequestId}" was not found.`,
    });
    return;
  }

  // Record cancellation in payment details, keep purchase in approved state
  updatePurchaseRequestStatus(purchase.id, purchase.status, {
    paymentDetails: {
      paypalOrderId: orderId || purchase.paypalOrderId || 'CANCELLED',
      status: 'CANCELLED',
      amount: purchase.authoritativeTotal,
      currency: purchase.currency,
      isSandbox: true,
      notes: reason || 'User cancelled checkout in PayPal approval window.',
    },
  });

  res.status(200).json({
    success: true,
    message: 'PayPal checkout cancelled safely. Purchase remains in approved status.',
    purchaseRequestId,
  });
});
