import { Request, Response, NextFunction } from 'express';
import { createSuccessResponse, AuthenticationError } from '@edusphere/common';
import { env } from '../../config/env.js';
import { authService } from './auth.service.js';
import { sessionService } from './session.service.js';

function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'strict',
    path: '/api/v1/auth',
    domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
  });
}

function extractMetadata(req: Request) {
  const userAgent = (req.headers['user-agent'] as string) || undefined;
  const ipAddress = (req.ip || req.socket.remoteAddress || '127.0.0.1') as string;
  const deviceHeader = req.headers['x-device-name'] as string | undefined;

  let deviceName = deviceHeader;
  if (!deviceName && userAgent) {
    if (userAgent.includes('Mobile')) deviceName = 'Mobile Browser';
    else if (userAgent.includes('Macintosh')) deviceName = 'macOS Browser';
    else if (userAgent.includes('Windows')) deviceName = 'Windows Browser';
    else if (userAgent.includes('Linux')) deviceName = 'Linux Browser';
    else deviceName = 'Web Browser';
  }

  return {
    deviceName: deviceName || 'Unknown Device',
    userAgent,
    ipAddress,
  };
}

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metadata = extractMetadata(req);
      const result = await authService.login(req.body, metadata);

      // Issue HttpOnly Refresh Token Cookie
      setRefreshTokenCookie(res, result.rawRefreshToken);

      const { rawRefreshToken, ...responsePayload } = result;

      res.status(200).json(
        createSuccessResponse(responsePayload, 'Authentication successful.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!rawRefreshToken) {
        throw new AuthenticationError('Refresh token required. None provided in cookie or body.');
      }

      const metadata = extractMetadata(req);
      const result = await authService.refreshTokens(rawRefreshToken, metadata);

      setRefreshTokenCookie(res, result.rawRefreshToken);

      const { rawRefreshToken: _, ...responsePayload } = result;

      res.status(200).json(
        createSuccessResponse(responsePayload, 'Token refreshed successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.auth) {
        await authService.logout(req.auth.sessionId, req.auth.userId);
      }
      clearRefreshTokenCookie(res);

      res.status(200).json(
        createSuccessResponse(null, 'Signed out successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.auth) {
        await authService.logoutAll(req.auth.userId);
      }
      clearRefreshTokenCookie(res);

      res.status(200).json(
        createSuccessResponse(null, 'All active sessions revoked successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.getCurrentUser(req.auth!.userId, req.auth!.sessionId);

      res.status(200).json(
        createSuccessResponse(result, 'User profile retrieved.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await sessionService.getUserSessions(req.auth!.userId, req.auth!.sessionId);

      res.status(200).json(
        createSuccessResponse(sessions, 'Active sessions retrieved.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      await sessionService.revokeSession(sessionId, req.auth!.userId, 'REMOTE_USER_REVOCATION');

      if (sessionId === req.auth!.sessionId) {
        clearRefreshTokenCookie(res);
      }

      res.status(200).json(
        createSuccessResponse(null, 'Session terminated successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.changePassword(
        req.auth!.userId,
        req.body.currentPassword,
        req.body.newPassword,
        req.auth!.sessionId
      );

      res
        .status(200)
        .json(
          createSuccessResponse(
            null,
            'Password changed successfully. Other active sessions have been terminated.',
            { requestId: req.id }
          )
        );
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.requestPasswordReset(req.body.email);

      res
        .status(200)
        .json(
          createSuccessResponse(
            null,
            'If an account with that email exists, password reset instructions have been sent.',
            { requestId: req.id }
          )
        );
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.resetPassword(req.body.token, req.body.newPassword);
      clearRefreshTokenCookie(res);

      res
        .status(200)
        .json(
          createSuccessResponse(
            null,
            'Password reset successfully. Please sign in with your new credentials.',
            { requestId: req.id }
          )
        );
    } catch (err) {
      next(err);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.verifyEmail(req.body.token);

      res.status(200).json(
        createSuccessResponse(null, 'Email verification confirmed successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.resendVerification(req.body.email);

      res
        .status(200)
        .json(
          createSuccessResponse(
            null,
            'If your account is pending verification, a new confirmation link has been sent.',
            { requestId: req.id }
          )
        );
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
