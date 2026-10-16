import { Router } from 'express';
import { healthRouter } from './health.js';
import { aiRouter } from './ai.js';
import { policiesRouter } from './policies.js';
import { checkoutRouter } from './checkout.js';
import { requestsRouter } from './requests.js';
import { spendGuardRouter } from './spendGuard.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/policies', policiesRouter);
apiRouter.use('/checkout', checkoutRouter);
apiRouter.use('/requests', requestsRouter);
apiRouter.use('/spendguard', spendGuardRouter);


