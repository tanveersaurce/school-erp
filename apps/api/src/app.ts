import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import { requestIdMiddleware } from './middlewares/requestId.js';
import { securityHeadersMiddleware } from './middlewares/securityHeaders.js';
import { corsMiddleware } from './middlewares/cors.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { healthRouter } from './routes/health.routes.js';
import { env } from './config/env.js';

export function createApp(): Application {
  const app = express();

  // Basic Middlewares
  app.use(requestIdMiddleware);
  app.use(securityHeadersMiddleware);
  app.use(corsMiddleware);
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Routes
  app.use(`${env.API_PREFIX}/health`, healthRouter);

  // Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
