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

export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 1000 : 60, // 60 searches per minute in production
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const requestId = req.id || 'req_unknown';
    res
      .status(429)
      .json(
        createErrorResponse(
          'RATE_LIMIT_EXCEEDED',
          'Search rate limit exceeded. Please wait a moment before searching again.',
          requestId
        )
      );
  },
});

export const exportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 10, // 10 export operations per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const requestId = req.id || 'req_unknown';
    res
      .status(429)
      .json(
        createErrorResponse(
          'RATE_LIMIT_EXCEEDED',
          'Report export rate limit exceeded. Please wait before generating additional exports.',
          requestId
        )
      );
  },
});
