import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError, ErrorDetail } from '@edusphere/common';

export const loginSchema = z.object({
  email: z.string().trim().email('A valid email address is required.').toLowerCase(),
  password: z.string().min(1, 'Password is required.'),
  tenantId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid tenant ID format.')
    .optional(),
  rememberMe: z.boolean().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'Invalid refresh token format.').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long.')
    .max(128, 'New password cannot exceed 128 characters.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('A valid email address is required.').toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16, 'Password reset token is required and must be valid.'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long.')
    .max(128, 'New password cannot exceed 128 characters.'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(16, 'Email verification token is required.'),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email('A valid email address is required.').toLowerCase(),
});

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details: ErrorDetail[] = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        issue: err.message,
      }));
      throw new ValidationError('Validation failed for request parameters.', details);
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details: ErrorDetail[] = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        issue: err.message,
      }));
      throw new ValidationError('Validation failed for query parameters.', details);
    }
    req.query = result.data as any;
    next();
  };
}
