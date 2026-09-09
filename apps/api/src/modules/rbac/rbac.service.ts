import { Types } from 'mongoose';
import {
  UserType,
  NotFoundError,
  ConflictError,
  AuthorizationError,
  BadRequestError,
} from '@edusphere/common';
import {
  Role,
  Permission,
  UserRole,
  RolePermission,
  User,
  IRoleDoc,
  IPermissionDoc,
  IUserRoleDoc,
} from '@edusphere/database';
import {
  RbacRoleDto,
  RoleDetailDto,
  PermissionDto,
  UserRoleAssignmentDto,
  RoleCreateInput,
  RoleUpdateInput,
} from '@edusphere/types';
import { getRedisClient } from '../../config/redis.js';
import { logger } from '../../core/logger/logger.js';

interface CachedAuthz {
  roles: string[];
  permissions: string[];
  cachedAt: number;
}

// In-memory fallback cache with TTL for when Redis is unavailable or in local test environments
const memoryCache = new Map<string, CachedAuthz>();
const CACHE_TTL_SECONDS = 900; // 15 minutes

export class RbacService {
  private getCacheKey(tenantId: string, userId: string): string {
    return `authz:${tenantId}:${userId}`;
  }

  /**
   * Resolve effective permissions and active roles for a user.
   * Leverages Redis cache (key: authz:{tenantId}:{userId}) with in-memory degraded fallback.
   */
  async getEffectivePermissions(
    tenantId: string,
    userId: string,
    userType?: UserType
  ): Promise<{ roles: string[]; permissions: string[] }> {
    const cacheKey = this.getCacheKey(tenantId, userId);

    // 1. Try Redis cache lookup
    try {
      const redis = getRedisClient();
      if (redis && redis.status === 'ready') {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as { roles: string[]; permissions: string[] };
          return parsed;
        }
      }
    } catch (err) {
      logger.debug({ err, cacheKey }, 'Redis read error in authz cache. Falling back.');
    }

    // 2. Try In-Memory Fallback Cache
    const mem = memoryCache.get(cacheKey);
    if (mem && Date.now() - mem.cachedAt < CACHE_TTL_SECONDS * 1000) {
      return { roles: mem.roles, permissions: mem.permissions };
    }

    // 3. Cache Miss — Compute permissions from database
    let roles: string[] = [];
    let permissions: string[] = [];

    // Super Admin platform override
    if (userType === UserType.SUPER_ADMIN) {
      roles = ['SUPER_ADMIN'];
      const allPerms = await Permission.find({}).lean();
      permissions = allPerms.map((p) => p.permissionString.toLowerCase().trim());
    } else {
      // Find active user-role assignments in tenant
      const userRoles = await UserRole.find({
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(userId),
      }).lean();

      if (userRoles.length > 0) {
        const roleIds = userRoles.map((ur) => ur.roleId);
        const roleDocs = await Role.find({
          _id: { $in: roleIds },
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        }).lean();

        roles = roleDocs.map((r) => r.name);

        // Check if any assigned role has wildcard or SUPER_ADMIN access
        const hasSuperRole = roles.includes('SUPER_ADMIN');

        if (hasSuperRole) {
          const allPerms = await Permission.find({}).lean();
          permissions = allPerms.map((p) => p.permissionString.toLowerCase().trim());
        } else {
          // Fetch assigned RolePermissions
          const activeRoleIds = roleDocs.map((r) => r._id);
          const rolePerms = await RolePermission.find({
            tenantId: new Types.ObjectId(tenantId),
            roleId: { $in: activeRoleIds },
          }).lean();

          if (rolePerms.length > 0) {
            const permIds = rolePerms.map((rp) => rp.permissionId);
            const permDocs = await Permission.find({ _id: { $in: permIds } }).lean();
            permissions = permDocs.map((p) => p.permissionString.toLowerCase().trim());
          }
        }
      }
    }

    // Deduplicate permissions
    const uniquePermissions = Array.from(new Set(permissions));
    const result = { roles, permissions: uniquePermissions };

    // 4. Populate caches
    try {
      const redis = getRedisClient();
      if (redis && redis.status === 'ready') {
        await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
      }
    } catch (err) {
      logger.debug({ err, cacheKey }, 'Failed to set Redis authz cache.');
    }

    memoryCache.set(cacheKey, { ...result, cachedAt: Date.now() });

