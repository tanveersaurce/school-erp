import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Session, User, ISessionDoc, IUserDoc } from '@edusphere/database';
import { AuthenticationError, UserStatus } from '@edusphere/common';
import { SessionSummary } from '@edusphere/types';
import { tokenService } from './token.service.js';
import { logger } from '../../core/logger/logger.js';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface ClientMetadata {
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface CreateSessionParams extends ClientMetadata {
  userId: string | Types.ObjectId;
  tenantId: string | Types.ObjectId;
  tokenFamilyId?: string;
}

export class SessionService {
  /**
   * Creates a new session record in MongoDB with an unhashed refresh token returned to caller.
   */
  async createSession(params: CreateSessionParams): Promise<{
    session: ISessionDoc;
    rawRefreshToken: string;
  }> {
    const tokenFamilyId = params.tokenFamilyId || uuidv4();
    const { rawToken, tokenHash } = tokenService.generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const session = await Session.create({
      tenantId: new Types.ObjectId(params.tenantId),
      userId: new Types.ObjectId(params.userId),
      tokenFamilyId,
      refreshTokenHash: tokenHash,
      deviceName: params.deviceName || 'Web Browser',
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      lastUsedAt: new Date(),
      expiresAt,
      isRevoked: false,
    });

    return {
      session,
      rawRefreshToken: rawToken,
    };
  }

  /**
   * Rotates a session token pair with cryptographic token-family reuse detection.
   * If an already-rotated or revoked token is presented, the entire token family is revoked immediately.
   */
  async rotateSession(
    rawRefreshToken: string,
    metadata: ClientMetadata
  ): Promise<{
    session: ISessionDoc;
    rawRefreshToken: string;
    user: IUserDoc;
  }> {
    const tokenHash = tokenService.hashToken(rawRefreshToken);
    const existingSession = await Session.findOne({ refreshTokenHash: tokenHash });

    if (!existingSession) {
      throw new AuthenticationError('Invalid or expired refresh token.');
    }

    // Token Reuse / Replay Attack Detection
    if (existingSession.isRevoked) {
      logger.warn(
        {
          tokenFamilyId: existingSession.tokenFamilyId,
          userId: existingSession.userId.toString(),
          revokedReason: existingSession.revokedReason,
        },
        '🚨 Security Incident: Stolen refresh token replay detected! Revoking token family.'
      );

      // Invalidate all active sessions in the compromised token family
      await Session.updateMany(
        { tokenFamilyId: existingSession.tokenFamilyId, isRevoked: false },
        {
          $set: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: 'TOKEN_REUSE_DETECTED',
          },
        }
      );

      throw new AuthenticationError('Invalid or expired refresh token. Please sign in again.');
    }

    // Expiration check
    if (existingSession.expiresAt <= new Date()) {
      existingSession.isRevoked = true;
      existingSession.revokedAt = new Date();
      existingSession.revokedReason = 'TOKEN_EXPIRED';
      await existingSession.save();

      throw new AuthenticationError('Session expired. Please sign in again.');
    }

    // Verify user exists and is eligible for session continuity
    const user = await User.findById(existingSession.userId);
    if (!user || user.isDeleted) {
      throw new AuthenticationError('User account not found or deactivated.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      existingSession.isRevoked = true;
      existingSession.revokedAt = new Date();
      existingSession.revokedReason = `ACCOUNT_STATUS_${user.status}`;
      await existingSession.save();

      throw new AuthenticationError('Account is no longer active.');
    }

    // Invalidate the old refresh token (marked ROTATED)
    existingSession.isRevoked = true;
    existingSession.revokedAt = new Date();
    existingSession.revokedReason = 'ROTATED';
    await existingSession.save();

    // Issue a new session record under the same token family
    const { session: newSession, rawRefreshToken: newRawRefreshToken } = await this.createSession({
      userId: user._id,
      tenantId: user.tenantId,
      tokenFamilyId: existingSession.tokenFamilyId,
      deviceName: metadata.deviceName || existingSession.deviceName,
      userAgent: metadata.userAgent || existingSession.userAgent,
      ipAddress: metadata.ipAddress || existingSession.ipAddress,
    });

    return {
      session: newSession,
      rawRefreshToken: newRawRefreshToken,
      user,
    };
  }

  /**
   * Revokes a specific session for an authenticated user.
   */
  async revokeSession(sessionId: string, userId: string, reason = 'USER_LOGOUT'): Promise<boolean> {
    const result = await Session.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        userId: new Types.ObjectId(userId),
        isRevoked: false,
      },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: reason,
        },
      }
    );
    return !!result;
  }

  /**
   * Revokes all active sessions for a user, optionally exempting the current session.
   */
  async revokeAllUserSessions(
    userId: string,
    reason = 'USER_LOGOUT_ALL',
    exceptSessionId?: string
  ): Promise<number> {
    const filter: Record<string, any> = {
      userId: new Types.ObjectId(userId),
      isRevoked: false,
    };

    if (exceptSessionId) {
      filter._id = { $ne: new Types.ObjectId(exceptSessionId) };
    }

    const result = await Session.updateMany(filter, {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    return result.modifiedCount;
  }

  /**
   * Lists all active sessions for an authenticated user.
   */
  async getUserSessions(userId: string, currentSessionId?: string): Promise<SessionSummary[]> {
    const sessions = await Session.find({
      userId: new Types.ObjectId(userId),
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ lastUsedAt: -1 });

    return sessions.map((s) => ({
      id: s._id.toString(),
      deviceName: s.deviceName || 'Unknown Device',
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      lastUsedAt: (s.lastUsedAt || new Date()).toISOString(),
      createdAt: (s.createdAt || new Date()).toISOString(),
      isCurrent: s._id.toString() === currentSessionId,
    }));
  }
}

export const sessionService = new SessionService();
