import { Router, Request, Response } from 'express';
import { env, getPayPalConfig } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const memory = process.memoryUsage();
  const paypal = getPayPalConfig();
  
  res.status(200).json({
    status: 'healthy',
    service: 'procura-ai-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    paypal: {
      configured: paypal.isConfigured,
      checkoutEnabled: paypal.checkoutEnabled,
      baseUrl: paypal.baseUrl,
      statusMessage: paypal.message,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryMb: {
        rss: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        heapUsed: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotal: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
      },
    },
  });
});
