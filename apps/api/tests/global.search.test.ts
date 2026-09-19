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
  Student,
  Parent,
  StudentParentRelation,
  Book,
  Class,
  FeeInvoice,
  Announcement,
  AuditLog,
  AcademicYear,
  Campus,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  InvoiceStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';

describe('Phase 21: Global Search API Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenant1Id = new Types.ObjectId();
  const school1Id = new Types.ObjectId();
  const tenant2Id = new Types.ObjectId();
  const school2Id = new Types.ObjectId();

  let adminToken1: string;
  let teacherToken1: string;
  let parentToken1: string;
  let adminToken2: string;

  let childStudent1Id: Types.ObjectId;
  let otherStudent1Id: Types.ObjectId;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    // 1. Tenants & Schools
    await Tenant.create({
      _id: tenant1Id,
      name: 'Search Horizon Academy',
      slug: 'search-horizon',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
    });
    await School.create({
      _id: school1Id,
      tenantId: tenant1Id,
      name: 'Search Horizon Main',
      code: 'SHM',
      affiliationBoard: 'CBSE',
    });

    await Tenant.create({
      _id: tenant2Id,
      name: 'Other Horizon Academy',
      slug: 'other-horizon',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
    });
    await School.create({
      _id: school2Id,
      tenantId: tenant2Id,
      name: 'Other Horizon High',
      code: 'OHH',
      affiliationBoard: 'ICSE',
    });

    // 2. Permissions
    const permissionsToSeed = [
      { resource: 'student', action: 'read', permissionString: 'student:read', category: 'Academics' },
      { resource: 'library', action: 'read', permissionString: 'library:read', category: 'Library' },
      { resource: 'fee', action: 'read', permissionString: 'fee:read', category: 'Finance' },
      { resource: 'academic', action: 'read', permissionString: 'academic:read', category: 'Academics' },
      { resource: 'communication', action: 'read', permissionString: 'communication:read', category: 'Communication' },
      { resource: 'audit', action: 'read', permissionString: 'audit:read', category: 'System' },
    ];

    const permMap = new Map<string, Types.ObjectId>();
    for (const p of permissionsToSeed) {
      const doc = await Permission.create({
        resource: p.resource,
        action: p.action,
        permissionString: p.permissionString,
        description: `Permission ${p.permissionString}`,
        category: p.category,
      });
      permMap.set(p.permissionString, doc._id as Types.ObjectId);
    }

    // 3. Roles
    // Admin with all permissions
    const adminRole = await Role.create({
      tenantId: tenant1Id,
      name: 'SEARCH_ADMIN',
      description: 'Admin with all search access',
      isSystemRole: false,
    });
    await RolePermission.insertMany(
      Array.from(permMap.values()).map((pId) => ({ tenantId: tenant1Id, roleId: adminRole._id, permissionId: pId }))
    );

    // Teacher with student, academic, and library read only (no fee:read)
    const teacherRole = await Role.create({
      tenantId: tenant1Id,
      name: 'TEACHER',
      description: 'Teacher role',
      isSystemRole: false,
    });
    await RolePermission.insertMany([
      { tenantId: tenant1Id, roleId: teacherRole._id, permissionId: permMap.get('student:read')! },
      { tenantId: tenant1Id, roleId: teacherRole._id, permissionId: permMap.get('academic:read')! },
      { tenantId: tenant1Id, roleId: teacherRole._id, permissionId: permMap.get('library:read')! },
      { tenantId: tenant1Id, roleId: teacherRole._id, permissionId: permMap.get('communication:read')! },
    ]);

    // Parent role with student:read and communication:read
    const parentRole = await Role.create({
      tenantId: tenant1Id,
      name: 'PARENT',
      description: 'Parent role',
      isSystemRole: false,
    });
    await RolePermission.insertMany([
      { tenantId: tenant1Id, roleId: parentRole._id, permissionId: permMap.get('student:read')! },
      { tenantId: tenant1Id, roleId: parentRole._id, permissionId: permMap.get('communication:read')! },
    ]);

    // Tenant 2 Admin
    const adminRole2 = await Role.create({
      tenantId: tenant2Id,
      name: 'SEARCH_ADMIN_2',
      description: 'Admin tenant 2',
      isSystemRole: false,
    });
    await RolePermission.insertMany(
      Array.from(permMap.values()).map((pId) => ({ tenantId: tenant2Id, roleId: adminRole2._id, permissionId: pId }))
    );

    const passwordHash = await passwordService.hashPassword('Password@123');

    // 4. Users
    const uAdmin = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 'admin@search.edu',
      firstName: 'Search',
      lastName: 'Admin',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    await UserRole.create({ tenantId: tenant1Id, userId: uAdmin._id, roleId: adminRole._id });

    const uTeacher = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 'teacher@search.edu',
      firstName: 'Search',
      lastName: 'Teacher',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    await UserRole.create({ tenantId: tenant1Id, userId: uTeacher._id, roleId: teacherRole._id });

    const uParent = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 'parent@search.edu',
      firstName: 'Parent',
      lastName: 'User',
      userType: UserType.PARENT,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    await UserRole.create({ tenantId: tenant1Id, userId: uParent._id, roleId: parentRole._id });

    const uAdmin2 = await User.create({
      tenantId: tenant2Id,
      schoolId: school2Id,
      email: 'admin2@search.edu',
      firstName: 'TenantTwo',
      lastName: 'Admin',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    await UserRole.create({ tenantId: tenant2Id, userId: uAdmin2._id, roleId: adminRole2._id });

    // 5. Parent Document
    const parentDoc = await Parent.create({
      tenantId: tenant1Id,
      userId: uParent._id,
      guardianId: 'GRD-900',
      personalDetails: {
        firstName: 'Parent',
        lastName: 'User',
      },
      contactDetails: {
        email: 'parent@search.edu',
        phone: '1234567890',
        address: {
          street: '123 Elm St',
          city: 'Metropolis',
          state: 'State',
          postalCode: '10001',
          country: 'Country',
        },
      },
    });

    // 6. Domain Entities in Tenant 1
    // Student 1 (linked to parent)
    const uStudent1 = await User.create({
      tenantId: tenant1Id,
      email: 'student1@search.edu',
      firstName: 'Alice',
      lastName: 'Newton',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const s1 = await Student.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      userId: uStudent1._id,
      admissionNumber: 'ADM-1001',
      rollNumber: 'R-01',
      personalDetails: {
        firstName: 'Alice',
        lastName: 'Newton',
        dateOfBirth: new Date('2010-05-15'),
        gender: 'FEMALE',
      },
      contactDetails: {
        currentAddress: {
          street: '123 Elm St',
          city: 'Metropolis',
          state: 'State',
          postalCode: '10001',
          country: 'Country',
        },
      },
      currentStatus: 'ACTIVE',
    });
    childStudent1Id = s1._id as Types.ObjectId;

    await StudentParentRelation.create({
      tenantId: tenant1Id,
      parentId: parentDoc._id,
      studentId: childStudent1Id,
      relationshipType: 'MOTHER',
      isPrimaryContact: true,
      canPickup: true,
    });

    // Student 2 (unlinked student)
    const uStudent2 = await User.create({
      tenantId: tenant1Id,
      email: 'student2@search.edu',
      firstName: 'Bob',
      lastName: 'Newton',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const s2 = await Student.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      userId: uStudent2._id,
      admissionNumber: 'ADM-1002',
      rollNumber: 'R-02',
      personalDetails: {
        firstName: 'Bob',
        lastName: 'Newton',
        dateOfBirth: new Date('2010-08-20'),
        gender: 'MALE',
      },
      contactDetails: {
        currentAddress: {
          street: '456 Oak St',
          city: 'Metropolis',
          state: 'State',
          postalCode: '10001',
          country: 'Country',
        },
      },
      currentStatus: 'ACTIVE',
    });
    otherStudent1Id = s2._id as Types.ObjectId;

    // Book
    await Book.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      title: 'Newton Physics Fundamentals',
      author: 'Isaac Newton',
      isbn: '978-0123456789',
      edition: '1st',
    });

    // Campus, Academic Year & Class
    const testCampus = await Campus.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Main Campus',
      code: 'MC1',
      isMain: true,
      address: {
        street: '123 Main Street',
        city: 'Metropolis',
        state: 'State',
        postalCode: '10001',
        country: 'Country',
      },
    });

    const acadYear = await AcademicYear.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: testCampus._id,
      name: '2026-2027',
      code: 'AY26',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
    });

    const testClass = await Class.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Grade 10 Newton Science',
      code: 'CLS-10-SCI',
      order: 10,
    });

    // Fee Invoice
    await FeeInvoice.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      studentId: childStudent1Id,
      academicYearId: acadYear._id,
      classId: testClass._id,
      invoiceNumber: 'INV-NEWTON-001',
      issueDate: new Date(),
      dueDate: new Date(),
      subTotal: 1500,
      totalAmount: 1500,
      paidAmount: 0,
      balanceAmount: 1500,
      status: InvoiceStatus.ISSUED,
    });

    // Announcement
    await Announcement.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      authorId: uAdmin._id,
      title: 'Newton Science Fair 2026',
      content: 'Annual school science fair celebration.',
      targetAudience: 'ALL',
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });

    // Audit Log (Must NEVER be returned by search)
    await AuditLog.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      action: 'NEWTON_ACTION_AUDIT',
      entity: 'STUDENT',
      entityId: 'STU-NEWTON',
      actorType: 'USER',
      status: 'SUCCESS',
    });

    // 7. Domain Entity in Tenant 2 (Isolation test)
    await Book.create({
      tenantId: tenant2Id,
      schoolId: school2Id,
      title: 'Newton Physics for Tenant 2',
      author: 'Isaac Newton',
      isbn: '978-9876543210',
    });

    // Authenticate users
    const resA = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@search.edu',
      password: 'Password@123',
    });
    adminToken1 = resA.body.data.accessToken;

    const resT = await request(app).post('/api/v1/auth/login').send({
      email: 'teacher@search.edu',
      password: 'Password@123',
    });
    teacherToken1 = resT.body.data.accessToken;

    const resP = await request(app).post('/api/v1/auth/login').send({
      email: 'parent@search.edu',
      password: 'Password@123',
    });
    parentToken1 = resP.body.data.accessToken;

    const resA2 = await request(app).post('/api/v1/auth/login').send({
      email: 'admin2@search.edu',
      password: 'Password@123',
    });
    adminToken2 = resA2.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('1. GET /api/v1/search returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/search?q=Newton');
    expect(res.status).toBe(401);
  });

  it('2. GET /api/v1/search rejects queries shorter than 2 characters (422)', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=N')
      .set('Authorization', `Bearer ${adminToken1}`);
    expect(res.status).toBe(422);
  });

  it('3. Searches across multiple entity types for authorized admin', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=Newton')
      .set('Authorization', `Bearer ${adminToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.query).toBe('Newton');
    expect(data.totalMatches).toBeGreaterThanOrEqual(4);

    const entityTypes = data.groups.map((g: any) => g.entityType);
    expect(entityTypes).toContain('STUDENT');
    expect(entityTypes).toContain('BOOK');
    expect(entityTypes).toContain('CLASS');
    expect(entityTypes).toContain('FEE_INVOICE');
    expect(entityTypes).toContain('ANNOUNCEMENT');
  });

  it('4. Filters entity results based on user permissions (teacher lacks fee:read)', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=Newton')
      .set('Authorization', `Bearer ${teacherToken1}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    const entityTypes = data.groups.map((g: any) => g.entityType);

    // Teacher has student:read and library:read
    expect(entityTypes).toContain('STUDENT');
    expect(entityTypes).toContain('BOOK');

    // Teacher lacks fee:read - FEE_INVOICE must NOT appear in search groups
    expect(entityTypes).not.toContain('FEE_INVOICE');
  });

  it('5. Enforces parent scoping: Parent sees only their linked children in student results', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=Newton')
      .set('Authorization', `Bearer ${parentToken1}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    const studentGroup = data.groups.find((g: any) => g.entityType === 'STUDENT');
    expect(studentGroup).toBeDefined();

    // Alice is linked, Bob is not
    const foundIds = studentGroup.items.map((it: any) => it.entityId);
    expect(foundIds).toContain(childStudent1Id.toString());
    expect(foundIds).not.toContain(otherStudent1Id.toString());
  });

  it('6. Escapes regex special characters without causing crash', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=[Newton](*+?)')
      .set('Authorization', `Bearer ${adminToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalMatches).toBe(0);
  });

  it('7. Enforces multi-tenant isolation: Tenant 1 cannot see Tenant 2 records', async () => {
    const res1 = await request(app)
      .get('/api/v1/search?q=Tenant 2')
      .set('Authorization', `Bearer ${adminToken1}`);

    expect(res1.status).toBe(200);
    expect(res1.body.data.totalMatches).toBe(0);

    const res2 = await request(app)
      .get('/api/v1/search?q=Tenant 2')
      .set('Authorization', `Bearer ${adminToken2}`);

    expect(res2.status).toBe(200);
    expect(res2.body.data.totalMatches).toBeGreaterThanOrEqual(1);
    expect(res2.body.data.groups[0].items[0].title).toBe('Newton Physics for Tenant 2');
  });

  it('8. Strictly excludes AuditLog records from global search results', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=NEWTON_ACTION_AUDIT')
      .set('Authorization', `Bearer ${adminToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalMatches).toBe(0);
  });
});
