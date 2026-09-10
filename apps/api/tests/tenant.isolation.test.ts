import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import {
  Tenant,
  School,
  Campus,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Student,
  runWithTenantContext,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  CampusStatus,
  TenantPlan,
  TenantBillingStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Multi-Tenant Zero-Trust Isolation & Anti-Tampering Suite (Phase 5)', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantAId = new Types.ObjectId();
  const schoolAId = new Types.ObjectId();
  const campusAId = new Types.ObjectId();

  const tenantBId = new Types.ObjectId();
  const schoolBId = new Types.ObjectId();
  const campusBId = new Types.ObjectId();

  const suspendedTenantId = new Types.ObjectId();

  let tenantAUserToken: string;
  let tenantBUserToken: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // 1. Seed Tenant A & Organization
    await Tenant.create({
      _id: tenantAId,
      name: 'St. Jude Educational Group',
      slug: 'st-jude',
      customDomain: 'portal.stjude.edu',
      plan: TenantPlan.GROWTH,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
    });

    await School.create({
      _id: schoolAId,
      tenantId: tenantAId,
      name: 'St. Jude High School',
      code: 'SJH',
      affiliationBoard: 'ICSE',
      status: 'ACTIVE',
    });

    await Campus.create({
      _id: campusAId,
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'St. Jude Main Campus',
      code: 'SJH-01',
      address: {
        street: '10 Convent Rd',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      status: CampusStatus.ACTIVE,
    });

    // 2. Seed Tenant B & Organization
    await Tenant.create({
      _id: tenantBId,
      name: 'National Model Society',
      slug: 'national-model',
      customDomain: 'erp.nationalmodel.org',
      plan: TenantPlan.STARTER,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
    });

    await School.create({
      _id: schoolBId,
      tenantId: tenantBId,
      name: 'National Model Public School',
      code: 'NMPS',
      affiliationBoard: 'CBSE',
      status: 'ACTIVE',
    });

    await Campus.create({
      _id: campusBId,
      tenantId: tenantBId,
      schoolId: schoolBId,
      name: 'National Model Campus',
      code: 'NMPS-01',
      address: {
        street: '88 Model Town',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110009',
        country: 'India',
      },
      status: CampusStatus.ACTIVE,
    });

    // 3. Seed Suspended Tenant
    await Tenant.create({
      _id: suspendedTenantId,
      name: 'Suspended Academy',
      slug: 'suspended-academy',
      plan: TenantPlan.STARTER,
      billingStatus: TenantBillingStatus.SUSPENDED,
      status: TenantStatus.SUSPENDED,
    });

    // 4. Permissions & Roles
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

    const seedRolesForTenant = async (tId: Types.ObjectId) => {
      const roleMap = new Map<string, Types.ObjectId>();
      for (const roleDef of SYSTEM_ROLES) {
        const roleDoc = await Role.create({
          tenantId: tId,
          name: roleDef.name,
          description: roleDef.description,
          isSystemRole: true,
        });
        roleMap.set(roleDef.name, roleDoc._id as Types.ObjectId);

        const permsToAssign: Types.ObjectId[] = [];
        if (roleDef.permissions.includes('*')) {
          for (const pId of permissionMap.values()) permsToAssign.push(pId);
        } else {
          for (const pStr of roleDef.permissions) {
            const pId = permissionMap.get(pStr.toLowerCase().trim());
            if (pId) permsToAssign.push(pId);
          }
        }
        if (permsToAssign.length > 0) {
          await RolePermission.insertMany(
            permsToAssign.map((pId) => ({ tenantId: tId, roleId: roleDoc._id, permissionId: pId }))
          );
        }
      }
      return roleMap;
    };

    const rolesA = await seedRolesForTenant(tenantAId);
    const rolesB = await seedRolesForTenant(tenantBId);

    const passwordHash = await passwordService.hashPassword('Password@123');

    // 5. Seed Users
    const userA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'admin@stjude.edu',
      firstName: 'Jude',
      lastName: 'Admin',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    await UserRole.create({
      tenantId: tenantAId,
      userId: userA._id,
      roleId: rolesA.get('SCHOOL_ADMIN'),
    });

    const userB = await User.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      email: 'admin@nationalmodel.org',
      firstName: 'Model',
      lastName: 'Admin',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    await UserRole.create({
      tenantId: tenantBId,
      userId: userB._id,
      roleId: rolesB.get('SCHOOL_ADMIN'),
    });

    // Login tokens
    const loginA = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@stjude.edu',
      password: 'Password@123',
    });
    tenantAUserToken = loginA.body.data.accessToken;

    const loginB = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@nationalmodel.org',
      password: 'Password@123',
    });
    tenantBUserToken = loginB.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // 1. Dynamic Resolution via Headers & Hostnames
  // =========================================================================
  describe('1. Dynamic Tenant Resolution', () => {
    it('resolves tenant via x-tenant-slug header', async () => {
      const res = await request(app)
        .get('/api/v1/schools/profile')
        .set('Authorization', `Bearer ${tenantAUserToken}`)
        .set('x-tenant-slug', 'st-jude');

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('St. Jude High School');
    });

    it('resolves tenant via custom domain host header', async () => {
      const res = await request(app)
        .get('/api/v1/schools/profile')
        .set('Authorization', `Bearer ${tenantAUserToken}`)
        .set('Host', 'portal.stjude.edu');

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('St. Jude High School');
    });

    it('resolves tenant via subdomain host header', async () => {
      const res = await request(app)
        .get('/api/v1/schools/profile')
        .set('Authorization', `Bearer ${tenantBUserToken}`)
        .set('Host', 'national-model.edusphere.io');

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('National Model Public School');
    });

    it('returns 404 for unknown tenant subdomain', async () => {
      const res = await request(app)
        .get('/api/v1/schools/profile')
        .set('Host', 'non-existent-school.edusphere.io');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  // =========================================================================
  // 2. Cross-Tenant Anti-Tampering Security
  // =========================================================================
  describe('2. Cross-Tenant Anti-Tampering Defense', () => {
    it('rejects cross-tenant spoofing when token tenant does not match resolved tenant header', async () => {
      // User A (St. Jude) sends request targeting Tenant B (national-model)
      const res = await request(app)
        .get('/api/v1/schools/profile')
        .set('Authorization', `Bearer ${tenantAUserToken}`)
        .set('x-tenant-slug', 'national-model');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CROSS_TENANT_ACCESS_DENIED');
    });

    it('rejects cross-tenant access to another tenant campus resource', async () => {
      // User A attempts to read Tenant B's campus directly
      const res = await request(app)
        .get(`/api/v1/campuses/${campusBId}`)
        .set('Authorization', `Bearer ${tenantAUserToken}`);

      expect(res.status).toBe(404);
    });

    it('rejects cross-tenant campus update', async () => {
      // User A attempts to patch Tenant B's campus
      const res = await request(app)
        .patch(`/api/v1/campuses/${campusBId}`)
        .set('Authorization', `Bearer ${tenantAUserToken}`)
        .send({ name: 'Hacked Campus Name' });

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // 3. Suspended Tenant Access Protection
  // =========================================================================
  describe('3. Suspended Tenant Protection', () => {
    it('rejects any request targeting a suspended tenant with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/schools/profile')
        .set('x-tenant-slug', 'suspended-academy');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ACCESS');
      expect(res.body.error.message).toContain('suspended');
    });
  });

  // =========================================================================
  // 4. AsyncLocalStorage Automatic Query Scoping & Mongoose Plugin
  // =========================================================================
  describe('4. AsyncLocalStorage Automatic Query Scoping & Plugin', () => {
    it('automatically scopes queries to the active tenant in AsyncLocalStorage without explicit filter', async () => {
      // Run find within Tenant A context
      const schoolsA = await runWithTenantContext({ tenantId: tenantAId.toString() }, async () => {
        return School.find({});
      });

      expect(schoolsA).toHaveLength(1);
      expect(schoolsA[0].name).toBe('St. Jude High School');

      // Run find within Tenant B context
      const schoolsB = await runWithTenantContext({ tenantId: tenantBId.toString() }, async () => {
        return School.find({});
      });

      expect(schoolsB).toHaveLength(1);
      expect(schoolsB[0].name).toBe('National Model Public School');
    });

    it('automatically stamps new documents with tenantId from active AsyncLocalStorage context', async () => {
      await runWithTenantContext(
        { tenantId: tenantAId.toString(), schoolId: schoolAId.toString() },
        async () => {
          const student = await Student.create({
            schoolId: schoolAId,
            admissionNumber: 'AUTO-001',
            personalDetails: {
              firstName: 'Leo',
              lastName: 'Tolstoy',
              dateOfBirth: new Date('2014-05-10'),
              gender: 'MALE',
            },
            contactDetails: {
              emergencyPhone: '9876543210',
              currentAddress: 'Moscow St',
            },
            currentStatus: 'ACTIVE',
          });

          expect(student.tenantId.toString()).toBe(tenantAId.toString());
        }
      );
    });

    it('prohibits cross-tenant document creation if explicit tenantId conflicts with ALS context', async () => {
      await expect(
        runWithTenantContext({ tenantId: tenantAId.toString() }, async () => {
          return Student.create({
            tenantId: tenantBId, // Conflict with Tenant A context!
            schoolId: schoolBId,
            admissionNumber: 'HACK-001',
            personalDetails: {
              firstName: 'Malicious',
              lastName: 'User',
              dateOfBirth: new Date('2014-05-10'),
              gender: 'MALE',
            },
            contactDetails: {
              emergencyPhone: '9876543210',
              currentAddress: 'Unknown',
            },
            currentStatus: 'ACTIVE',
          });
        })
      ).rejects.toThrow(/Cross-tenant mutation prohibited/);
    });
  });
});
