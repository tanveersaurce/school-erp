import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import {
  Tenant,
  School,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
} from '@edusphere/database';
import { UserType, UserStatus } from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';
import { rbacService } from '../src/modules/rbac/rbac.service.js';

describe('Enterprise RBAC & Permission Management Suite (Phase 4)', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId('6a9fe236182646807d86ab27');
  const schoolId = new Types.ObjectId('6a9fe237182646807d86ab92');

  let superAdminToken: string;
  let adminToken: string;
  let teacherToken: string;
  let staffUserId: string;
  let customRoleId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // 1. Seed Tenant and School
    await Tenant.create({
      _id: tenantId,
      name: 'Greenwood International Trust',
      slug: 'greenwood',
      status: 'ACTIVE',
      subscriptionTier: 'ENTERPRISE',
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Greenwood High School',
      code: 'GWH-01',
      affiliationBoard: 'CBSE',
      status: 'ACTIVE',
    });

    // 2. Seed Permissions Dictionary
    const permissionMap = new Map<string, Types.ObjectId>();
    for (const perm of SYSTEM_PERMISSIONS) {
      const pDoc = await Permission.create({
        resource: perm.resource,
        action: perm.action,
        permissionString: perm.permissionString.toLowerCase().trim(),
        description: perm.description,
        category: perm.category,
      });
      permissionMap.set(perm.permissionString.toLowerCase().trim(), pDoc._id as Types.ObjectId);
    }

    // 3. Seed 14 System Roles
    const roleMap = new Map<string, Types.ObjectId>();
    for (const roleDef of SYSTEM_ROLES) {
      const roleDoc = await Role.create({
        tenantId,
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: true,
        isDeleted: false,
      });
      roleMap.set(roleDef.name, roleDoc._id as Types.ObjectId);

      const permsToAssign: Types.ObjectId[] = [];
      if (roleDef.permissions.includes('*')) {
        for (const pId of permissionMap.values()) {
          permsToAssign.push(pId);
        }
      } else {
        for (const pStr of roleDef.permissions) {
          const pId = permissionMap.get(pStr.toLowerCase().trim());
          if (pId) permsToAssign.push(pId);
        }
      }

      const rpDocs = permsToAssign.map((pId) => ({
        tenantId,
        roleId: roleDoc._id,
        permissionId: pId,
      }));
      if (rpDocs.length > 0) {
        await RolePermission.insertMany(rpDocs);
      }
    }

    const defaultHash = await passwordService.hashPassword('Admin@123456');

    // 4. Seed Users
    const superAdminUser = await User.create({
      tenantId,
      schoolId,
      email: 'superadmin@greenwood.edu',
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: defaultHash,
    });
    await UserRole.create({
      tenantId,
      userId: superAdminUser._id,
      roleId: roleMap.get('SUPER_ADMIN'),
    });

    const adminUser = await User.create({
      tenantId,
      schoolId,
      email: 'admin@greenwood.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: defaultHash,
    });
    await UserRole.create({
      tenantId,
      userId: adminUser._id,
      roleId: roleMap.get('SCHOOL_ADMIN'),
    });

    const teacherUser = await User.create({
      tenantId,
      schoolId,
      email: 'teacher@greenwood.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash: defaultHash,
    });
    await UserRole.create({
      tenantId,
      userId: teacherUser._id,
      roleId: roleMap.get('TEACHER'),
    });

    const staffUser = await User.create({
      tenantId,
      schoolId,
      email: 'staff@greenwood.edu',
      userType: UserType.STAFF,
      status: UserStatus.ACTIVE,
      passwordHash: defaultHash,
    });
    staffUserId = staffUser._id.toString();

    // 5. Authenticate users to get Bearer tokens
    const superRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@greenwood.edu', password: 'Admin@123456' });
    superAdminToken = superRes.body.data.accessToken;

    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@greenwood.edu', password: 'Admin@123456' });
    adminToken = adminRes.body.data.accessToken;

    const teacherRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@greenwood.edu', password: 'Admin@123456' });
    teacherToken = teacherRes.body.data.accessToken;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (replSet) {
      await replSet.stop();
    }
  });

  describe('1. Permissions Catalog (GET /api/v1/permissions)', () => {
    it('returns the system permissions catalog for authorized admins', async () => {
      const res = await request(app)
        .get('/api/v1/permissions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(70);

      // Verify standardized format resource:action
      const firstPerm = res.body.data[0];
      expect(firstPerm).toHaveProperty('permissionString');
      expect(firstPerm.permissionString).toMatch(/^[a-z_]+:[a-z_]+$/);
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/permissions');
      expect(res.status).toBe(401);
    });
  });

  describe('2. Roles Listing & Inspection (GET /api/v1/roles)', () => {
    it('returns 14 system roles with their permission and user counts', async () => {
      const res = await request(app)
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(14);

      const systemRoles = res.body.data.filter((r: any) => r.isSystemRole);
      expect(systemRoles.length).toBeGreaterThanOrEqual(14);

      const schoolAdminRole = res.body.data.find((r: any) => r.name === 'SCHOOL_ADMIN');
      expect(schoolAdminRole).toBeDefined();
      expect(schoolAdminRole.isSystemRole).toBe(true);
      expect(schoolAdminRole.usersCount).toBe(1);
      expect(schoolAdminRole.permissionsCount).toBeGreaterThan(0);
    });

    it('returns role details with full permission list by ID', async () => {
      const rolesRes = await request(app)
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`);
      const teacherRole = rolesRes.body.data.find((r: any) => r.name === 'TEACHER');

      const res = await request(app)
        .get(`/api/v1/roles/${teacherRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('TEACHER');
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
      expect(res.body.data.permissions.length).toBeGreaterThan(0);
    });
  });

  describe('3. Role Lifecycle: Creation, Conflict Check & Immutability', () => {
    it('creates a custom tenant role with isSystemRole: false', async () => {
      const res = await request(app)
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Exam Coordinator',
          description: 'Responsible for exam scheduling and report card publishing',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Exam Coordinator');
      expect(res.body.data.isSystemRole).toBe(false);
      customRoleId = res.body.data.id;
    });

    it('rejects creating a role with duplicate name with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Exam Coordinator',
          description: 'Duplicate role creation attempt',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RESOURCE_CONFLICT');
    });

    it('prevents renaming a system default role (HTTP 403 Forbidden)', async () => {
      const rolesRes = await request(app)
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`);
      const teacherRole = rolesRes.body.data.find((r: any) => r.name === 'TEACHER');

      const res = await request(app)
        .put(`/api/v1/roles/${teacherRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'SENIOR_TEACHER' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ACCESS');
      expect(res.body.error.message).toMatch(/immutable and cannot be renamed/i);
    });

    it('allows updating description of a system role', async () => {
      const rolesRes = await request(app)
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`);
      const teacherRole = rolesRes.body.data.find((r: any) => r.name === 'TEACHER');

      const res = await request(app)
        .put(`/api/v1/roles/${teacherRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated teacher description' });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Updated teacher description');
    });

    it('allows renaming a custom role', async () => {
      const res = await request(app)
        .put(`/api/v1/roles/${customRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Senior Exam Coordinator' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Senior Exam Coordinator');
    });
  });

  describe('4. Permission Assignment to Role', () => {
    it('assigns specific permissions to a custom role', async () => {
      const permsRes = await request(app)
        .get('/api/v1/permissions')
        .set('Authorization', `Bearer ${adminToken}`);

      const examPerms = permsRes.body.data
        .filter((p: any) => p.resource === 'EXAM')
        .slice(0, 3)
        .map((p: any) => p.id);

      const res = await request(app)
        .put(`/api/v1/roles/${customRoleId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissionIds: examPerms });

      expect(res.status).toBe(200);
      expect(res.body.data.permissions.length).toBe(3);
    });
  });

  describe('5. User Role Assignment & Deletion Safety', () => {
    it('assigns custom role to a user', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${staffUserId}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleId: customRoleId });

      expect(res.status).toBe(201);
      expect(res.body.data.userId).toBe(staffUserId);
      expect(res.body.data.roleId).toBe(customRoleId);
    });

    it('rejects duplicate role assignment to same user with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${staffUserId}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleId: customRoleId });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('RESOURCE_CONFLICT');
    });

    it('lists user roles', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${staffUserId}/roles`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.some((r: any) => r.roleId === customRoleId)).toBe(true);
    });

    it('prevents deleting a system role (HTTP 403 Forbidden)', async () => {
      const rolesRes = await request(app)
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${adminToken}`);
      const teacherRole = rolesRes.body.data.find((r: any) => r.name === 'TEACHER');

      const res = await request(app)
        .delete(`/api/v1/roles/${teacherRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ACCESS');
    });

    it('prevents deleting a custom role that has active user assignments (HTTP 409 Conflict)', async () => {
      const res = await request(app)
        .delete(`/api/v1/roles/${customRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('RESOURCE_CONFLICT');
      expect(res.body.error.message).toMatch(/currently assigned to 1 user/i);
    });

    it('removes role from user successfully', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${staffUserId}/roles/${customRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('deletes custom role once no users are assigned', async () => {
      const res = await request(app)
        .delete(`/api/v1/roles/${customRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Verify role is soft-deleted
      const checkRes = await request(app)
        .get(`/api/v1/roles/${customRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(checkRes.status).toBe(404);
    });
  });

  describe('6. Effective Permissions Resolution & Caching', () => {
    it('returns effective permissions for current user (/api/v1/rbac/me/permissions)', async () => {
      const res = await request(app)
        .get('/api/v1/rbac/me/permissions')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.roles).toContain('TEACHER');
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
      expect(res.body.data.permissions).toContain('attendance:mark');
    });

    it('grants Super Admin all permissions regardless of specific role assignment', async () => {
      const res = await request(app)
        .get('/api/v1/rbac/me/permissions')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.roles).toContain('SUPER_ADMIN');
      expect(res.body.data.permissions.length).toBeGreaterThanOrEqual(70);
    });

    it('invalidates user permission cache when role assignments change', async () => {
      // Create a temporary role
      const role = await rbacService.createRole(tenantId.toString(), {
        name: 'Temp Role',
      });

      // Get initial permissions
      const initial = await rbacService.getEffectivePermissions(tenantId.toString(), staffUserId);
      expect(initial.roles).not.toContain('Temp Role');

      // Assign role
      await rbacService.assignRoleToUser(tenantId.toString(), staffUserId, role.id);

      // Should reflect immediately because cache was invalidated
      const updated = await rbacService.getEffectivePermissions(tenantId.toString(), staffUserId);
      expect(updated.roles).toContain('Temp Role');

      // Cleanup
      await rbacService.removeRoleFromUser(tenantId.toString(), staffUserId, role.id);
      await rbacService.deleteRole(tenantId.toString(), role.id);
    });
  });
});
