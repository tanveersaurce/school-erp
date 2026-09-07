import { ErrorDetail } from '../errors/application-error.js';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  pagination?: PaginationMeta;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta: ResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
    requestId: string;
    timestamp: string;
  };
}

export function createSuccessResponse<T>(
  data: T,
  message = 'Operation completed successfully',
  meta: Partial<ResponseMeta> & { requestId: string }
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  requestId: string,
  details?: ErrorDetail[]
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}
