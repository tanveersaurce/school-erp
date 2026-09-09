import { Schema, model, Types } from 'mongoose';
import { UserType, UserStatus } from '@edusphere/common';
import { IUser, IRole, IPermission, IUserRole, IRolePermission } from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IUserDoc extends Omit<IUser, 'id' | 'tenantId' | 'schoolId'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  passwordHash: string;
  mfaSecret?: string;
}

export interface IRoleDoc extends Omit<IRole, 'id' | 'tenantId'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
}

export interface IPermissionDoc extends Omit<IPermission, 'id'> {
  _id: Types.ObjectId;
}

export interface IUserRoleDoc extends Omit<
  IUserRole,
  'id' | 'tenantId' | 'userId' | 'roleId' | 'schoolId' | 'campusId'
> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  roleId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
}

export interface IRolePermissionDoc extends Omit<
  IRolePermission,
  'id' | 'tenantId' | 'roleId' | 'permissionId'
> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  roleId: Types.ObjectId;
  permissionId: Types.ObjectId;
}

export interface ISessionDoc {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  tokenFamilyId: string;
  refreshTokenHash: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
  lastUsedAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVerificationTokenDoc {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  tokenType: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// 1. User Schema
const UserSchema = new Schema<IUserDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    userType: {
      type: String,
      enum: Object.values(UserType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
      required: true,
      index: true,
    },
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    lastLoginAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
UserSchema.plugin(tenantPlugin);
UserSchema.plugin(softDeletePlugin);
UserSchema.index(
  { tenantId: 1, email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
UserSchema.index({ tenantId: 1, userType: 1, status: 1 });

// 2. Role Schema
const RoleSchema = new Schema<IRoleDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isSystemRole: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
RoleSchema.plugin(tenantPlugin);
RoleSchema.plugin(softDeletePlugin);
RoleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

// 3. Permission Schema (System-wide dictionary)
const PermissionSchema = new Schema<IPermissionDoc>(
  {
    resource: { type: String, required: true, uppercase: true, trim: true },
    action: { type: String, required: true, uppercase: true, trim: true },
    permissionString: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, required: true },
    category: { type: String, required: true },
  },
  { timestamps: true, versionKey: '__v' }
);

// 4. UserRole Schema
const UserRoleSchema = new Schema<IUserRoleDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School' },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
  },
  { timestamps: true, versionKey: '__v' }
);
UserRoleSchema.plugin(tenantPlugin);
UserRoleSchema.index({ tenantId: 1, userId: 1, roleId: 1, schoolId: 1 }, { unique: true });

// 5. RolePermission Schema
const RolePermissionSchema = new Schema<IRolePermissionDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    permissionId: { type: Schema.Types.ObjectId, ref: 'Permission', required: true, index: true },
    conditions: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: '__v' }
);
RolePermissionSchema.plugin(tenantPlugin);
RolePermissionSchema.index({ tenantId: 1, roleId: 1, permissionId: 1 }, { unique: true });

// 6. Session Schema
const SessionSchema = new Schema<ISessionDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenFamilyId: { type: String, required: true, index: true },
    refreshTokenHash: { type: String, required: true, index: true },
    deviceName: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    isRevoked: { type: Boolean, default: false, index: true },
    revokedAt: { type: Date },
    revokedReason: { type: String, trim: true },
  },
  { timestamps: true, versionKey: '__v' }
);
SessionSchema.plugin(tenantPlugin);
SessionSchema.index({ tenantId: 1, userId: 1, isRevoked: 1 });

// 7. VerificationToken Schema
const VerificationTokenSchema = new Schema<IVerificationTokenDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    tokenType: {
      type: String,
      enum: ['PASSWORD_RESET', 'EMAIL_VERIFICATION'],
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    isUsed: { type: Boolean, default: false, index: true },
    usedAt: { type: Date },
  },
  { timestamps: true, versionKey: '__v' }
);
VerificationTokenSchema.plugin(tenantPlugin);
VerificationTokenSchema.index({ tokenHash: 1, tokenType: 1, isUsed: 1 });

export const User = model<IUserDoc>('User', UserSchema);
export const Role = model<IRoleDoc>('Role', RoleSchema);
export const Permission = model<IPermissionDoc>('Permission', PermissionSchema);
export const UserRole = model<IUserRoleDoc>('UserRole', UserRoleSchema);
export const RolePermission = model<IRolePermissionDoc>('RolePermission', RolePermissionSchema);
export const Session = model<ISessionDoc>('Session', SessionSchema);
export const VerificationToken = model<IVerificationTokenDoc>(
  'VerificationToken',
  VerificationTokenSchema
);
