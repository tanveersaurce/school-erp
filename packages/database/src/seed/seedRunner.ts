import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import {
  TenantPlan,
  TenantBillingStatus,
  UserType,
  UserStatus,
  StudentStatus,
} from '@edusphere/common';
import {
  Tenant,
  School,
  Campus,
  AcademicYear,
  User,
  Role,
  Permission,
  UserRole,
  RolePermission,
  Class,
  Section,
  Subject,
  Teacher,
  TeacherSubjectAssignment,
  Student,
  Parent,
  StudentParentRelation,
  StudentEnrollment,
  FeeStructure,
} from '../models/index.js';
import { SYSTEM_PERMISSIONS } from './permissions.data.js';
import { SYSTEM_ROLES } from './roles.data.js';

export interface SeedResult {
  tenantId: string;
  schoolId: string;
  academicYearId: string;
  permissionsCount: number;
  rolesCount: number;
  usersCreated: string[];
}

export async function runSeed(): Promise<SeedResult> {
  console.log('--- [EduSphere Database Seed Engine: START] ---');

  // 1. Upsert Default Tenant
  const tenant = await Tenant.findOneAndUpdate(
    { slug: 'greenwood-trust' },
    {
      name: 'Greenwood Educational Trust',
      slug: 'greenwood-trust',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      features: {
        maxStudents: 5000,
        modulesEnabled: [
          'ACADEMICS',
          'ATTENDANCE',
          'FEES',
          'EXAMS',
          'LIBRARY',
          'TRANSPORT',
          'HOSTEL',
          'HR',
        ],
        customBranding: true,
      },
      databaseConfig: { mode: 'SHARED' },
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`[Seed] Tenant ready: ${tenant.name} (${tenant._id})`);

  // 2. Upsert School
  const school = await School.findOneAndUpdate(
    { tenantId: tenant._id, code: 'GHS' },
    {
      tenantId: tenant._id,
      name: 'Greenwood High International School',
      code: 'GHS',
      affiliationBoard: 'CBSE',
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`[Seed] School ready: ${school.name} (${school._id})`);

  // 3. Upsert Campus
  const campus = await Campus.findOneAndUpdate(
    { tenantId: tenant._id, schoolId: school._id, code: 'MC' },
    {
      tenantId: tenant._id,
      schoolId: school._id,
      name: 'Main Campus',
      code: 'MC',
      address: {
        street: '100 Knowledge Park Boulevard',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560100',
        country: 'India',
      },
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`[Seed] Campus ready: ${campus.name} (${campus._id})`);

  // 4. Upsert Academic Year (2026-2027)
  const academicYear = await AcademicYear.findOneAndUpdate(
    { tenantId: tenant._id, schoolId: school._id, campusId: campus._id, name: '2026-2027' },
    {
      tenantId: tenant._id,
      schoolId: school._id,
      campusId: campus._id,
      name: '2026-2027',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T23:59:59.999Z'),
      isCurrent: true,
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`[Seed] Academic Year ready: ${academicYear.name} (${academicYear._id})`);

  // 5. Upsert 75 System Permissions
  const permissionMap = new Map<string, Types.ObjectId>();
  for (const perm of SYSTEM_PERMISSIONS) {
    const pDoc = await Permission.findOneAndUpdate(
      { permissionString: perm.permissionString },
      perm,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    permissionMap.set(perm.permissionString, pDoc._id as Types.ObjectId);
  }
  console.log(`[Seed] Seeded ${permissionMap.size} System Permissions.`);

  // 6. Upsert 14 System Roles & RolePermission mappings
  const roleMap = new Map<string, Types.ObjectId>();
  for (const roleDef of SYSTEM_ROLES) {
    const roleDoc = await Role.findOneAndUpdate(
      { tenantId: tenant._id, name: roleDef.name },
      {
        tenantId: tenant._id,
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: true,
        isDeleted: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    roleMap.set(roleDef.name, roleDoc._id as Types.ObjectId);

    // Map permissions
    const permsToAssign: Types.ObjectId[] = [];
    if (roleDef.permissions.includes('*')) {
      for (const pId of permissionMap.values()) {
        permsToAssign.push(pId);
      }
    } else {
      for (const pStr of roleDef.permissions) {
        const pId = permissionMap.get(pStr);
        if (pId) permsToAssign.push(pId);
      }
    }

    for (const pId of permsToAssign) {
      await RolePermission.findOneAndUpdate(
        { tenantId: tenant._id, roleId: roleDoc._id, permissionId: pId },
        { tenantId: tenant._id, roleId: roleDoc._id, permissionId: pId },
        { upsert: true }
      );
    }
  }
  console.log(`[Seed] Seeded ${roleMap.size} System Roles with Permission Bundles.`);

  // 7. Seed Initial Core Users with securely hashed default password
  const defaultPasswordHash = await bcrypt.hash('Admin@123456', 10);

  const seedUsersConfig = [
    {
      email: 'admin@greenwood.edu',
      role: 'SUPER_ADMIN',
      type: UserType.SUPER_ADMIN,
      phone: '+919876543210',
    },
    {
      email: 'principal@greenwood.edu',
      role: 'PRINCIPAL',
      type: UserType.PRINCIPAL,
      phone: '+919876543211',
    },
    {
      email: 'teacher@greenwood.edu',
      role: 'TEACHER',
      type: UserType.TEACHER,
      phone: '+919876543212',
    },
    {
      email: 'accountant@greenwood.edu',
      role: 'ACCOUNTANT',
      type: UserType.ACCOUNTANT,
      phone: '+919876543213',
    },
    {
      email: 'student@greenwood.edu',
      role: 'STUDENT',
      type: UserType.STUDENT,
      phone: '+919876543214',
    },
    {
      email: 'parent@greenwood.edu',
      role: 'PARENT',
      type: UserType.PARENT,
      phone: '+919876543215',
    },
  ];

  const userMap = new Map<string, Types.ObjectId>();

  for (const cfg of seedUsersConfig) {
    const user = await User.findOneAndUpdate(
      { tenantId: tenant._id, email: cfg.email },
      {
        tenantId: tenant._id,
        schoolId: school._id,
        email: cfg.email,
        phone: cfg.phone,
        passwordHash: defaultPasswordHash,
        userType: cfg.type,
        status: UserStatus.ACTIVE,
        isDeleted: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    userMap.set(cfg.email, user._id as Types.ObjectId);

    // Assign Role to User
    const roleId = roleMap.get(cfg.role);
    if (roleId) {
      await UserRole.findOneAndUpdate(
        { tenantId: tenant._id, userId: user._id, roleId, schoolId: school._id },
        {
          tenantId: tenant._id,
          userId: user._id,
          roleId,
          schoolId: school._id,
          campusId: campus._id,
        },
        { upsert: true }
      );
    }
  }
  console.log(`[Seed] Seeded ${userMap.size} User accounts with mapped Roles.`);

  // 8. Seed Teacher Profile
  const teacherUser = userMap.get('teacher@greenwood.edu')!;
  const teacher = await Teacher.findOneAndUpdate(
    { tenantId: tenant._id, schoolId: school._id, employeeId: 'TCH-001' },
    {
      tenantId: tenant._id,
      schoolId: school._id,
      userId: teacherUser,
      employeeId: 'TCH-001',
      department: 'Science & Mathematics',
      designation: 'Senior Faculty',
      qualifications: ['M.Sc. Mathematics', 'B.Ed.'],
      joiningDate: new Date('2024-06-01T00:00:00.000Z'),
      employmentStatus: 'ACTIVE',
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`[Seed] Teacher Profile ready: ${teacher.employeeId}`);

  // 9. Seed Classes: Grade 9 & Grade 10
  const grade9 = await Class.findOneAndUpdate(
    { tenantId: tenant._id, schoolId: school._id, academicYearId: academicYear._id, code: 'G9' },
    {
      tenantId: tenant._id,
      schoolId: school._id,
      campusId: campus._id,
      academicYearId: academicYear._id,
      name: 'Grade 9',
      code: 'G9',
      order: 9,
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const grade10 = await Class.findOneAndUpdate(
    { tenantId: tenant._id, schoolId: school._id, academicYearId: academicYear._id, code: 'G10' },
    {
      tenantId: tenant._id,
      schoolId: school._id,
      campusId: campus._id,
      academicYearId: academicYear._id,
      name: 'Grade 10',
      code: 'G10',
      order: 10,
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 10. Seed Sections: Section A & Section B for Grade 10
  const section10A = await Section.findOneAndUpdate(
    { tenantId: tenant._id, classId: grade10._id, name: 'Section A' },
    {
      tenantId: tenant._id,
      schoolId: school._id,
      campusId: campus._id,
      academicYearId: academicYear._id,
      classId: grade10._id,
      name: 'Section A',
      capacity: 40,
      room: 'Room 201',
      classTeacherId: teacher._id,
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Section.findOneAndUpdate(
    { tenantId: tenant._id, classId: grade10._id, name: 'Section B' },
    {
      tenantId: tenant._id,
      schoolId: school._id,
      campusId: campus._id,
      academicYearId: academicYear._id,
      classId: grade10._id,
      name: 'Section B',
      capacity: 40,
      room: 'Room 202',
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`[Seed] Classes and Sections initialized.`);

  // 11. Seed Subjects
  const mathSubject = await Subject.findOneAndUpdate(
    { tenantId: tenant._id, schoolId: school._id, code: 'MATH10' },
    {
      tenantId: tenant._id,
      schoolId: school._id,
      name: 'Mathematics',
      code: 'MATH10',
      type: 'CORE',
      creditHours: 5,
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Subject.findOneAndUpdate(
    { tenantId: tenant._id, schoolId: school._id, code: 'SCI10' },
    {
      tenantId: tenant._id,
      schoolId: school._id,
      name: 'Science & Laboratory',
      code: 'SCI10',
      type: 'LAB',
      creditHours: 5,
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 12. Seed TeacherSubjectAssignment
  await TeacherSubjectAssignment.findOneAndUpdate(
    {
      tenantId: tenant._id,
      academicYearId: academicYear._id,
      sectionId: section10A._id,
      subjectId: mathSubject._id,
    },
    {
      tenantId: tenant._id,
      academicYearId: academicYear._id,
      schoolId: school._id,
      teacherId: teacher._id,
      subjectId: mathSubject._id,
      classId: grade10._id,
      sectionId: section10A._id,
    },
    { upsert: true }
  );
  console.log(`[Seed] Teacher Subject Assignment ready.`);

  // 13. Seed Student & Parent Profiles
  const studentUser = userMap.get('student@greenwood.edu')!;
  const student = await Student.findOneAndUpdate(
    { tenantId: tenant._id, schoolId: school._id, admissionNumber: 'STD-2026-0001' },
    {
      tenantId: tenant._id,
      schoolId: school._id,
      userId: studentUser,
      admissionNumber: 'STD-2026-0001',
      personalDetails: {
        firstName: 'John',
        middleName: 'Michael',
        lastName: 'Doe',
        dateOfBirth: new Date('2011-05-14T00:00:00.000Z'),
        gender: 'MALE',
        bloodGroup: 'O+',
        nationality: 'Indian',
      },
      contactDetails: {
        primaryEmail: 'student@greenwood.edu',
        primaryPhone: '+919876543214',
        emergencyPhone: '+919876543215',
        currentAddress: '42 Palm Avenue, Bengaluru',
      },
      currentStatus: StudentStatus.ACTIVE,
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const parentUser = userMap.get('parent@greenwood.edu')!;
  const parent = await Parent.findOneAndUpdate(
    { tenantId: tenant._id, 'contactDetails.email': 'parent@greenwood.edu' },
    {
      tenantId: tenant._id,
      userId: parentUser,
      personalDetails: {
        firstName: 'Robert',
        lastName: 'Doe',
        occupation: 'Software Architect',
        annualIncome: 3500000,
      },
      contactDetails: {
        email: 'parent@greenwood.edu',
        phone: '+919876543215',
        address: '42 Palm Avenue, Bengaluru',
      },
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Link Student and Parent
  await StudentParentRelation.findOneAndUpdate(
    { tenantId: tenant._id, studentId: student._id, parentId: parent._id },
    {
      tenantId: tenant._id,
      studentId: student._id,
      parentId: parent._id,
      relationshipType: 'FATHER',
      isPrimaryContact: true,
      isEmergencyContact: true,
      hasFeeResponsibility: true,
    },
    { upsert: true }
  );

  // Enroll Student in Grade 10 Section A
  await StudentEnrollment.findOneAndUpdate(
    { tenantId: tenant._id, academicYearId: academicYear._id, studentId: student._id },
    {
      tenantId: tenant._id,
      schoolId: school._id,
      campusId: campus._id,
      studentId: student._id,
      academicYearId: academicYear._id,
      classId: grade10._id,
      sectionId: section10A._id,
      rollNumber: 1,
      status: 'ENROLLED',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
    },
    { upsert: true }
  );
  console.log(`[Seed] Student, Parent and Enrollment records configured.`);

  // 14. Seed Grade 10 Standard Fee Structure
  await FeeStructure.findOneAndUpdate(
    {
      tenantId: tenant._id,
      academicYearId: academicYear._id,
      classId: grade10._id,
      title: 'Grade 10 Annual Fee',
    },
    {
      tenantId: tenant._id,
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: grade10._id,
      title: 'Grade 10 Annual Fee',
      heads: [
        { name: 'Tuition Fee', amount: 60000, isOptional: false, frequency: 'QUARTERLY' },
        { name: 'Science Laboratory Fee', amount: 12000, isOptional: false, frequency: 'ANNUAL' },
        { name: 'Library & Technology Fee', amount: 8000, isOptional: false, frequency: 'ANNUAL' },
      ],
      totalAmount: 80000,
      dueDate: new Date('2026-05-15T00:00:00.000Z'),
      isDeleted: false,
    },
    { upsert: true }
  );
  console.log(`[Seed] Fee Structure configured for Grade 10.`);

  console.log('--- [EduSphere Database Seed Engine: COMPLETED SUCCESSFULLY] ---');

  return {
    tenantId: tenant._id.toString(),
    schoolId: school._id.toString(),
    academicYearId: academicYear._id.toString(),
    permissionsCount: permissionMap.size,
    rolesCount: roleMap.size,
    usersCreated: seedUsersConfig.map((u) => u.email),
  };
}
