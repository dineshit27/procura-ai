import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getSpendGuardSummary,
  canCommitSpend,
} from '../services/spendGuardService.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

export const spendGuardRouter = Router();

/**
 * GET /api/spendguard/summary
 * Authoritative SpendGuard overview:
 * - configured spending limit
 * - successfully paid spending during current period
 * - reserved amount for active requests
 * - remaining available budget
 * - budget utilization percentage
 * - requests awaiting approval
 * - blocked requests and specific reasons
 * - recent spending activity
 * - live deterministic financial alerts
 */
spendGuardRouter.get('/summary', requireAuth, requirePermission('read_financials'), (_req: Request, res: Response) => {
  const summary = getSpendGuardSummary();
  res.status(200).json({
    success: true,
    data: summary,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/spendguard/alerts
 * Active financial alerts derived deterministically from authoritative records.
 */
spendGuardRouter.get('/alerts', requireAuth, requirePermission('read_financials'), (_req: Request, res: Response) => {
  const summary = getSpendGuardSummary();
  res.status(200).json({
    success: true,
    data: summary.alerts,
    timestamp: new Date().toISOString(),
  });
});

const checkBudgetSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  excludeRequestId: z.string().optional(),
});

/**
 * POST /api/spendguard/check-budget
 * Dry-run evaluation of whether a proposed spending amount fits within remaining budget.
 */
spendGuardRouter.post('/check-budget', requireAuth, requirePermission('create_requests'), (req: Request, res: Response) => {
  const parseResult = checkBudgetSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid budget check payload',
      details: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  const { amount, excludeRequestId } = parseResult.data;
  const result = canCommitSpend(amount, excludeRequestId);

  res.status(200).json({
    success: true,
    data: result,
  });
});