    return result;
  }

  /**
   * Invalidate cached permissions for a specific user.
   */
  async invalidateUserPermissionCache(tenantId: string, userId: string): Promise<void> {
    const cacheKey = this.getCacheKey(tenantId, userId);
    memoryCache.delete(cacheKey);

    try {
      const redis = getRedisClient();
      if (redis && redis.status === 'ready') {
        await redis.del(cacheKey);
      }
    } catch (err) {
      logger.debug({ err, cacheKey }, 'Failed to evict Redis authz cache key.');
    }
  }

  /**
   * Invalidate cached permissions for all users assigned to a role.
   */
  async invalidateRolePermissionCache(tenantId: string, roleId: string): Promise<void> {
    const assignments = await UserRole.find({
      tenantId: new Types.ObjectId(tenantId),
      roleId: new Types.ObjectId(roleId),
    })
      .select('userId')
      .lean();

    await Promise.all(
      assignments.map((assignment) =>
        this.invalidateUserPermissionCache(tenantId, assignment.userId.toString())
      )
    );
  }

  /**
   * List all roles within a tenant, including assignment & permission counts.
   */
  async listRoles(tenantId: string): Promise<RbacRoleDto[]> {
    const roles = await Role.find({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .sort({ isSystemRole: -1, name: 1 })
      .lean();

    if (roles.length === 0) return [];

    const roleIds = roles.map((r) => r._id);

    const [permCounts, userCounts] = await Promise.all([
      RolePermission.aggregate<{ _id: Types.ObjectId; count: number }>([
        {
          $match: {
            tenantId: new Types.ObjectId(tenantId),
            roleId: { $in: roleIds },
          },
        },
        { $group: { _id: '$roleId', count: { $sum: 1 } } },
      ]),
      UserRole.aggregate<{ _id: Types.ObjectId; count: number }>([
        {
          $match: {
            tenantId: new Types.ObjectId(tenantId),
            roleId: { $in: roleIds },
          },
        },
        { $group: { _id: '$roleId', count: { $sum: 1 } } },
      ]),
    ]);

    const permCountMap = new Map<string, number>(
      permCounts.map((pc) => [pc._id.toString(), pc.count])
    );
    const userCountMap = new Map<string, number>(
      userCounts.map((uc) => [uc._id.toString(), uc.count])
    );

    return roles.map((r) => ({
      id: r._id.toString(),
      tenantId: r.tenantId.toString(),
      name: r.name,
      description: r.description,
      isSystemRole: r.isSystemRole,
      permissionsCount: permCountMap.get(r._id.toString()) || 0,
      usersCount: userCountMap.get(r._id.toString()) || 0,
      createdAt: (r.createdAt || new Date()).toISOString(),
      updatedAt: (r.updatedAt || new Date()).toISOString(),
    }));
  }

  /**
   * Get role details by ID including its configured permissions.
   */
  async getRoleById(tenantId: string, roleId: string): Promise<RoleDetailDto> {
    const role = await Role.findOne({
      _id: new Types.ObjectId(roleId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).lean();

    if (!role) {
      throw new NotFoundError('Role not found or has been deactivated.');
    }

    const rolePerms = await RolePermission.find({
      tenantId: new Types.ObjectId(tenantId),
      roleId: role._id,
    }).lean();

    const permIds = rolePerms.map((rp) => rp.permissionId);
    const permDocs = await Permission.find({ _id: { $in: permIds } }).lean();

    const permissions: PermissionDto[] = permDocs.map((p) => ({
      id: p._id.toString(),
      resource: p.resource,
      action: p.action,
      permissionString: p.permissionString.toLowerCase().trim(),
      description: p.description,
      category: p.category,
    }));

    const usersCount = await UserRole.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      roleId: role._id,
    });

    return {
      id: role._id.toString(),
      tenantId: role.tenantId.toString(),
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      permissionsCount: permissions.length,
      usersCount,
      permissions,
      createdAt: (role.createdAt || new Date()).toISOString(),
      updatedAt: (role.updatedAt || new Date()).toISOString(),
    };
  }

  /**
   * Create a new custom role within the tenant.
   */
  async createRole(tenantId: string, input: RoleCreateInput): Promise<RbacRoleDto> {
    const existing = await Role.findOne({
      tenantId: new Types.ObjectId(tenantId),
      name: input.name.trim(),
      isDeleted: false,
    });

    if (existing) {
      throw new ConflictError(`A role named '${input.name}' already exists in this tenant.`);
    }

    const role = await Role.create({
      tenantId: new Types.ObjectId(tenantId),
      name: input.name.trim(),
      description: input.description?.trim(),
      isSystemRole: false,
      isDeleted: false,
    });

    let permissionsCount = 0;
    if (input.permissionIds && input.permissionIds.length > 0) {
      const validPerms = await Permission.find({
        _id: { $in: input.permissionIds.map((id) => new Types.ObjectId(id)) },
      });

      if (validPerms.length !== input.permissionIds.length) {
        throw new BadRequestError('One or more permission IDs provided are invalid.');
      }

      const mappings = validPerms.map((p) => ({
        tenantId: new Types.ObjectId(tenantId),
        roleId: role._id,
        permissionId: p._id,
      }));

      await RolePermission.insertMany(mappings);
      permissionsCount = mappings.length;
    }

    return {
      id: role._id.toString(),
      tenantId: role.tenantId.toString(),
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      permissionsCount,
      usersCount: 0,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }

  /**
   * Update a role's name, description, and permission mappings.
   * System roles cannot be renamed.
   */
  async updateRole(
    tenantId: string,
    roleId: string,
    input: RoleUpdateInput
  ): Promise<RoleDetailDto> {
    const role = await Role.findOne({
      _id: new Types.ObjectId(roleId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!role) {
      throw new NotFoundError('Role not found or has been deactivated.');
    }

    // System role protection: Cannot rename
    if (role.isSystemRole && input.name && input.name.trim() !== role.name) {
      throw new AuthorizationError('System default roles are immutable and cannot be renamed.');
    }

    // Check name uniqueness if changed
    if (input.name && input.name.trim() !== role.name) {
      const conflict = await Role.findOne({
        tenantId: new Types.ObjectId(tenantId),
        name: input.name.trim(),
        isDeleted: false,
        _id: { $ne: role._id },
      });

      if (conflict) {
        throw new ConflictError(`A role named '${input.name}' already exists in this tenant.`);
      }
      role.name = input.name.trim();
    }

    if (input.description !== undefined) {
      role.description = input.description.trim();
    }

    await role.save();

    // If permissionIds provided, update mappings
    if (input.permissionIds !== undefined) {
      const validPerms = await Permission.find({
        _id: { $in: input.permissionIds.map((id) => new Types.ObjectId(id)) },
      });

      if (validPerms.length !== input.permissionIds.length) {
        throw new BadRequestError('One or more permission IDs provided are invalid.');
      }

      await RolePermission.deleteMany({
        tenantId: new Types.ObjectId(tenantId),
        roleId: role._id,
      });

      if (validPerms.length > 0) {
        const mappings = validPerms.map((p) => ({
          tenantId: new Types.ObjectId(tenantId),
          roleId: role._id,
          permissionId: p._id,
        }));
        await RolePermission.insertMany(mappings);
      }
    }

    // Invalidate cached permissions for all users assigned to this role
    await this.invalidateRolePermissionCache(tenantId, roleId);

    return this.getRoleById(tenantId, roleId);
  }

  /**
   * Delete a custom role.
   * System roles cannot be deleted.
   * Roles with active user assignments cannot be deleted (returns 409 Conflict).
   */
  async deleteRole(tenantId: string, roleId: string): Promise<void> {
    const role = await Role.findOne({
      _id: new Types.ObjectId(roleId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!role) {
      throw new NotFoundError('Role not found or has already been deleted.');
    }

    if (role.isSystemRole) {
      throw new AuthorizationError('System default roles are immutable and cannot be deleted.');
    }

    const assignedUsers = await UserRole.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      roleId: role._id,
    });

    if (assignedUsers > 0) {
      throw new ConflictError(
        `Cannot delete role '${role.name}': it is currently assigned to ${assignedUsers} user(s). Reassign or remove active users first.`
      );
    }

    role.isDeleted = true;
    await role.save();

    await RolePermission.deleteMany({
      tenantId: new Types.ObjectId(tenantId),
      roleId: role._id,
    });

    await this.invalidateRolePermissionCache(tenantId, roleId);
  }

  /**
   * Assign or replace permissions for a role.
   */
  async assignPermissionsToRole(
    tenantId: string,
    roleId: string,
    permissionIds: string[]
  ): Promise<RoleDetailDto> {
    const role = await Role.findOne({
      _id: new Types.ObjectId(roleId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!role) {
      throw new NotFoundError('Role not found or has been deactivated.');
    }

    const validPerms = await Permission.find({
      _id: { $in: permissionIds.map((id) => new Types.ObjectId(id)) },
    });

    if (validPerms.length !== permissionIds.length) {
      throw new BadRequestError('One or more permission IDs provided are invalid.');
    }

    await RolePermission.deleteMany({
      tenantId: new Types.ObjectId(tenantId),
      roleId: role._id,
    });

    if (validPerms.length > 0) {
      const mappings = validPerms.map((p) => ({
        tenantId: new Types.ObjectId(tenantId),
        roleId: role._id,
        permissionId: p._id,
      }));
      await RolePermission.insertMany(mappings);
    }

    await this.invalidateRolePermissionCache(tenantId, roleId);

    return this.getRoleById(tenantId, roleId);
  }

  /**
   * Assign a role to a user.
   */
  async assignRoleToUser(
    tenantId: string,
    userId: string,
    roleId: string,
    schoolId?: string,
    campusId?: string
  ): Promise<UserRoleAssignmentDto> {
    const [user, role] = await Promise.all([
      User.findOne({
        _id: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }),
      Role.findOne({
        _id: new Types.ObjectId(roleId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }),
    ]);

    if (!user) {
      throw new NotFoundError('User not found within this tenant.');
    }
    if (!role) {
      throw new NotFoundError('Role not found within this tenant.');
    }

    const existingAssignment = await UserRole.findOne({
      tenantId: new Types.ObjectId(tenantId),
      userId: user._id,
      roleId: role._id,
    });

    if (existingAssignment) {
      throw new ConflictError(`User is already assigned to the '${role.name}' role.`);
    }

    const assignment = await UserRole.create({
      tenantId: new Types.ObjectId(tenantId),
      userId: user._id,
      roleId: role._id,
      schoolId: schoolId ? new Types.ObjectId(schoolId) : undefined,
      campusId: campusId ? new Types.ObjectId(campusId) : undefined,
    });

    await this.invalidateUserPermissionCache(tenantId, userId);

    return {
      id: assignment._id.toString(),
      tenantId: assignment.tenantId.toString(),
      userId: assignment.userId.toString(),
      roleId: role._id.toString(),
      roleName: role.name,
      isSystemRole: role.isSystemRole,
      schoolId: assignment.schoolId?.toString(),
      campusId: assignment.campusId?.toString(),
      createdAt: assignment.createdAt.toISOString(),
    };
  }

  /**
   * Remove a role assignment from a user.
   */
  async removeRoleFromUser(tenantId: string, userId: string, roleId: string): Promise<void> {
    const result = await UserRole.deleteOne({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId),
      roleId: new Types.ObjectId(roleId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundError('Role assignment not found for this user.');
    }

    await this.invalidateUserPermissionCache(tenantId, userId);
  }

  /**
   * Get all active roles assigned to a user.
   */
  async getUserRoles(tenantId: string, userId: string): Promise<UserRoleAssignmentDto[]> {
    const assignments = await UserRole.find({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId),
    }).lean();

    if (assignments.length === 0) return [];

    const roleIds = assignments.map((a) => a.roleId);
    const roles = await Role.find({
      _id: { $in: roleIds },
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).lean();

    const roleMap = new Map<string, { name: string; isSystemRole: boolean }>(
      roles.map((r) => [r._id.toString(), { name: r.name, isSystemRole: r.isSystemRole }])
    );

    const result: UserRoleAssignmentDto[] = [];
    for (const a of assignments) {
      const roleInfo = roleMap.get(a.roleId.toString());
      if (roleInfo) {
        result.push({
          id: a._id.toString(),
          tenantId: a.tenantId.toString(),
          userId: a.userId.toString(),
          roleId: a.roleId.toString(),
          roleName: roleInfo.name,
          isSystemRole: roleInfo.isSystemRole,
          schoolId: a.schoolId ? a.schoolId.toString() : undefined,
          campusId: a.campusId ? a.campusId.toString() : undefined,
          createdAt: (a.createdAt || new Date()).toISOString(),
        });
      }
    }

    return result;
  }

  /**
   * List all system permissions in the dictionary.
   */
  async listPermissions(): Promise<PermissionDto[]> {
    const permissions = await Permission.find({})
      .sort({ category: 1, resource: 1, action: 1 })
      .lean();

    return permissions.map((p) => ({
      id: p._id.toString(),
      resource: p.resource,
      action: p.action,
      permissionString: p.permissionString.toLowerCase().trim(),
      description: p.description,
      category: p.category,
    }));
  }
}

export const rbacService = new RbacService();
