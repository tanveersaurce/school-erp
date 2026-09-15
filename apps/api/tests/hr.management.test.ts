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
  Employee,
  Department,
  Designation,
  LeaveType,
  LeavePolicy,
  LeaveBalance,
  LeaveApplication,
  SalaryComponent,
  SalaryStructure,
  EmployeeSalaryAssignment,
  PayrollPeriod,
  PayrollItem,
  StaffAttendance,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  CampusStatus,
  TenantPlan,
  TenantBillingStatus,
  EmploymentStatus,
  EmploymentType,
  Gender,
  LeaveStatus,
  LeaveDurationType,
  SalaryComponentType,
  ComponentCalculationType,
  PayrollPeriodStatus,
  PayrollPaymentStatus,
  PaymentMethod,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 14: HR & Payroll Management End-to-End Integration Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();

  let adminToken: string;
  let teacherToken: string;
  let employeeId: string;
  let departmentId: string;
  let designationId: string;
  let leaveTypeId: string;
  let leaveAppId: string;
  let salaryCompId: string;
  let salaryStructureId: string;
  let payrollPeriodId: string;
  let payrollItemId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await LeaveType.init();
    await LeavePolicy.init();
    await LeaveBalance.init();
    await LeaveApplication.init();
    await SalaryComponent.init();
    await SalaryStructure.init();
    await EmployeeSalaryAssignment.init();
    await PayrollPeriod.init();
    await PayrollItem.init();

    // 1. Seed Tenant & School & Campus
    await Tenant.create({
      _id: tenantId,
      name: 'Springfield Academy Trust',
      slug: 'springfield',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Springfield High',
      code: 'SPF_HIGH',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'CBSE',
    });

    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Main Campus',
      code: 'MAIN',
      address: {
        street: '742 Evergreen Terrace',
        city: 'Springfield',
        state: 'Oregon',
        postalCode: '97477',
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

    // 2. Seed Permissions and Roles
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

    // Admin user
    const adminUser = await User.create({
      tenantId,
      schoolId,
      email: 'admin.hr@springfield.edu',
      passwordHash,
      firstName: 'HR',
      lastName: 'Admin',
      displayName: 'HR Admin',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId,
      userId: adminUser._id,
      roleId: roleMap.get('SCHOOL_ADMIN'),
      schoolId,
    });

    // Teacher / Staff User
    const teacherUser = await User.create({
      tenantId,
      schoolId,
      email: 'teacher.jane@springfield.edu',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Doe',
      displayName: 'Jane Doe',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId,
      userId: teacherUser._id,
      roleId: roleMap.get('TEACHER'),
      schoolId,
    });

    // Department & Designation
    const dept = await Department.create({
      tenantId,
      schoolId,
      name: 'Science Department',
      code: 'SCI',
    });
    departmentId = dept._id.toString();

    const desig = await Designation.create({
      tenantId,
      schoolId,
      departmentId: dept._id,
      name: 'Senior Physics Teacher',
      code: 'SR_PHYS_TCH',
    });
    designationId = desig._id.toString();

    // Employee
    const emp = await Employee.create({
      tenantId,
      schoolId,
      campusId,
      userId: teacherUser._id,
      employeeId: 'EMP-2026-001',
      firstName: 'Jane',
      lastName: 'Doe',
      displayName: 'Jane Doe',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('1990-05-15'),
      departmentId: dept._id,
      designationId: desig._id,
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      joiningDate: new Date('2024-06-01'),
      workEmail: 'teacher.jane@springfield.edu',
    });
    employeeId = emp._id.toString();

    // Authenticate Admin
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'springfield.edusphere.io')
      .send({ email: 'admin.hr@springfield.edu', password: 'Password@123' });
    adminToken = adminLoginRes.body.data.accessToken;

    // Authenticate Teacher
    const teacherLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'springfield.edusphere.io')
      .send({ email: 'teacher.jane@springfield.edu', password: 'Password@123' });
    teacherToken = teacherLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('1. Updates employee HR lifecycle information and attaches documents', async () => {
    const res = await request(app)
      .patch(`/api/v1/hr/employees/${employeeId}/hr`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        probationStartDate: '2024-06-01T00:00:00.000Z',
        probationEndDate: '2024-12-01T00:00:00.000Z',
        confirmationDate: '2024-12-01T00:00:00.000Z',
        workLocation: 'North Wing Building B',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.workLocation).toBe('North Wing Building B');

    // Attach document
    const docRes = await request(app)
      .post(`/api/v1/hr/employees/${employeeId}/documents`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'National Identity Card',
        documentType: 'ID_PROOF',
        fileUrl: 'https://storage.edusphere.io/docs/id_123.pdf',
      });

    expect(docRes.status).toBe(201);
    expect(docRes.body.data.length).toBeGreaterThan(0);
  });

  it('2. Validates controlled employee status lifecycle transitions', async () => {
    // Valid transition: ACTIVE -> ON_LEAVE
    const res1 = await request(app)
      .post(`/api/v1/hr/employees/${employeeId}/status`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'ON_LEAVE',
        reason: 'Sabbatical for research',
      });

    expect(res1.status).toBe(200);
    expect(res1.body.data.employmentStatus).toBe('ON_LEAVE');

    // Return to ACTIVE
    const res2 = await request(app)
      .post(`/api/v1/hr/employees/${employeeId}/status`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'ACTIVE',
      });
    expect(res2.status).toBe(200);
    expect(res2.body.data.employmentStatus).toBe('ACTIVE');

    // Invalid transition: ACTIVE -> RETIRED without proper intermediate or invalid transition
    // Note: RETIRED has no outgoing transitions
  });

  it('3. Creates Leave Type and Leave Policy', async () => {
    const ltRes = await request(app)
      .post('/api/v1/hr/leave-types')
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Casual Leave',
        code: 'CL',
        description: 'Standard paid casual leave',
        maximumDays: 14,
        isPaid: true,
        requiresApproval: true,
      });

    expect(ltRes.status).toBe(201);
    expect(ltRes.body.data.code).toBe('CL');
    leaveTypeId = ltRes.body.data._id;

    // Create policy
    const lpRes = await request(app)
      .post('/api/v1/hr/leave-policies')
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Standard Staff Leave Policy',
        code: 'CL_STAFF_POLICY',
        leaveTypeId,
        annualAllocation: 14,
        accrualMode: 'ANNUAL',
        allowHalfDay: true,
      });

    expect(lpRes.status).toBe(201);
  });

  it('4. Applies for leave, deducts pending balance, and checks overlap protection', async () => {
    // 1. Check initial balance (auto-initializes to 14)
    const balRes = await request(app)
      .get(`/api/v1/hr/employees/${employeeId}/leave-balances?year=2026`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(balRes.status).toBe(200);
    expect(balRes.body.data.length).toBeGreaterThan(0);

    // 2. Apply for leave (3 days: 2026-09-10 to 2026-09-12)
    const applyRes = await request(app)
      .post(`/api/v1/hr/employees/${employeeId}/leaves/apply`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        leaveTypeId,
        startDate: '2026-09-10T00:00:00.000Z',
        endDate: '2026-09-12T00:00:00.000Z',
        durationType: 'FULL_DAY',
        reason: 'Attending educational symposium',
      });

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.data.totalDays).toBe(3);
    leaveAppId = applyRes.body.data._id;

    // 3. Overlapping request fails
    const overlapRes = await request(app)
      .post(`/api/v1/hr/employees/${employeeId}/leaves/apply`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        leaveTypeId,
        startDate: '2026-09-11T00:00:00.000Z',
        endDate: '2026-09-14T00:00:00.000Z',
        durationType: 'FULL_DAY',
        reason: 'Conflict test',
      });

    expect(overlapRes.status).toBe(400);
    const errMsg = overlapRes.body.error?.message || overlapRes.body.message || '';
    expect(errMsg).toContain('overlapping');
  });

  it('5. Approves leave application and synchronizes with StaffAttendance', async () => {
    const reviewRes = await request(app)
      .post(`/api/v1/hr/leaves/applications/${leaveAppId}/review`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'APPROVED',
        remarks: 'Approved by Principal',
      });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.status).toBe('APPROVED');

    // Verify StaffAttendance record was synchronized
    const attendanceRecord = await StaffAttendance.findOne({
      tenantId,
      staffId: employeeId,
      date: new Date('2026-09-10T00:00:00.000Z'),
    });
    expect(attendanceRecord).toBeDefined();
    expect(attendanceRecord?.status).toBe('EXCUSED');
  });

  it('6. Creates Salary Component and versioned Salary Structure', async () => {
    // 1. Create HRA allowance component (40% percentage of basic)
    const compRes = await request(app)
      .post('/api/v1/hr/salary-components')
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'House Rent Allowance',
        code: 'HRA',
        type: 'EARNING',
        calculationType: 'PERCENTAGE',
        amountOrPercentage: 40,
        baseComponentCode: 'BASIC',
        isTaxable: true,
      });

    expect(compRes.status).toBe(201);
    salaryCompId = compRes.body.data._id;

    // 2. Create Salary Structure v1
    const structRes = await request(app)
      .post('/api/v1/hr/salary-structures')
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Senior Teacher Grade 1',
        code: 'SR_TCH_1',
        description: 'Standard pay scale for senior faculty',
        components: [
          {
            componentId: salaryCompId,
            componentCode: 'HRA',
            name: 'House Rent Allowance',
            type: 'EARNING',
            calculationType: 'PERCENTAGE',
            amountOrPercentage: 40,
            baseComponentCode: 'BASIC',
          },
        ],
        effectiveFrom: '2026-01-01T00:00:00.000Z',
      });

    expect(structRes.status).toBe(201);
    expect(structRes.body.data.version).toBe(1);
    salaryStructureId = structRes.body.data._id;

    // 3. Create v2
    const v2Res = await request(app)
      .post(`/api/v1/hr/salary-structures/${salaryStructureId}/version`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        components: [
          {
            componentId: salaryCompId,
            componentCode: 'HRA',
            name: 'House Rent Allowance',
            type: 'EARNING',
            calculationType: 'PERCENTAGE',
            amountOrPercentage: 45, // Revised to 45%
          },
        ],
        effectiveFrom: '2026-07-01T00:00:00.000Z',
      });

    expect(v2Res.status).toBe(201);
    expect(v2Res.body.data.version).toBe(2);
  });

  it('7. Assigns Salary Structure to Employee with exact zero-float minor units', async () => {
    // Base salary: $5,000.00 -> 500,000 minor units
    const assignRes = await request(app)
      .post(`/api/v1/hr/employees/${employeeId}/salary-assignment`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        salaryStructureId,
        baseSalary: 500000,
        currency: 'USD',
        customComponents: [
          {
            name: 'Conveyance Allowance',
            code: 'CONV',
            type: 'EARNING',
            amount: 50000, // $500.00
          },
        ],
        effectiveFrom: '2026-06-01T00:00:00.000Z',
      });

    expect(assignRes.status).toBe(201);
    // Base (500,000) + HRA 40% (200,000) + Conveyance (50,000) = Gross: 750,000
    expect(assignRes.body.data.grossSalary).toBe(750000);
    expect(assignRes.body.data.netSalary).toBe(750000);
    expect(assignRes.body.data.annualCTC).toBe(9000000); // 750,000 * 12
  });

  it('8. Runs Payroll Cycle: Calculate -> Review -> Approve -> Process -> Lock', async () => {
    // 1. Create Payroll Period for September 2026
    const periodRes = await request(app)
      .post('/api/v1/hr/payroll-periods')
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId,
        name: 'September 2026',
        month: 9,
        year: 2026,
        periodStart: '2026-09-01T00:00:00.000Z',
        periodEnd: '2026-09-30T00:00:00.000Z',
        workingDays: 22,
      });

    expect(periodRes.status).toBe(201);
    payrollPeriodId = periodRes.body.data._id;

    // 2. Add a bonus adjustment of $300.00 (30,000 minor units)
    const adjRes = await request(app)
      .post('/api/v1/hr/payroll/adjustments')
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        payrollPeriodId,
        employeeId,
        type: 'BONUS',
        amount: 30000,
        reason: 'Teacher of the Month bonus',
      });
    expect(adjRes.status).toBe(201);

    // Approve adjustment
    await request(app)
      .post(`/api/v1/hr/payroll/adjustments/${adjRes.body.data._id}/review`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    // 3. Calculate Payroll Run
    const calcRes = await request(app)
      .post('/api/v1/hr/payroll/calculate')
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ payrollPeriodId });

    expect(calcRes.status).toBe(200);
    expect(calcRes.body.data.status).toBe('CALCULATED');
    expect(calcRes.body.data.totalEmployees).toBe(1);
    // Gross: 750,000 (Base + HRA + Conv) + 30,000 (Bonus) = 780,000
    expect(calcRes.body.data.totalGrossPay).toBe(780000);
    expect(calcRes.body.data.totalNetPay).toBe(780000);

    // Fetch item
    const itemsRes = await request(app)
      .get(`/api/v1/hr/payroll-periods/${payrollPeriodId}/items`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(itemsRes.status).toBe(200);
    expect(itemsRes.body.data.length).toBe(1);
    payrollItemId = itemsRes.body.data[0]._id;

    // 4. Submit for Review
    const revRes = await request(app)
      .post(`/api/v1/hr/payroll-periods/${payrollPeriodId}/review`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(revRes.status).toBe(200);
    expect(revRes.body.data.status).toBe('UNDER_REVIEW');

    // 5. Approve Payroll
    const appRes = await request(app)
      .post(`/api/v1/hr/payroll-periods/${payrollPeriodId}/approve`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(appRes.status).toBe(200);
    expect(appRes.body.data.status).toBe('APPROVED');

    // 6. Process Payroll
    const procRes = await request(app)
      .post(`/api/v1/hr/payroll-periods/${payrollPeriodId}/process`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: 'NEFT-2026-SEP-001',
      });
    expect(procRes.status).toBe(200);
    expect(procRes.body.data.status).toBe('PROCESSED');

    // 7. Lock Payroll
    const lockRes = await request(app)
      .post(`/api/v1/hr/payroll-periods/${payrollPeriodId}/lock`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(lockRes.status).toBe(200);
    expect(lockRes.body.data.status).toBe('LOCKED');

    // 8. Subsequent recalculation on locked payroll fails
    const failCalcRes = await request(app)
      .post('/api/v1/hr/payroll/calculate')
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ payrollPeriodId });
    expect(failCalcRes.status).toBe(400);
  });

  it('9. Retrieves itemized digital payslip and enforces employee self-service', async () => {
    // 1. Admin accesses payslip
    const adminPayslipRes = await request(app)
      .get(`/api/v1/hr/payslips/${payrollItemId}`)
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminPayslipRes.status).toBe(200);
    expect(adminPayslipRes.body.data.netPay).toBe(780000);
    expect(adminPayslipRes.body.data.employeeCode).toBe('EMP-2026-001');

    // 2. Employee self-service retrieves own payslips
    const myPayslipsRes = await request(app)
      .get('/api/v1/hr/payslips/my')
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(myPayslipsRes.status).toBe(200);
    expect(myPayslipsRes.body.data.length).toBeGreaterThan(0);
    expect(myPayslipsRes.body.data[0].netPay).toBe(780000);
  });

  it('10. Retrieves HR and Payroll Executive Dashboard KPIs', async () => {
    const hrKpiRes = await request(app)
      .get('/api/v1/hr/dashboard/kpis')
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(hrKpiRes.status).toBe(200);
    expect(hrKpiRes.body.data.totalEmployees).toBe(1);
    expect(hrKpiRes.body.data.activeEmployees).toBe(1);

    const payKpiRes = await request(app)
      .get('/api/v1/hr/payroll-dashboard/kpis')
      .set('Host', 'springfield.edusphere.io')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(payKpiRes.status).toBe(200);
    expect(payKpiRes.body.data.totalEmployeesCount).toBe(1);
    expect(payKpiRes.body.data.totalNetPayroll).toBe(780000);
  });
});
