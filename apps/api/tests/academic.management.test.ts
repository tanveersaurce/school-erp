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
  Class,
  Section,
  AcademicClass,
  Subject,
  ClassSubject,
  TeacherSubjectAssignment,
  StudentEnrollment,
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
  EducationLevel,
  AcademicStatus,
  SubjectCategory,
  TeacherAssignmentStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Academic Management Integration Suite (Phase 8)', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();

  let schoolAdminToken: string;
  let teacherUserToken: string;
  let teacherProfileId: string;
  let studentProfileId: string;
  let student2ProfileId: string;

  let createdClassId: string;
  let createdSectionId: string;
  let createdAcademicClassId: string;
  let createdSubjectId: string;
  let createdClassSubjectId: string;
  let createdTeacherAssignmentId: string;
  let createdEnrollmentId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    // 1. Seed Tenant
    await Tenant.create({
      _id: tenantId,
      name: 'Cambridge International Trust',
      slug: 'cambridge',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
      features: { maxStudents: 2000, modulesEnabled: ['ALL'], customBranding: true },
    });

    // 2. Seed School
    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Cambridge Academy',
      code: 'CAM-01',
      affiliationBoard: 'CBSE',
      contact: { email: 'admin@cambridge.edu', phone: '9876543210' },
      address: {
        street: '10 King Street',
        city: 'Cambridge',
        state: 'Cambridgeshire',
        postalCode: 'CB2 1TN',
        country: 'UK',
      },
      timezone: 'Europe/London',
      currency: 'GBP',
    });

    // 3. Seed Campus
    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Central Campus',
      code: 'CC',
      status: CampusStatus.ACTIVE,
      address: {
        street: '10 King Street',
        city: 'Cambridge',
        state: 'Cambridgeshire',
        postalCode: 'CB2 1TN',
        country: 'UK',
      },
    });

    // 4. Seed Academic Year
    await AcademicYear.create({
      _id: academicYearId,
      tenantId,
      schoolId,
      campusId,
      name: '2026-2027',
      code: 'AY-2026-2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
      status: AcademicYearStatus.ACTIVE,
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
      email: 'admin@cambridge.edu',
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

    // 8. Seed Teacher User & Profile
    const teacherUser = await User.create({
      tenantId,
      schoolId,
      email: 'teacher.john@cambridge.edu',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
    });

    const teacherRole = await Role.findOne({ tenantId, name: 'TEACHER' });
    await UserRole.create({
      tenantId,
      userId: teacherUser._id,
      roleId: teacherRole!._id,
      schoolId,
      campusId,
    });

    const teacherProfile = await Teacher.create({
      tenantId,
      schoolId,
      userId: teacherUser._id,
      employeeId: 'EMP-TCH-001',
      department: 'Mathematics',
      designation: 'Senior Faculty',
      joiningDate: new Date('2024-01-01'),
    });
    teacherProfileId = teacherProfile._id.toString();

    // 9. Seed Student Profiles
    const stuUser1 = await User.create({
      tenantId,
      schoolId,
      email: 'student.alice@cambridge.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const student1 = await Student.create({
      tenantId,
      schoolId,
      userId: stuUser1._id,
      admissionNumber: 'CAM-STD-001',
      personalDetails: {
        firstName: 'Alice',
        lastName: 'Smith',
        dateOfBirth: new Date('2012-05-15'),
        gender: 'FEMALE',
      },
      contactDetails: {
        primaryEmail: 'student.alice@cambridge.edu',
        currentAddress: '10 King Street',
      },
      currentStatus: StudentStatus.ACTIVE,
    });
    studentProfileId = student1._id.toString();

    const stuUser2 = await User.create({
      tenantId,
      schoolId,
      email: 'student.bob@cambridge.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const student2 = await Student.create({
      tenantId,
      schoolId,
      userId: stuUser2._id,
      admissionNumber: 'CAM-STD-002',
      personalDetails: {
        firstName: 'Bob',
        lastName: 'Jones',
        dateOfBirth: new Date('2012-08-20'),
        gender: 'MALE',
      },
      contactDetails: {
        primaryEmail: 'student.bob@cambridge.edu',
        currentAddress: '12 Queen Street',
      },
      currentStatus: StudentStatus.ACTIVE,
    });
    student2ProfileId = student2._id.toString();

    // Login tokens
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'cambridge.edusphere.io')
      .send({ email: 'admin@cambridge.edu', password: 'Admin@123456' });
    schoolAdminToken = adminLoginRes.body.data.accessToken;

    const teacherLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'cambridge.edusphere.io')
      .send({ email: 'teacher.john@cambridge.edu', password: 'Admin@123456' });
    teacherUserToken = teacherLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  // =========================================================================
  // 1. Class / Grade Level Management
  // =========================================================================
  describe('1. Class / Grade Level Management', () => {
    it('creates a new grade/class successfully', async () => {
      const res = await request(app)
        .post('/api/v1/academic/classes')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Grade 9',
          shortName: 'G9',
          code: 'G9',
          order: 9,
          educationLevel: EducationLevel.SECONDARY,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Grade 9');
      expect(res.body.data.code).toBe('G9');
      expect(res.body.data.educationLevel).toBe(EducationLevel.SECONDARY);
      createdClassId = res.body.data.id;
    });

    it('rejects duplicate class code in the same school', async () => {
      const res = await request(app)
        .post('/api/v1/academic/classes')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Grade 9 Duplicate',
          code: 'G9',
          order: 9,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('retrieves class list with pagination and filter', async () => {
      const res = await request(app)
        .get('/api/v1/academic/classes')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .query({ search: 'Grade 9' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].code).toBe('G9');
    });

    it('retrieves class by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/academic/classes/${createdClassId}`)
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdClassId);
    });

    it('updates class details', async () => {
      const res = await request(app)
        .patch(`/api/v1/academic/classes/${createdClassId}`)
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({ name: 'Grade 9 Advanced' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Grade 9 Advanced');
    });
  });

  // =========================================================================
  // 2. Section Management
  // =========================================================================
  describe('2. Section Management', () => {
    it('creates a new section under a class', async () => {
      const res = await request(app)
        .post('/api/v1/academic/sections')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          classId: createdClassId,
          name: 'Section A',
          code: 'A',
          capacity: 30,
          room: 'Room 101',
          classTeacherId: teacherProfileId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Section A');
      expect(res.body.data.capacity).toBe(30);
      expect(res.body.data.classTeacherId).toBe(teacherProfileId);
      createdSectionId = res.body.data.id;
    });

    it('rejects duplicate section name in the same class', async () => {
      const res = await request(app)
        .post('/api/v1/academic/sections')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          classId: createdClassId,
          name: 'Section A',
        });

      expect(res.status).toBe(409);
    });

    it('retrieves section by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/academic/sections/${createdSectionId}`)
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdSectionId);
    });

    it('updates section capacity and room', async () => {
      const res = await request(app)
        .patch(`/api/v1/academic/sections/${createdSectionId}`)
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({ capacity: 35, room: 'Room 102' });

      expect(res.status).toBe(200);
      expect(res.body.data.capacity).toBe(35);
      expect(res.body.data.room).toBe('Room 102');
    });
  });

  // =========================================================================
  // 3. Academic Class (Offering) Management
  // =========================================================================
  describe('3. Academic Class Offering Management', () => {
    it('creates an academic class offering binding Grade, Section, Campus & Year', async () => {
      const res = await request(app)
        .post('/api/v1/academic/academic-classes')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          campusId: campusId.toString(),
          academicYearId: academicYearId.toString(),
          classId: createdClassId,
          sectionId: createdSectionId,
          capacity: 35,
          room: 'Room 102',
          classTeacherId: teacherProfileId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.capacity).toBe(35);
      expect(res.body.data.currentEnrollment).toBe(0);
      expect(res.body.data.availableCapacity).toBe(35);
      createdAcademicClassId = res.body.data.id;
    });

    it('rejects duplicate academic class offering for the same year, campus, class, and section', async () => {
      const res = await request(app)
        .post('/api/v1/academic/academic-classes')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          campusId: campusId.toString(),
          academicYearId: academicYearId.toString(),
          classId: createdClassId,
          sectionId: createdSectionId,
        });

      expect(res.status).toBe(409);
    });

    it('retrieves academic classes list with computed capacity', async () => {
      const res = await request(app)
        .get('/api/v1/academic/academic-classes')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const found = res.body.data.find((ac: any) => ac.id === createdAcademicClassId);
      expect(found).toBeDefined();
      expect(found.capacity).toBe(35);
    });

    it('assigns and updates class teacher on academic class', async () => {
      const res = await request(app)
        .post(`/api/v1/academic/academic-classes/${createdAcademicClassId}/class-teacher`)
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({ classTeacherId: teacherProfileId });

      expect(res.status).toBe(200);
      expect(res.body.data.classTeacherId).toBe(teacherProfileId);
    });
  });

  // =========================================================================
  // 4. Subject Management
  // =========================================================================
  describe('4. Subject Management', () => {
    it('creates a curriculum subject', async () => {
      const res = await request(app)
        .post('/api/v1/academic/subjects')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Advanced Physics',
          shortName: 'PHYS',
          code: 'PHYS9',
          type: 'CORE',
          category: SubjectCategory.STEM,
          educationLevel: EducationLevel.SECONDARY,
          creditHours: 4,
          sequence: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Advanced Physics');
      expect(res.body.data.code).toBe('PHYS9');
      expect(res.body.data.creditHours).toBe(4);
      createdSubjectId = res.body.data.id;
    });

    it('rejects duplicate subject code within school', async () => {
      const res = await request(app)
        .post('/api/v1/academic/subjects')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Physics Duplicate',
          code: 'PHYS9',
        });

      expect(res.status).toBe(409);
    });

    it('updates subject details', async () => {
      const res = await request(app)
        .patch(`/api/v1/academic/subjects/${createdSubjectId}`)
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({ creditHours: 5 });

      expect(res.status).toBe(200);
      expect(res.body.data.creditHours).toBe(5);
    });
  });

  // =========================================================================
  // 5. Class ↔ Subject Curriculum Mapping
  // =========================================================================
  describe('5. Class-Subject Curriculum Mapping', () => {
    it('maps subject to class for academic year', async () => {
      const res = await request(app)
        .post('/api/v1/academic/class-subjects')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          academicYearId: academicYearId.toString(),
          classId: createdClassId,
          subjectId: createdSubjectId,
          isOptional: false,
          creditHours: 5,
          sequence: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.classId).toBe(createdClassId);
      expect(res.body.data.subjectId).toBe(createdSubjectId);
      createdClassSubjectId = res.body.data.id;
    });

    it('rejects duplicate mapping of same subject to class in same academic year', async () => {
      const res = await request(app)
        .post('/api/v1/academic/class-subjects')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          academicYearId: academicYearId.toString(),
          classId: createdClassId,
          subjectId: createdSubjectId,
        });

      expect(res.status).toBe(409);
    });

    it('retrieves mapped subjects for class & academic year', async () => {
      const res = await request(app)
        .get('/api/v1/academic/class-subjects')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .query({
          academicYearId: academicYearId.toString(),
          classId: createdClassId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].subjectCode).toBe('PHYS9');
    });
  });

  // =========================================================================
  // 6. Teacher-Subject Assignment
  // =========================================================================
  describe('6. Teacher-Subject Assignment', () => {
    it('assigns teacher to teach subject in section', async () => {
      const res = await request(app)
        .post('/api/v1/academic/teacher-assignments')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          academicYearId: academicYearId.toString(),
          teacherId: teacherProfileId,
          subjectId: createdSubjectId,
          classId: createdClassId,
          sectionId: createdSectionId,
          academicClassId: createdAcademicClassId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.teacherId).toBe(teacherProfileId);
      expect(res.body.data.subjectId).toBe(createdSubjectId);
      createdTeacherAssignmentId = res.body.data.id;
    });

    it('rejects duplicate assignment for same teacher, subject, section, and academic year', async () => {
      const res = await request(app)
        .post('/api/v1/academic/teacher-assignments')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          academicYearId: academicYearId.toString(),
          teacherId: teacherProfileId,
          subjectId: createdSubjectId,
          classId: createdClassId,
          sectionId: createdSectionId,
        });

      expect(res.status).toBe(409);
    });

    it('retrieves teacher assignments list', async () => {
      const res = await request(app)
        .get('/api/v1/academic/teacher-assignments')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .query({ teacherId: teacherProfileId });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].teacherId).toBe(teacherProfileId);
    });
  });

  // =========================================================================
  // 7. Student Academic Enrollment & Roll Numbers
  // =========================================================================
  describe('7. Student Academic Enrollment & Roll Numbers', () => {
    it('enrolls student into academic class with unique roll number', async () => {
      const res = await request(app)
        .post('/api/v1/academic/enrollments')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          studentId: studentProfileId,
          academicClassId: createdAcademicClassId,
          rollNumber: 10,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.studentId).toBe(studentProfileId);
      expect(res.body.data.rollNumber).toBe(10);
      expect(res.body.data.status).toBe('ENROLLED');
      createdEnrollmentId = res.body.data._id;
    });

    it('prevents duplicate active enrollment in same academic year', async () => {
      const res = await request(app)
        .post('/api/v1/academic/enrollments')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          studentId: studentProfileId,
          academicClassId: createdAcademicClassId,
          rollNumber: 11,
        });

      expect(res.status).toBe(409);
    });

    it('rejects duplicate roll number in same section', async () => {
      const res = await request(app)
        .post('/api/v1/academic/enrollments')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          studentId: student2ProfileId,
          academicClassId: createdAcademicClassId,
          rollNumber: 10, // already assigned to student 1
        });

      expect(res.status).toBe(409);
    });

    it('enrolls second student with distinct roll number', async () => {
      const res = await request(app)
        .post('/api/v1/academic/enrollments')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          studentId: student2ProfileId,
          academicClassId: createdAcademicClassId,
          rollNumber: 12,
        });

      expect(res.status).toBe(201);
    });

    it('updates roll number of an enrollment', async () => {
      const res = await request(app)
        .patch(`/api/v1/academic/enrollments/${createdEnrollmentId}/roll-number`)
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({ rollNumber: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.rollNumber).toBe(1);
    });

    it('auto-assigns roll numbers alphabetically across students', async () => {
      const res = await request(app)
        .post(`/api/v1/academic/academic-classes/${createdAcademicClassId}/auto-roll-numbers`)
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.updatedCount).toBe(2);
      // Alice Smith should be roll 1, Bob Jones should be roll 2
      const aliceAssignment = res.body.data.assignments.find(
        (a: any) => a.studentId === studentProfileId
      );
      const bobAssignment = res.body.data.assignments.find(
        (a: any) => a.studentId === student2ProfileId
      );
      expect(aliceAssignment.rollNumber).toBe(1);
      expect(bobAssignment.rollNumber).toBe(2);
    });

    it('retrieves enrolled students of academic class', async () => {
      const res = await request(app)
        .get(`/api/v1/academic/academic-classes/${createdAcademicClassId}/students`)
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].firstName).toBe('Alice');
    });

    it('enforces academic class capacity invariant when attempting to exceed capacity', async () => {
      // Temporarily set capacity to 2 (already has 2 enrolled)
      await AcademicClass.updateOne({ _id: createdAcademicClassId }, { capacity: 2 });

      // Create 3rd student
      const stuUser3 = await User.create({
        tenantId,
        schoolId,
        email: 'student.charlie@cambridge.edu',
        userType: UserType.STUDENT,
        status: UserStatus.ACTIVE,
        passwordHash: await passwordService.hashPassword('Admin@123456'),
      });
      const student3 = await Student.create({
        tenantId,
        schoolId,
        userId: stuUser3._id,
        admissionNumber: 'CAM-STD-003',
        personalDetails: {
          firstName: 'Charlie',
          lastName: 'Brown',
          dateOfBirth: new Date(),
          gender: 'MALE',
        },
        contactDetails: {
          primaryEmail: 'student.charlie@cambridge.edu',
          currentAddress: '14 Prince Street',
        },
        currentStatus: StudentStatus.ACTIVE,
      });

      const res = await request(app)
        .post('/api/v1/academic/enrollments')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          studentId: student3._id.toString(),
          academicClassId: createdAcademicClassId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/capacity reached/i);
    });

    it('retrieves comprehensive academic class details (overview, students, subjects, teachers)', async () => {
      const res = await request(app)
        .get(`/api/v1/academic/academic-classes/${createdAcademicClassId}/details`)
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.academicClass).toBeDefined();
      expect(res.body.data.students.length).toBe(2);
      expect(res.body.data.subjects.length).toBe(1);
      expect(res.body.data.teachers.length).toBe(1);
    });
  });

  // =========================================================================
  // 8. Academic Dashboard Summary
  // =========================================================================
  describe('8. Academic Dashboard Summary', () => {
    it('computes school-wide academic metrics and capacity utilization', async () => {
      const res = await request(app)
        .get('/api/v1/academic/dashboard/summary')
        .set('Host', 'cambridge.edusphere.io')
        .set('Authorization', `Bearer ${schoolAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalClasses).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalSections).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalAcademicClasses).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalSubjects).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalTeacherAssignments).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalEnrolled).toBe(2);
      expect(res.body.data.capacityUtilization).toBeGreaterThanOrEqual(0);
    });
  });
});
