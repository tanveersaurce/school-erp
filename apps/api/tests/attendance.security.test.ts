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
  Timetable,
  TimetableEntry,
  Period,
  StudentAttendance,
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
  AttendanceStatus,
  AttendanceMode,
  AttendanceLifecycleStatus,
  PeriodType,
  TimetableStatus,
  WeekDay,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 10: Attendance Security & Multi-Tenant RBAC Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  // Tenant 1
  const tenant1Id = new Types.ObjectId();
  const school1Id = new Types.ObjectId();
  const campus1Id = new Types.ObjectId();
  const campus2Id = new Types.ObjectId();
  const academicYear1Id = new Types.ObjectId();

  // Tenant 2
  const tenant2Id = new Types.ObjectId();
  const school2Id = new Types.ObjectId();
  const campus3Id = new Types.ObjectId();
  const academicYear2Id = new Types.ObjectId();

  let admin1Token: string;
  let admin2Token: string;
  let teacher1Token: string; // assigned to Class 1
  let teacher2Token: string; // unassigned to Class 1
  let student1Token: string;
  let student2Token: string;
  let parent1Token: string;  // parent of student 1

  let academicClassId: string;
  let student1Id: string;
  let student2Id: string;
  let attendance1Id: string;
  let period1Id: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    // 1. Seed Tenant 1 & 2
    await Tenant.create([
      {
        _id: tenant1Id,
        name: 'Academy One',
        slug: 'acad1',
        customDomain: 'acad1.edusphere.io',
        status: TenantStatus.ACTIVE,
        plan: TenantPlan.ENTERPRISE,
        billingStatus: TenantBillingStatus.ACTIVE,
      },
      {
        _id: tenant2Id,
        name: 'Academy Two',
        slug: 'acad2',
        customDomain: 'acad2.edusphere.io',
        status: TenantStatus.ACTIVE,
        plan: TenantPlan.ENTERPRISE,
        billingStatus: TenantBillingStatus.ACTIVE,
      },
    ]);

    // 2. Seed Schools
    await School.create([
      {
        _id: school1Id,
        tenantId: tenant1Id,
        name: 'Academy One School',
        code: 'ACAD1',
        affiliationBoard: 'CBSE',
        timezone: 'Asia/Kolkata',
        settings: {
          workingDays: [WeekDay.MONDAY, WeekDay.TUESDAY, WeekDay.WEDNESDAY, WeekDay.THURSDAY, WeekDay.FRIDAY],
        },
      },
      {
        _id: school2Id,
        tenantId: tenant2Id,
        name: 'Academy Two School',
        code: 'ACAD2',
        affiliationBoard: 'CBSE',
        timezone: 'Asia/Kolkata',
        settings: {
          workingDays: [WeekDay.MONDAY, WeekDay.TUESDAY, WeekDay.WEDNESDAY, WeekDay.THURSDAY, WeekDay.FRIDAY],
        },
      },
    ]);

    // 3. Seed Campuses
    await Campus.create([
      {
        _id: campus1Id,
        tenantId: tenant1Id,
        schoolId: school1Id,
        name: 'Campus Alpha',
        code: 'ALPHA',
        status: CampusStatus.ACTIVE,
        address: { street: '1 A St', city: 'Metropolis', state: 'State', postalCode: '10001', country: 'India' },
      },
      {
        _id: campus2Id,
        tenantId: tenant1Id,
        schoolId: school1Id,
        name: 'Campus Beta',
        code: 'BETA',
        status: CampusStatus.ACTIVE,
        address: { street: '2 B St', city: 'Metropolis', state: 'State', postalCode: '10001', country: 'India' },
      },
      {
        _id: campus3Id,
        tenantId: tenant2Id,
        schoolId: school2Id,
        name: 'Campus Gamma',
        code: 'GAMMA',
        status: CampusStatus.ACTIVE,
        address: { street: '3 C St', city: 'Metropolis', state: 'State', postalCode: '10001', country: 'India' },
      },
    ]);

    // 4. Academic Years
    await AcademicYear.create([
      {
        _id: academicYear1Id,
        tenantId: tenant1Id,
        schoolId: school1Id,
        campusId: campus1Id,
        name: '2026-2027',
        code: 'AY1',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2027-04-30'),
        isCurrent: true,
        status: AcademicYearStatus.ACTIVE,
      },
      {
        _id: academicYear2Id,
        tenantId: tenant2Id,
        schoolId: school2Id,
        campusId: campus3Id,
        name: '2026-2027',
        code: 'AY2',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2027-04-30'),
        isCurrent: true,
        status: AcademicYearStatus.ACTIVE,
      },
    ]);

    // 5. Seed Permissions & Roles for both tenants
    const permissionDocs = await Permission.insertMany(
      SYSTEM_PERMISSIONS.map((perm) => ({
        resource: perm.resource,
        action: perm.action,
        permissionString: perm.permissionString.toLowerCase().trim(),
        description: perm.description,
        category: perm.category,
      }))
    );
    const permissionMap = new Map<string, Types.ObjectId>();
    for (const pDoc of permissionDocs) {
      permissionMap.set(pDoc.permissionString, pDoc._id as Types.ObjectId);
    }

    for (const tId of [tenant1Id, tenant2Id]) {
      const roleDocs = await Role.insertMany(
        SYSTEM_ROLES.map((roleDef) => ({
          tenantId: tId,
          name: roleDef.name,
          description: roleDef.description,
          isSystemRole: true,
        }))
      );

      const roleMap = new Map<string, Types.ObjectId>();
      for (const r of roleDocs) {
        roleMap.set(r.name, r._id as Types.ObjectId);
      }

      const allRolePerms: { tenantId: Types.ObjectId; roleId: Types.ObjectId; permissionId: Types.ObjectId }[] = [];
      for (const roleDef of SYSTEM_ROLES) {
        const roleId = roleMap.get(roleDef.name);
        if (!roleId) continue;
        if (roleDef.permissions.includes('*')) {
          for (const pId of permissionMap.values()) {
            allRolePerms.push({ tenantId: tId, roleId, permissionId: pId });
          }
        } else {
          for (const pStr of roleDef.permissions) {
            const pId = permissionMap.get(pStr.toLowerCase().trim());
            if (pId) {
              allRolePerms.push({ tenantId: tId, roleId, permissionId: pId });
            }
          }
        }
      }
      if (allRolePerms.length > 0) {
        await RolePermission.insertMany(allRolePerms);
      }
    }

    const passwordHash = await passwordService.hashPassword('Admin@123456');

    // 6. Users in Tenant 1
    const admin1 = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 'admin@acad1.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const admin1Role = await Role.findOne({ tenantId: tenant1Id, name: 'SCHOOL_ADMIN' });
    await UserRole.create({ tenantId: tenant1Id, userId: admin1._id, roleId: admin1Role!._id, schoolId: school1Id });

    // Teacher 1 (assigned class teacher)
    const t1User = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 't1@acad1.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const teacherRole = await Role.findOne({ tenantId: tenant1Id, name: 'TEACHER' });
    await UserRole.create({ tenantId: tenant1Id, userId: t1User._id, roleId: teacherRole!._id, schoolId: school1Id, campusId: campus1Id });
    const t1Profile = await Teacher.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      userId: t1User._id,
      employeeId: 'EMP-T1',
      department: 'Science',
      designation: 'Faculty',
      joiningDate: new Date('2023-01-10'),
    });

    // Teacher 2 (unassigned)
    const t2User = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 't2@acad1.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    await UserRole.create({ tenantId: tenant1Id, userId: t2User._id, roleId: teacherRole!._id, schoolId: school1Id, campusId: campus2Id });
    await Teacher.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      userId: t2User._id,
      employeeId: 'EMP-T2',
      department: 'Math',
      designation: 'Faculty',
      joiningDate: new Date('2023-01-10'),
    });

    // Class & AcademicClass
    const classDoc = await Class.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Grade 10',
      code: 'G10',
      order: 10,
    });
    const sectionDoc = await Section.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      classId: classDoc._id,
      name: 'A',
      code: 'A',
    });
    const acDoc = await AcademicClass.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus1Id,
      academicYearId: academicYear1Id,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      classTeacherId: t1Profile._id,
    });
    academicClassId = acDoc._id.toString();

    // Student 1 & Student 2
    const s1User = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 'student1@acad1.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const studentRole = await Role.findOne({ tenantId: tenant1Id, name: 'STUDENT' });
    await UserRole.create({ tenantId: tenant1Id, userId: s1User._id, roleId: studentRole!._id, schoolId: school1Id });

    const s1 = await Student.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus1Id,
      userId: s1User._id,
      admissionNumber: 'ADM-101',
      personalDetails: { firstName: 'Sam', lastName: 'Altman', dateOfBirth: new Date('2011-01-01'), gender: 'MALE' },
      contactDetails: { currentAddress: { street: '1' } },
    });
    student1Id = s1._id.toString();

    const s2User = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 'student2@acad1.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    await UserRole.create({ tenantId: tenant1Id, userId: s2User._id, roleId: studentRole!._id, schoolId: school1Id });

    const s2 = await Student.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus1Id,
      userId: s2User._id,
      admissionNumber: 'ADM-102',
      personalDetails: { firstName: 'Satya', lastName: 'Nadella', dateOfBirth: new Date('2011-02-02'), gender: 'MALE' },
      contactDetails: { currentAddress: { street: '2' } },
    });
    student2Id = s2._id.toString();

    await StudentEnrollment.create([
      { tenantId: tenant1Id, schoolId: school1Id, campusId: campus1Id, studentId: s1._id, academicYearId: academicYear1Id, academicClassId: acDoc._id, classId: classDoc._id, sectionId: sectionDoc._id, rollNumber: 1, status: 'ENROLLED' },
      { tenantId: tenant1Id, schoolId: school1Id, campusId: campus1Id, studentId: s2._id, academicYearId: academicYear1Id, academicClassId: acDoc._id, classId: classDoc._id, sectionId: sectionDoc._id, rollNumber: 2, status: 'ENROLLED' },
    ]);

    // Parent 1 (linked to Student 1 only)
    const p1User = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 'parent1@acad1.edu',
      userType: UserType.PARENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const parentRole = await Role.findOne({ tenantId: tenant1Id, name: 'PARENT' });
    await UserRole.create({ tenantId: tenant1Id, userId: p1User._id, roleId: parentRole!._id, schoolId: school1Id });
    const p1Profile = await Parent.create({
      tenantId: tenant1Id,
      userId: p1User._id,
      guardianId: 'GUA-001',
      personalDetails: {
        firstName: 'Connie',
        lastName: 'Altman',
      },
      contactDetails: {
        email: 'parent1@acad1.edu',
        phone: '9876543210',
        address: { street: '1 A St', city: 'Metropolis', state: 'State', postalCode: '10001', country: 'India' },
      },
    });
    await StudentParentRelation.create({
      tenantId: tenant1Id,
      studentId: s1._id,
      parentId: p1Profile._id,
      relationshipType: 'MOTHER',
      canAccessAcademicInformation: true,
    });

    // Attendance session for Class 1 on Monday 2026-09-14
    const att = await StudentAttendance.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus1Id,
      academicYearId: academicYear1Id,
      academicClassId: acDoc._id,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      date: new Date('2026-09-14T00:00:00.000Z'),
      attendanceMode: AttendanceMode.DAILY,
      takenBy: t1Profile._id,
      status: AttendanceLifecycleStatus.SUBMITTED,
      records: [
        { studentId: s1._id, status: AttendanceStatus.PRESENT },
        { studentId: s2._id, status: AttendanceStatus.ABSENT },
      ],
    });
    attendance1Id = att._id.toString();

    // Tenant 2 Admin
    const admin2 = await User.create({
      tenantId: tenant2Id,
      schoolId: school2Id,
      email: 'admin@acad2.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const admin2Role = await Role.findOne({ tenantId: tenant2Id, name: 'SCHOOL_ADMIN' });
    await UserRole.create({ tenantId: tenant2Id, userId: admin2._id, roleId: admin2Role!._id, schoolId: school2Id });

    // Fetch Tokens
    const rAdmin1 = await request(app).post('/api/v1/auth/login').set('Host', 'acad1.edusphere.io').send({ email: 'admin@acad1.edu', password: 'Admin@123456' });
    admin1Token = rAdmin1.body.data.accessToken;

    const rAdmin2 = await request(app).post('/api/v1/auth/login').set('Host', 'acad2.edusphere.io').send({ email: 'admin@acad2.edu', password: 'Admin@123456' });
    admin2Token = rAdmin2.body.data.accessToken;

    const rT1 = await request(app).post('/api/v1/auth/login').set('Host', 'acad1.edusphere.io').send({ email: 't1@acad1.edu', password: 'Admin@123456' });
    teacher1Token = rT1.body.data.accessToken;

    const rT2 = await request(app).post('/api/v1/auth/login').set('Host', 'acad1.edusphere.io').send({ email: 't2@acad1.edu', password: 'Admin@123456' });
    teacher2Token = rT2.body.data.accessToken;

    const rS1 = await request(app).post('/api/v1/auth/login').set('Host', 'acad1.edusphere.io').send({ email: 'student1@acad1.edu', password: 'Admin@123456' });
    student1Token = rS1.body.data.accessToken;

    const rS2 = await request(app).post('/api/v1/auth/login').set('Host', 'acad1.edusphere.io').send({ email: 'student2@acad1.edu', password: 'Admin@123456' });
    student2Token = rS2.body.data.accessToken;

    const rP1 = await request(app).post('/api/v1/auth/login').set('Host', 'acad1.edusphere.io').send({ email: 'parent1@acad1.edu', password: 'Admin@123456' });
    parent1Token = rP1.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // 1. Multi-Tenant Isolation Tests
  // =========================================================================

  it('should deny Tenant 2 Admin from reading Tenant 1 attendance records', async () => {
    const res = await request(app)
      .get('/api/v1/attendance')
      .set('Host', 'acad2.edusphere.io')
      .set('Authorization', `Bearer ${admin2Token}`)
      .query({ academicClassId });

    expect(res.status).toBe(200);
    // Scoped to Tenant 2; should return 0 records
    expect(res.body.data.data).toHaveLength(0);
  });

  it('should deny Tenant 2 Admin from modifying or submitting Tenant 1 attendance (IDOR)', async () => {
    const res = await request(app)
      .post(`/api/v1/attendance/${attendance1Id}/submit`)
      .set('Host', 'acad2.edusphere.io')
      .set('Authorization', `Bearer ${admin2Token}`);

    expect(res.status).toBe(404);
  });

  // =========================================================================
  // 2. Teacher Scope Enforcement Tests
  // =========================================================================

  it('should deny unassigned Teacher 2 from marking daily attendance for Class 1', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/daily')
      .set('Host', 'acad1.edusphere.io')
      .set('Authorization', `Bearer ${teacher2Token}`)
      .send({
        academicClassId,
        date: '2026-09-15',
        records: [{ studentId: student1Id, status: AttendanceStatus.PRESENT }],
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow assigned Teacher 1 to mark daily attendance for Class 1', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/daily')
      .set('Host', 'acad1.edusphere.io')
      .set('Authorization', `Bearer ${teacher1Token}`)
      .send({
        academicClassId,
        date: '2026-09-15', // Tuesday
        records: [
          { studentId: student1Id, status: AttendanceStatus.PRESENT },
          { studentId: student2Id, status: AttendanceStatus.PRESENT },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  // =========================================================================
  // 3. Student Self-Access Scope Tests
  // =========================================================================

  it('should allow Student 1 to view own attendance summary', async () => {
    const res = await request(app)
      .get(`/api/v1/attendance/student/${student1Id}`)
      .set('Host', 'acad1.edusphere.io')
      .set('Authorization', `Bearer ${student1Token}`)
      .query({ academicYearId: academicYear1Id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.studentId).toBe(student1Id);
  });

  it('should deny Student 1 from viewing Student 2 attendance summary', async () => {
    const res = await request(app)
      .get(`/api/v1/attendance/student/${student2Id}`)
      .set('Host', 'acad1.edusphere.io')
      .set('Authorization', `Bearer ${student1Token}`)
      .query({ academicYearId: academicYear1Id.toString() });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // =========================================================================
  // 4. Parent Linked-Child Scope Tests
  // =========================================================================

  it('should allow Parent 1 to view attendance summary of linked child (Student 1)', async () => {
    const res = await request(app)
      .get(`/api/v1/attendance/student/${student1Id}`)
      .set('Host', 'acad1.edusphere.io')
      .set('Authorization', `Bearer ${parent1Token}`)
      .query({ academicYearId: academicYear1Id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.studentId).toBe(student1Id);
  });

  it('should deny Parent 1 from viewing attendance summary of unlinked student (Student 2)', async () => {
    const res = await request(app)
      .get(`/api/v1/attendance/student/${student2Id}`)
      .set('Host', 'acad1.edusphere.io')
      .set('Authorization', `Bearer ${parent1Token}`)
      .query({ academicYearId: academicYear1Id.toString() });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // =========================================================================
  // 5. Privilege Escalation Tests
  // =========================================================================

  it('should deny Teacher from approving attendance register', async () => {
    const res = await request(app)
      .post(`/api/v1/attendance/${attendance1Id}/approve`)
      .set('Host', 'acad1.edusphere.io')
      .set('Authorization', `Bearer ${teacher1Token}`);

    expect(res.status).toBe(403);
  });

  it('should deny Teacher from locking attendance register', async () => {
    const res = await request(app)
      .post(`/api/v1/attendance/${attendance1Id}/lock`)
      .set('Host', 'acad1.edusphere.io')
      .set('Authorization', `Bearer ${teacher1Token}`);

    expect(res.status).toBe(403);
  });
});
