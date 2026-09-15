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
  StudentEnrollment,
  Class,
  Section,
  FeeCategory,
  FeeStructure,
  StudentFeeAssignment,
  FeeInvoice,
  Payment,
  Refund,
  Income,
  Expense,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  CampusStatus,
  TenantPlan,
  TenantBillingStatus,
  FeeCategoryType,
  FeeFrequency,
  DiscountType,
  LateFeeType,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
  WeekDay,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 13: Finance Management End-to-End Integration Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();

  let adminToken: string;
  let studentToken: string;

  let classId: string;
  let sectionId: string;
  let student1Id: string;
  let categoryId: string;
  let structureId: string;
  let invoiceId: string;
  let paymentId: string;
  let refundId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await FeeCategory.init();
    await FeeStructure.init();
    await StudentFeeAssignment.init();
    await FeeInvoice.init();
    await Payment.init();
    await Refund.init();
    await Income.init();
    await Expense.init();

    // 1. Seed Tenant
    await Tenant.create({
      _id: tenantId,
      name: 'Oakridge International Academy',
      slug: 'oakridge',
      customDomain: 'oakridge.edusphere.io',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    // 2. Seed School
    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Oakridge High',
      code: 'OAKRIDGE',
      affiliationBoard: 'IB',
      currency: 'USD',
      timezone: 'UTC',
      settings: {
        numbering: {
          invoicePrefix: 'INV',
          receiptPrefix: 'REC',
        },
        workingDays: [WeekDay.MONDAY, WeekDay.TUESDAY, WeekDay.WEDNESDAY, WeekDay.THURSDAY, WeekDay.FRIDAY],
      },
    });

    // 3. Seed Campus
    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Main Campus',
      code: 'MAIN',
      status: CampusStatus.ACTIVE,
      address: { street: '1 Oak Way', city: 'Metropolis', state: 'State', postalCode: '10001', country: 'USA' },
    });

    // 4. Seed Academic Year
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

    // 5. Seed Permissions & Roles
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

    const passwordHash = await passwordService.hashPassword('Secret@123');

    // Admin User
    const adminUser = await User.create({
      tenantId,
      schoolId,
      email: 'accountant@oakridge.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const adminRole = roleMap.get('SCHOOL_ADMIN');
    await UserRole.create({ tenantId, userId: adminUser._id, roleId: adminRole!, schoolId });

    // Student User & Profile
    const studentUser = await User.create({
      tenantId,
      schoolId,
      email: 'student@oakridge.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const studentRole = roleMap.get('STUDENT');
    await UserRole.create({ tenantId, userId: studentUser._id, roleId: studentRole!, schoolId });

    const studentProfile = await Student.create({
      tenantId,
      schoolId,
      campusId,
      userId: studentUser._id,
      admissionNumber: 'ADM-2026-001',
      personalDetails: {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('2010-01-01'),
        gender: 'MALE',
      },
      contactDetails: { currentAddress: { street: '1 Oak Way' } },
    });
    student1Id = studentProfile._id.toString();

    // Class and Section
    const classDoc = await Class.create({
      tenantId,
      schoolId,
      name: 'Grade 10',
      code: 'G10',
      order: 10,
    });
    classId = classDoc._id.toString();

    const sectionDoc = await Section.create({
      tenantId,
      schoolId,
      name: 'Section A',
      code: 'A',
      classId: classDoc._id,
    });
    sectionId = sectionDoc._id.toString();

    // Enrollment
    await StudentEnrollment.create({
      tenantId,
      schoolId,
      campusId,
      studentId: studentProfile._id,
      academicYearId,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      rollNumber: 1,
      status: 'ENROLLED',
    });

    // Obtain tokens
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'oakridge.edusphere.io')
      .send({ email: 'accountant@oakridge.edu', password: 'Secret@123' });
    adminToken = adminLoginRes.body.data.accessToken;

    const studentLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'oakridge.edusphere.io')
      .send({ email: 'student@oakridge.edu', password: 'Secret@123' });
    studentToken = studentLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('1. should create a fee category', async () => {
    const res = await request(app)
      .post('/api/v1/finance/categories')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Tuition Fee',
        code: 'TUIT_2026',
        description: 'Standard academic tuition fee',
        type: FeeCategoryType.TUITION,
        isTaxable: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe('TUIT_2026');
    categoryId = res.body.data._id;
  });

  it('2. should create a fee structure with heads and calculate total using zero-float math', async () => {
    const res = await request(app)
      .post('/api/v1/finance/structures')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        academicYearId: academicYearId.toString(),
        classId,
        title: 'Grade 10 Standard Fee',
        code: 'G10_FEE_2026',
        heads: [
          {
            feeCategoryId: categoryId,
            name: 'Academic Tuition',
            amount: 100000, // $1,000.00
            isOptional: false,
            frequency: FeeFrequency.ANNUAL,
          },
          {
            name: 'Laboratory Fee',
            amount: 25000, // $250.00
            isOptional: false,
            frequency: FeeFrequency.ANNUAL,
          },
        ],
        lateFeePolicy: {
          enabled: true,
          lateFeeType: LateFeeType.FLAT,
          amount: 5000, // $50.00
          gracePeriodDays: 5,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.totalAmount).toBe(125000); // 100000 + 25000
    structureId = res.body.data._id;
  });

  it('3. should assign fee structure to student with a custom scholarship discount', async () => {
    const res = await request(app)
      .post('/api/v1/finance/assignments')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: student1Id,
        academicYearId: academicYearId.toString(),
        classId,
        feeStructureId: structureId,
        customDiscounts: [
          {
            category: 'Academic Tuition',
            discountType: DiscountType.FLAT,
            value: 20000, // $200.00 discount on tuition
            reason: 'Merit Scholarship',
          },
        ],
      });

    expect(res.status).toBe(201);
    // 125,000 base - 20,000 discount = 105,000 payable
    expect(res.body.data.totalPayable).toBe(105000);
  });

  it('4. should generate an invoice for the student with sequential numbering', async () => {
    const res = await request(app)
      .post('/api/v1/finance/invoices/generate')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        mode: 'SINGLE',
        studentId: student1Id,
        academicYearId: academicYearId.toString(),
        classId,
        feeStructureId: structureId,
        dueDate: new Date(Date.now() + 86400000 * 30),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.invoiceNumber).toMatch(/^INV-\d{4}-\d{5}$/);
    expect(res.body.data.subTotal).toBe(125000);
    expect(res.body.data.totalDiscount).toBe(20000);
    expect(res.body.data.totalAmount).toBe(105000);
    expect(res.body.data.balanceAmount).toBe(105000);
    expect(res.body.data.paidAmount).toBe(0);
    expect(res.body.data.status).toBe(InvoiceStatus.ISSUED);

    invoiceId = res.body.data._id;
  });

  it('5. should record a partial payment and update invoice balances atomically', async () => {
    const res = await request(app)
      .post('/api/v1/finance/payments/collect')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoiceId,
        studentId: student1Id,
        amount: 50000, // $500.00 partial payment
        paymentMethod: PaymentMethod.CASH,
        notes: 'First installment paid in cash',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.receiptNumber).toMatch(/^REC-\d{4}-\d{5}$/);
    expect(res.body.data.amount).toBe(50000);
    expect(res.body.data.status).toBe(PaymentStatus.SUCCESS);

    paymentId = res.body.data._id;

    // Verify invoice status is PARTIALLY_PAID and balance is 55,000
    const invRes = await request(app)
      .get(`/api/v1/finance/invoices/${invoiceId}`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(invRes.body.data.paidAmount).toBe(50000);
    expect(invRes.body.data.balanceAmount).toBe(55000);
    expect(invRes.body.data.status).toBe(InvoiceStatus.PARTIALLY_PAID);
  });

  it('6. should reject payments that exceed the remaining invoice balance', async () => {
    const res = await request(app)
      .post('/api/v1/finance/payments/collect')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoiceId,
        studentId: student1Id,
        amount: 60000, // Balance is 55,000, so 60,000 must fail
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      });

    expect(res.status).toBe(400);
    const errorMsg = res.body.error?.message || res.body.message;
    expect(errorMsg).toContain('exceeds outstanding balance');
  });

  it('7. should collect remaining balance and transition invoice to PAID', async () => {
    const res = await request(app)
      .post('/api/v1/finance/payments/collect')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoiceId,
        studentId: student1Id,
        amount: 55000, // Exact remaining balance
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        transactionReference: 'TXN-WIRE-98765',
      });

    expect(res.status).toBe(201);

    const invRes = await request(app)
      .get(`/api/v1/finance/invoices/${invoiceId}`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(invRes.body.data.paidAmount).toBe(105000);
    expect(invRes.body.data.balanceAmount).toBe(0);
    expect(invRes.body.data.status).toBe(InvoiceStatus.PAID);
  });

  it('8. should process refund workflow (request -> review -> process) and reverse invoice balances', async () => {
    // 8a. Request refund
    const reqRes = await request(app)
      .post('/api/v1/finance/refunds')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        paymentId,
        amount: 20000, // $200.00 refund
        reason: 'Adjusting fee waiver retrospectively',
      });

    expect(reqRes.status).toBe(201);
    expect(reqRes.body.data.status).toBe(RefundStatus.PENDING);
    expect(reqRes.body.data.refundNumber).toMatch(/^REF-\d{4}-\d{5}$/);
    refundId = reqRes.body.data._id;

    // 8b. Review & Approve refund
    const reviewRes = await request(app)
      .put(`/api/v1/finance/refunds/${refundId}/review`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.status).toBe(RefundStatus.APPROVED);

    // 8c. Process refund
    const procRes = await request(app)
      .post(`/api/v1/finance/refunds/${refundId}/process`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(procRes.status).toBe(200);
    expect(procRes.body.data.status).toBe(RefundStatus.PROCESSED);

    // Verify invoice balance increased back by 20,000
    const invRes = await request(app)
      .get(`/api/v1/finance/invoices/${invoiceId}`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(invRes.body.data.paidAmount).toBe(85000); // 105,000 - 20,000
    expect(invRes.body.data.balanceAmount).toBe(20000);
    expect(invRes.body.data.status).toBe(InvoiceStatus.PARTIALLY_PAID);
  });

  it('9. should record non-fee operational income and school expenses', async () => {
    const incRes = await request(app)
      .post('/api/v1/finance/incomes')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Auditorium Rental',
        category: 'Facility Rental',
        amount: 75000,
        referenceNumber: 'RENT-001',
      });
    expect(incRes.status).toBe(201);

    const expRes = await request(app)
      .post('/api/v1/finance/expenses')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Science Lab Equipment',
        category: 'Laboratory Supplies',
        amount: 30000,
        payee: 'Apex Scientific Inc',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        referenceNumber: 'PO-9912',
      });
    expect(expRes.status).toBe(201);
  });

  it('10. should generate comprehensive financial reports and student ledger statements', async () => {
    // 10a. Financial KPI summary
    const kpiRes = await request(app)
      .get('/api/v1/finance/reports/kpis')
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(kpiRes.status).toBe(200);
    expect(kpiRes.body.data.totalInvoiced).toBe(105000);
    expect(kpiRes.body.data.totalCollected).toBe(105000);
    expect(kpiRes.body.data.totalRefunds).toBe(20000);

    // 10b. Student financial ledger statement
    const ledgerRes = await request(app)
      .get(`/api/v1/finance/students/${student1Id}/ledger`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(ledgerRes.status).toBe(200);
    expect(ledgerRes.body.data.studentName).toContain('John Doe');
    expect(ledgerRes.body.data.entries.length).toBeGreaterThanOrEqual(3); // 1 Invoice + 2 Payments + 1 Refund
    expect(ledgerRes.body.data.outstandingBalance).toBe(20000);

    // 10c. Student self-access: student can view own ledger
    const selfRes = await request(app)
      .get(`/api/v1/finance/students/${student1Id}/ledger`)
      .set('Host', 'oakridge.edusphere.io')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(selfRes.status).toBe(200);
    expect(selfRes.body.data.studentId).toBe(student1Id);
  });
});
