import { UserType, UserStatus } from '@edusphere/common';

export interface IUser {
  id: string;
  tenantId: string;
  schoolId?: string;
  email: string;
  phone?: string;
  userType: UserType;
  status: UserStatus;
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  mfaEnabled: boolean;
  lastLoginAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRole {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPermission {
  id: string;
  resource: string;
  action: string;
  permissionString: string;
  description: string;
  category: string;
}

export interface IUserRole {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  schoolId?: string;
  campusId?: string;
  createdAt: Date;
}

export interface IRolePermission {
  id: string;
  tenantId: string;
  roleId: string;
  permissionId: string;
  conditions?: Record<string, unknown>;
  createdAt: Date;
}
