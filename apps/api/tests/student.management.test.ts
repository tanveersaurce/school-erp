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
  Session,
  VerificationToken,
  Student,
  Parent,
  StudentParentRelation,
  StudentEnrollment,
  Counter,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  CampusStatus,
  AcademicYearStatus,
  TenantPlan,
  TenantBillingStatus,
  StudentStatus,
  Gender,
  GuardianRelationType,
  StudentDocumentType,
  DocumentVerificationStatus,
  AdmissionType,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Student & Parent Management Integration Suite (Phase 7)', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();

  let schoolAdminToken: string;
  let testStudentId: string;
  let testGuardianId: string;
  let testRelationshipId: string;
  let testEnrollmentId: string;
  let testDocumentId: string;

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
          admissionNumberPrefix: 'SF-ADM',
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

    // 4. Seed Academic Year
    await AcademicYear.create({
      _id: academicYearId,
      tenantId,
      schoolId,
      campusId,
      name: 'Academic Year 2026-2027',
      code: 'AY-2026-27',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-04-30'),
      status: AcademicYearStatus.ACTIVE,
      isCurrent: true,
    });

    // 5. Seed Permissions
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

    // 6. Seed Roles
    for (const roleDef of SYSTEM_ROLES) {
      const roleDoc = await Role.create({
        tenantId,
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: true,
      });

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

    // 7. Seed School Admin User
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
    if (replSet) await replSet.stop();
  });

  // =========================================================================
  // 1. Sequential Identifier Generation
  // =========================================================================
  describe('1. Sequential Identifier Generation', () => {
    it('generates next collision-free admission number with school prefix', async () => {
      const res = await request(app)
        .get('/api/v1/students/identifiers/next-admission-number')
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admissionNumber).toMatch(/^SF-ADM-\d{4}-0001$/);
    });

    it('generates next collision-free studentId (STU-YYYY-XXXX)', async () => {
      const res = await request(app)
        .get('/api/v1/students/identifiers/next-student-id')
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.studentId).toMatch(/^STU-\d{4}-0001$/);
    });

    it('generates next collision-free guardianId (GRD-YYYY-XXXX)', async () => {
      const res = await request(app)
        .get('/api/v1/guardians/identifiers/next-guardian-id')
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.guardianId).toMatch(/^GRD-\d{4}-0001$/);
    });
  });

  // =========================================================================
  // 2. Student CRUD & Lifecycle
  // =========================================================================
  describe('2. Student Management', () => {
    it('creates a student with personal, contact, academic details and auto-generated IDs', async () => {
      const payload = {
        campusId: campusId.toString(),
        currentAcademicYearId: academicYearId.toString(),
        admissionDate: '2026-06-15T00:00:00.000Z',
        admissionType: AdmissionType.REGULAR,
        personalDetails: {
          firstName: 'Bart',
          middleName: 'Jojo',
          lastName: 'Simpson',
          dateOfBirth: '2015-04-01T00:00:00.000Z',
          gender: Gender.MALE,
          bloodGroup: 'O+',
          nationality: 'American',
          religion: 'Christian',
        },
        contactDetails: {
          email: 'bart.simpson@example.com',
          phone: '5551234567',
          currentAddress: {
            addressLine1: '742 Evergreen Terrace',
            city: 'Springfield',
            state: 'Oregon',
            postalCode: '97477',
            country: 'USA',
          },
        },
        medicalInfo: {
          allergies: ['Peanuts'],
          chronicConditions: [],
          physicianName: 'Dr. Julius Hibbert',
          physicianContact: '5559876543',
        },
      };

      const res = await request(app)
        .post('/api/v1/students')
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.admissionNumber).toMatch(/^SF-ADM-\d{4}-/);
      expect(res.body.data.studentId).toMatch(/^STU-\d{4}-/);
      expect(res.body.data.personalDetails.firstName).toBe('Bart');
      expect(res.body.data.personalDetails.lastName).toBe('Simpson');
      expect(res.body.data.currentStatus).toBe(StudentStatus.ACTIVE);

      testStudentId = res.body.data.id;
    });

    it('retrieves paginated students list with search and filters', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .query({ search: 'Bart', page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.pagination.totalRecords).toBeGreaterThanOrEqual(1);
    });

    it('retrieves a student by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/students/${testStudentId}`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testStudentId);
      expect(res.body.data.personalDetails.firstName).toBe('Bart');
    });

    it('updates student details', async () => {
      const res = await request(app)
        .patch(`/api/v1/students/${testStudentId}`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          personalDetails: {
            bloodGroup: 'A+',
          },
          medicalInfo: {
            allergies: ['Peanuts', 'Dust'],
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.personalDetails.bloodGroup).toBe('A+');
      expect(res.body.data.medicalInfo.allergies).toContain('Dust');
    });

    it('transitions student lifecycle status with history tracking', async () => {
      const res = await request(app)
        .patch(`/api/v1/students/${testStudentId}/status`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          status: StudentStatus.ON_LEAVE,
          reason: 'Family vacation travel',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentStatus).toBe(StudentStatus.ON_LEAVE);
      expect(res.body.data.statusHistory.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects invalid student lifecycle status transition', async () => {
      const res = await request(app)
        .patch(`/api/v1/students/${testStudentId}/status`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          status: StudentStatus.PROSPECT,
          reason: 'Attempt invalid regression',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('transitions student back to ACTIVE status', async () => {
      const res = await request(app)
        .patch(`/api/v1/students/${testStudentId}/status`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          status: StudentStatus.ACTIVE,
          reason: 'Returned from leave',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe(StudentStatus.ACTIVE);
    });
  });

  // =========================================================================
  // 3. Student Document Vault
  // =========================================================================
  describe('3. Student Document Vault', () => {
    it('attaches document metadata to student record', async () => {
      const res = await request(app)
        .post(`/api/v1/students/${testStudentId}/documents`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          documentType: StudentDocumentType.BIRTH_CERTIFICATE,
          title: 'Birth Certificate Official Copy',
          fileUrl: 'https://cdn.edusphere.io/vault/bart_birth_certificate.pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documents.length).toBe(1);
      expect(res.body.data.documents[0].verificationStatus).toBe(
        DocumentVerificationStatus.PENDING_VERIFICATION
      );

      testDocumentId = res.body.data.documents[0].id;
    });

    it('requires rejectionReason when rejecting document verification', async () => {
      const res = await request(app)
        .patch(`/api/v1/students/${testStudentId}/documents/${testDocumentId}/verify`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          verificationStatus: DocumentVerificationStatus.REJECTED,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('verifies student document successfully', async () => {
      const res = await request(app)
        .patch(`/api/v1/students/${testStudentId}/documents/${testDocumentId}/verify`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          verificationStatus: DocumentVerificationStatus.VERIFIED,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const doc = res.body.data.documents.find((d: any) => d.id === testDocumentId);
      expect(doc.verificationStatus).toBe(DocumentVerificationStatus.VERIFIED);
    });
  });

  // =========================================================================
  // 4. Guardian / Parent Operations
  // =========================================================================
  describe('4. Guardian Management', () => {
    it('creates a guardian record with contact and communication preferences', async () => {
      const res = await request(app)
        .post('/api/v1/guardians')
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          firstName: 'Homer',
          lastName: 'Simpson',
          email: 'homer.simpson@springfield.edu',
          phone: '5559998888',
          address: {
            addressLine1: '742 Evergreen Terrace',
            city: 'Springfield',
            state: 'Oregon',
            postalCode: '97477',
            country: 'USA',
          },
          occupation: 'Safety Inspector',
          annualIncome: 65000,
          communicationPreferences: {
            email: true,
            sms: true,
            whatsapp: false,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.guardianId).toMatch(/^GRD-\d{4}-/);
      expect(res.body.data.personalDetails.firstName).toBe('Homer');
      expect(res.body.data.contactDetails.email).toBe('homer.simpson@springfield.edu');

      testGuardianId = res.body.data.id;
    });

    it('rejects duplicate guardian email within the same tenant', async () => {
      const res = await request(app)
        .post('/api/v1/guardians')
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          firstName: 'Homer',
          lastName: 'Simpson',
          email: 'homer.simpson@springfield.edu',
          phone: '5559998889',
          address: '742 Evergreen Terrace',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('retrieves paginated guardians list', async () => {
      const res = await request(app)
        .get('/api/v1/guardians')
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .query({ search: 'Homer', page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('retrieves guardian by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/guardians/${testGuardianId}`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testGuardianId);
    });

    it('updates guardian details and communication preferences', async () => {
      const res = await request(app)
        .patch(`/api/v1/guardians/${testGuardianId}`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          occupation: 'Chief Safety Inspector',
          communicationPreferences: {
            whatsapp: true,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.personalDetails.occupation).toBe('Chief Safety Inspector');
      expect(res.body.data.communicationPreferences.whatsapp).toBe(true);
    });

    it('dispatches portal invitation to guardian', async () => {
      const res = await request(app)
        .post(`/api/v1/guardians/${testGuardianId}/invite`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('homer.simpson@springfield.edu');

      // Verify token created
      const tokenDoc = await VerificationToken.findOne({
        tenantId,
        tokenType: 'GUARDIAN_INVITATION',
        isUsed: false,
      });
      expect(tokenDoc).toBeDefined();
    });
  });

  // =========================================================================
  // 5. Student ↔ Guardian Relationships
  // =========================================================================
  describe('5. Student-Guardian Relationships', () => {
    it('links guardian to student with permissions and custody flags', async () => {
      const res = await request(app)
        .post(`/api/v1/students/${testStudentId}/guardians`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          guardianId: testGuardianId,
          relationshipType: GuardianRelationType.FATHER,
          isPrimaryContact: true,
          isEmergencyContact: true,
          canPickup: true,
          canAccessAcademicInformation: true,
          canAccessFinancialInformation: true,
          canReceiveNotifications: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.relationshipType).toBe(GuardianRelationType.FATHER);
      expect(res.body.data.isPrimaryContact).toBe(true);
      expect(res.body.data.canPickup).toBe(true);

      testRelationshipId = res.body.data.id;
    });

    it('prevents duplicate relationship between same student and guardian', async () => {
      const res = await request(app)
        .post(`/api/v1/students/${testStudentId}/guardians`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          guardianId: testGuardianId,
          relationshipType: GuardianRelationType.FATHER,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('retrieves all linked guardians for a student', async () => {
      const res = await request(app)
        .get(`/api/v1/students/${testStudentId}/guardians`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].guardian.name).toBe('Homer Simpson');
    });

    it('updates relationship flags and custody restrictions', async () => {
      const res = await request(app)
        .patch(`/api/v1/students/${testStudentId}/guardians/${testRelationshipId}`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          custodyRestrictions: 'Sole physical custody; pickup authorized at all times.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // 6. Student Enrollment
  // =========================================================================
  describe('6. Student Enrollment', () => {
    it('creates initial student enrollment in academic year before section allocation', async () => {
      const res = await request(app)
        .post('/api/v1/enrollments')
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          studentId: testStudentId,
          academicYearId: academicYearId.toString(),
          campusId: campusId.toString(),
          status: 'ENROLLED',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('ENROLLED');

      testEnrollmentId = res.body.data.id;
    });

    it('prevents duplicate enrollment for same student in same academic year', async () => {
      const res = await request(app)
        .post('/api/v1/enrollments')
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          studentId: testStudentId,
          academicYearId: academicYearId.toString(),
          status: 'ENROLLED',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('lists enrollments with filter by academic year', async () => {
      const res = await request(app)
        .get('/api/v1/enrollments')
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .query({ academicYearId: academicYearId.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('updates enrollment record (assigning roll number)', async () => {
      const res = await request(app)
        .patch(`/api/v1/enrollments/${testEnrollmentId}`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          rollNumber: 15,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rollNumber).toBe(15);
    });
  });

  // =========================================================================
  // 7. Cleanup / Soft Delete
  // =========================================================================
  describe('7. Soft Delete Operations', () => {
    it('unlinks student-guardian relationship', async () => {
      const res = await request(app)
        .delete(`/api/v1/students/${testStudentId}/guardians/${testRelationshipId}`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const relation = await StudentParentRelation.findById(testRelationshipId);
      expect(relation).toBeNull();
    });

    it('deletes document from student vault', async () => {
      const res = await request(app)
        .delete(`/api/v1/students/${testStudentId}/documents/${testDocumentId}`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documents.length).toBe(0);
    });

    it('soft deletes student record', async () => {
      const res = await request(app)
        .delete(`/api/v1/students/${testStudentId}`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const studentDoc = await Student.findOne({ _id: testStudentId, isDeleted: true });
      expect(studentDoc?.isDeleted).toBe(true);
      expect(studentDoc?.currentStatus).toBe(StudentStatus.ARCHIVED);
    });

    it('soft deletes guardian record', async () => {
      const res = await request(app)
        .delete(`/api/v1/guardians/${testGuardianId}`)
        .set('Host', 'springfield.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const guardianDoc = await Parent.findOne({ _id: testGuardianId, isDeleted: true });
      expect(guardianDoc?.isDeleted).toBe(true);
    });
  });
});
