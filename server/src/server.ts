import express, { Application } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { requestLogger } from './middleware/logger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/api.js';

export function createServer(): Application {
  const app: Application = express();

  // Middleware
  const allowedOrigins = [
    'https://procura-io.onrender.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    env.CLIENT_URL.replace(/\/+$/, ''),
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, server-to-server, curl)
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/+$/, '');
        if (
          allowedOrigins.includes(normalized) ||
          normalized.endsWith('.onrender.com')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-user-role'],
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Mount API routes
  app.use('/api', apiRouter);

  // Fallback 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
