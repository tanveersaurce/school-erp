import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { createErrorResponse } from '@edusphere/common';
import { env } from '../config/env.js';

const isTest = env.NODE_ENV === 'test';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 10, // 10 attempts per 15 min per IP in production
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const requestId = req.id || 'req_unknown';
    res
      .status(429)
      .json(
        createErrorResponse(
          'RATE_LIMIT_EXCEEDED',
          'Too many login attempts. Please try again after 15 minutes.',
          requestId
        )
      );
  },
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 5, // 5 requests per 15 min per IP in production
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const requestId = req.id || 'req_unknown';
    res
      .status(429)
      .json(
        createErrorResponse(
          'RATE_LIMIT_EXCEEDED',
          'Too many password reset requests. Please try again after 15 minutes.',
          requestId
        )
      );
  },
});

export const resendVerificationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 3, // 3 requests per 15 min per IP in production
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const requestId = req.id || 'req_unknown';
    res
      .status(429)
      .json(
        createErrorResponse(
          'RATE_LIMIT_EXCEEDED',
          'Too many verification requests. Please try again after 15 minutes.',
          requestId
        )
      );
  },
});
