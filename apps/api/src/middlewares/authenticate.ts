import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, UserStatus } from '@edusphere/common';
import { Session, User } from '@edusphere/database';
import { tokenService } from '../modules/auth/token.service.js';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Authentication required. Missing Bearer token.');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new AuthenticationError('Authentication required. Empty Bearer token.');
    }

    // Verify JWT cryptographic signature and expiration
    const payload = tokenService.verifyAccessToken(token);

    // Verify session existence, revocation state, and TTL in database
    const session = await Session.findById(payload.sessionId);
    if (!session || session.isRevoked || session.expiresAt <= new Date()) {
      throw new AuthenticationError('Session has expired or been revoked. Please sign in again.');
    }

    // Verify user existence and active account status
    const user = await User.findById(payload.userId);
    if (!user || user.isDeleted) {
      throw new AuthenticationError('User account not found or deactivated.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AuthenticationError(`Account status is ${user.status}. Access denied.`);
    }

    // Populate typed request authentication context
    req.auth = {
      userId: user._id.toString(),
      tenantId: user.tenantId.toString(),
      schoolId: user.schoolId?.toString(),
      userType: user.userType,
      sessionId: session._id.toString(),
      email: user.email,
    };

    next();
  } catch (err) {
    next(err);
  }
}
