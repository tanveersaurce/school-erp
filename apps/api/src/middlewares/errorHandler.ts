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

  // Handle Mongoose CastError (invalid ObjectId format)
  if (err.name === 'CastError') {
    logger.warn(
      {
        requestId,
        path: req.originalUrl,
        method: req.method,
      },
      'Mongoose CastError: invalid identifier format'
    );
    res
      .status(422)
      .json(
        createErrorResponse(
          'VALIDATION_FAILED',
          'Invalid identifier format provided in request.',
          requestId
        )
      );
    return;
  }

  // Handle MongoDB duplicate key collision (E11000)
  if ((err as any).code === 11000 || (err as any).name === 'MongoServerError' && (err as any).code === 11000) {
    logger.warn(
      {
        requestId,
        path: req.originalUrl,
        method: req.method,
      },
      'MongoDB duplicate key collision'
    );
    res
      .status(409)
      .json(
        createErrorResponse(
          'RESOURCE_ALREADY_EXISTS',
          'A record with conflicting unique attributes already exists.',
          requestId
        )
      );
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

  const isSafeEnv = env.NODE_ENV === 'development';
  res
    .status(500)
    .json(
      createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        isSafeEnv ? err.message : 'An unexpected error occurred. Please contact system support.',
        requestId
      )
    );
}
