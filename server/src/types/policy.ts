import { z } from 'zod';

export type PolicyDecision = 'ALLOWED' | 'NEEDS_APPROVAL' | 'BLOCKED';

export type RuleStatus = 'PASSED' | 'FAILED' | 'FLAGGED';

export type RuleSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  status: RuleStatus;
  severity: RuleSeverity;
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

export interface PolicyEvaluationContext {
  currentCommittedSpend?: number;
  excludeRequestId?: string;
  checkCumulativeSpend?: boolean;
}

/**
 * Zod schema for validating policy evaluation requests.
 * Notice: We deliberately do NOT accept client-supplied unitPrice, supplier, or total.
 * These are strictly derived from the authoritative server catalog.
 */
export const policyEvaluationRequestSchema = z.object({
  catalogItemId: z
    .string({ required_error: 'catalogItemId is required' })
    .min(1, 'catalogItemId must not be empty')
    .max(50, 'catalogItemId is too long'),
  quantity: z
    .number({ required_error: 'quantity is required' })
    .int('Quantity must be an integer')
    .positive('Quantity must be greater than zero')
    .max(5000, 'Quantity cannot exceed 5000 units'),
  userSpecifiedBudget: z
    .number()
    .positive('userSpecifiedBudget must be greater than zero')
    .optional(),
  department: z.string().max(100).optional(),
  urgency: z.enum(['standard', 'expedited', 'flexible']).optional(),
  notes: z.string().max(1000).optional(),
  checkCumulativeSpend: z.boolean().optional(),
  excludeRequestId: z.string().optional(),
});

export type PolicyEvaluationRequest = z.infer<typeof policyEvaluationRequestSchema>;

