import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const isProduction = env.NODE_ENV === 'production';

  console.error(`[Error] ${err.name || 'Error'}: ${err.message}`);
  if (err.stack && !isProduction) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 && isProduction ? 'Internal Server Error' : err.message,
    ...(err.details ? { details: err.details } : {}),
    ...(!isProduction && err.stack ? { stack: err.stack } : {}),
    timestamp: new Date().toISOString(),
  });
}
