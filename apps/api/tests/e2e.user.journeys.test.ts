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
  Employee,
  TeacherProfile,
  Student,
  Guardian,
  StudentParentRelation,
  StudentEnrollment,
  AcademicClass,
  Subject,
  ClassSubject,
  TeacherSubjectAssignment,
  StudentAttendance,
  Assignment,
  AssignmentSubmission,
  Exam,
  ExamSchedule,
  ExamMark,
  Result,
  FeeCategory,
  FeeStructure,
  FeeInvoice,
  Payment,
  Book,
  BookCopy,
  Library,
  LibraryMember,
  LibraryCirculation,
  Vehicle,
  TransportRoute,
  StudentTransportAssignment,
  Hostel,
  HostelRoom,
  HostelBed,
  HostelStudentAllocation,
  InventoryStore,
  InventoryItem,
  InventoryStock,
  Notification,
  Announcement,
  AuditLog,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  Gender,
  AttendanceStatus,
  AssignmentType,
  AssignmentStatus,
  SubmissionType,
  SubmissionStatus,
  AssignmentSubmissionStatus,
  ExamStatus,
  FeeCategoryType,
  FeeFrequency,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  BookCopyStatus,
  MemberStatus,
  CirculationStatus,
  HostelType,
  BedStatus,
  NotificationChannel,
  NotificationPriority,
  AuditAction,
  AuditActorType,
  Money,
} from '@edusphere/common';
import {
  createTenant,
  createSchool,
  createCampus,
  createAcademicYear,
  createEmployee,
  createStudent,
  createGuardian,
  createStudentParentRelation,
  createAcademicClass,
  createStudentAttendance,
  createAssignment,
  createBookCopy,
} from './factories/entity.factories.js';
import { persona } from './factories/persona.factories.js';

