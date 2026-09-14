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
  Teacher,
  Student,
  Parent,
  StudentParentRelation,
  StudentEnrollment,
  Class,
  Section,
  AcademicClass,
  Subject,
  TeacherSubjectAssignment,
  GradingScheme,
  Exam,
  ExamSchedule,
  ExamMark,
  Result,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  CampusStatus,
  AcademicYearStatus,
  TenantPlan,
  TenantBillingStatus,
  EducationLevel,
  ExamStatus,
  ExamType,
  ResultStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 12: Examination Security, Multi-Tenancy & Authorization Audit', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  // Tenant A
  const tenantAId = new Types.ObjectId();
  const schoolAId = new Types.ObjectId();
  const campusAId = new Types.ObjectId();
  const academicYearAId = new Types.ObjectId();

  // Tenant B
  const tenantBId = new Types.ObjectId();
  const schoolBId = new Types.ObjectId();
  const campusBId = new Types.ObjectId();
  const academicYearBId = new Types.ObjectId();

  let adminAToken: string;
  let adminBToken: string;
  let teacherA1Token: string;
  let teacherA2Token: string;
  let studentA1Token: string;
  let studentA2Token: string;
  let parentA1Token: string;

  let academicClassAId: string;
  let subjectMathAId: string;
  let studentA1Id: string;
  let studentA2Id: string;
  let examAId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await GradingScheme.init();
    await Exam.init();
    await ExamSchedule.init();
    await ExamMark.init();
    await Result.init();

    // 1. Seed Tenant A
    await Tenant.create({
      _id: tenantAId,
      name: 'Alpha Academy',
      slug: 'alpha',
      customDomain: 'alpha.edusphere.io',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });
    await School.create({ _id: schoolAId, tenantId: tenantAId, name: 'Alpha School', code: 'AS01', affiliationBoard: 'CBSE' });
    await Campus.create({
      _id: campusAId,
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'Main Campus',
      code: 'MAIN',
      status: CampusStatus.ACTIVE,
      address: { street: '1 Main St', city: 'Metropolis', state: 'State', postalCode: '10001', country: 'India' },
    });
    await AcademicYear.create({
      _id: academicYearAId,
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      name: '2026-2027',
      code: 'AY26',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-04-30'),
      status: AcademicYearStatus.ACTIVE,
    });

    // 2. Seed Tenant B
    await Tenant.create({
      _id: tenantBId,
      name: 'Beta Academy',
      slug: 'beta',
      customDomain: 'beta.edusphere.io',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });
    await School.create({ _id: schoolBId, tenantId: tenantBId, name: 'Beta School', code: 'BS01', affiliationBoard: 'CBSE' });
    await Campus.create({
      _id: campusBId,
      tenantId: tenantBId,
      schoolId: schoolBId,
      name: 'North Campus',
      code: 'NORTH',
      status: CampusStatus.ACTIVE,
      address: { street: '2 North St', city: 'Metropolis', state: 'State', postalCode: '10002', country: 'India' },
    });
    await AcademicYear.create({
      _id: academicYearBId,
      tenantId: tenantBId,
      schoolId: schoolBId,
      campusId: campusBId,
      name: '2026-2027',
      code: 'BY26',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-04-30'),
      status: AcademicYearStatus.ACTIVE,
    });

    // 3. Seed Permissions (once system-wide)
    const permissionDocs = await Permission.insertMany(
      SYSTEM_PERMISSIONS.map((perm) => ({
        resource: perm.resource,
        action: perm.action,
        permissionString: perm.permissionString.toLowerCase().trim(),
        description: perm.description,
        category: perm.category,
      }))
    );
    const permMap = new Map<string, Types.ObjectId>();
    for (const p of permissionDocs) {
      permMap.set(p.permissionString, p._id as Types.ObjectId);
    }

    const seedRolesForTenant = async (tId: Types.ObjectId) => {
      const roleDocs = await Role.insertMany(
        SYSTEM_ROLES.map((r) => ({
          tenantId: tId,
          name: r.name,
          description: r.description,
          isSystemRole: true,
        }))
      );
      const roleMap = new Map<string, Types.ObjectId>();
      for (const r of roleDocs) {
        roleMap.set(r.name, r._id as Types.ObjectId);
      }

      const rolePerms: any[] = [];
      for (const r of SYSTEM_ROLES) {
        const rId = roleMap.get(r.name);
        if (!rId) continue;
        if (r.permissions.includes('*')) {
          for (const pId of permMap.values()) {
            rolePerms.push({ tenantId: tId, roleId: rId, permissionId: pId });
          }
        } else {
          for (const pStr of r.permissions) {
            const pId = permMap.get(pStr.toLowerCase().trim());
            if (pId) rolePerms.push({ tenantId: tId, roleId: rId, permissionId: pId });
          }
        }
      }
      await RolePermission.insertMany(rolePerms);
      return roleMap;
    };

    const roleMapA = await seedRolesForTenant(tenantAId);
    const roleMapB = await seedRolesForTenant(tenantBId);

    const passwordHash = await passwordService.hashPassword('Password123!');

    // Admin A
    const adminAUser = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'admin@alpha.edusphere.io',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });
    await UserRole.create({ tenantId: tenantAId, userId: adminAUser._id, roleId: roleMapA.get('SUPER_ADMIN')!, schoolId: schoolAId });

    // Admin B
    const adminBUser = await User.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      email: 'admin@beta.edusphere.io',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });
    await UserRole.create({ tenantId: tenantBId, userId: adminBUser._id, roleId: roleMapB.get('SUPER_ADMIN')!, schoolId: schoolBId });

    // Teacher A1 (Assigned to Math)
    const tA1User = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'teacher1@alpha.edusphere.io',
      passwordHash,
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
    });
    await UserRole.create({ tenantId: tenantAId, userId: tA1User._id, roleId: roleMapA.get('TEACHER')!, schoolId: schoolAId });
    const teacherA1 = await Teacher.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      userId: tA1User._id,
      employeeId: 'TA-01',
      designation: 'Math Teacher',
      department: 'Mathematics',
      joiningDate: new Date('2020-01-01'),
    });

    // Teacher A2 (NOT Assigned to Math)
    const tA2User = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'teacher2@alpha.edusphere.io',
      passwordHash,
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
    });
    await UserRole.create({ tenantId: tenantAId, userId: tA2User._id, roleId: roleMapA.get('TEACHER')!, schoolId: schoolAId });
    await Teacher.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      userId: tA2User._id,
      employeeId: 'TA-02',
      designation: 'History Teacher',
      department: 'Social Studies',
      joiningDate: new Date('2020-01-01'),
    });

    // Academic Class A
    const clsA = await Class.create({ tenantId: tenantAId, schoolId: schoolAId, name: 'Grade 10', code: 'G10', order: 10, educationLevel: EducationLevel.SECONDARY });
    const secA = await Section.create({ tenantId: tenantAId, schoolId: schoolAId, name: 'Section A', code: 'SEC-A', classId: clsA._id });
    const acA = await AcademicClass.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      academicYearId: academicYearAId,
      classId: clsA._id,
      sectionId: secA._id,
      capacity: 35,
    });
    academicClassAId = acA._id.toString();

    // Subject Math
    const subMath = await Subject.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'Mathematics',
      code: 'MATH10',
      isElective: false,
    });
    subjectMathAId = subMath._id.toString();

    // Assign Teacher A1 to AcademicClassA + Math
    await TeacherSubjectAssignment.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      academicYearId: academicYearAId,
      teacherId: teacherA1._id,
      academicClassId: acA._id,
      classId: clsA._id,
      sectionId: secA._id,
      subjectId: subMath._id,
      status: 'ACTIVE',
      isPrimary: true,
    });

    // Student A1
    const stA1User = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'student1@alpha.edusphere.io',
      passwordHash,
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
    });
    await UserRole.create({ tenantId: tenantAId, userId: stA1User._id, roleId: roleMapA.get('STUDENT')!, schoolId: schoolAId });
    const student1 = await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      userId: stA1User._id,
      admissionNumber: 'ADM-001',
      personalDetails: { firstName: 'Alice', lastName: 'Smith', dateOfBirth: new Date('2010-05-15'), gender: 'FEMALE' },
      contactDetails: { currentAddress: { street: '1 High St' } },
    });
    studentA1Id = student1._id.toString();
    await StudentEnrollment.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      studentId: student1._id,
      academicClassId: acA._id,
      classId: clsA._id,
      sectionId: secA._id,
      academicYearId: academicYearAId,
      rollNumber: 1,
      status: 'ENROLLED',
      enrollmentDate: new Date('2026-06-01'),
    });

    // Student A2
    const stA2User = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'student2@alpha.edusphere.io',
      passwordHash,
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
    });
    await UserRole.create({ tenantId: tenantAId, userId: stA2User._id, roleId: roleMapA.get('STUDENT')!, schoolId: schoolAId });
    const student2 = await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      userId: stA2User._id,
      admissionNumber: 'ADM-002',
      personalDetails: { firstName: 'Bob', lastName: 'Jones', dateOfBirth: new Date('2010-08-20'), gender: 'MALE' },
      contactDetails: { currentAddress: { street: '2 High St' } },
    });
    studentA2Id = student2._id.toString();
    await StudentEnrollment.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      studentId: student2._id,
      academicClassId: acA._id,
      classId: clsA._id,
      sectionId: secA._id,
      academicYearId: academicYearAId,
      rollNumber: 2,
      status: 'ENROLLED',
      enrollmentDate: new Date('2026-06-01'),
    });

    // Parent A1 (Parent of Alice/Student 1 only)
    const pA1User = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'parent1@alpha.edusphere.io',
      passwordHash,
      userType: UserType.PARENT,
      status: UserStatus.ACTIVE,
    });
    await UserRole.create({ tenantId: tenantAId, userId: pA1User._id, roleId: roleMapA.get('PARENT')!, schoolId: schoolAId });
    const parent1 = await Parent.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      userId: pA1User._id,
      guardianId: 'GRD-001',
      personalDetails: { firstName: 'Mary', lastName: 'Smith' },
      contactDetails: { email: 'parent1@alpha.edusphere.io', phone: '1111111111', address: '1 Main St' },
    });
    await StudentParentRelation.create({
      tenantId: tenantAId,
      studentId: student1._id,
      parentId: parent1._id,
      relationshipType: 'MOTHER',
    });

    // Login users to get tokens
    const login = async (host: string, email: string) => {
      const res = await request(app).post('/api/v1/auth/login').set('Host', host).send({ email, password: 'Password123!' });
      return res.body.data.accessToken;
    };

    adminAToken = await login('alpha.edusphere.io', 'admin@alpha.edusphere.io');
    adminBToken = await login('beta.edusphere.io', 'admin@beta.edusphere.io');
    teacherA1Token = await login('alpha.edusphere.io', 'teacher1@alpha.edusphere.io');
    teacherA2Token = await login('alpha.edusphere.io', 'teacher2@alpha.edusphere.io');
    studentA1Token = await login('alpha.edusphere.io', 'student1@alpha.edusphere.io');
    studentA2Token = await login('alpha.edusphere.io', 'student2@alpha.edusphere.io');
    parentA1Token = await login('alpha.edusphere.io', 'parent1@alpha.edusphere.io');

    // Create Grading Scheme & Exam in Tenant A
    const gs = await GradingScheme.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'Alpha Scheme',
      code: 'ALPHA_SCHEME',
      grades: [
        { grade: 'A', minPercentage: 75, maxPercentage: 100, gradePoint: 9, isPassing: true },
        { grade: 'B', minPercentage: 50, maxPercentage: 74.99, gradePoint: 7, isPassing: true },
        { grade: 'C', minPercentage: 33, maxPercentage: 49.99, gradePoint: 4, isPassing: true },
        { grade: 'F', minPercentage: 0, maxPercentage: 32.99, gradePoint: 0, isPassing: false },
      ],
    });

    const examA = await Exam.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      academicYearId: academicYearAId,
      title: 'Mid Term Exam Alpha',
      code: 'MTE-A',
      examType: ExamType.MID_TERM,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-10'),
      status: ExamStatus.SCHEDULED,
      gradingSchemeId: gs._id,
      academicClassIds: [new Types.ObjectId(academicClassAId)],
      subjectConfigs: [
        { subjectId: new Types.ObjectId(subjectMathAId), maxMarks: 100, passMarks: 33, weightage: 100 },
      ],
    });
    examAId = examA._id.toString();

    // Schedule paper
    await ExamSchedule.create({
      tenantId: tenantAId,
      examId: examA._id,
      academicClassId: new Types.ObjectId(academicClassAId),
      subjectId: new Types.ObjectId(subjectMathAId),
      examDate: new Date('2026-10-05'),
      startTime: '09:00',
      endTime: '12:00',
      maxMarks: 100,
      passMarks: 33,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // 1. Unauthenticated Access Rejection (401)
  // =========================================================================
  it('should reject unauthenticated requests with 401', async () => {
    const res = await request(app)
      .get('/api/v1/examinations')
      .set('Host', 'alpha.edusphere.io');

    expect(res.status).toBe(401);
  });

  // =========================================================================
  // 2. Multi-Tenant Cross-Access Isolation
  // =========================================================================
  it('should prevent Tenant B from accessing Tenant A exams (404/403 isolation)', async () => {
    // Admin B tries to get Tenant A's exam using Tenant B domain
    const res = await request(app)
      .get(`/api/v1/examinations/${examAId}`)
      .set('Host', 'beta.edusphere.io')
      .set('Authorization', `Bearer ${adminBToken}`);

    // Since exam belongs to Tenant A, findOne({ _id, tenantId: Tenant B }) returns null -> 404
    expect(res.status).toBe(404);
  });

  it('should prevent Tenant B from submitting marks for Tenant A exam', async () => {
    const res = await request(app)
      .post('/api/v1/examinations/marks/bulk')
      .set('Host', 'beta.edusphere.io')
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({
        examId: examAId,
        academicClassId: academicClassAId,
        subjectId: subjectMathAId,
        maxMarks: 100,
        passMarks: 33,
        entries: [{ studentId: studentA1Id, marksObtained: 80 }],
      });

    expect(res.status).toBe(404);
  });

  // =========================================================================
  // 3. Teacher Scoped Authorization
  // =========================================================================
  it('should allow assigned teacher (Teacher 1) to enter marks', async () => {
    const res = await request(app)
      .post('/api/v1/examinations/marks/bulk')
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${teacherA1Token}`)
      .send({
        examId: examAId,
        academicClassId: academicClassAId,
        subjectId: subjectMathAId,
        maxMarks: 100,
        passMarks: 33,
        entries: [
          { studentId: studentA1Id, marksObtained: 88 },
          { studentId: studentA2Id, marksObtained: 72 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject unassigned teacher (Teacher 2) from entering marks for Math (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/examinations/marks/bulk')
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${teacherA2Token}`)
      .send({
        examId: examAId,
        academicClassId: academicClassAId,
        subjectId: subjectMathAId,
        maxMarks: 100,
        passMarks: 33,
        entries: [{ studentId: studentA1Id, marksObtained: 99 }],
      });

    expect(res.status).toBe(403);
    expect(res.body.error?.message || res.body.message).toContain('not authorized to enter marks');
  });

  it('should reject teacher from approving results without permission (403)', async () => {
    const res = await request(app)
      .post(`/api/v1/examinations/${examAId}/results/approve`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${teacherA1Token}`);

    expect(res.status).toBe(403);
  });

  // =========================================================================
  // 4. Student & Parent Scoped Privacy
  // =========================================================================
  it('should reject student and parent access before results are approved and published', async () => {
    // 4a. Student 1 tries to view unpublished results
    const sRes = await request(app)
      .get(`/api/v1/examinations/results/student/${studentA1Id}`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${studentA1Token}`);

    expect(sRes.status).toBe(403);
    expect(sRes.body.error?.message || sRes.body.message).toContain('not yet published');

    // 4b. Parent 1 tries to view unpublished results
    const pRes = await request(app)
      .get(`/api/v1/examinations/results/student/${studentA1Id}`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${parentA1Token}`);

    expect(pRes.status).toBe(403);
    expect(pRes.body.error?.message || pRes.body.message).toContain('not yet published');
  });

  it('should calculate, approve and publish results, then verify student and parent access scoping', async () => {
    // 1. Calculate Results as Admin
    const calcRes = await request(app)
      .post(`/api/v1/examinations/${examAId}/results/calculate`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${adminAToken}`);
    expect(calcRes.status).toBe(200);

    // 2. Approve Results as Admin
    const appRes = await request(app)
      .post(`/api/v1/examinations/${examAId}/results/approve`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${adminAToken}`);
    expect(appRes.status).toBe(200);

    // 3. Student 1 views their own result -> 200 OK
    const st1Res = await request(app)
      .get(`/api/v1/examinations/results/student/${studentA1Id}`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${studentA1Token}`);
    expect(st1Res.status).toBe(200);
    expect(st1Res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(st1Res.body.data[0].studentId.toString()).toBe(studentA1Id);

    // 4. Student 1 tries to view Student 2 result -> 403 Forbidden
    const stCrossRes = await request(app)
      .get(`/api/v1/examinations/results/student/${studentA2Id}`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${studentA1Token}`);
    expect(stCrossRes.status).toBe(403);
    expect(stCrossRes.body.error?.message || stCrossRes.body.message).toContain('only view your own');

    // 5. Parent 1 views their child (Student 1) result -> 200 OK
    const parentOwnChildRes = await request(app)
      .get(`/api/v1/examinations/results/student/${studentA1Id}`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${parentA1Token}`);
    expect(parentOwnChildRes.status).toBe(200);
    expect(parentOwnChildRes.body.data[0].studentId.toString()).toBe(studentA1Id);

    // 6. Parent 1 tries to view another student (Student 2) result -> 403 Forbidden
    const parentOtherChildRes = await request(app)
      .get(`/api/v1/examinations/results/student/${studentA2Id}`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${parentA1Token}`);
    expect(parentOtherChildRes.status).toBe(403);
    expect(parentOtherChildRes.body.error?.message || parentOtherChildRes.body.message).toContain('not authorized to view results for this student');
  });
});
