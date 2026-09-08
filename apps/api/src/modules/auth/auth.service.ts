import { Types } from 'mongoose';
import crypto from 'crypto';
import { User, Session, VerificationToken, IUserDoc } from '@edusphere/database';
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  ValidationError,
  UserStatus,
} from '@edusphere/common';
import { LoginResponse, RefreshResponse, AuthUserProfile, SessionSummary } from '@edusphere/types';
import { env } from '../../config/env.js';
import { passwordService } from './password.service.js';
import { tokenService } from './token.service.js';
import { sessionService, ClientMetadata } from './session.service.js';
import { emailService } from './email.service.js';

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
  rememberMe?: boolean;
}

export class AuthService {
  /**
   * Authenticates user with email and password, enforces brute-force lockout,
   * creates an active session, and returns access and refresh tokens.
   */
  async login(
    credentials: LoginCredentials,
    metadata: ClientMetadata
  ): Promise<LoginResponse & { rawRefreshToken: string }> {
    const email = credentials.email.toLowerCase().trim();

    // Query user by email (optionally scoped by tenantId if provided)
    const query: Record<string, any> = { email, isDeleted: false };
    if (credentials.tenantId) {
      query.tenantId = new Types.ObjectId(credentials.tenantId);
    }

    const user = await User.findOne(query).select('+passwordHash');

    // Anti-enumeration: if user is not found, execute dummy bcrypt to equalize timing
    if (!user) {
      await passwordService.dummyCompare();
      throw new AuthenticationError('Invalid email or password.');
    }

    // Check brute-force lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / (60 * 1000));
      throw new AuthenticationError(
        `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`
      );
    }

    // If lockout has elapsed, reset counter
    if (user.lockoutUntil && user.lockoutUntil <= new Date()) {
      user.lockoutUntil = undefined;
      user.failedLoginAttempts = 0;
    }

