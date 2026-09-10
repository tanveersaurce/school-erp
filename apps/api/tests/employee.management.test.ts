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
  Session,
  VerificationToken,
  Department,
  Designation,
  Employee,
  TeacherProfile,
  Counter,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  CampusStatus,
  TenantPlan,
  TenantBillingStatus,
  EmploymentStatus,
  EmploymentType,
  Gender,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { emailService } from '../src/modules/auth/email.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Employee, Staff & Teacher Management Suite (Phase 6)', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();

  let schoolAdminToken: string;
  let hrRoleDocId: string;
  let createdDeptId: string;
  let createdDesigId: string;
  let createdEmployeeId: string;
  let createdTeacherEmpId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // 1. Seed Tenant
    await Tenant.create({
      _id: tenantId,
      name: 'Springfield School District',
      slug: 'springfield',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
      features: { maxStudents: 2000, modulesEnabled: ['ALL'], customBranding: true },
    });

    // 2. Seed School
    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Springfield High School',
      code: 'SF-01',
      affiliationBoard: 'CBSE',
      contact: { email: 'admin@springfield.edu', phone: '9876543210' },
      address: {
        street: '742 Evergreen Terrace',
        city: 'Springfield',
        state: 'Oregon',
        postalCode: '97477',
        country: 'USA',
      },
      timezone: 'America/Los_Angeles',
      currency: 'USD',
      settings: {
        numbering: {
          employeeIdPrefix: 'SF-EMP',
        },
      },
    });

    // 3. Seed Campus
    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Main Campus',
      code: 'SF-MC',
      address: {
        street: '742 Evergreen Terrace',
        city: 'Springfield',
        state: 'Oregon',
        postalCode: '97477',
        country: 'USA',
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
    for (const roleDef of SYSTEM_ROLES) {
      const roleDoc = await Role.create({
        tenantId,
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: true,
      });

      if (roleDef.name === 'HR_MANAGER') {
        hrRoleDocId = roleDoc._id.toString();
      }

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

    // 6. School Admin User
    const adminUser = await User.create({
      tenantId,
      schoolId,
      email: 'school.admin@springfield.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    });

    const adminRole = await Role.findOne({ tenantId, name: 'SCHOOL_ADMIN' });
    await UserRole.create({
      tenantId,
      userId: adminUser._id,
      roleId: adminRole!._id,
      schoolId,
    });

    // Login as School Admin
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'springfield.edusphere.io')
      .send({ email: 'school.admin@springfield.edu', password: 'Admin@123456' });

    schoolAdminToken = adminLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // 1. Department Management
  // =========================================================================
  describe('Department Management', () => {
    it('should create a department successfully', async () => {
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          name: 'Mathematics',
          code: 'MATH',
          description: 'Department of Pure and Applied Mathematics',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Mathematics');
      expect(res.body.data.code).toBe('MATH');
      expect(res.body.data.status).toBe('ACTIVE');

      createdDeptId = res.body.data.id;
    });

    it('should prevent creating duplicate department code within the same school', async () => {
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          name: 'Math Secondary',
          code: 'MATH',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/already exists/);
    });

    it('should retrieve list of departments with employee count', async () => {
      const res = await request(app)
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].employeeCount).toBeDefined();
    });

    it('should update department details successfully', async () => {
      const res = await request(app)
        .patch(`/api/v1/departments/${createdDeptId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          description: 'Updated Department of Mathematics and Statistics',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe('Updated Department of Mathematics and Statistics');
    });
  });

  // =========================================================================
  // 2. Designation Management
  // =========================================================================
  describe('Designation Management', () => {
    it('should create a designation successfully', async () => {
      const res = await request(app)
        .post('/api/v1/designations')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          name: 'Senior Teacher',
          code: 'SR-TCH',
          departmentId: createdDeptId,
          description: 'Senior Subject Instructor',
          level: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Senior Teacher');
      expect(res.body.data.code).toBe('SR-TCH');
      expect(res.body.data.level).toBe(2);

      createdDesigId = res.body.data.id;
    });

    it('should prevent duplicate designation code within the same school', async () => {
      const res = await request(app)
        .post('/api/v1/designations')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          name: 'Senior Teacher Duplicate',
          code: 'SR-TCH',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/already exists/);
    });

    it('should retrieve designations with department name populated', async () => {
      const res = await request(app)
        .get('/api/v1/designations')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].departmentName).toBe('Mathematics');
    });
  });

  // =========================================================================
  // 3. Atomic Employee ID Generation
  // =========================================================================
  describe('Employee ID Generation', () => {
    it('should generate sequential, collision-safe employee IDs based on school settings', async () => {
      const res1 = await request(app)
        .get('/api/v1/employees/next-id')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io');

      expect(res1.status).toBe(200);
      expect(res1.body.data.nextEmployeeId).toBe('SF-EMP-0001');

      const res2 = await request(app)
        .get('/api/v1/employees/next-id')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io');

      expect(res2.status).toBe(200);
      expect(res2.body.data.nextEmployeeId).toBe('SF-EMP-0002');
    });
  });

  // =========================================================================
  // 4. Employee Lifecycle & Provisioning
  // =========================================================================
  describe('Employee Creation & Account Provisioning', () => {
    it('should register an employee without user account and auto-assign next ID', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          campusId: campusId.toString(),
          firstName: 'John',
          lastName: 'Doe',
          gender: Gender.MALE,
          dateOfBirth: '1985-05-15',
          workEmail: 'john.doe@springfield.edu',
          workPhone: '555-0101',
          departmentId: createdDeptId,
          designationId: createdDesigId,
          employmentType: EmploymentType.FULL_TIME,
          joiningDate: '2024-01-10',
          emergencyContact: {
            name: 'Jane Doe',
            relationship: 'Spouse',
            phone: '555-0102',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeId).toBe('SF-EMP-0003');
      expect(res.body.data.displayName).toBe('John Doe');
      expect(res.body.data.userId).toBeUndefined();

      createdEmployeeId = res.body.data.id;
    });

    it('should register an employee with direct active user account provisioning', async () => {
      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          campusId: campusId.toString(),
          firstName: 'Sarah',
          lastName: 'Connor',
          gender: Gender.FEMALE,
          dateOfBirth: '1990-08-20',
          workEmail: 'sarah.connor@springfield.edu',
          workPhone: '555-0201',
          departmentId: createdDeptId,
          designationId: createdDesigId,
          employmentType: EmploymentType.FULL_TIME,
          joiningDate: '2024-02-01',
          emergencyContact: {
            name: 'Kyle Reese',
            relationship: 'Partner',
            phone: '555-0202',
          },
          provisionUser: true,
          initialPassword: 'Password@123456',
          roles: [hrRoleDocId],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBeDefined();

      const user = await User.findById(res.body.data.userId);
      expect(user).not.toBeNull();
      expect(user?.status).toBe(UserStatus.ACTIVE);

      // Verify Role assignment
      const userRole = await UserRole.findOne({ userId: user!._id });
      expect(userRole).not.toBeNull();
      expect(userRole?.roleId.toString()).toBe(hrRoleDocId);
    });

    it('should register an employee with token-based email invitation flow', async () => {
      emailService.clearSentEmails();

      const res = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          campusId: campusId.toString(),
          firstName: 'Albert',
          lastName: 'Einstein',
          gender: Gender.MALE,
          dateOfBirth: '1979-03-14',
          workEmail: 'albert.einstein@springfield.edu',
          workPhone: '555-0301',
          departmentId: createdDeptId,
          designationId: createdDesigId,
          employmentType: EmploymentType.FULL_TIME,
          joiningDate: '2024-03-01',
          emergencyContact: {
            name: 'Mileva Maric',
            relationship: 'Spouse',
            phone: '555-0302',
          },
          provisionUser: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBeDefined();

      createdTeacherEmpId = res.body.data.id;

      // Verify User is PENDING_VERIFICATION
      const user = await User.findById(res.body.data.userId);
      expect(user?.status).toBe(UserStatus.PENDING_VERIFICATION);

      // Verify VerificationToken generated with 48h expiration
      const tokenDoc = await VerificationToken.findOne({
        userId: user!._id,
        tokenType: 'STAFF_INVITATION',
      });
      expect(tokenDoc).not.toBeNull();
      expect(tokenDoc?.isUsed).toBe(false);

      // Verify Invitation Email dispatched
      const sentEmail = emailService.getLastSentEmail();
      expect(sentEmail).toBeDefined();
      expect(sentEmail?.to).toBe('albert.einstein@springfield.edu');
      expect(sentEmail?.subject).toMatch(/Complete Your Staff Account Setup/);
    });

    it('should retrieve paginated employee directory with filters', async () => {
      const res = await request(app)
        .get('/api/v1/employees')
        .query({ search: 'Einstein', departmentId: createdDeptId })
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].lastName).toBe('Einstein');
      expect(res.body.meta.pagination.totalRecords).toBe(1);
    });

    it('should update employee details', async () => {
      const res = await request(app)
        .patch(`/api/v1/employees/${createdEmployeeId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          personalPhone: '555-9999',
          currentAddress: '123 Test Street, Springfield',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.personalPhone).toBe('555-9999');
      expect(res.body.data.currentAddress).toBe('123 Test Street, Springfield');
    });
  });

  // =========================================================================
  // 5. Employee Status Transitions & Cascading Revocation
  // =========================================================================
  describe('Status Transitions & Session Revocation', () => {
    let targetEmployeeUserId: string;
    let targetEmployeeRecordId: string;

    beforeAll(async () => {
      // Create an employee with an active user account and active session
      const createRes = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          campusId: campusId.toString(),
          firstName: 'Robert',
          lastName: 'Oppenheimer',
          gender: Gender.MALE,
          dateOfBirth: '1980-04-22',
          workEmail: 'oppenheimer@springfield.edu',
          departmentId: createdDeptId,
          designationId: createdDesigId,
          joiningDate: '2024-01-01',
          emergencyContact: {
            name: 'Katherine',
            relationship: 'Spouse',
            phone: '555-0402',
          },
          provisionUser: true,
          initialPassword: 'Password@123456',
        });

      targetEmployeeRecordId = createRes.body.data.id;
      targetEmployeeUserId = createRes.body.data.userId;

      // Simulate an active user session in DB
      await Session.create({
        tenantId,
        userId: new Types.ObjectId(targetEmployeeUserId),
        tokenFamilyId: 'fam-oppenheimer-1',
        refreshTokenHash: 'dummy-hash',
        deviceName: 'Work Laptop',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
      });
    });

    it('should transition status to SUSPENDED, suspend user, and revoke active sessions', async () => {
      const res = await request(app)
        .post(`/api/v1/employees/${targetEmployeeRecordId}/status`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          status: EmploymentStatus.SUSPENDED,
          reason: 'Internal inquiry pending',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employmentStatus).toBe(EmploymentStatus.SUSPENDED);

      // Verify User status updated to SUSPENDED
      const user = await User.findById(targetEmployeeUserId);
      expect(user?.status).toBe(UserStatus.SUSPENDED);

      // Verify Sessions revoked
      const activeSessions = await Session.find({
        userId: new Types.ObjectId(targetEmployeeUserId),
        isRevoked: false,
      });
      expect(activeSessions.length).toBe(0);
    });

    it('should transition status to TERMINATED and deactivate user account', async () => {
      const res = await request(app)
        .post(`/api/v1/employees/${targetEmployeeRecordId}/status`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          status: EmploymentStatus.TERMINATED,
          reason: 'Contract concluded',
          effectiveDate: new Date().toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employmentStatus).toBe(EmploymentStatus.TERMINATED);
      expect(res.body.data.terminationReason).toBe('Contract concluded');

      const user = await User.findById(targetEmployeeUserId);
      expect(user?.status).toBe(UserStatus.DEACTIVATED);
    });

    it('should enforce terminal state guards: prevent transitioning TERMINATED back to PROBATION', async () => {
      const res = await request(app)
        .post(`/api/v1/employees/${targetEmployeeRecordId}/status`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          status: EmploymentStatus.PROBATION,
          reason: 'Invalid state attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Cannot transition employee from terminal state/);
    });
  });

  // =========================================================================
  // 6. Teacher Profile Specialization
  // =========================================================================
  describe('Teacher Academic Profiles', () => {
    it('should create teacher profile linked to existing employee', async () => {
      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          employeeId: createdTeacherEmpId,
          primarySubject: 'Theoretical Physics',
          secondarySubjects: ['Calculus', 'Astrophysics'],
          specialization: 'Relativity and Quantum Theory',
          teachingExperienceYears: 15,
          maxWeeklyPeriods: 24,
          isAvailableForTimetable: true,
          bio: 'Nobel laureate physics lecturer.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.primarySubject).toBe('Theoretical Physics');
      expect(res.body.data.employeeDetails.name).toBe('Albert Einstein');
      expect(res.body.data.secondarySubjects).toContain('Calculus');
    });

    it('should prevent duplicate teacher profiles for the same employee', async () => {
      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io')
        .send({
          employeeId: createdTeacherEmpId,
          primarySubject: 'Duplicate Physics',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/already exists/);
    });

    it('should query teachers with subject and timetable availability filters', async () => {
      const res = await request(app)
        .get('/api/v1/teachers')
        .query({ primarySubject: 'Physics', isAvailableForTimetable: true })
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].primarySubject).toBe('Theoretical Physics');
    });
  });

  // =========================================================================
  // 7. Relational Integrity Checks
  // =========================================================================
  describe('Integrity & Deletion Guards', () => {
    it('should reject deleting a department when active employees are assigned', async () => {
      const res = await request(app)
        .delete(`/api/v1/departments/${createdDeptId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io');

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/currently assigned to/);
    });

    it('should reject deleting a designation when active employees are assigned', async () => {
      const res = await request(app)
        .delete(`/api/v1/designations/${createdDesigId}`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .set('Host', 'springfield.edusphere.io');

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/currently assigned to/);
    });
  });
});
