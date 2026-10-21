import { Router, Request, Response, NextFunction } from 'express';
import { policyEvaluationRequestSchema } from '../types/policy.js';
import { evaluatePurchasingPolicy } from '../services/policyEngine.js';
import {
  getActivePolicy,
  updateActivePolicy,
  resetPolicyToDefault,
  procurementPolicySchema,
} from '../config/policySettings.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

export const policiesRouter = Router();

/**
 * POST /api/policies/evaluate
 * Deterministically evaluates a purchase against server-side procurement spending rules.
 */
policiesRouter.post(
  '/evaluate',
  requireAuth,
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parseResult = policyEvaluationRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid policy evaluation request payload',
          details: parseResult.error.flatten().fieldErrors,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const evaluation = evaluatePurchasingPolicy(
        parseResult.data,
        undefined,
        {
          checkCumulativeSpend: parseResult.data.checkCumulativeSpend ?? true,
          excludeRequestId: parseResult.data.excludeRequestId,
        }
      );

      res.status(200).json({
        status: 'success',
        data: evaluation,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/policies/current
 * Returns the active server-side policy settings (readable by any role).
 */
policiesRouter.get('/current', requireAuth, (_req: Request, res: Response): void => {
  const policy = getActivePolicy();
  res.status(200).json({
    status: 'success',
    data: policy,
    meta: {
      storage: 'development-in-memory',
      persistence: 'server/data/policySettings.json',
      note: 'In production, policies are retrieved from an encrypted persistent database.',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * PUT /api/policies/current
 * Updates the active procurement spending policies.
 *
 * Access control is enforced from the verified server-side profile role.
 */
policiesRouter.put(
  '/current',
  requireAuth,
  requirePermission('manage_policies'),
  (req: Request, res: Response): void => {
    const updateSchema = procurementPolicySchema.partial();
    const parseResult = updateSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        status: 'error',
        error: 'INVALID_POLICY_PAYLOAD',
        message: 'Invalid policy configuration options',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const updated = updateActivePolicy(parseResult.data);
      res.status(200).json({
        status: 'success',
        data: updated,
        message: 'Procurement spending policy updated and saved to authoritative server store.',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(400).json({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to update policy',
      });
    }
  }
);

/**
 * POST /api/policies/reset
 * Resets procurement policies back to default settings.
 *
 * Access control is enforced from the verified server-side profile role.
 */
policiesRouter.post(
  '/reset',
  requireAuth,
  requirePermission('manage_policies'),
  (_req: Request, res: Response): void => {
    resetPolicyToDefault();
    res.status(200).json({
      status: 'success',
      data: getActivePolicy(),
      message: 'Policy settings successfully reset to factory defaults.',
    });
  }
);
