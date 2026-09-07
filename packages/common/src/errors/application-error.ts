export interface ErrorDetail {
  field?: string;
  issue: string;
  received?: unknown;
}

export abstract class ApplicationError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  readonly details?: ErrorDetail[];

  constructor(message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApplicationError {
  readonly statusCode = 422;
  readonly errorCode = 'VALIDATION_FAILED';

  constructor(message = 'Validation failed for request parameters', details?: ErrorDetail[]) {
    super(message, details);
  }
}

export class AuthenticationError extends ApplicationError {
  readonly statusCode = 401;
  readonly errorCode = 'AUTHENTICATION_REQUIRED';

  constructor(message = 'Authentication credentials missing or invalid') {
    super(message);
  }
}

export class TokenExpiredError extends ApplicationError {
  readonly statusCode = 401;
  readonly errorCode = 'TOKEN_EXPIRED';

  constructor(message = 'Authentication token has expired') {
    super(message);
  }
}

export class AuthorizationError extends ApplicationError {
  readonly statusCode = 403;
  readonly errorCode = 'FORBIDDEN_ACCESS';

  constructor(message = 'Insufficient permissions to perform this action') {
    super(message);
  }
}

export class TenantMismatchError extends ApplicationError {
  readonly statusCode = 403;
  readonly errorCode = 'CROSS_TENANT_ACCESS_DENIED';

  constructor(message = 'Access to this tenant resource is denied') {
    super(message);
  }
}

export class NotFoundError extends ApplicationError {
  readonly statusCode = 404;
  readonly errorCode = 'RESOURCE_NOT_FOUND';

  constructor(message = 'Requested resource was not found') {
    super(message);
  }
}

export class ConflictError extends ApplicationError {
  readonly statusCode = 409;
  readonly errorCode = 'RESOURCE_CONFLICT';

  constructor(message = 'Resource already exists or violates uniqueness constraints') {
    super(message);
  }
}

export class RateLimitError extends ApplicationError {
  readonly statusCode = 429;
  readonly errorCode = 'RATE_LIMIT_EXCEEDED';

  constructor(message = 'Too many requests. Please try again later') {
    super(message);
  }
}

export class BadRequestError extends ApplicationError {
  readonly statusCode = 400;
  readonly errorCode = 'BAD_REQUEST';

  constructor(message = 'Malformed request syntax or parameters') {
    super(message);
  }
}

export class InternalServerError extends ApplicationError {
  readonly statusCode = 500;
  readonly errorCode = 'INTERNAL_SERVER_ERROR';

  constructor(message = 'An unexpected internal server error occurred') {
    super(message);
  }
}
