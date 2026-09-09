import { UserType, UserStatus } from '@edusphere/common';

export interface JwtPayload {
  sub: string;
  userId: string;
  tenantId: string;
  schoolId?: string;
  userType: UserType;
  sessionId: string;
  jti: string;
  roles?: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export interface AuthContext {
  userId: string;
  tenantId: string;
  schoolId?: string;
  userType: UserType;
  sessionId: string;
  email: string;
  roles?: string[];
  permissions?: string[];
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  schoolId?: string;
  email: string;
  userType: UserType;
  roles: string[];
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  expiresIn: number;
}

export interface SessionData {
  id: string;
  userId: string;
  tenantId: string;
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
  lastActive: Date;
  isValid: boolean;
}

export interface AuthUserProfile {
  id: string;
  email: string;
  userType: UserType;
  tenantId: string;
  schoolId?: string;
  status: UserStatus;
  phone?: string;
  mfaEnabled?: boolean;
  lastLoginAt?: string;
  roles?: string[];
  permissions?: string[];
}

export interface SessionSummary {
  id: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: AuthUserProfile;
  session: SessionSummary;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}