    // Verify password hash
    const isPasswordValid = await passwordService.comparePassword(
      credentials.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
      }
      await user.save();
      throw new AuthenticationError('Invalid email or password.');
    }

    // Check account status
    if (user.status === UserStatus.SUSPENDED) {
      throw new AuthorizationError(
        'Your account has been suspended. Please contact your institution administrator.'
      );
    }
    if (user.status === UserStatus.DEACTIVATED) {
      throw new AuthorizationError('Your account has been deactivated.');
    }
    if (user.status === UserStatus.LOCKED) {
      throw new AuthenticationError('Your account is locked. Please contact your administrator.');
    }
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new AuthorizationError('Please verify your email address before signing in.');
    }

    // Successful credentials verification: reset counters & record last login
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    // Create session & tokens
    const { session, rawRefreshToken } = await sessionService.createSession({
      userId: user._id,
      tenantId: user.tenantId,
      deviceName: metadata.deviceName,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
    });

    const accessToken = tokenService.generateAccessToken({
      sub: user._id.toString(),
      userId: user._id.toString(),
      tenantId: user.tenantId.toString(),
      schoolId: user.schoolId?.toString(),
      userType: user.userType,
      sessionId: session._id.toString(),
    });

    const userProfile: AuthUserProfile = {
      id: user._id.toString(),
      email: user.email,
      userType: user.userType,
      tenantId: user.tenantId.toString(),
      schoolId: user.schoolId?.toString(),
      status: user.status,
      phone: user.phone,
      mfaEnabled: user.mfaEnabled,
      lastLoginAt: user.lastLoginAt?.toISOString(),
    };

    const sessionSummary: SessionSummary = {
      id: session._id.toString(),
      deviceName: session.deviceName,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      lastUsedAt: session.lastUsedAt.toISOString(),
      createdAt: (session.createdAt || session.lastUsedAt).toISOString(),
      isCurrent: true,
    };

    return {
      accessToken,
      expiresIn: tokenService.parseExpiryToMs(env.JWT_ACCESS_EXPIRY),
      tokenType: 'Bearer',
      rawRefreshToken,
      user: userProfile,
      session: sessionSummary,
    };
  }

  /**
   * Refreshes access and refresh tokens using token family rotation.
   */
  async refreshTokens(
    rawRefreshToken: string,
    metadata: ClientMetadata
  ): Promise<RefreshResponse & { rawRefreshToken: string }> {
    const {
      session,
      rawRefreshToken: newRawRefreshToken,
      user,
    } = await sessionService.rotateSession(rawRefreshToken, metadata);

    const accessToken = tokenService.generateAccessToken({
      sub: user._id.toString(),
      userId: user._id.toString(),
      tenantId: user.tenantId.toString(),
      schoolId: user.schoolId?.toString(),
      userType: user.userType,
      sessionId: session._id.toString(),
    });

    return {
      accessToken,
      expiresIn: tokenService.parseExpiryToMs(env.JWT_ACCESS_EXPIRY),
      tokenType: 'Bearer',
      rawRefreshToken: newRawRefreshToken,
    };
  }

  /**
   * Logs out current session.
   */
  async logout(sessionId: string, userId: string): Promise<void> {
    await sessionService.revokeSession(sessionId, userId, 'USER_LOGOUT');
  }

  /**
   * Logs out all sessions for the user.
   */
  async logoutAll(userId: string): Promise<void> {
    await sessionService.revokeAllUserSessions(userId, 'USER_LOGOUT_ALL');
  }

  /**
   * Fetches the current authenticated user profile and active session summary.
   */
  async getCurrentUser(
    userId: string,
    sessionId: string
  ): Promise<{ user: AuthUserProfile; session: SessionSummary }> {
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      throw new AuthenticationError('User not found or deactivated.');
    }

    const session = await Session.findById(sessionId);
    if (!session || session.isRevoked) {
      throw new AuthenticationError('Session expired or revoked.');
    }

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        userType: user.userType,
        tenantId: user.tenantId.toString(),
        schoolId: user.schoolId?.toString(),
        status: user.status,
        phone: user.phone,
        mfaEnabled: user.mfaEnabled,
        lastLoginAt: user.lastLoginAt?.toISOString(),
      },
      session: {
        id: session._id.toString(),
        deviceName: session.deviceName,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        lastUsedAt: session.lastUsedAt.toISOString(),
        createdAt: (session.createdAt || session.lastUsedAt).toISOString(),
        isCurrent: true,
      },
    };
  }

  /**
   * Changes authenticated user password, verifies current password, and invalidates other sessions.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentSessionId: string
  ): Promise<void> {
    const policyResult = passwordService.validatePasswordPolicy(newPassword);
    if (!policyResult.isValid) {
      throw new ValidationError(
        'New password does not meet security requirements.',
        policyResult.issues.map((issue) => ({ issue }))
      );
    }

    const user = await User.findById(userId).select('+passwordHash');
    if (!user || user.isDeleted) {
      throw new AuthenticationError('User not found.');
    }

    const isMatch = await passwordService.comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AuthenticationError('Current password is incorrect.');
    }

    user.passwordHash = await passwordService.hashPassword(newPassword);
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;
    await user.save();

    // Revoke all other active sessions for security
    await sessionService.revokeAllUserSessions(userId, 'PASSWORD_CHANGE', currentSessionId);
  }

  /**
   * Initiates password reset flow with single-use hashed token and email notification.
   * Mitigates user enumeration by always returning successfully.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, isDeleted: false });

    if (!user || user.status !== UserStatus.ACTIVE) {
      // Return cleanly to prevent account enumeration
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = tokenService.hashToken(rawToken);

    // Invalidate previous pending password reset tokens for this user
    await VerificationToken.deleteMany({
      userId: user._id,
      tokenType: 'PASSWORD_RESET',
      isUsed: false,
    });

    await VerificationToken.create({
      tenantId: user.tenantId,
      userId: user._id,
      tokenHash,
      tokenType: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes TTL
      isUsed: false,
    });

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    await emailService.sendPasswordResetEmail(user.email, rawToken, resetUrl);
  }

  /**
   * Resets user password using a single-use token and invalidates all existing sessions.
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const policyResult = passwordService.validatePasswordPolicy(newPassword);
    if (!policyResult.isValid) {
      throw new ValidationError(
        'New password does not meet security requirements.',
        policyResult.issues.map((issue) => ({ issue }))
      );
    }

    const tokenHash = tokenService.hashToken(rawToken);
    const tokenDoc = await VerificationToken.findOne({
      tokenHash,
      tokenType: 'PASSWORD_RESET',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      throw new BadRequestError('Invalid or expired password reset token.');
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user || user.isDeleted) {
      throw new BadRequestError('User account associated with this token no longer exists.');
    }

    user.passwordHash = await passwordService.hashPassword(newPassword);
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;
    await user.save();

    tokenDoc.isUsed = true;
    tokenDoc.usedAt = new Date();
    await tokenDoc.save();

    // Revoke all sessions across all devices
    await sessionService.revokeAllUserSessions(user._id.toString(), 'PASSWORD_RESET');
  }

  /**
   * Verifies email address using a verification token.
   */
  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = tokenService.hashToken(rawToken);
    const tokenDoc = await VerificationToken.findOne({
      tokenHash,
      tokenType: 'EMAIL_VERIFICATION',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      throw new BadRequestError('Invalid or expired email verification token.');
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user || user.isDeleted) {
      throw new BadRequestError('User account associated with this token no longer exists.');
    }

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      user.status = UserStatus.ACTIVE;
      await user.save();
    }

    tokenDoc.isUsed = true;
    tokenDoc.usedAt = new Date();
    await tokenDoc.save();
  }

  /**
   * Resends email verification token (rate limited & anti-enumeration safe).
   */
  async resendVerification(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, isDeleted: false });

    if (!user || user.status !== UserStatus.PENDING_VERIFICATION) {
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = tokenService.hashToken(rawToken);

    await VerificationToken.deleteMany({
      userId: user._id,
      tokenType: 'EMAIL_VERIFICATION',
      isUsed: false,
    });

    await VerificationToken.create({
      tenantId: user.tenantId,
      userId: user._id,
      tokenHash,
      tokenType: 'EMAIL_VERIFICATION',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours TTL
      isUsed: false,
    });

    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    await emailService.sendEmailVerificationEmail(user.email, rawToken, verifyUrl);
  }
}

export const authService = new AuthService();
