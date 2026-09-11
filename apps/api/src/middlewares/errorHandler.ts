import { Request, Response, NextFunction } from 'express';
import { ApplicationError, ValidationError, createErrorResponse } from '@edusphere/common';
import { ZodError } from 'zod';
import { logger } from '../core/logger/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.id || 'req_unknown';

  if (err instanceof ZodError || err.name === 'ZodError') {
    const zodErr = err as ZodError;
    const details = zodErr.issues?.map((issue) => ({
      field: issue.path.join('.'),
      issue: issue.message,
    }));
    const validationError = new ValidationError('Request validation failed', details);
    logger.warn(
      {
        requestId,
        errorCode: validationError.errorCode,
        statusCode: 422,
        message: validationError.message,
        details,
        path: req.originalUrl,
        method: req.method,
      },
      'Zod validation failed'
    );
    res
      .status(422)
      .json(
        createErrorResponse(validationError.errorCode, validationError.message, requestId, details)
      );
    return;
  }

  if (err instanceof ApplicationError) {
    logger.warn(
      {
        requestId,
        errorCode: err.errorCode,
        statusCode: err.statusCode,
        message: err.message,
        details: err.details,
        path: req.originalUrl,
        method: req.method,
      },
      'Application expected domain error'
    );

    res
      .status(err.statusCode)
      .json(createErrorResponse(err.errorCode, err.message, requestId, err.details));
    return;
  }

  // Unhandled internal exception
  logger.error(
    {
      requestId,
      err: {
        name: err.name,
        message: err.message,
        stack: env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      path: req.originalUrl,
      method: req.method,
    },
    'Unhandled internal server error'
  );

  res
    .status(500)
    .json(
      createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please contact system support.'
          : err.message,
        requestId
      )
    );
}
