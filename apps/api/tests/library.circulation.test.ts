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
  Student,
  Library,
  LibrarySetting,
  LibraryAuthor,
  LibraryPublisher,
  LibraryCategory,
  LibraryShelf,
  Book,
  BookCopy,
  LibraryMember,
  LibraryCirculation,
  LibraryReservation,
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
  BookCopyStatus,
  BookCondition,
  LibraryMemberType,
  LibraryMemberStatus,
  CirculationStatus,
  ReservationStatus,
  LibraryFineStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 15: Library Circulation & Concurrency Integration Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();

  let librarianToken: string;
  let studentToken: string;
  let libraryId: string;
  let categoryId: string;
  let authorId: string;
  let publisherId: string;
  let shelfId: string;
  let bookId: string;
  let copy1Id: string;
  let copy2Id: string;
  let memberId: string;
  let studentUserId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Library.init();
    await LibrarySetting.init();
    await LibraryAuthor.init();
    await LibraryPublisher.init();
    await LibraryCategory.init();
    await LibraryShelf.init();
    await Book.init();
    await BookCopy.init();
    await LibraryMember.init();
    await LibraryCirculation.init();
    await LibraryReservation.init();
    await LibraryFine.init();

    // 1. Seed Tenant, School, Campus, AcademicYear
    await Tenant.create({
      _id: tenantId,
      name: 'Oakridge International Academy',
      slug: 'oakridge',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Oakridge High School',
      code: 'OAK_HIGH',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'CBSE',
    });

    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Main Campus',
      code: 'OAK_MAIN',
      address: {
        street: '100 Knowledge Ave',
        city: 'Metropolis',
        state: 'New York',
        postalCode: '10001',
        country: 'USA',
      },
      status: CampusStatus.ACTIVE,
    });

    await AcademicYear.create({
      _id: academicYearId,
      tenantId,
      schoolId,
      campusId,
      name: '2026-2027',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-05-31'),
      status: 'ACTIVE',
      isCurrent: true,
    });

    // 2. Seed Permissions & Roles
    const permDocs = await Permission.insertMany(SYSTEM_PERMISSIONS);
    const permMap = new Map<string, Types.ObjectId>();
    for (const p of permDocs) {
      permMap.set(p.permissionString.toLowerCase().trim(), p._id as Types.ObjectId);
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

    const passwordHash = await passwordService.hashPassword('Password@123');

    // Librarian User
    const librarianUser = await User.create({
      tenantId,
      schoolId,
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
      tenantId,
      userId: librarianUser._id,
      roleId: roleMap.get('LIBRARIAN'),
      schoolId,
    });

    // Student User
    const studentUser = await User.create({
      tenantId,
      schoolId,
      email: 'student.leo@oakridge.edu',
      passwordHash,
      firstName: 'Leo',
      lastName: 'Tolstoy',
      displayName: 'Leo Tolstoy',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    studentUserId = studentUser._id.toString();

    await UserRole.create({
      tenantId,
      userId: studentUser._id,
      roleId: roleMap.get('STUDENT'),
      schoolId,
    });

    await Student.create({
      tenantId,
      schoolId,
      campusId,
      userId: studentUser._id,
      admissionNumber: 'ADM-2026-991',
      admissionDate: new Date('2026-06-01'),
      currentStatus: StudentStatus.ACTIVE,
      personalDetails: {
        firstName: 'Leo',
        lastName: 'Tolstoy',
        gender: Gender.MALE,
        dateOfBirth: new Date('2010-09-09'),
      },
      contactDetails: {
        currentAddress: {
          addressLine1: '100 Knowledge Ave',
          city: 'Metropolis',
          state: 'New York',
          postalCode: '10001',
          country: 'USA',
        },
      },
    });

    // Authenticate Librarian
    const libLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'oakridge.edusphere.io')
      .send({ email: 'librarian@oakridge.edu', password: 'Password@123' });
    librarianToken = libLogin.body.data.accessToken;

    // Authenticate Student
    const studLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'oakridge.edusphere.io')
      .send({ email: 'student.leo@oakridge.edu', password: 'Password@123' });
    studentToken = studLogin.body.data.accessToken;
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  }, 60000);

  it('1. Creates library branch and library settings with zero-float fine configurations', async () => {
    const libRes = await request(app)
      .post('/api/v1/library/libraries')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        name: 'Central Learning Resource Center',
        code: 'LIB-CENTRAL',
        description: 'Main central library building',
        campusId: campusId.toString(),
      });

    expect(libRes.status).toBe(201);
    expect(libRes.body.data.code).toBe('LIB-CENTRAL');
    libraryId = libRes.body.data._id;

    // Configure Library Settings
    const setRes = await request(app)
      .put('/api/v1/library/settings')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        libraryId,
        studentBorrowLimit: 3,
        staffBorrowLimit: 10,
        studentLoanPeriodDays: 14,
        staffLoanPeriodDays: 30,
        studentMaxRenewals: 2,
        staffMaxRenewals: 5,
        dailyFineRateMinorUnits: 50, // 50 cents per day
        gracePeriodDays: 1,
        maxFinePerBookMinorUnits: 2000, // $20.00 max fine
        lostBookProcessingFeeMinorUnits: 500, // $5.00
      });

    expect(setRes.status).toBe(200);
    expect(setRes.body.data.dailyFineRateMinorUnits).toBe(50);
  });

  it('2. Creates catalog metadata: Category, Author, Publisher, Shelf', async () => {
    const catRes = await request(app)
      .post('/api/v1/library/categories')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        name: 'Classic Literature',
        code: 'CAT-LIT-01',
        description: 'Classic world novels and masterpieces',
      });
    expect(catRes.status).toBe(201);
    categoryId = catRes.body.data._id;

    const authRes = await request(app)
      .post('/api/v1/library/authors')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        name: 'George Orwell',
        biography: 'English novelist, essayist, journalist and critic',
      });
    expect(authRes.status).toBe(201);
    authorId = authRes.body.data._id;

    const pubRes = await request(app)
      .post('/api/v1/library/publishers')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        name: 'Secker & Warburg',
        contactEmail: 'contact@secker.co.uk',
      });
    expect(pubRes.status).toBe(201);
    publisherId = pubRes.body.data._id;

    const shelfRes = await request(app)
      .post('/api/v1/library/shelves')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        libraryId,
        name: 'Shelf A-101',
        code: 'SH-A101',
        floor: '1st Floor',
        aisle: 'Aisle 3',
        capacity: 50,
      });
    expect(shelfRes.status).toBe(201);
    shelfId = shelfRes.body.data._id;
  });

  it('3. Enrolls student as a library member', async () => {
    const memRes = await request(app)
      .post('/api/v1/library/members')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        userId: studentUserId,
        memberType: LibraryMemberType.STUDENT,
        maxBorrowLimit: 3,
      });

    expect(memRes.status).toBe(201);
    expect(memRes.body.data.memberNumber).toMatch(/^MEM-/);
    expect(memRes.body.data.status).toBe(LibraryMemberStatus.ACTIVE);
    memberId = memRes.body.data._id;
  });

  it('4. Creates a Book with ISBN and physical copies, verifying counter synchronization', async () => {
    const bookRes = await request(app)
      .post('/api/v1/library/books')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        title: '1984',
        subtitle: 'A Novel',
        isbn: '978-0-452-28423-4',
        authorIds: [authorId],
        publisherId,
        publicationYear: 1949,
        edition: '1st Centennial Edition',
        categoryId,
        language: 'English',
        pages: 328,
        priceMinorUnits: 2500, // $25.00
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.data.totalCopies).toBe(0);
    expect(bookRes.body.data.availableCopies).toBe(0);
    bookId = bookRes.body.data._id;

    // Add Copy 1
    const copy1Res = await request(app)
      .post(`/api/v1/library/books/${bookId}/copies`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        libraryId,
        shelfId,
        barcode: 'BAR-1984-001',
        condition: BookCondition.NEW,
        costMinorUnits: 2500,
      });

    expect(copy1Res.status).toBe(201);
    const copy1Data = Array.isArray(copy1Res.body.data) ? copy1Res.body.data[0] : copy1Res.body.data;
    expect(copy1Data.status).toBe(BookCopyStatus.AVAILABLE);
    expect(copy1Data.accessionNumber).toMatch(/^ACC-/);
    copy1Id = copy1Data._id;

    // Add Copy 2
    const copy2Res = await request(app)
      .post(`/api/v1/library/books/${bookId}/copies`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        libraryId,
        shelfId,
        barcode: 'BAR-1984-002',
        condition: BookCondition.GOOD,
        costMinorUnits: 2500,
      });

    expect(copy2Res.status).toBe(201);
    const copy2Data = Array.isArray(copy2Res.body.data) ? copy2Res.body.data[0] : copy2Res.body.data;
    copy2Id = copy2Data._id;

    // Verify Book counters were synchronized
    const getBookRes = await request(app)
      .get(`/api/v1/library/books/${bookId}`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`);

    expect(getBookRes.body.data.totalCopies).toBe(2);
    expect(getBookRes.body.data.availableCopies).toBe(2);
  });

  let circulation1Id: string;

  it('5. Checks out physical copy 1, decrementing availability atomically', async () => {
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const checkoutRes = await request(app)
      .post('/api/v1/library/circulations/checkout')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        memberId,
        copyId: copy1Id,
        libraryId,
        dueDate,
      });

    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.data.status).toBe(CirculationStatus.ISSUED);
    circulation1Id = checkoutRes.body.data._id;

    // Verify copy status is ISSUED
    const copyCheck = await BookCopy.findById(copy1Id);
    expect(copyCheck?.status).toBe(BookCopyStatus.ISSUED);

    // Verify book availableCopies decremented to 1
    const bookCheck = await Book.findById(bookId);
    expect(bookCheck?.availableCopies).toBe(1);
  });

  it('6. Concurrency test: Simultaneous checkout attempts on the exact same physical copy', async () => {
    // Both requests attempt to checkout copy2 at the exact same moment
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/v1/library/circulations/checkout')
        .set('Host', 'oakridge.edusphere.io')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({ memberId, copyId: copy2Id, libraryId, dueDate }),
      request(app)
        .post('/api/v1/library/circulations/checkout')
        .set('Host', 'oakridge.edusphere.io')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({ memberId, copyId: copy2Id, libraryId, dueDate }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // Exactly one must succeed (201 Created), and the other must fail (400 or 409)
    expect(statuses[0]).toBe(201);
    expect([400, 409]).toContain(statuses[1]);

    // Available copies must now be 0
    const bookCheck = await Book.findById(bookId);
    expect(bookCheck?.availableCopies).toBe(0);
  });

  it('7. Renews loan for copy 1 and extends due date', async () => {
    const renewRes = await request(app)
      .post(`/api/v1/library/circulations/${circulation1Id}/renew`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ additionalDays: 7 });

    expect(renewRes.status).toBe(200);
    expect(renewRes.body.data.renewalCount).toBe(1);
  });

  it('8. Returns physical copy 1 and restores availability', async () => {
    const returnRes = await request(app)
      .post(`/api/v1/library/circulations/${circulation1Id}/return`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        returnCondition: BookCondition.GOOD,
        notes: 'Returned in good condition',
      });

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.data.circulation.status).toBe(CirculationStatus.RETURNED);

    const copyCheck = await BookCopy.findById(copy1Id);
    expect(copyCheck?.status).toBe(BookCopyStatus.AVAILABLE);

    const bookCheck = await Book.findById(bookId);
    expect(bookCheck?.availableCopies).toBe(1);
  });

  it('9. Places a reservation and verifies waitlist positioning', async () => {
    const reserveRes = await request(app)
      .post('/api/v1/library/reservations')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        memberId,
        bookId,
        libraryId,
        priority: 1,
      });

    expect(reserveRes.status).toBe(201);
    expect(reserveRes.body.data.status).toBe(ReservationStatus.PENDING);
    expect(reserveRes.body.data.queuePosition).toBe(1);
  });

  it('10. Marks a circulation as lost, updates physical copy, and assesses replacement fine in minor units', async () => {
    // Find circulation for copy2 (the one that succeeded during concurrency test)
    const circ2 = await LibraryCirculation.findOne({ bookCopyId: copy2Id, status: CirculationStatus.ISSUED });
    expect(circ2).toBeDefined();

    const lostRes = await request(app)
      .post(`/api/v1/library/circulations/${circ2!._id}/lost`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        replacementFeeMinorUnits: 2500, // $25.00
        processingFeeMinorUnits: 500,    // $5.00
        notes: 'Borrower reported book lost on transit',
      });

    expect(lostRes.status).toBe(200);
    expect(lostRes.body.data.circulation.status).toBe(CirculationStatus.LOST);
    expect(lostRes.body.data.fine.amountMinorUnits).toBe(3000); // 2500 + 500 = $30.00
    expect(lostRes.body.data.fine.status).toBe(LibraryFineStatus.PENDING);

    const fineId = lostRes.body.data.fine._id;

    // Settle / Pay Fine
    const payRes = await request(app)
      .post(`/api/v1/library/fines/${fineId}/pay`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        amountMinorUnits: 3000,
        paymentMethod: 'CASH',
        transactionReference: 'RCPT-LIB-1001',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.status).toBe(LibraryFineStatus.PAID);
    expect(payRes.body.data.paidAmountMinorUnits).toBe(3000);
  });
});
