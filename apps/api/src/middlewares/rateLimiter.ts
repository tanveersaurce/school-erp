import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { appConfig } from '../config/app.js';
import { createErrorResponse } from '@edusphere/common';

export const globalRateLimiter = rateLimit({
  windowMs: appConfig.rateLimit.windowMs,
  max: appConfig.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const requestId = req.id || 'req_unknown';
    res
      .status(429)
      .json(
        createErrorResponse(
          'RATE_LIMIT_EXCEEDED',
          'Too many requests from this IP. Please try again after 15 minutes.',
          requestId
        )
      );
  },
  skip: (req: Request) => {
    // Skip rate limiting for health check probes to prevent monitoring flapping
    return req.path === '/health' || req.path === '/ready' || req.path.startsWith('/api/v1/health');
  },
});
