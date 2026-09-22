import { Router } from 'express';
import { authController } from './auth.controller.js';
import {
  validateBody,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from './auth.validator.js';
import { authenticate } from '../../middlewares/authenticate.js';
import {
  loginRateLimiter,
  forgotPasswordRateLimiter,
  resendVerificationRateLimiter,
  refreshRateLimiter,
  resetPasswordRateLimiter,
  verifyEmailRateLimiter,
} from '../../middlewares/authRateLimiter.js';

export const authRouter = Router();

// Public Authentication Endpoints
authRouter.post('/login', loginRateLimiter, validateBody(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

authRouter.post('/refresh', refreshRateLimiter, validateBody(refreshTokenSchema), (req, res, next) =>
  authController.refresh(req, res, next)
);

authRouter.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validateBody(forgotPasswordSchema),
  (req, res, next) => authController.forgotPassword(req, res, next)
);

authRouter.post('/reset-password', resetPasswordRateLimiter, validateBody(resetPasswordSchema), (req, res, next) =>
  authController.resetPassword(req, res, next)
);

authRouter.post('/verify-email', verifyEmailRateLimiter, validateBody(verifyEmailSchema), (req, res, next) =>
  authController.verifyEmail(req, res, next)
);

authRouter.post(
  '/resend-verification',
  resendVerificationRateLimiter,
  validateBody(resendVerificationSchema),
  (req, res, next) => authController.resendVerification(req, res, next)
);

// Authenticated Session & Profile Endpoints
authRouter.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));

authRouter.post('/logout-all', authenticate, (req, res, next) =>
  authController.logoutAll(req, res, next)
);

authRouter.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

authRouter.get('/sessions', authenticate, (req, res, next) =>
  authController.getSessions(req, res, next)
);

authRouter.delete('/sessions/:sessionId', authenticate, (req, res, next) =>
  authController.revokeSession(req, res, next)
);

authRouter.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  (req, res, next) => authController.changePassword(req, res, next)
);
