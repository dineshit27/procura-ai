import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { analyzePurchasingRequest } from '../services/geminiService.js';

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

/**
 * POST /api/ai/analyze-purchase
 * Evaluates a purchasing requirement against approved catalog items using Gemini AI
 * with an automatic deterministic fallback.
 */
aiRouter.post(
  '/analyze-purchase',
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
