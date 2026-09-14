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
  Class,
  Section,
  AcademicClass,
  Subject,
  GradingScheme,
  Exam,
  ExamSchedule,
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
  ExamType,
  ExamStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 12: Examination Scheduling & Conflict Engine Test Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();

  let adminToken: string;
  let academicClassAId: string;
  let academicClassBId: string;
  let subjectMathId: string;
  let subjectSciId: string;
  let invigilator1Id: string;
  let invigilator2Id: string;
  const room101 = 'Room-101';
  const room102 = 'Room-102';

  let gradingSchemeId: string;
  let examId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await GradingScheme.init();
    await Exam.init();
    await ExamSchedule.init();

    // 1. Tenant
    await Tenant.create({
      _id: tenantId,
      name: 'Conflict Test Academy',
      slug: 'conflict',
      customDomain: 'conflict.edusphere.io',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    // 2. School
    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Conflict School',
      code: 'CS01',
      affiliationBoard: 'CBSE',
    });

    // 3. Campus
    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Main Campus',
      code: 'MAIN',
      status: CampusStatus.ACTIVE,
      address: { street: '1 Main St', city: 'Metropolis', state: 'State', postalCode: '10001', country: 'India' },
    });

    // 4. Academic Year
    await AcademicYear.create({
      _id: academicYearId,
      tenantId,
      schoolId,
      campusId,
      name: '2026-2027',
      code: 'AY26',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-04-30'),
      status: AcademicYearStatus.ACTIVE,
    });

    // 5. RBAC Seed
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

    const roleDocs = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId,
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
          rolePerms.push({ tenantId, roleId: rId, permissionId: pId });
        }
      } else {
        for (const pStr of r.permissions) {
          const pId = permMap.get(pStr.toLowerCase().trim());
          if (pId) rolePerms.push({ tenantId, roleId: rId, permissionId: pId });
        }
      }
    }
    await RolePermission.insertMany(rolePerms);

    const passwordHash = await passwordService.hashPassword('Password123!');

    // 6. Admin User
    const adminUser = await User.create({
      tenantId,
      schoolId,
      email: 'admin.conflict@edusphere.io',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });
    const adminRole = roleMap.get('SUPER_ADMIN');
    await UserRole.create({
      tenantId,
      userId: adminUser._id,
      roleId: adminRole!,
      schoolId,
    });

    // 7. Teachers (Invigilators)
    const teacherRole = roleMap.get('TEACHER');
    const tUser1 = await User.create({
      tenantId,
      schoolId,
      email: 'invig1@edusphere.io',
      passwordHash,
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
    });
    await UserRole.create({ tenantId, userId: tUser1._id, roleId: teacherRole!, schoolId });
    const teacher1 = await Teacher.create({
      tenantId,
      schoolId,
      userId: tUser1._id,
      employeeId: 'EMP-INV1',
      designation: 'Senior Teacher',
      department: 'Science',
      joiningDate: new Date('2020-01-01'),
    });
    invigilator1Id = teacher1._id.toString();

    const tUser2 = await User.create({
      tenantId,
      schoolId,
      email: 'invig2@edusphere.io',
      passwordHash,
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
    });
    await UserRole.create({ tenantId, userId: tUser2._id, roleId: teacherRole!, schoolId });
    const teacher2 = await Teacher.create({
      tenantId,
      schoolId,
      userId: tUser2._id,
      employeeId: 'EMP-INV2',
      designation: 'Assistant Teacher',
      department: 'Mathematics',
      joiningDate: new Date('2020-01-01'),
    });
    invigilator2Id = teacher2._id.toString();

    // 8. Academic Classes (Class 10-A, Class 10-B)
    const classDoc = await Class.create({
      tenantId,
      schoolId,
      name: 'Class 10',
      code: 'CLS10',
      order: 10,
      educationLevel: EducationLevel.SECONDARY,
    });
    const secA = await Section.create({
      tenantId,
      schoolId,
      name: 'Section A',
      code: 'SEC-A',
      classId: classDoc._id,
    });
    const secB = await Section.create({
      tenantId,
      schoolId,
      name: 'Section B',
      code: 'SEC-B',
      classId: classDoc._id,
    });

    const acA = await AcademicClass.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId: classDoc._id,
      sectionId: secA._id,
      capacity: 40,
    });
    academicClassAId = acA._id.toString();

    const acB = await AcademicClass.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      classId: classDoc._id,
      sectionId: secB._id,
      capacity: 40,
    });
    academicClassBId = acB._id.toString();

    // 9. Subjects
    const sMath = await Subject.create({
      tenantId,
      schoolId,
      name: 'Mathematics',
      code: 'MATH101',
      isElective: false,
    });
    subjectMathId = sMath._id.toString();

    const sSci = await Subject.create({
      tenantId,
      schoolId,
      name: 'Science',
      code: 'SCI101',
      isElective: false,
    });
    subjectSciId = sSci._id.toString();

    // 10. Login Admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'conflict.edusphere.io')
      .send({ email: 'admin.conflict@edusphere.io', password: 'Password123!' });
    adminToken = loginRes.body.data.accessToken;

    // 11. Create Grading Scheme
    const gsRes = await request(app)
      .post('/api/v1/examinations/grading-schemes')
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Standard Scheme',
        code: 'STD_SCHEME',
        grades: [
          { grade: 'A', minPercentage: 80, maxPercentage: 100, gradePoint: 10, isPassing: true },
          { grade: 'B', minPercentage: 60, maxPercentage: 79.99, gradePoint: 8, isPassing: true },
          { grade: 'C', minPercentage: 33, maxPercentage: 59.99, gradePoint: 5, isPassing: true },
          { grade: 'F', minPercentage: 0, maxPercentage: 32.99, gradePoint: 0, isPassing: false },
        ],
      });
    gradingSchemeId = gsRes.body.data._id;

    // 12. Create Exam (2026-10-01 to 2026-10-15)
    const examRes = await request(app)
      .post('/api/v1/examinations')
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        academicYearId: academicYearId.toString(),
        campusId: campusId.toString(),
        title: 'Mid-Term Examinations 2026',
        code: 'MID-2026',
        examType: ExamType.MID_TERM,
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-15T23:59:59.999Z',
        gradingSchemeId,
        academicClassIds: [academicClassAId, academicClassBId],
        subjectConfigs: [
          { subjectId: subjectMathId, maxMarks: 100, passMarks: 33, weightage: 100 },
          { subjectId: subjectSciId, maxMarks: 100, passMarks: 33, weightage: 100 },
        ],
      });
    examId = examRes.body.data._id;

    // Transition DRAFT -> SCHEDULED
    await request(app)
      .post(`/api/v1/examinations/${examId}/status`)
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ExamStatus.SCHEDULED });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // 1. Pre-validation endpoint check
  // =========================================================================
  it('should validate conflict-free pre-check', async () => {
    const res = await request(app)
      .post('/api/v1/examinations/schedules/check-conflicts')
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId: academicClassAId,
        subjectId: subjectMathId,
        examDate: '2026-10-05T00:00:00.000Z',
        startTime: '09:00',
        endTime: '12:00',
        roomId: room101,
        invigilatorId: invigilator1Id,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hasConflicts).toBe(false);
    expect(res.body.data.conflicts).toHaveLength(0);
  });

  // =========================================================================
  // 2. Schedule Base Paper
  // =========================================================================
  it('should successfully create base schedule (Class A, Math, 09:00-12:00, Room 101, Invig 1)', async () => {
    const res = await request(app)
      .post('/api/v1/examinations/schedules')
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId: academicClassAId,
        subjectId: subjectMathId,
        examDate: '2026-10-05T00:00:00.000Z',
        startTime: '09:00',
        endTime: '12:00',
        maxMarks: 100,
        passMarks: 33,
        roomId: room101,
        invigilatorId: invigilator1Id,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
  });

  // =========================================================================
  // 3. Class Conflict Detection
  // =========================================================================
  it('should detect class conflict when scheduling Class A at overlapping time (10:00-13:00)', async () => {
    // 3a. Pre-check
    const preCheck = await request(app)
      .post('/api/v1/examinations/schedules/check-conflicts')
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId: academicClassAId,
        subjectId: subjectSciId,
        examDate: '2026-10-05T00:00:00.000Z',
        startTime: '10:00',
        endTime: '13:00',
        roomId: room102,
        invigilatorId: invigilator2Id,
      });

    expect(preCheck.status).toBe(200);
    expect(preCheck.body.data.hasConflicts).toBe(true);
    expect(preCheck.body.data.conflicts.some((c: any) => c.type === 'CLASS_OVERLAP')).toBe(true);

    // 3b. Actual creation attempt returns 400
    const res = await request(app)
      .post('/api/v1/examinations/schedules')
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId: academicClassAId,
        subjectId: subjectSciId,
        examDate: '2026-10-05T00:00:00.000Z',
        startTime: '10:00',
        endTime: '13:00',
        maxMarks: 100,
        passMarks: 33,
        roomId: room102,
        invigilatorId: invigilator2Id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.message).toContain('conflict');
  });

  // =========================================================================
  // 4. Room Conflict Detection
  // =========================================================================
  it('should detect room conflict when scheduling different class in Room 101 at overlapping time (11:00-14:00)', async () => {
    const preCheck = await request(app)
      .post('/api/v1/examinations/schedules/check-conflicts')
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId: academicClassBId,
        subjectId: subjectSciId,
        examDate: '2026-10-05T00:00:00.000Z',
        startTime: '11:00',
        endTime: '14:00',
        roomId: room101,
        invigilatorId: invigilator2Id,
      });

    expect(preCheck.status).toBe(200);
    expect(preCheck.body.data.hasConflicts).toBe(true);
    expect(preCheck.body.data.conflicts.some((c: any) => c.type === 'ROOM_OCCUPIED')).toBe(true);

    const res = await request(app)
      .post('/api/v1/examinations/schedules')
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId: academicClassBId,
        subjectId: subjectSciId,
        examDate: '2026-10-05T00:00:00.000Z',
        startTime: '11:00',
        endTime: '14:00',
        maxMarks: 100,
        passMarks: 33,
        roomId: room101,
        invigilatorId: invigilator2Id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.message).toContain('Room');
  });

  // =========================================================================
  // 5. Invigilator Conflict Detection
  // =========================================================================
  it('should detect invigilator conflict when scheduling different class with Invigilator 1 at overlapping time (09:30-11:30)', async () => {
    const preCheck = await request(app)
      .post('/api/v1/examinations/schedules/check-conflicts')
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId: academicClassBId,
        subjectId: subjectSciId,
        examDate: '2026-10-05T00:00:00.000Z',
        startTime: '09:30',
        endTime: '11:30',
        roomId: room102,
        invigilatorId: invigilator1Id,
      });

    expect(preCheck.status).toBe(200);
    expect(preCheck.body.data.hasConflicts).toBe(true);
    expect(preCheck.body.data.conflicts.some((c: any) => c.type === 'INVIGILATOR_ASSIGNED')).toBe(true);

    const res = await request(app)
      .post('/api/v1/examinations/schedules')
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId: academicClassBId,
        subjectId: subjectSciId,
        examDate: '2026-10-05T00:00:00.000Z',
        startTime: '09:30',
        endTime: '11:30',
        maxMarks: 100,
        passMarks: 33,
        roomId: room102,
        invigilatorId: invigilator1Id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.message).toContain('Invigilator');
  });

  // =========================================================================
  // 6. Duplicate Subject for Class Detection
  // =========================================================================
  it('should reject scheduling the same subject twice for Class A in the same exam', async () => {
    const preCheck = await request(app)
      .post('/api/v1/examinations/schedules/check-conflicts')
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId: academicClassAId,
        subjectId: subjectMathId,
        examDate: '2026-10-08T00:00:00.000Z',
        startTime: '09:00',
        endTime: '12:00',
        roomId: room101,
        invigilatorId: invigilator1Id,
      });

    expect(preCheck.status).toBe(200);
    expect(preCheck.body.data.hasConflicts).toBe(true);
    expect(preCheck.body.data.conflicts.some((c: any) => c.type === 'DUPLICATE_SUBJECT')).toBe(true);

    const res = await request(app)
      .post('/api/v1/examinations/schedules')
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId: academicClassAId,
        subjectId: subjectMathId,
        examDate: '2026-10-08T00:00:00.000Z',
        startTime: '09:00',
        endTime: '12:00',
        maxMarks: 100,
        passMarks: 33,
        roomId: room101,
        invigilatorId: invigilator1Id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.message).toContain('already scheduled');
  });

  // =========================================================================
  // 7. Date Window Violation
  // =========================================================================
  it('should reject scheduling a paper outside the exam date range (2026-10-01 to 2026-10-15)', async () => {
    const res = await request(app)
      .post('/api/v1/examinations/schedules')
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId: academicClassBId,
        subjectId: subjectMathId,
        examDate: '2026-10-20T00:00:00.000Z',
        startTime: '09:00',
        endTime: '12:00',
        maxMarks: 100,
        passMarks: 33,
        roomId: room102,
        invigilatorId: invigilator2Id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.message).toContain('outside exam window');
  });

  // =========================================================================
  // 8. Successful Non-Conflicting Schedule
  // =========================================================================
  it('should successfully create schedule when there are no overlaps (Class B, Science, 13:00-16:00, Room 102, Invig 2)', async () => {
    const res = await request(app)
      .post('/api/v1/examinations/schedules')
      .set('Host', 'conflict.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examId,
        academicClassId: academicClassBId,
        subjectId: subjectSciId,
        examDate: '2026-10-05T00:00:00.000Z',
        startTime: '13:00',
        endTime: '16:00',
        maxMarks: 100,
        passMarks: 33,
        roomId: room102,
        invigilatorId: invigilator2Id,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
  });
});
