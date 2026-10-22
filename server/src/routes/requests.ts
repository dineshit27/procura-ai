import { Router, Response } from 'express';
import {
  getAllPurchaseRequests,
  getPurchaseRequestById,
  setPurchaseRequest,
  updatePurchaseRequestStatus,
} from '../data/purchaseRequests.js';
import { syncPurchaseRequestSchema } from '../types/checkout.js';
import { CATALOG_ITEMS } from '../data/catalog.js';
import { evaluatePurchasingPolicy } from '../services/policyEngine.js';
import { atomicApproveRequest, canCommitSpend, withStoreLock } from '../services/spendGuardService.js';
import { AuthedRequest, canAccessRequest, requireAuth, requirePermission } from '../middleware/auth.js';
import { emitZapierWebhook } from '../services/zapierWebhookService.js';

export const requestsRouter = Router();

/**
 * GET /api/requests
 * Returns all purchase requests in server memory.
 */
requestsRouter.get('/', requireAuth, requirePermission('read_requests'), (req: AuthedRequest, res: Response) => {
  const requests = getAllPurchaseRequests().filter((request) => canAccessRequest(req, request.ownerId));
  res.status(200).json({
    success: true,
    data: requests,
  });
});

/**
 * GET /api/requests/:id
 * Returns a specific purchase request by ID.
 */
requestsRouter.get('/:id', requireAuth, requirePermission('read_requests'), (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ success: false, message: 'ID parameter required.' });
    return;
  }
  const purchase = getPurchaseRequestById(id);
  if (!purchase) {
    res.status(404).json({
      success: false,
      message: `Purchase request "${id}" not found.`,
    });
    return;
  }
  if (!canAccessRequest(req, purchase.ownerId)) {
    res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'You cannot access this purchase request.' });
    return;
  }
  res.status(200).json({
    success: true,
    data: purchase,
  });
});

/**
 * POST /api/requests
 * Adds or synchronizes a purchase request with the authoritative server store.
 * Authoritatively computes prices and evaluates spend compliance before persisting.
 *
 * Wrapped in withStoreLock to prevent a race condition where two concurrent
 * requests both pass the cumulative spend check before either is written.
 */
