import { Router, Request, Response, NextFunction } from 'express';
import { policyEvaluationRequestSchema } from '../types/policy.js';
import { evaluatePurchasingPolicy } from '../services/policyEngine.js';
import {
  getActivePolicy,
  updateActivePolicy,
  resetPolicyToDefault,
  procurementPolicySchema,
} from '../config/policySettings.js';

export const policiesRouter = Router();

/**
 * POST /api/policies/evaluate
 * Deterministically evaluates a purchase against server-side procurement spending rules.
 */
policiesRouter.post(
  '/evaluate',
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
 * Returns the active server-side policy settings.
 */
policiesRouter.get('/current', (_req: Request, res: Response): void => {
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
 * Strictly checks administrator authorization and validates schema.
 */
policiesRouter.put('/current', (req: Request, res: Response): void => {
  // Authorization check: ordinary users cannot change policy limits
  const userRole = (req.headers['x-user-role'] as string || '').toLowerCase();
  if (userRole === 'employee' || userRole === 'requester' || userRole === 'guest') {
    res.status(403).json({
      status: 'error',
      error: 'FORBIDDEN',
      message: 'Unauthorized: Only designated Procurement or Finance Administrators may update spending policies.',
    });
    return;
  }

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
});

/**
 * POST /api/policies/reset
 * Resets procurement policies back to default settings.
 */
policiesRouter.post('/reset', (req: Request, res: Response): void => {
  const userRole = (req.headers['x-user-role'] as string || '').toLowerCase();
  if (userRole === 'employee' || userRole === 'requester') {
    res.status(403).json({
      status: 'error',
      message: 'Unauthorized: Administrator privileges required to reset policies.',
    });
    return;
  }

  resetPolicyToDefault();
  res.status(200).json({
    status: 'success',
    data: getActivePolicy(),
    message: 'Policy settings successfully reset to factory defaults.',
  });
});

