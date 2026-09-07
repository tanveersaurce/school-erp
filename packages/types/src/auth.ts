import { UserType } from '@edusphere/common';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  schoolId?: string;
  userType: UserType;
  roles: string[];
  permissions: string[];
  jti: string;
  iat?: number;
  exp?: number;
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