requestsRouter.post('/', requireAuth, requirePermission('create_requests'), async (req: AuthedRequest, res: Response) => {
  const parseResult = syncPurchaseRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid purchase request payload',
      details: parseResult.error.format(),
    });
    return;
  }

  const data = parseResult.data;

  let newRecord;
  try {
    newRecord = await withStoreLock(() => {
      const catalogItem = CATALOG_ITEMS.find((c) => c.id === data.catalogItemId);

      const authoritativeUnitPrice = catalogItem ? catalogItem.price : 0;
      const authoritativeTotal = Number((authoritativeUnitPrice * data.quantity).toFixed(2));
      const currency = catalogItem?.currency || 'USD';
      const supplier = catalogItem?.supplier || data.preferredSupplier || 'Unknown Supplier';
      const itemName = catalogItem?.name || data.title;

      // Authoritatively evaluate policy including cumulative spending checks
      const policyResult = evaluatePurchasingPolicy(
        {
          catalogItemId: data.catalogItemId,
          quantity: data.quantity,
          userSpecifiedBudget: data.budgetLimit,
          checkCumulativeSpend: true,
          excludeRequestId: data.id,
        },
        undefined,
        { checkCumulativeSpend: true, excludeRequestId: data.id }
      );

      // Authoritative status determination (never trust client-supplied approval)
      let authoritativeStatus = data.status;

      if (policyResult.decision === 'BLOCKED') {
        authoritativeStatus = 'draft';
      } else if (policyResult.decision === 'NEEDS_APPROVAL') {
        if (authoritativeStatus === 'approved') {
          authoritativeStatus = 'pending_approval';
        }
      } else if (authoritativeStatus === 'approved') {
        // If client requested auto-approved status for an ALLOWED request, check cumulative reservation
        const spendCheck = canCommitSpend(authoritativeTotal, data.id);
        if (!spendCheck.allowed) {
          authoritativeStatus = 'pending_approval';
        }
      }

      return setPurchaseRequest({
        ...data,
        status: authoritativeStatus,
        createdAt: new Date().toISOString(),
        authoritativeUnitPrice,
        authoritativeTotal,
        currency,
        selectedSupplier: supplier,
        selectedItemName: itemName,
        policyDecision: policyResult.decision,
        policyResult,
        ownerId: req.auth!.userId,
      });
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase request.',
      details: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  res.status(201).json({
    success: true,
    data: newRecord,
  });

  if (newRecord.policyDecision === 'BLOCKED' || newRecord.policyDecision === 'NEEDS_APPROVAL') {
    void emitZapierWebhook('spendguard.policy_alert', newRecord, `policy:${newRecord.id}:${newRecord.policyDecision}`);
  }
});

/**
 * PATCH /api/requests/:id/status
 * Updates status of a purchase request (e.g. approve or cancel).
 * Strictly forbids setting 'paid' without verified PayPal capture.
 * Atomically verifies cumulative budget availability on approval.
 */
requestsRouter.patch('/:id/status', requireAuth, async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  const { status, notes } = req.body;

  if (!id) {
    res.status(400).json({ success: false, message: 'ID parameter required.' });
    return;
  }

  // Security check: NEVER allow setting 'paid' status directly via client callback/patch
  if (status === 'paid') {
    res.status(403).json({
      success: false,
      error: 'PAYMENT_VERIFICATION_REQUIRED',
      message: 'Cannot manually mark purchase as paid. Paid status requires authoritative PayPal capture verification at /api/checkout/capture-order.',
    });
    return;
  }

  if (!['draft', 'pending_approval', 'approved', 'cancelled'].includes(status)) {
    res.status(400).json({
      success: false,
      message: `Invalid status "${status}". Allowed values: draft, pending_approval, approved, cancelled.`,
    });
    return;
  }

  const existingForAccess = getPurchaseRequestById(id);
  if (!existingForAccess) {
    res.status(404).json({ success: false, message: `Purchase request "${id}" not found.` });
    return;
  }
  if (!canAccessRequest(req, existingForAccess.ownerId)) {
    res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'You cannot modify this purchase request.' });
    return;
  }
  if (status === 'approved' && !['admin', 'procurement_manager', 'finance_manager'].includes(req.auth!.role)) {
    res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Only authorized approvers can approve requests.' });
    return;
  }
  if (status !== 'cancelled' && req.auth!.role === 'requester') {
    res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Requesters may only cancel their own requests.' });
    return;
  }

  // Atomic approval with cumulative budget reservation check
  if (status === 'approved') {
    const result = await atomicApproveRequest(id, notes);
    if (!result.success) {
      const isNotFound = result.error?.includes('not found');
      res.status(isNotFound ? 404 : 422).json({
        success: false,
        error: isNotFound ? 'NOT_FOUND' : 'APPROVAL_REJECTED',
        message: result.error || 'Approval rejected by SpendGuard policy engine.',
      });
      return;
    }

    if (result.request && existingForAccess.status !== result.request.status) {
      void emitZapierWebhook('purchase_request.updated', result.request);
    }

    res.status(200).json({
      success: true,
      data: result.request,
      message: 'Purchase request approved and budget reserved successfully.',
    });
    return;
  }

  // For other transitions (e.g. cancelled, pending_approval, draft)
  const existing = getPurchaseRequestById(id);
  if (!existing) {
    res.status(404).json({
      success: false,
      message: `Purchase request "${id}" not found.`,
    });
    return;
  }

  const updated = updatePurchaseRequestStatus(id, status, {
    complianceNotes: notes ? `${existing.complianceNotes || ''} [Status: ${status} - ${notes}]`.trim() : existing.complianceNotes,
  });

  res.status(200).json({
    success: true,
    data: updated,
  });
  if (updated && existing.status !== updated.status) {
    void emitZapierWebhook('purchase_request.updated', updated);
  }
});

