import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { analyzePurchasingRequest, chatWithAssistant } from '../services/geminiService.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

export const aiRouter = Router();

const analyzePurchaseSchema = z.object({
  prompt: z
    .string({ required_error: 'Prompt is required' })
    .min(5, 'Requirement description must be at least 5 characters')
    .max(2000, 'Prompt cannot exceed 2000 characters'),
  budget: z
    .number({ required_error: 'Budget is required' })
    .positive('Budget must be greater than zero')
    .max(1_000_000, 'Budget exceeds allowable threshold ($1,000,000)'),
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(5000, 'Quantity cannot exceed 5000 units'),
  category: z.string().optional(),
  preferredSupplier: z.string().optional(),
  urgency: z.enum(['standard', 'expedited', 'flexible']).optional(),
  constraints: z.string().max(1000).optional(),
});

const assistantChatSchema = z.object({
  message: z
    .string({ required_error: 'Message is required' })
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message cannot exceed 1000 characters'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      })
    )
    .max(10)
    .optional(),
});

/**
 * POST /api/ai/analyze-purchase
 * Evaluates a purchasing requirement against approved catalog items using Gemini AI
 * with an automatic deterministic fallback.
 */
aiRouter.post(
  '/analyze-purchase',
  requireAuth,
  requirePermission('create_requests'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = analyzePurchaseSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid purchase analysis request',
          details: parseResult.error.flatten().fieldErrors,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await analyzePurchasingRequest(parseResult.data);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/ai/chat
 * Answers visitor inquiries about Procura AI, SpendGuard, approvals, and PayPal Sandbox demo.
 */
aiRouter.post(
  '/chat',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = assistantChatSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid assistant chat payload',
          details: parseResult.error.flatten().fieldErrors,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await chatWithAssistant(parseResult.data);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