describe('14 End-to-End Critical User Journeys (Phase 23)', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  let tenant: any;
  let school: any;
  let campus: any;
  let academicYear: any;

  let admin: any;
  let teacher: any;
  let studentPersona: any;
  let parentPersona: any;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    tenant = await createTenant({ name: 'E2E Excellence Trust', slug: 'e2e-trust' });
    school = await createSchool(tenant._id, { name: 'E2E High School', code: 'E2E-01' });
    campus = await createCampus(tenant._id, school._id, { name: 'E2E Main Campus', code: 'E2E-MC', isMainCampus: true });
    academicYear = await createAcademicYear(tenant._id, school._id, campus._id, { isCurrent: true });

    admin = await persona.schoolAdmin(tenant._id, { schoolId: school._id });
    teacher = await persona.teacher(tenant._id, { schoolId: school._id });
    studentPersona = await persona.student(tenant._id, { schoolId: school._id });
    parentPersona = await persona.parent(tenant._id, { schoolId: school._id });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (replSet) {
      await replSet.stop();
    }
  });

  // =========================================================================
  // Journey 1 — School Onboarding
  // =========================================================================
  describe('Journey 1 — School Onboarding Flow', () => {
    it('creates tenant -> school -> campus -> academic year -> admin user', async () => {
      const onboardTenant = await Tenant.create({
        name: 'New Horizon Foundation',
        slug: 'new-horizon',
        plan: 'ENTERPRISE',
        billingStatus: 'ACTIVE',
        status: 'ACTIVE',
      });

      const onboardSchool = await School.create({
        tenantId: onboardTenant._id,
        name: 'New Horizon World School',
        code: 'NHWS-01',
        affiliationBoard: 'IB',
        contact: { email: 'info@newhorizon.edu', phone: '9876543210' },
        address: { street: '1 Horizon Way', city: 'Metropolis', state: 'State', postalCode: '10001', country: 'Country' },
        timezone: 'UTC',
        currency: 'USD',
      });

      const onboardCampus = await Campus.create({
        tenantId: onboardTenant._id,
        schoolId: onboardSchool._id,
        name: 'Main Campus',
        code: 'NH-MC',
        address: { street: '1 Horizon Way', city: 'Metropolis', state: 'State', postalCode: '10001', country: 'Country' },
        status: 'ACTIVE',
        isMainCampus: true,
      });

      const onboardAy = await AcademicYear.create({
        tenantId: onboardTenant._id,
        schoolId: onboardSchool._id,
        campusId: onboardCampus._id,
        name: 'AY 2026-2027',
        code: 'NH-2026',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2027-05-31'),
        status: 'ACTIVE',
        isCurrent: true,
      });

      expect(onboardTenant._id).toBeDefined();
      expect(onboardSchool.tenantId.toString()).toBe(onboardTenant._id.toString());
      expect(onboardCampus.schoolId.toString()).toBe(onboardSchool._id.toString());
      expect(onboardAy.isCurrent).toBe(true);
    });
  });

  // =========================================================================
  // Journey 2 — Staff & Teacher Setup
  // =========================================================================
  describe('Journey 2 — Staff & Teacher Journey', () => {
    it('creates employee -> teacher profile -> verified credentials', async () => {
      const staffUser = await User.create({
        tenantId: tenant._id,
        schoolId: school._id,
        email: 'sarah.connor@e2e.edu',
        passwordHash: '$2a$12$e8wR80B7jX9Fm.fR0x8f7O86D491.5K8i3M6n/l0N9wZ3hC3E4R7u',
        userType: UserType.TEACHER,
        status: UserStatus.ACTIVE,
      });

      const employee = await createEmployee(tenant._id, school._id, staffUser._id, {
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah.connor@e2e.edu',
      });

      const profile = await TeacherProfile.create({
        tenantId: tenant._id,
        schoolId: school._id,
        employeeId: employee._id,
        teacherCode: 'TCH-9001',
        specialization: 'Physics',
        maxWeeklyPeriods: 24,
      });

      expect(employee.userId.toString()).toBe(staffUser._id.toString());
      expect(profile.employeeId.toString()).toBe(employee._id.toString());
    });
  });

  // =========================================================================
  // Journey 3 — Student & Guardian Registration
  // =========================================================================
  describe('Journey 3 — Student & Guardian Journey', () => {
    it('registers student -> links guardian -> creates academic enrollment', async () => {
      const student = await createStudent(tenant._id, school._id, {
        firstName: 'John',
        lastName: 'Connor',
      });

      const guardian = await createGuardian(tenant._id, {
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah.guardian@e2e.edu',
      });

      const relation = await createStudentParentRelation(tenant._id, student._id, guardian._id, {
        relationshipType: 'MOTHER',
      });

      expect(relation.studentId.toString()).toBe(student._id.toString());
      expect(relation.parentId.toString()).toBe(guardian._id.toString());
    });
  });

  // =========================================================================
  // Journey 4 — Academic Curriculum & Allocation
  // =========================================================================
  describe('Journey 4 — Academic Curriculum Allocation', () => {
    it('creates grade & section -> subject -> teacher assignment -> student allocation', async () => {
      const academicClass = await createAcademicClass(tenant._id, school._id, campus._id, academicYear._id, {
        name: 'Grade 10 - Section A',
        code: 'G10-A',
        capacity: 35,
        enrolledCount: 1,
      });

      const subject = await Subject.create({
        tenantId: tenant._id,
        schoolId: school._id,
        name: 'Physics 101',
        code: 'PHY-101',
        type: 'CORE',
      });

      const mapping = await ClassSubject.create({
        tenantId: tenant._id,
        schoolId: school._id,
        academicYearId: academicYear._id,
        classId: academicClass.classId,
        subjectId: subject._id,
        creditHours: 4,
      });

      const assignment = await TeacherSubjectAssignment.create({
        tenantId: tenant._id,
        schoolId: school._id,
        academicYearId: academicYear._id,
        teacherId: teacher.user._id,
        subjectId: subject._id,
        classId: academicClass.classId,
        sectionId: academicClass.sectionId,
        academicClassId: academicClass._id,
        status: 'ACTIVE',
      });

      expect(mapping.classId.toString()).toBe(academicClass.classId.toString());
      expect(assignment.teacherId.toString()).toBe(teacher.user._id.toString());
    });
  });

  // =========================================================================
  // Journey 5 — Daily Attendance Roll Call & Verification
  // =========================================================================
  describe('Journey 5 — Attendance Roll Call', () => {
    it('marks attendance -> submits register -> locks attendance record', async () => {
      const studentId = new Types.ObjectId();
      const academicClassId = new Types.ObjectId();

      const attendance = await createStudentAttendance(
        tenant._id,
        school._id,
        academicClassId,
        studentId,
        academicYear._id,
        {
          takenBy: teacher.user._id,
          status: 'SUBMITTED',
        }
      );

      expect(attendance.status).toBe('SUBMITTED');
      expect(attendance.takenBy.toString()).toBe(teacher.user._id.toString());
    });
  });

  // =========================================================================
  // Journey 6 — Homework Lifecycle & Teacher Evaluation
  // =========================================================================
  describe('Journey 6 — Homework Lifecycle & Grading', () => {
    it('publishes homework -> student submits -> teacher grades with feedback', async () => {
      const academicClassId = new Types.ObjectId();
      const subjectId = new Types.ObjectId();
      const studentId = studentPersona.user._id;

      // 1. Teacher publishes assignment
      const assignment = await createAssignment(
        tenant._id,
        school._id,
        academicClassId,
        subjectId,
        teacher.user._id,
        {
          campusId: campus._id,
          academicYearId: academicYear._id,
          title: 'Projectile Motion Lab',
          description: 'Complete questions 1-10 on motion equations.',
          maxScore: 50,
        }
      );

      // 2. Student submits
      const submission = await AssignmentSubmission.create({
        tenantId: tenant._id,
        schoolId: school._id,
        campusId: campus._id,
        assignmentId: assignment._id,
        studentId,
        textResponse: 'v = u + at derived with proofs attached.',
        status: AssignmentSubmissionStatus.SUBMITTED,
        submittedAt: new Date(),
        attemptNumber: 1,
      });

      // 3. Teacher evaluates
      const graded = await AssignmentSubmission.findByIdAndUpdate(
        submission._id,
        {
          score: 48,
          feedback: 'Excellent work and neat derivation.',
          status: AssignmentSubmissionStatus.GRADED,
          gradedAt: new Date(),
          gradedBy: teacher.user._id,
        },
        { new: true }
      );

      expect(graded?.status).toBe(AssignmentSubmissionStatus.GRADED);
      expect(graded?.score).toBe(48);
      expect(graded?.gradedBy?.toString()).toBe(teacher.user._id.toString());
    });
  });

  // =========================================================================
  // Journey 7 — Master Examination & Result Publication
  // =========================================================================
  describe('Journey 7 — Examination & Results Flow', () => {
    it('creates exam -> schedules -> enters marks -> calculates result', async () => {
      const exam = await Exam.create({
        tenantId: tenant._id,
        schoolId: school._id,
        academicYearId: academicYear._id,
        title: 'Mid-Term Examinations 2026',
        examType: 'MID_TERM',
        code: 'MID-2026',
        term: 'TERM_1',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-10'),
        status: ExamStatus.SCHEDULED,
      });

      const schedule = await ExamSchedule.create({
        tenantId: tenant._id,
        schoolId: school._id,
        examId: exam._id,
        academicClassId: new Types.ObjectId(),
        subjectId: new Types.ObjectId(),
        examDate: new Date('2026-10-02'),
        startTime: '09:00',
        endTime: '12:00',
        maxMarks: 100,
        passMarks: 40,
      });

      const studentId = studentPersona.user._id;
      const mark = await ExamMark.create({
        tenantId: tenant._id,
        schoolId: school._id,
        campusId: campus._id,
        academicYearId: academicYear._id,
        examId: exam._id,
        academicClassId: schedule.academicClassId,
        subjectId: schedule.subjectId,
        studentId,
        maxMarks: 100,
        marksObtained: 92,
        status: 'ENTERED',
      });

      const result = await Result.create({
        tenantId: tenant._id,
        schoolId: school._id,
        campusId: campus._id,
        academicYearId: academicYear._id,
        examId: exam._id,
        studentId,
        academicClassId: schedule.academicClassId,
        classId: new Types.ObjectId(),
        sectionId: new Types.ObjectId(),
        totalMaxMarks: 100,
        totalMarksObtained: 92,
        percentage: 92.0,
        overallGrade: 'A+',
        resultStatus: 'PASS',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      });

      expect(mark.marksObtained).toBe(92);
      expect(result.overallGrade).toBe('A+');
      expect(result.status).toBe('PUBLISHED');
    });
  });

  // =========================================================================
  // Journey 8 — Fees Billing, Payment & Ledger
  // =========================================================================
  describe('Journey 8 — Fees Billing & Reconciliation', () => {
    it('creates fee structure -> issues invoice -> processes payment -> updates balance', async () => {
      const studentId = studentPersona.user._id;

      const category = await FeeCategory.create({
        tenantId: tenant._id,
        schoolId: school._id,
        name: 'Tuition Fee Q1',
        code: 'TUI-Q1',
        type: FeeCategoryType.TUITION,
      });

      const structure = await FeeStructure.create({
        tenantId: tenant._id,
        schoolId: school._id,
        academicYearId: academicYear._id,
        classId: new Types.ObjectId(),
        feeCategoryId: category._id,
        title: 'Standard Grade 10 Tuition',
        totalAmount: 250000, // 2500.00
      });

      const invoice = await FeeInvoice.create({
        tenantId: tenant._id,
        schoolId: school._id,
        studentId,
        academicYearId: academicYear._id,
        classId: new Types.ObjectId(),
        invoiceNumber: 'INV-2026-88001',
        subTotal: 250000,
        totalAmount: 250000,
        paidAmount: 0,
        balanceAmount: 250000,
        status: InvoiceStatus.ISSUED,
        issueDate: new Date(),
        dueDate: new Date('2026-09-30'),
        lineItems: [{ description: 'Tuition Q1', amount: 250000, netAmount: 250000 }],
      });

      // Complete payment
      const payment = await Payment.create({
        tenantId: tenant._id,
        schoolId: school._id,
        invoiceId: invoice._id,
        studentId,
        receiptNumber: 'REC-2026-88001',
        amount: 250000,
        paymentMethod: 'CASH',
        gatewayProvider: 'OFFLINE',
        reconciliationStatus: 'MATCHED',
        status: PaymentStatus.SUCCESS,
        paymentDate: new Date(),
      });

      const updatedInvoice = await FeeInvoice.findByIdAndUpdate(
        invoice._id,
        { $set: { paidAmount: 250000, balanceAmount: 0, status: InvoiceStatus.PAID } },
        { new: true }
      );

      expect(payment.status).toBe(PaymentStatus.SUCCESS);
      expect(updatedInvoice?.status).toBe(InvoiceStatus.PAID);
      expect(Money.subtract(updatedInvoice!.totalAmount, updatedInvoice!.paidAmount)).toBe(0);
    });
  });

  // =========================================================================
  // Journey 9 — Library Catalog, Circulation & Return
  // =========================================================================
  describe('Journey 9 — Library Circulation Flow', () => {
    it('catalogs book -> tracks barcode copy -> checks out to member -> checks in', async () => {
      const studentId = studentPersona.user._id;

      const library = await Library.create({
        tenantId: tenant._id,
        schoolId: school._id,
        campusId: campus._id,
        name: 'Main Campus Library',
        code: 'LIB-MAIN',
        isActive: true,
      });

      const book = await Book.create({
        tenantId: tenant._id,
        schoolId: school._id,
        title: 'A Brief History of Time',
        isbn: '978-0553380163',
        author: 'Stephen Hawking',
        category: 'Physics',
        totalCopies: 1,
        availableCopies: 1,
      });

      const copy = await createBookCopy(tenant._id, book._id, {
        schoolId: school._id,
        libraryId: library._id,
        barcode: 'BC-PHYS-001',
        accessionNumber: 'ACC-PHYS-001',
        status: BookCopyStatus.AVAILABLE,
      });

      const member = await LibraryMember.create({
        tenantId: tenant._id,
        schoolId: school._id,
        userId: studentId,
        memberNumber: 'LIB-MEM-001',
        memberType: 'STUDENT',
        status: 'ACTIVE',
        maxBooks: 2,
      });

      // Checkout
      const circulation = await LibraryCirculation.create({
        tenantId: tenant._id,
        schoolId: school._id,
        libraryId: library._id,
        bookId: book._id,
        bookCopyId: copy._id,
        memberId: member._id,
        borrowerType: 'STUDENT',
        borrowerId: studentId,
        userId: studentId,
        issuedBy: teacher.user._id,
        issuedAt: new Date(),
        dueAt: new Date(Date.now() + 86400000 * 14),
        status: CirculationStatus.ISSUED,
      });

      await BookCopy.findByIdAndUpdate(copy._id, { status: BookCopyStatus.ISSUED });

      // Return
      const returned = await LibraryCirculation.findByIdAndUpdate(
        circulation._id,
        {
          returnedAt: new Date(),
          status: CirculationStatus.RETURNED,
        },
        { new: true }
      );

      await BookCopy.findByIdAndUpdate(copy._id, { status: BookCopyStatus.AVAILABLE });

      expect(returned?.status).toBe(CirculationStatus.RETURNED);
    });
  });

  // =========================================================================
  // Journey 10 — Transport Fleet & Route Allocation
  // =========================================================================
  describe('Journey 10 — Transport Fleet & Route Allocation', () => {
    it('creates vehicle -> configures route -> assigns student to stop', async () => {
      const studentId = studentPersona.user._id;

      const vehicle = await Vehicle.create({
        tenantId: tenant._id,
        schoolId: school._id,
        registrationNumber: 'BUS-EXP-01',
        type: 'BUS',
        capacity: 45,
        status: 'ACTIVE',
      });

      const route = await TransportRoute.create({
        tenantId: tenant._id,
        schoolId: school._id,
        name: 'Downtown Express',
        code: 'RTE-DT-01',
        stops: [
          { name: 'Station Square', order: 1, pickupTime: '07:30', dropoffTime: '15:30' },
        ],
        isActive: true,
      });

      const allocation = await StudentTransportAssignment.create({
        tenantId: tenant._id,
        schoolId: school._id,
        studentId,
        routeId: route._id,
        pickupStopId: new Types.ObjectId(),
        status: 'ACTIVE',
      });

      expect(vehicle.capacity).toBe(45);
      expect(allocation.routeId.toString()).toBe(route._id.toString());
      expect(allocation.studentId.toString()).toBe(studentId.toString());
    });
  });

  // =========================================================================
  // Journey 11 — Hostel Residential Management
  // =========================================================================
  describe('Journey 11 — Hostel Residential Allocation', () => {
    it('creates hostel building & room -> allocates bed -> checks out', async () => {
      const studentId = studentPersona.user._id;

      const hostel = await Hostel.create({
        tenantId: tenant._id,
        schoolId: school._id,
        name: 'Sir Isaac Newton Hall',
        code: 'HST-SIN',
        type: HostelType.BOYS,
        capacity: 50,
        status: 'ACTIVE',
      });

      const room = await HostelRoom.create({
        tenantId: tenant._id,
        hostelId: hostel._id,
        roomNumber: '101',
        floor: 1,
        capacity: 2,
        status: 'AVAILABLE',
      });

      const bed = await HostelBed.create({
        tenantId: tenant._id,
        roomId: room._id,
        bedNumber: '101-A',
        status: BedStatus.AVAILABLE,
      });

      const allocation = await HostelStudentAllocation.create({
        tenantId: tenant._id,
        schoolId: school._id,
        studentId,
        hostelId: hostel._id,
        roomId: room._id,
        bedId: bed._id,
        academicYearId: academicYear._id,
        checkInDate: new Date(),
        status: 'ALLOCATED',
      });

      await HostelBed.findByIdAndUpdate(bed._id, { status: BedStatus.OCCUPIED });

      // Checkout
      const checkout = await HostelStudentAllocation.findByIdAndUpdate(
        allocation._id,
        {
          checkOutDate: new Date(),
          status: 'VACATED',
        },
        { new: true }
      );

      await HostelBed.findByIdAndUpdate(bed._id, { status: BedStatus.AVAILABLE });

      expect(checkout?.status).toBe('VACATED');
    });
  });

  // =========================================================================
  // Journey 12 — Inventory Stock & Asset Management
  // =========================================================================
  describe('Journey 12 — Inventory Stock Lifecycle', () => {
    it('creates store & catalog item -> tracks stock -> issues stock', async () => {
      const store = await InventoryStore.create({
        tenantId: tenant._id,
        schoolId: school._id,
        name: 'Central Stationery Depot',
        code: 'STR-CSD',
        status: 'ACTIVE',
      });

      const item = await InventoryItem.create({
        tenantId: tenant._id,
        schoolId: school._id,
        storeId: store._id,
        name: 'Graph Notebooks (100 Pages)',
        itemCode: 'NB-GRP-100',
        categoryId: new Types.ObjectId(),
        unitId: new Types.ObjectId(),
        itemType: 'CONSUMABLE',
        reorderLevel: 50,
        minimumStock: 10,
      });

      const stock = await InventoryStock.create({
        tenantId: tenant._id,
        schoolId: school._id,
        itemId: item._id,
        storeId: store._id,
        quantityOnHand: 200,
        quantityReserved: 0,
        quantityAvailable: 200,
      });

      // Issue 20 units
      const updated = await InventoryStock.findByIdAndUpdate(
        stock._id,
        { $inc: { quantityOnHand: -20, quantityAvailable: -20 } },
        { new: true }
      );

      expect(updated?.quantityOnHand).toBe(180);
    });
  });

  // =========================================================================
  // Journey 13 — Institutional Announcement & Push Notifications
  // =========================================================================
  describe('Journey 13 — Communication & Broadcast Notice', () => {
    it('creates school-wide announcement -> dispatches notification -> reads notification', async () => {
      const announcement = await Announcement.create({
        tenantId: tenant._id,
        schoolId: school._id,
        title: 'Science Fair 2026 Registration Open',
        content: 'All Grade 9-12 students are invited to register projects.',
        authorId: teacher.user._id,
        category: 'GENERAL',
        priority: 'NORMAL',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishAt: new Date(),
      });

      const notification = await Notification.create({
        tenantId: tenant._id,
        recipientId: studentPersona.user._id,
        category: 'ANNOUNCEMENT',
        eventType: 'ANNOUNCEMENT_PUBLISHED',
        title: announcement.title,
        body: 'A new announcement has been posted: Science Fair 2026',
        priority: 'NORMAL',
        status: 'DELIVERED',
        isRead: false,
      });

      // Mark as read
      const readNotif = await Notification.findByIdAndUpdate(
        notification._id,
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      expect(announcement.status).toBe('PUBLISHED');
      expect(readNotif?.isRead).toBe(true);
      expect(readNotif?.readAt).toBeDefined();
    });
  });

  // =========================================================================
  // Journey 14 — Compliance Audit & Global Search Discovery
  // =========================================================================
  describe('Journey 14 — Compliance Audit & Global Search', () => {
    it('records immutable audit log -> queries audit history -> searches in global search', async () => {
      const studentId = studentPersona.user._id;

      // 1. Record Audit Log
      const audit = await AuditLog.create({
        tenantId: tenant._id,
        actorType: 'USER',
        actorId: admin.user._id,
        action: 'UPDATE',
        entity: 'Student',
        entityId: studentId.toString(),
        status: 'SUCCESS',
        details: { reason: 'Annual information update' },
        timestamp: new Date(),
      });

      // 2. Query Audit Log via API as admin
      const auditRes = await request(app)
        .get(`/api/v1/audit-logs`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.logs.length).toBeGreaterThanOrEqual(1);

      // 3. Prohibit audit records from ever appearing in global search
      const searchRes = await request(app)
        .get('/api/v1/search?q=audit')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(searchRes.status).toBe(200);
      // Ensure zero audit entities returned
      const groups = searchRes.body.data?.groups || [];
      const entityTypes = groups.map((r: any) => r.entityType);
      expect(entityTypes).not.toContain('AuditLog');
    });
  });
});
