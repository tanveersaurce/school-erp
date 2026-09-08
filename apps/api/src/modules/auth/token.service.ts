import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env.js';
import { JwtPayload } from '@edusphere/types';
import { AuthenticationError, TokenExpiredError } from '@edusphere/common';

export interface GeneratedRefreshToken {
  rawToken: string;
  tokenHash: string;
}

export class TokenService {
  /**
   * Hashes a raw token string (refresh token or verification token) using SHA-256.
   * Only the hash is ever stored in the database.
   */
  hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Generates a cryptographically strong 256-bit random refresh token
   * and returns both the raw token (sent to client) and its SHA-256 hash (stored in DB).
   */
  generateRefreshToken(): GeneratedRefreshToken {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    return { rawToken, tokenHash };
  }

  /**
   * Generates a short-lived JWT Access Token.
   */
  generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>): string {
    const jti = uuidv4();
    const tokenPayload: JwtPayload = {
      ...payload,
      jti,
    };

    return jwt.sign(tokenPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'],
    });
  }

  /**
   * Verifies and decodes a JWT Access Token.
   * Throws TokenExpiredError if expired or AuthenticationError if malformed/invalid.
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      return decoded;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Access token has expired. Please refresh your session.');
      }
      throw new AuthenticationError('Invalid or corrupted authentication token.');
    }
  }

  /**
   * Helper to parse duration string (e.g. '15m', '7d') into milliseconds.
   */
  parseExpiryToMs(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }
}

export const tokenService = new TokenService();
