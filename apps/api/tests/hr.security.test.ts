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
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  CampusStatus,
  EmploymentStatus,
  EmploymentType,
  Gender,
  SalaryComponentType,
  ComponentCalculationType,
  PayrollPeriodStatus,
  PayrollPaymentStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 14: HR & Payroll Security, IDOR & Multi-Tenant Isolation Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantAId = new Types.ObjectId();
  const schoolAId = new Types.ObjectId();
  const campusAId = new Types.ObjectId();

  const tenantBId = new Types.ObjectId();
  const schoolBId = new Types.ObjectId();
  const campusBId = new Types.ObjectId();

  let adminAToken: string;
  let adminBToken: string;
  let teacher1Token: string;
  let teacher2Token: string;

  let employee1Id: string;
  let employee2Id: string;
  let leaveTypeAId: string;
  let salaryStructureAId: string;
  let payrollPeriodAId: string;
  let payrollItemAId: string;

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

    // 1. Seed Tenant A
    await Tenant.create({
      _id: tenantAId,
      name: 'Alpha Academy',
      slug: 'alpha',
      customDomain: 'alpha.edusphere.io',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.GROWTH,
      billingStatus: TenantBillingStatus.ACTIVE,
    });
    await School.create({
      _id: schoolAId,
      tenantId: tenantAId,
      name: 'Alpha High',
      code: 'ALPHA',
      affiliationBoard: 'CBSE',
      timezone: 'UTC',
    });
    await Campus.create({
      _id: campusAId,
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'Alpha Main Campus',
      code: 'ALPHA-MC',
      address: {
        street: '1 Alpha Way',
        city: 'AlphaCity',
        state: 'AlphaState',
        postalCode: '10001',
        country: 'USA',
      },
      status: CampusStatus.ACTIVE,
    });

    // 2. Seed Tenant B
    await Tenant.create({
      _id: tenantBId,
      name: 'Beta Academy',
      slug: 'beta',
      customDomain: 'beta.edusphere.io',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.GROWTH,
      billingStatus: TenantBillingStatus.ACTIVE,
    });
    await School.create({
      _id: schoolBId,
      tenantId: tenantBId,
      name: 'Beta High',
      code: 'BETA',
      affiliationBoard: 'CBSE',
      timezone: 'UTC',
    });
    await Campus.create({
      _id: campusBId,
      tenantId: tenantBId,
      schoolId: schoolBId,
      name: 'Beta Main Campus',
      code: 'BETA-MC',
      address: {
        street: '2 Beta Way',
        city: 'BetaCity',
        state: 'BetaState',
        postalCode: '20002',
        country: 'USA',
      },
      status: CampusStatus.ACTIVE,
    });

    // 3. Seed Permissions & Roles for both tenants
    const permDocs = await Permission.insertMany(SYSTEM_PERMISSIONS);
    const permMap = new Map<string, Types.ObjectId>();
    for (const p of permDocs) {
      permMap.set(p.permissionString.toLowerCase().trim(), p._id as Types.ObjectId);
    }

    for (const tId of [tenantAId, tenantBId]) {
      const roleDocs = await Role.insertMany(
        SYSTEM_ROLES.map((r) => ({
          tenantId: tId,
          name: r.name,
          displayName: r.displayName,
          description: r.description,
          isSystem: r.isSystem,
        }))
      );

      const tRoleMap = new Map<string, Types.ObjectId>();
      for (const rd of roleDocs) {
        tRoleMap.set(rd.name, rd._id as Types.ObjectId);
      }

      for (const roleDef of SYSTEM_ROLES) {
        const rId = tRoleMap.get(roleDef.name);
        if (!rId) continue;
        const permsToAssign: Types.ObjectId[] = [];
        if (roleDef.permissions.includes('*')) {
          permsToAssign.push(...permDocs.map((p) => p._id as Types.ObjectId));
        } else {
          for (const pStr of roleDef.permissions) {
            const pId = permMap.get(pStr.toLowerCase().trim());
            if (pId) permsToAssign.push(pId);
          }
        }
        if (permsToAssign.length > 0) {
          await RolePermission.insertMany(
            permsToAssign.map((pId) => ({ tenantId: tId, roleId: rId, permissionId: pId }))
          );
        }
      }
    }

    const passwordHash = await passwordService.hashPassword('SecPassword@123');

    // 4. Create Users in Tenant A
    const adminAUser = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'admin@alpha.edusphere.io',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Alpha',
      displayName: 'Admin Alpha',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    const adminARole = await Role.findOne({ tenantId: tenantAId, name: 'SCHOOL_ADMIN' });
    await UserRole.create({
      tenantId: tenantAId,
      userId: adminAUser._id,
      roleId: adminARole!._id,
      schoolId: schoolAId,
    });

    const teacher1User = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'teacher1@alpha.edusphere.io',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Doe',
      displayName: 'Jane Doe',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    const teacherARole = await Role.findOne({ tenantId: tenantAId, name: 'TEACHER' });
    await UserRole.create({
      tenantId: tenantAId,
      userId: teacher1User._id,
      roleId: teacherARole!._id,
      schoolId: schoolAId,
    });

    const teacher2User = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'teacher2@alpha.edusphere.io',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Smith',
      displayName: 'Bob Smith',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenantAId,
      userId: teacher2User._id,
      roleId: teacherARole!._id,
      schoolId: schoolAId,
    });

    // 5. Create Users in Tenant B
    const adminBUser = await User.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      email: 'admin@beta.edusphere.io',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Beta',
      displayName: 'Admin Beta',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    const adminBRole = await Role.findOne({ tenantId: tenantBId, name: 'SCHOOL_ADMIN' });
    await UserRole.create({
      tenantId: tenantBId,
      userId: adminBUser._id,
      roleId: adminBRole!._id,
      schoolId: schoolBId,
    });

    // 6. Department & Employees in Tenant A
    const deptA = await Department.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'Science',
      code: 'SCI_A',
    });
    const desigA = await Designation.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      departmentId: deptA._id,
      name: 'Teacher',
      code: 'TCH_A',
    });

    const emp1 = await Employee.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      userId: teacher1User._id,
      employeeId: 'EMP-A-001',
      firstName: 'Jane',
      lastName: 'Doe',
      displayName: 'Jane Doe',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('1990-01-01'),
      departmentId: deptA._id,
      designationId: desigA._id,
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      joiningDate: new Date('2024-01-01'),
      workEmail: 'teacher1@alpha.edusphere.io',
    });
    employee1Id = emp1._id.toString();

    const emp2 = await Employee.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      userId: teacher2User._id,
      employeeId: 'EMP-A-002',
      firstName: 'Bob',
      lastName: 'Smith',
      displayName: 'Bob Smith',
      gender: Gender.MALE,
      dateOfBirth: new Date('1992-02-02'),
      departmentId: deptA._id,
      designationId: desigA._id,
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      joiningDate: new Date('2024-02-01'),
      workEmail: 'teacher2@alpha.edusphere.io',
    });
    employee2Id = emp2._id.toString();

    // 7. Seed HR records in Tenant A
    const ltA = await LeaveType.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'Alpha Sick Leave',
      code: 'ASL',
      maximumDays: 10,
      isPaid: true,
      requiresApproval: true,
    });
    leaveTypeAId = ltA._id.toString();

    const salCompA = await SalaryComponent.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'Alpha Basic Pay',
      code: 'ABASIC',
      type: SalaryComponentType.EARNING,
      calculationType: ComponentCalculationType.FIXED,
      amountOrPercentage: 400000,
    });

    const structA = await SalaryStructure.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'Alpha Faculty Structure',
      code: 'AFS',
      version: 1,
      components: [
        {
          componentId: salCompA._id,
          componentCode: 'ABASIC',
          name: 'Alpha Basic Pay',
          type: SalaryComponentType.EARNING,
          calculationType: ComponentCalculationType.FIXED,
          amountOrPercentage: 400000,
        },
      ],
      effectiveFrom: new Date('2026-01-01'),
    });
    salaryStructureAId = structA._id.toString();

    await EmployeeSalaryAssignment.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      employeeId: emp1._id,
      salaryStructureId: structA._id,
      baseSalary: 400000,
      currency: 'USD',
      grossSalary: 400000,
      totalDeductions: 0,
      netSalary: 400000,
      annualCTC: 4800000,
      customComponents: [],
      effectiveFrom: new Date('2026-01-01'),
      status: 'ACTIVE',
      version: 1,
    });

    const periodA = await PayrollPeriod.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'September 2026',
      month: 9,
      year: 2026,
      periodStart: new Date('2026-09-01'),
      periodEnd: new Date('2026-09-30'),
      workingDays: 22,
      status: PayrollPeriodStatus.CALCULATED,
      totalEmployees: 1,
      totalGrossPay: 400000,
      totalDeductions: 0,
      totalNetPay: 400000,
    });
    payrollPeriodAId = periodA._id.toString();

    const itemA = await PayrollItem.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      payrollPeriodId: periodA._id,
      employeeId: emp1._id,
      salaryAssignmentId: new Types.ObjectId(),
      employeeCode: 'EMP-A-001',
      employeeName: 'Jane Doe',
      departmentName: 'Science',
      designationName: 'Teacher',
      baseSalary: 400000,
      workingDays: 22,
      paidDays: 22,
      unpaidDays: 0,
      leaveDays: 0,
      overtimeHours: 0,
      overtimeAmount: 0,
      bonusAmount: 0,
      grossEarnings: 400000,
      totalDeductions: 0,
      netPay: 400000,
      earnings: [{ code: 'ABASIC', name: 'Alpha Basic Pay', amount: 400000 }],
      deductions: [],
      paymentStatus: PayrollPaymentStatus.PENDING,
      isLocked: false,
    });
    payrollItemAId = itemA._id.toString();

    // 8. Authenticate Tokens
    const loginA = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'admin@alpha.edusphere.io', password: 'SecPassword@123' });
    adminAToken = loginA.body.data.accessToken;

    const loginB = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'beta.edusphere.io')
      .send({ email: 'admin@beta.edusphere.io', password: 'SecPassword@123' });
    adminBToken = loginB.body.data.accessToken;

    const loginT1 = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'teacher1@alpha.edusphere.io', password: 'SecPassword@123' });
    teacher1Token = loginT1.body.data.accessToken;

    const loginT2 = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'teacher2@alpha.edusphere.io', password: 'SecPassword@123' });
    teacher2Token = loginT2.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  // =========================================================================
  // 1. Multi-Tenant Isolation
  // =========================================================================
  describe('Multi-Tenant Isolation', () => {
    it('prevents Tenant B Admin from viewing Tenant A Leave Types', async () => {
      const res = await request(app)
        .get('/api/v1/hr/leave-types')
        .set('Host', 'beta.edusphere.io')
        .set('Authorization', `Bearer ${adminBToken}`);

      expect(res.status).toBe(200);
      // Tenant B has 0 leave types
      expect(res.body.data.length).toBe(0);
    });

    it('prevents Tenant B Admin from modifying Tenant A Salary Structure', async () => {
      const res = await request(app)
        .put(`/api/v1/hr/salary-structures/${salaryStructureAId}`)
        .set('Host', 'beta.edusphere.io')
        .set('Authorization', `Bearer ${adminBToken}`)
        .send({
          name: 'Hijacked Structure',
        });

      // Tenant B cannot find Tenant A's structure -> 404
      expect(res.status).toBe(404);
    });

    it('prevents Tenant B Admin from calculating Tenant A Payroll Period', async () => {
      const res = await request(app)
        .post('/api/v1/hr/payroll/calculate')
        .set('Host', 'beta.edusphere.io')
        .set('Authorization', `Bearer ${adminBToken}`)
        .send({ payrollPeriodId: payrollPeriodAId });

      // Period not found in Tenant B -> 404
      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // 2. IDOR Prevention & Employee Self-Service
  // =========================================================================
  describe('IDOR & Self-Service Protection', () => {
    it('allows employee to view their own HR profile', async () => {
      const res = await request(app)
        .get(`/api/v1/hr/employees/${employee1Id}/hr`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.employeeId).toBe('EMP-A-001');
    });

    it('forbids employee from viewing another employee HR profile (IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/hr/employees/${employee1Id}/hr`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${teacher2Token}`);

      expect(res.status).toBe(403);
    });

    it('allows employee to view their own payslip', async () => {
      const res = await request(app)
        .get(`/api/v1/hr/payslips/${payrollItemAId}`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.netPay).toBe(400000);
      expect(res.body.data.employeeCode).toBe('EMP-A-001');
    });

    it('forbids employee from viewing another employee payslip (IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/hr/payslips/${payrollItemAId}`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${teacher2Token}`);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 3. RBAC & Unauthorized Operations
  // =========================================================================
  describe('RBAC & Privilege Separation', () => {
    it('forbids regular teacher from creating salary components', async () => {
      const res = await request(app)
        .post('/api/v1/hr/salary-components')
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          name: 'Unauthorized Allowance',
          code: 'UNAUTH',
          type: 'EARNING',
          calculationType: 'FIXED',
          amountOrPercentage: 1000,
        });

      expect(res.status).toBe(403);
    });

    it('forbids regular teacher from locking payroll periods', async () => {
      const res = await request(app)
        .post(`/api/v1/hr/payroll-periods/${payrollPeriodAId}/lock`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(403);
    });

    it('forbids regular teacher from modifying another employee HR lifecycle', async () => {
      const res = await request(app)
        .patch(`/api/v1/hr/employees/${employee2Id}/hr`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          workLocation: 'Remote',
        });

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 4. Irreversible Locked Payroll
  // =========================================================================
  describe('Payroll Locking Invariant', () => {
    it('locks payroll and prevents any subsequent modifications or recalculations', async () => {
      // 1. Admin locks the period
      const lockRes = await request(app)
        .post(`/api/v1/hr/payroll-periods/${payrollPeriodAId}/lock`)
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(lockRes.status).toBe(200);
      expect(lockRes.body.data.status).toBe('LOCKED');

      // 2. Recalculation attempt fails
      const recalcRes = await request(app)
        .post('/api/v1/hr/payroll/calculate')
        .set('Host', 'alpha.edusphere.io')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ payrollPeriodId: payrollPeriodAId });

      expect(recalcRes.status).toBe(400);
      const errMsg = recalcRes.body.error?.message || recalcRes.body.message || '';
      expect(errMsg).toContain('locked');
    });
  });
});
