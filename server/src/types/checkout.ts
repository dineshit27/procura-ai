import { z } from 'zod';
import { PolicyDecision, PolicyEvaluationResult } from './policy.js';

export type PurchaseRequestStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'paid'
  | 'failed'
  | 'cancelled';

export interface PaymentDetails {
  paypalOrderId: string;
  captureId?: string;
  status: 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'PENDING';
  amount: number;
  currency: string;
  capturedAt?: string;
  isSandbox: boolean;
  notes?: string;
}

export interface ServerPurchaseRequest {
  id: string;
  title: string;
  category: string;
  prompt: string;
  budgetLimit: number;
  quantity: number;
  catalogItemId: string;
  preferredSupplier?: string;
  constraints?: string;
  createdAt: string;
  status: PurchaseRequestStatus;
  authoritativeUnitPrice: number;
  authoritativeTotal: number;
  currency: string;
  selectedSupplier: string;
  selectedItemName: string;
  urgency: 'standard' | 'expedited' | 'flexible';
  complianceNotes?: string;
  policyDecision: PolicyDecision;
  policyResult?: PolicyEvaluationResult;
  paypalOrderId?: string;
  paymentDetails?: PaymentDetails;
  /** Supabase user id. Undefined legacy records are admin/manager-only. */
  ownerId?: string;
}

export const createOrderRequestSchema = z.object({
  purchaseRequestId: z
    .string({ required_error: 'purchaseRequestId is required' })
    .trim()
    .min(1, 'purchaseRequestId must not be empty')
    .max(100, 'purchaseRequestId is too long'),
});

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

export const captureOrderRequestSchema = z.object({
  purchaseRequestId: z
    .string({ required_error: 'purchaseRequestId is required' })
    .trim()
    .min(1, 'purchaseRequestId must not be empty'),
  orderId: z
    .string({ required_error: 'orderId is required' })
    .trim()
    .min(1, 'orderId must not be empty'),
});

export type CaptureOrderRequest = z.infer<typeof captureOrderRequestSchema>;

export const cancelOrderRequestSchema = z.object({
  purchaseRequestId: z
    .string({ required_error: 'purchaseRequestId is required' })
    .trim()
    .min(1, 'purchaseRequestId must not be empty'),
  orderId: z.string().trim().optional(),
  reason: z.string().trim().max(500).optional(),
});

export type CancelOrderRequest = z.infer<typeof cancelOrderRequestSchema>;

export const syncPurchaseRequestSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  prompt: z.string().min(1),
  budgetLimit: z.number().positive(),
  quantity: z.number().int().positive(),
  catalogItemId: z.string().min(1),
  preferredSupplier: z.string().optional(),
  constraints: z.string().optional(),
  urgency: z.enum(['standard', 'expedited', 'flexible']).default('standard'),
  status: z
    .enum(['draft', 'pending_approval', 'approved', 'paid', 'failed', 'cancelled'])
    .default('draft'),
});

export type SyncPurchaseRequest = z.infer<typeof syncPurchaseRequestSchema>;

export interface CreateOrderResponse {
  success: true;
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

export interface CaptureOrderResponse {
  success: true;
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
}

export interface PaymentStatusResponse {
  purchaseRequestId: string;
  orderId: string;
  status: 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'PENDING' | 'UNKNOWN';
  purchaseStatus: PurchaseRequestStatus;
  amount: number;
  currency: string;
  isSandbox: boolean;
  captureId?: string;
  capturedAt?: string;
  notes?: string;
}
