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
  Parent,
  StudentParentRelation,
  Library,
  Book,
  BookCopy,
  LibraryMember,
  LibraryCirculation,
  LibraryFine,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  CampusStatus,
  TenantPlan,
  TenantBillingStatus,
  StudentStatus,
  Gender,
  BookCondition,
  BookCopyStatus,
  LibraryMemberType,
  LibraryMemberStatus,
  CirculationStatus,
  LibraryFineType,
  LibraryFineStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 15: Library Security, RBAC & Multi-Tenant Isolation Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  // Tenant A: Oakridge
  const tenantAId = new Types.ObjectId();
  const schoolAId = new Types.ObjectId();
  const campusAId = new Types.ObjectId();

  // Tenant B: Greenwood
  const tenantBId = new Types.ObjectId();
  const schoolBId = new Types.ObjectId();
  const campusBId = new Types.ObjectId();

  let tenantAAdminToken: string;
  let tenantALibrarianToken: string;
  let tenantAStudent1Token: string;
  let tenantAStudent2Token: string;
  let tenantAParent1Token: string;
  let tenantBAdminToken: string;

  let libraryAId: string;
  let bookAId: string;
  let copyAId: string;
  let memberStudent1Id: string;
  let memberStudent2Id: string;
  let circulationA1Id: string;
  let fineA1Id: string;

  let student1DocId: string;
  let student2DocId: string;

  let libraryBId: string;
  let bookBId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Library.init();
    await Book.init();
    await BookCopy.init();
    await LibraryMember.init();
    await LibraryCirculation.init();
    await LibraryFine.init();

    // 1. Seed Tenants
    await Tenant.create([
      {
        _id: tenantAId,
        name: 'Oakridge International',
        slug: 'oakridge',
        status: TenantStatus.ACTIVE,
        plan: TenantPlan.ENTERPRISE,
        billingStatus: TenantBillingStatus.ACTIVE,
      },
      {
        _id: tenantBId,
        name: 'Greenwood Academy',
        slug: 'greenwood',
        status: TenantStatus.ACTIVE,
        plan: TenantPlan.ENTERPRISE,
        billingStatus: TenantBillingStatus.ACTIVE,
      },
    ]);

    await School.create([
      {
        _id: schoolAId,
        tenantId: tenantAId,
        name: 'Oakridge High',
        code: 'OAK_HIGH',
        currency: 'USD',
        timezone: 'UTC',
        affiliationBoard: 'CBSE',
      },
      {
        _id: schoolBId,
        tenantId: tenantBId,
        name: 'Greenwood High',
        code: 'GW_HIGH',
        currency: 'USD',
        timezone: 'UTC',
        affiliationBoard: 'CBSE',
      },
    ]);

    await Campus.create([
      {
        _id: campusAId,
        tenantId: tenantAId,
        schoolId: schoolAId,
        name: 'Oakridge Main',
        code: 'OAK_MAIN',
        address: { street: '1 Oak Way', city: 'Metropolis', state: 'NY', postalCode: '10001', country: 'USA' },
        status: CampusStatus.ACTIVE,
      },
      {
        _id: campusBId,
        tenantId: tenantBId,
        schoolId: schoolBId,
        name: 'Greenwood Main',
        code: 'GW_MAIN',
        address: { street: '2 Forest Rd', city: 'Gotham', state: 'NJ', postalCode: '07001', country: 'USA' },
        status: CampusStatus.ACTIVE,
      },
    ]);

    // 2. Seed Permissions
    const permDocs = await Permission.insertMany(SYSTEM_PERMISSIONS);
    const permMap = new Map<string, Types.ObjectId>();
    for (const p of permDocs) {
      permMap.set(p.permissionString.toLowerCase().trim(), p._id as Types.ObjectId);
    }

    // Roles for Tenant A
    const rolesA = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId: tenantAId,
        name: r.name,
        description: r.description,
        isSystemRole: true,
      }))
    );
    const roleMapA = new Map<string, Types.ObjectId>();
    for (const r of rolesA) {
      roleMapA.set(r.name, r._id as Types.ObjectId);
    }

    // Roles for Tenant B
    const rolesB = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId: tenantBId,
        name: r.name,
        description: r.description,
        isSystemRole: true,
      }))
    );
    const roleMapB = new Map<string, Types.ObjectId>();
    for (const r of rolesB) {
      roleMapB.set(r.name, r._id as Types.ObjectId);
    }

    const rolePerms: any[] = [];
    // Link perms for Tenant A
    for (const r of SYSTEM_ROLES) {
      const rId = roleMapA.get(r.name);
      if (!rId) continue;
      if (r.permissions.includes('*')) {
        for (const pId of permMap.values()) {
          rolePerms.push({ tenantId: tenantAId, roleId: rId, permissionId: pId });
        }
      } else {
        for (const pStr of r.permissions) {
          const pId = permMap.get(pStr.toLowerCase().trim());
          if (pId) rolePerms.push({ tenantId: tenantAId, roleId: rId, permissionId: pId });
        }
      }
    }
    // Link perms for Tenant B
    for (const r of SYSTEM_ROLES) {
      const rId = roleMapB.get(r.name);
      if (!rId) continue;
      if (r.permissions.includes('*')) {
        for (const pId of permMap.values()) {
          rolePerms.push({ tenantId: tenantBId, roleId: rId, permissionId: pId });
        }
      } else {
        for (const pStr of r.permissions) {
          const pId = permMap.get(pStr.toLowerCase().trim());
          if (pId) rolePerms.push({ tenantId: tenantBId, roleId: rId, permissionId: pId });
        }
      }
    }
    await RolePermission.insertMany(rolePerms);

    const passwordHash = await passwordService.hashPassword('Password@123');

    // Users in Tenant A
    const adminUserA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'admin@oakridge.edu',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Oak',
      displayName: 'Admin Oak',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenantAId,
      userId: adminUserA._id,
      roleId: roleMapA.get('SCHOOL_ADMIN'),
      schoolId: schoolAId,
    });

    const librarianUserA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'librarian@oakridge.edu',
      passwordHash,
      firstName: 'Marian',
      lastName: 'Paroo',
      displayName: 'Marian Paroo',
      userType: UserType.STAFF,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenantAId,
      userId: librarianUserA._id,
      roleId: roleMapA.get('LIBRARIAN'),
      schoolId: schoolAId,
    });

    // Student 1 in Tenant A
    const student1UserA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'student1@oakridge.edu',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Liddell',
      displayName: 'Alice Liddell',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenantAId,
      userId: student1UserA._id,
      roleId: roleMapA.get('STUDENT'),
      schoolId: schoolAId,
    });
    const s1 = await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      userId: student1UserA._id,
      admissionNumber: 'ADM-OAK-001',
      admissionDate: new Date('2026-06-01'),
      currentStatus: StudentStatus.ACTIVE,
      personalDetails: { firstName: 'Alice', lastName: 'Liddell', gender: Gender.FEMALE, dateOfBirth: new Date('2012-05-04') },
      contactDetails: { currentAddress: { addressLine1: '1 Wonderland Ave', city: 'Metropolis', state: 'NY', postalCode: '10001', country: 'USA' } },
    });
    student1DocId = s1._id.toString();

    // Student 2 in Tenant A
    const student2UserA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'student2@oakridge.edu',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Cratchit',
      displayName: 'Bob Cratchit',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenantAId,
      userId: student2UserA._id,
      roleId: roleMapA.get('STUDENT'),
      schoolId: schoolAId,
    });
    const s2 = await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      userId: student2UserA._id,
      admissionNumber: 'ADM-OAK-002',
      admissionDate: new Date('2026-06-01'),
      currentStatus: StudentStatus.ACTIVE,
      personalDetails: { firstName: 'Bob', lastName: 'Cratchit', gender: Gender.MALE, dateOfBirth: new Date('2011-12-25') },
      contactDetails: { currentAddress: { addressLine1: '2 Camden St', city: 'Metropolis', state: 'NY', postalCode: '10001', country: 'USA' } },
    });
    student2DocId = s2._id.toString();

    // Parent 1 (Guardian of Student 1)
    const parent1UserA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'parent1@oakridge.edu',
      passwordHash,
      firstName: 'Arthur',
      lastName: 'Liddell',
      displayName: 'Arthur Liddell',
      userType: UserType.PARENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenantAId,
      userId: parent1UserA._id,
      roleId: roleMapA.get('PARENT'),
      schoolId: schoolAId,
    });
    const parent1Doc = await Parent.create({
      tenantId: tenantAId,
      userId: parent1UserA._id,
      guardianId: 'OAK-GRD-001',
      personalDetails: { firstName: 'Arthur', lastName: 'Liddell' },
      contactDetails: { email: 'parent1@oakridge.edu', phone: '5551112222', address: '1 Wonderland Ave' },
      communicationPreferences: { email: true, sms: true, whatsapp: false },
    });
    await StudentParentRelation.create({
      tenantId: tenantAId,
      studentId: s1._id,
      parentId: parent1Doc._id,
      relationshipType: 'FATHER',
      isPrimaryContact: true,
      isEmergencyContact: true,
    });

    // Admin User in Tenant B
    const adminUserB = await User.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      email: 'admin@greenwood.edu',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Green',
      displayName: 'Admin Green',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenantBId,
      userId: adminUserB._id,
      roleId: roleMapB.get('SCHOOL_ADMIN'),
      schoolId: schoolBId,
    });

    // Obtain Tokens
    const loginAAdmin = await request(app).post('/api/v1/auth/login').set('Host', 'oakridge.edusphere.io').send({ email: 'admin@oakridge.edu', password: 'Password@123' });
    tenantAAdminToken = loginAAdmin.body.data.accessToken;

    const loginALib = await request(app).post('/api/v1/auth/login').set('Host', 'oakridge.edusphere.io').send({ email: 'librarian@oakridge.edu', password: 'Password@123' });
    tenantALibrarianToken = loginALib.body.data.accessToken;

    const loginAS1 = await request(app).post('/api/v1/auth/login').set('Host', 'oakridge.edusphere.io').send({ email: 'student1@oakridge.edu', password: 'Password@123' });
    tenantAStudent1Token = loginAS1.body.data.accessToken;

    const loginAS2 = await request(app).post('/api/v1/auth/login').set('Host', 'oakridge.edusphere.io').send({ email: 'student2@oakridge.edu', password: 'Password@123' });
    tenantAStudent2Token = loginAS2.body.data.accessToken;

    const loginAP1 = await request(app).post('/api/v1/auth/login').set('Host', 'oakridge.edusphere.io').send({ email: 'parent1@oakridge.edu', password: 'Password@123' });
    tenantAParent1Token = loginAP1.body.data.accessToken;

    const loginBAdmin = await request(app).post('/api/v1/auth/login').set('Host', 'greenwood.edusphere.io').send({ email: 'admin@greenwood.edu', password: 'Password@123' });
    tenantBAdminToken = loginBAdmin.body.data.accessToken;

    // Create Library and Book in Tenant A
    const libA = await Library.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      name: 'Oakridge Library A',
      code: 'LIB-OAK',
    });
    libraryAId = libA._id.toString();

    const bookA = await Book.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      title: 'Alice in Wonderland',
      isbn: '978-1-5032-2262-5',
      totalCopies: 1,
      availableCopies: 1,
    });
    bookAId = bookA._id.toString();

    const copyA = await BookCopy.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      bookId: bookA._id,
      libraryId: libA._id,
      accessionNumber: 'ACC-OAK-001',
      barcode: 'BAR-OAK-001',
      status: BookCopyStatus.AVAILABLE,
      condition: BookCondition.NEW,
    });
    copyAId = copyA._id.toString();

    const mem1 = await LibraryMember.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      studentId: s1._id,
      userId: student1UserA._id,
      memberNumber: 'MEM-OAK-001',
      memberType: LibraryMemberType.STUDENT,
      status: LibraryMemberStatus.ACTIVE,
    });
    memberStudent1Id = mem1._id.toString();

    const mem2 = await LibraryMember.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      studentId: s2._id,
      userId: student2UserA._id,
      memberNumber: 'MEM-OAK-002',
      memberType: LibraryMemberType.STUDENT,
      status: LibraryMemberStatus.ACTIVE,
    });
    memberStudent2Id = mem2._id.toString();

    // Circulation for Student 1 in Tenant A
    const circA1 = await LibraryCirculation.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      libraryId: libA._id,
      bookCopyId: copyA._id,
      bookId: bookA._id,
      memberId: mem1._id,
      borrowerType: LibraryMemberType.STUDENT,
      borrowerId: s1._id,
      userId: student1UserA._id,
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      issuedBy: librarianUserA._id,
      status: CirculationStatus.ISSUED,
    });
    circulationA1Id = circA1._id.toString();

    // Fine for Student 1 in Tenant A
    const fineA1 = await LibraryFine.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      memberId: mem1._id,
      circulationId: circA1._id,
      bookId: bookA._id,
      bookCopyId: copyA._id,
      type: LibraryFineType.OVERDUE,
      amount: 1500, // $15.00
      paidAmount: 0,
      outstandingAmount: 1500,
      status: LibraryFineStatus.PENDING,
      assessedAt: new Date(),
    });
    fineA1Id = fineA1._id.toString();

    // Create Library and Book in Tenant B
    const libB = await Library.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      campusId: campusBId,
      name: 'Greenwood Library B',
      code: 'LIB-GW',
    });
    libraryBId = libB._id.toString();

    const bookB = await Book.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      title: 'Greenwood Chronicles',
      isbn: '978-0-1234-5678-9',
      totalCopies: 1,
      availableCopies: 1,
    });
    bookBId = bookB._id.toString();
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  }, 60000);

  // =========================================================================
  // 1. Multi-Tenant Isolation
  // =========================================================================
  describe('1. Multi-Tenant Data Isolation', () => {
    it('Tenant B admin cannot read or query Tenant A library branch', async () => {
      const res = await request(app)
        .get(`/api/v1/library/locations/${libraryAId}`)
        .set('Host', 'greenwood.edusphere.io')
        .set('Authorization', `Bearer ${tenantBAdminToken}`);

      expect([403, 404]).toContain(res.status);
    });

    it('Tenant B admin cannot access Tenant A book catalog entry', async () => {
      const res = await request(app)
        .get(`/api/v1/library/books/${bookAId}`)
        .set('Host', 'greenwood.edusphere.io')
        .set('Authorization', `Bearer ${tenantBAdminToken}`);

      expect([403, 404]).toContain(res.status);
    });

    it('Tenant B admin cannot checkout a book copy belonging to Tenant A', async () => {
      const res = await request(app)
        .post('/api/v1/library/circulations/checkout')
        .set('Host', 'greenwood.edusphere.io')
        .set('Authorization', `Bearer ${tenantBAdminToken}`)
        .send({
          memberId: memberStudent1Id,
          copyId: copyAId,
          libraryId: libraryBId,
        });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  // =========================================================================
  // 2. RBAC Permission Gates
  // =========================================================================
  describe('2. RBAC Permission Gates', () => {
    it('Student cannot create book catalog items (requires book:create)', async () => {
      const res = await request(app)
        .post('/api/v1/library/books')
        .set('Host', 'oakridge.edusphere.io')
        .set('Authorization', `Bearer ${tenantAStudent1Token}`)
        .send({
          title: 'Unauthorized Student Book',
        });

      expect(res.status).toBe(403);
    });

    it('Student cannot configure library settings (requires library:manage)', async () => {
      const res = await request(app)
        .put('/api/v1/library/settings')
        .set('Host', 'oakridge.edusphere.io')
        .set('Authorization', `Bearer ${tenantAStudent1Token}`)
        .send({
          dailyFineRateMinorUnits: 0,
        });

      expect(res.status).toBe(403);
    });

    it('Librarian without fine:waive permission or student cannot waive fines', async () => {
      const res = await request(app)
        .post(`/api/v1/library/fines/${fineA1Id}/waive`)
        .set('Host', 'oakridge.edusphere.io')
        .set('Authorization', `Bearer ${tenantAStudent1Token}`)
        .send({
          reason: 'Self waiver attempt',
        });

      expect(res.status).toBe(403);
    });

    it('School Admin WITH fine:waive permission can waive fines with mandatory audit reason', async () => {
      // Missing reason should fail 400
      const badRes = await request(app)
        .post(`/api/v1/library/fines/${fineA1Id}/waive`)
        .set('Host', 'oakridge.edusphere.io')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .send({ reason: '' });

      expect(badRes.status).toBe(400);

      // Valid waiver by Admin
      const goodRes = await request(app)
        .post(`/api/v1/library/fines/${fineA1Id}/waive`)
        .set('Host', 'oakridge.edusphere.io')
        .set('Authorization', `Bearer ${tenantAAdminToken}`)
        .send({
          reason: 'Authorized principal administrative waiver for first offence',
          waivedAmount: 500, // Waive $5.00
        });

      expect(goodRes.status).toBe(200);
      expect(goodRes.body.data.waivedAmount).toBe(500);
    });
  });

  // =========================================================================
  // 3. Anti-IDOR Self-Service & Parent-Child Authorization
  // =========================================================================
  describe('3. Anti-IDOR & Scoped Access Gates', () => {
    it('Student 1 accessing /me/profile retrieves own profile', async () => {
      const res = await request(app)
        .get('/api/v1/library/me/profile')
        .set('Host', 'oakridge.edusphere.io')
        .set('Authorization', `Bearer ${tenantAStudent1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(memberStudent1Id);
    });

    it('Student 1 accessing /me/circulations gets only own loans', async () => {
      const res = await request(app)
        .get('/api/v1/library/me/circulations')
        .set('Host', 'oakridge.edusphere.io')
        .set('Authorization', `Bearer ${tenantAStudent1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0]._id).toBe(circulationA1Id);
    });

    it('Student 2 accessing /me/circulations gets empty list (not Student 1s loans)', async () => {
      const res = await request(app)
        .get('/api/v1/library/me/circulations')
        .set('Host', 'oakridge.edusphere.io')
        .set('Authorization', `Bearer ${tenantAStudent2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
    });

    it('Student 2 attempting to view Student 1 member record directly is denied 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/library/members/${memberStudent1Id}`)
        .set('Host', 'oakridge.edusphere.io')
        .set('Authorization', `Bearer ${tenantAStudent2Token}`);

      expect(res.status).toBe(403);
    });

    it('Verified parent can view their childs library record', async () => {
      const res = await request(app)
        .get(`/api/v1/library/students/${student1DocId}`)
        .set('Host', 'oakridge.edusphere.io')
        .set('Authorization', `Bearer ${tenantAParent1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.member._id).toBe(memberStudent1Id);
      expect(res.body.data.activeLoans).toHaveLength(1);
    });

    it('Parent cannot view an unrelated students library record', async () => {
      const res = await request(app)
        .get(`/api/v1/library/students/${student2DocId}`)
        .set('Host', 'oakridge.edusphere.io')
        .set('Authorization', `Bearer ${tenantAParent1Token}`);

      expect(res.status).toBe(403);
    });
  });
});
