import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import {
  Tenant,
  School,
  Campus,
  AcademicYear,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  AuditLog,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  CampusStatus,
  AcademicYearStatus,
  TenantPlan,
  TenantBillingStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('School, Tenant & Organization Management Suite (Phase 5)', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();

  let superAdminToken: string;
  let schoolAdminToken: string;
  let teacherToken: string;
  let createdCampusId: string;
  let createdAyId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // 1. Seed Tenant
    await Tenant.create({
      _id: tenantId,
      name: 'Oakridge Educational Foundation',
      slug: 'oakridge',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
      features: { maxStudents: 2000, modulesEnabled: ['ALL'], customBranding: true },
    });

    // 2. Seed School
    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Oakridge World Academy',
      code: 'OWA-01',
      affiliationBoard: 'IB',
      contact: { email: 'contact@oakridge.edu', phone: '9876543210' },
      address: {
        street: '12 Elite Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
      },
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      branding: { displayName: 'Oakridge Academy', primaryColor: '#4f46e5' },
    });

    // 3. Seed Campus
    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Primary Campus',
      code: 'OWA-PC',
      address: {
        street: '12 Elite Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
      },
      status: CampusStatus.ACTIVE,
    });

    // 4. Seed Permissions
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

    // 5. Seed Roles
    const roleMap = new Map<string, Types.ObjectId>();
    for (const roleDef of SYSTEM_ROLES) {
      const roleDoc = await Role.create({
        tenantId,
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
          permsToAssign.map((pId) => ({ tenantId, roleId: roleDoc._id, permissionId: pId }))
        );
      }
    }

    const passwordHash = await passwordService.hashPassword('Admin@123456');

    // 6. Super Admin User
    await User.create({
      tenantId,
      schoolId,
      email: 'platform.super@edusphere.io',
      firstName: 'Platform',
      lastName: 'Admin',
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    const superUser = await User.findOne({ email: 'platform.super@edusphere.io' });
    await UserRole.create({ tenantId, userId: superUser!._id, roleId: roleMap.get('SUPER_ADMIN') });

    // 7. School Admin User
    await User.create({
      tenantId,
      schoolId,
      email: 'school.admin@oakridge.edu',
      firstName: 'Arthur',
      lastName: 'Pendleton',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    const adminUser = await User.findOne({ email: 'school.admin@oakridge.edu' });
    await UserRole.create({
      tenantId,
      userId: adminUser!._id,
      roleId: roleMap.get('SCHOOL_ADMIN'),
    });

    // 8. Teacher User
    await User.create({
      tenantId,
      schoolId,
      email: 'teacher@oakridge.edu',
      firstName: 'Sarah',
      lastName: 'Connor',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    const teacherUser = await User.findOne({ email: 'teacher@oakridge.edu' });
    await UserRole.create({ tenantId, userId: teacherUser!._id, roleId: roleMap.get('TEACHER') });

    // Authenticate and obtain tokens
    const superLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'platform.super@edusphere.io',
      password: 'Admin@123456',
    });
    superAdminToken = superLogin.body.data.accessToken;

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'school.admin@oakridge.edu',
      password: 'Admin@123456',
    });
    schoolAdminToken = adminLogin.body.data.accessToken;

    const teacherLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'teacher@oakridge.edu',
      password: 'Admin@123456',
    });
    teacherToken = teacherLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // 1. Tenant Onboarding Flow (Atomic Multi-Entity Provisioning)
  // =========================================================================
  describe('1. Tenant Onboarding Flow', () => {
    it('successfully onboards a new tenant organization with school, campus, academic year, and initial admin', async () => {
      const payload = {
        tenantName: 'Delhi Heritage Public Trust',
        slug: 'delhi-heritage',
        schoolName: 'Delhi Heritage International School',
        schoolCode: 'DHIS-01',
        affiliationBoard: 'CBSE',
        campusName: 'Main Campus Vasant Kunj',
        campusCode: 'VK-MAIN',
        academicYearName: '2026-2027',
        academicYearStartDate: '2026-04-01T00:00:00.000Z',
        academicYearEndDate: '2027-03-31T00:00:00.000Z',
        adminEmail: 'principal@delhiheritage.edu',
        adminPassword: 'SecurePassword@2026',
        adminFirstName: 'Rajesh',
        adminLastName: 'Khanna',
        adminPhone: '9811223344',
      };

      const res = await request(app).post('/api/v1/tenants/onboard').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tenant.slug).toBe('delhi-heritage');
      expect(res.body.data.school.code).toBe('DHIS-01');
      expect(res.body.data.campus.code).toBe('VK-MAIN');
      expect(res.body.data.academicYear.isCurrent).toBe(true);
      expect(res.body.data.adminUserId).toBeDefined();

      // Verify records in DB
      const tenantDoc = await Tenant.findOne({ slug: 'delhi-heritage' });
      expect(tenantDoc).not.toBeNull();
      expect(tenantDoc?.status).toBe(TenantStatus.ACTIVE);

      const userDoc = await User.findOne({ email: 'principal@delhiheritage.edu' });
      expect(userDoc).not.toBeNull();
      expect(userDoc?.userType).toBe(UserType.SCHOOL_ADMIN);

      // Verify user role assignment
      const userRoleDoc = await UserRole.findOne({ userId: userDoc!._id });
      expect(userRoleDoc).not.toBeNull();

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'TENANT_ONBOARDED',
        entityId: tenantDoc!._id.toString(),
      });
      expect(audit).not.toBeNull();
    });

    it('rejects duplicate tenant slug with 409 Conflict', async () => {
      const res = await request(app).post('/api/v1/tenants/onboard').send({
        tenantName: 'Duplicate Slug School',
        slug: 'delhi-heritage', // Already used
        schoolName: 'Duplicate School',
        schoolCode: 'DS-01',
        affiliationBoard: 'CBSE',
        campusName: 'Main Campus',
        campusCode: 'DS-MAIN',
        academicYearName: '2026-2027',
        academicYearStartDate: '2026-04-01T00:00:00.000Z',
        academicYearEndDate: '2027-03-31T00:00:00.000Z',
        adminEmail: 'different@email.com',
        adminPassword: 'SecurePassword@2026',
        adminFirstName: 'Test',
        adminLastName: 'User',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RESOURCE_CONFLICT');
    });

    it('rejects duplicate admin email with 409 Conflict', async () => {
      const res = await request(app).post('/api/v1/tenants/onboard').send({
        tenantName: 'New Unique Trust',
        slug: 'unique-trust-99',
        schoolName: 'Unique School',
        schoolCode: 'US-01',
        affiliationBoard: 'CBSE',
        campusName: 'Main Campus',
        campusCode: 'US-MAIN',
        academicYearName: '2026-2027',
        academicYearStartDate: '2026-04-01T00:00:00.000Z',
        academicYearEndDate: '2027-03-31T00:00:00.000Z',
        adminEmail: 'principal@delhiheritage.edu', // Already registered
        adminPassword: 'SecurePassword@2026',
        adminFirstName: 'Test',
        adminLastName: 'User',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('RESOURCE_CONFLICT');
    });

    it('rejects invalid onboarding payload with 422 Validation Error', async () => {
      const res = await request(app).post('/api/v1/tenants/onboard').send({
        tenantName: 'AB', // Min length 3
        slug: 'Invalid Slug With Caps!',
      });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  // =========================================================================
  // 2. Platform Tenant Administration (SUPER_ADMIN)
  // =========================================================================
  describe('2. Platform Tenant Administration (SUPER_ADMIN)', () => {
    it('allows SUPER_ADMIN to list tenants with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta.pagination).toBeDefined();
    });

    it('forbids non-SUPER_ADMIN users from accessing platform tenant list', async () => {
      const res = await request(app)
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ACCESS');
    });

    it('allows SUPER_ADMIN to update tenant subscription and branding features', async () => {
      const res = await request(app)
        .patch(`/api/v1/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          plan: TenantPlan.ENTERPRISE,
          features: {
            maxStudents: 5000,
            modulesEnabled: ['ACADEMICS', 'ATTENDANCE', 'FEES', 'EXAMS', 'TRANSPORT', 'HOSTEL'],
            customBranding: true,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.plan).toBe(TenantPlan.ENTERPRISE);
      expect(res.body.data.features.maxStudents).toBe(5000);
    });

    it('allows SUPER_ADMIN to suspend and restore a tenant', async () => {
      const tempTenant = await Tenant.create({
        name: 'Temporary Test Academy',
        slug: 'temp-test-academy',
        plan: TenantPlan.STARTER,
        status: TenantStatus.ACTIVE,
        features: {
          maxStudents: 500,
          modulesEnabled: ['ACADEMICS'],
          customBranding: false,
        },
      });

      // 1. Suspend
      const suspendRes = await request(app)
        .post(`/api/v1/tenants/${tempTenant._id}/suspend`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Overdue billing payment' });

      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.status).toBe(TenantStatus.SUSPENDED);

      // Verify DB state
      const tDoc = await Tenant.findById(tempTenant._id);
      expect(tDoc?.status).toBe(TenantStatus.SUSPENDED);

      // 2. Restore
      const restoreRes = await request(app)
        .post(`/api/v1/tenants/${tempTenant._id}/restore`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.status).toBe(TenantStatus.ACTIVE);
    });
  });

  // =========================================================================
  // 3. School Profile, Settings & Branding
  // =========================================================================
  describe('3. School Profile, Settings & Branding', () => {
    it('retrieves current school profile for authenticated School Admin', async () => {
      const res = await request(app)
        .get('/api/v1/schools/profile')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Oakridge World Academy');
      expect(res.body.data.code).toBe('OWA-01');
      expect(res.body.data.timezone).toBe('Asia/Kolkata');
    });

    it('updates school profile details with validation and audit trail', async () => {
      const res = await request(app)
        .patch('/api/v1/schools/profile')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Oakridge International Academy',
          legalName: 'Oakridge Educational Trust Ltd.',
          affiliationBoard: 'IB / Cambridge',
          establishedYear: 2005,
          contact: {
            email: 'admin@oakridge.edu',
            phone: '9988776655',
            website: 'https://www.oakridge.edu',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Oakridge International Academy');
      expect(res.body.data.establishedYear).toBe(2005);

      const audit = await AuditLog.findOne({
        action: 'SCHOOL_PROFILE_UPDATED',
        tenantId,
      });
      expect(audit).not.toBeNull();
    });

    it('retrieves and updates school operational settings', async () => {
      const getRes = await request(app)
        .get('/api/v1/schools/settings')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.general).toBeDefined();

      const updateRes = await request(app)
        .patch('/api/v1/schools/settings')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          general: {
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24H',
            weekStartDay: 'MONDAY',
            defaultLanguage: 'en',
          },
          numbering: {
            admissionNumberPrefix: 'OWA-ADM',
            invoicePrefix: 'OWA-INV',
            receiptPrefix: 'OWA-REC',
            employeeIdPrefix: 'OWA-EMP',
          },
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.general.timeFormat).toBe('24H');
      expect(updateRes.body.data.numbering.admissionNumberPrefix).toBe('OWA-ADM');
    });

    it('retrieves and updates school branding configuration', async () => {
      const updateRes = await request(app)
        .patch('/api/v1/schools/branding')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          displayName: 'Oakridge Global School',
          primaryColor: '#6366f1',
          secondaryColor: '#0ea5e9',
          reportCardHeader: 'Official Grade Report Card',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.primaryColor).toBe('#6366f1');
      expect(updateRes.body.data.displayName).toBe('Oakridge Global School');
    });

    it('rejects profile and settings updates from users lacking permission (Teacher)', async () => {
      const res = await request(app)
        .patch('/api/v1/schools/profile')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ name: 'Hacked School Name' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ACCESS');
    });
  });

  // =========================================================================
  // 4. Campus Management (Campus / Branch)
  // =========================================================================
  describe('4. Campus Management', () => {
    it('creates a new campus site under the school', async () => {
      const res = await request(app)
        .post('/api/v1/campuses')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'North Bangalore Campus',
          code: 'OWA-NC',
          address: {
            street: '45 Tech Boulevard',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560064',
            country: 'India',
          },
          contact: {
            email: 'north.campus@oakridge.edu',
            phone: '9876500001',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('North Bangalore Campus');
      expect(res.body.data.code).toBe('OWA-NC');
      createdCampusId = res.body.data.id;
    });

    it('rejects duplicate campus code within the same school with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/campuses')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Another Campus with Duplicate Code',
          code: 'OWA-NC', // Duplicate
          address: {
            street: '100 Road',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560001',
            country: 'India',
          },
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('RESOURCE_CONFLICT');
    });

    it('lists campuses for the authenticated tenant', async () => {
      const res = await request(app)
        .get('/api/v1/campuses')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('updates campus details', async () => {
      const res = await request(app)
        .patch(`/api/v1/campuses/${createdCampusId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Oakridge North Campus & Innovation Hub',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Oakridge North Campus & Innovation Hub');
    });

    it('archives a campus site', async () => {
      const res = await request(app)
        .post(`/api/v1/campuses/${createdCampusId}/archive`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(CampusStatus.ARCHIVED);
    });
  });

  // =========================================================================
  // 5. Academic Year Calendar Management
  // =========================================================================
  describe('5. Academic Year Calendar Management', () => {
    it('creates an academic calendar year in DRAFT status', async () => {
      const res = await request(app)
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          campusId: campusId.toString(),
          name: '2026-2027',
          startDate: '2026-06-01T00:00:00.000Z',
          endDate: '2027-04-30T00:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('2026-2027');
      expect(res.body.data.status).toBe(AcademicYearStatus.DRAFT);
      expect(res.body.data.isCurrent).toBe(false);
      createdAyId = res.body.data.id;
    });

    it('rejects academic year creation when start date is after end date', async () => {
      const res = await request(app)
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          campusId: campusId.toString(),
          name: '2028-2029',
          startDate: '2029-06-01T00:00:00.000Z', // Inverted
          endDate: '2028-04-30T00:00:00.000Z',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('activates academic year and atomically sets as current session', async () => {
      // 1. Activate created year
      const res = await request(app)
        .post(`/api/v1/academic-years/${createdAyId}/activate`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(AcademicYearStatus.ACTIVE);
      expect(res.body.data.isCurrent).toBe(true);

      // 2. Resolve current academic year
      const currentRes = await request(app)
        .get('/api/v1/academic-years/current')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(currentRes.status).toBe(200);
      expect(currentRes.body.data.id).toBe(createdAyId);
      expect(currentRes.body.data.isCurrent).toBe(true);
    });

    it('closes an active academic year session preserving historical records', async () => {
      const res = await request(app)
        .post(`/api/v1/academic-years/${createdAyId}/close`)
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(AcademicYearStatus.CLOSED);
      expect(res.body.data.isCurrent).toBe(false);

      // Verify DB record is NOT deleted
      const ayDoc = await AcademicYear.findById(createdAyId);
      expect(ayDoc).not.toBeNull();
      expect(ayDoc?.isDeleted).toBe(false);
      expect(ayDoc?.status).toBe(AcademicYearStatus.CLOSED);
    });
  });
});
