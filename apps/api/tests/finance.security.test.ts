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
  FeeInvoice,
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
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 13: Finance Security & Multi-Tenant Isolation Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantAId = new Types.ObjectId();
  const schoolAId = new Types.ObjectId();

  const tenantBId = new Types.ObjectId();
  const schoolBId = new Types.ObjectId();

  let adminAToken: string;
  let adminBToken: string;
  let student1Token: string;

  let invoiceAId: string;
  let student2Id: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await FeeInvoice.init();

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
            rolePerms.push({ tenantId: tId, roleId: rId, permissionId: pId });
          }
        } else {
          for (const pStr of r.permissions) {
            const pId = permMap.get(pStr.toLowerCase().trim());
            if (pId) rolePerms.push({ tenantId: tId, roleId: rId, permissionId: pId });
          }
        }
      }
      await RolePermission.insertMany(rolePerms);
    }

    const passwordHash = await passwordService.hashPassword('Secret@123');

    // Admin A
    const adminA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'admin@alpha.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const adminARole = await Role.findOne({ tenantId: tenantAId, name: 'SCHOOL_ADMIN' });
    await UserRole.create({ tenantId: tenantAId, userId: adminA._id, roleId: adminARole!._id, schoolId: schoolAId });

    // Admin B
    const adminB = await User.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      email: 'admin@beta.edu',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const adminBRole = await Role.findOne({ tenantId: tenantBId, name: 'SCHOOL_ADMIN' });
    await UserRole.create({ tenantId: tenantBId, userId: adminB._id, roleId: adminBRole!._id, schoolId: schoolBId });

    // Student 1 (Tenant A)
    const s1User = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'student1@alpha.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const s1Role = await Role.findOne({ tenantId: tenantAId, name: 'STUDENT' });
    await UserRole.create({ tenantId: tenantAId, userId: s1User._id, roleId: s1Role!._id, schoolId: schoolAId });

    const s1Profile = await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      userId: s1User._id,
      admissionNumber: 'ADM-A-001',
      personalDetails: { firstName: 'Alice', lastName: 'Alpha', dateOfBirth: new Date('2010-01-01'), gender: 'FEMALE' },
      contactDetails: { currentAddress: { street: 'Alpha Street' } },
    });

    // Student 2 (Tenant A)
    const s2User = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      email: 'student2@alpha.edu',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const s2Role = await Role.findOne({ tenantId: tenantAId, name: 'STUDENT' });
    await UserRole.create({ tenantId: tenantAId, userId: s2User._id, roleId: s2Role!._id, schoolId: schoolAId });

    const s2Profile = await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      userId: s2User._id,
      admissionNumber: 'ADM-A-002',
      personalDetails: { firstName: 'Bob', lastName: 'Beta', dateOfBirth: new Date('2010-01-01'), gender: 'MALE' },
      contactDetails: { currentAddress: { street: 'Beta Street' } },
    });
    student2Id = s2Profile._id.toString();

    // Invoice for Student 1 in Tenant A
    const invoiceA = await FeeInvoice.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      invoiceNumber: 'INV-2026-ALPHA1',
      studentId: s1Profile._id,
      academicYearId: new Types.ObjectId(),
      classId: new Types.ObjectId(),
      dueDate: new Date(),
      issueDate: new Date(),
      subTotal: 50000,
      totalDiscount: 0,
      taxAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 50000,
      paidAmount: 0,
      balanceAmount: 50000,
      status: InvoiceStatus.ISSUED,
    });
    invoiceAId = invoiceA._id.toString();

    // Tokens
    const loginA = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'admin@alpha.edu', password: 'Secret@123' });
    adminAToken = loginA.body.data.accessToken;

    const loginB = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'beta.edusphere.io')
      .send({ email: 'admin@beta.edu', password: 'Secret@123' });
    adminBToken = loginB.body.data.accessToken;

    const loginS1 = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', 'alpha.edusphere.io')
      .send({ email: 'student1@alpha.edu', password: 'Secret@123' });
    student1Token = loginS1.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('should prevent cross-tenant access to invoices (Tenant B admin cannot read Tenant A invoice)', async () => {
    const res = await request(app)
      .get(`/api/v1/finance/invoices/${invoiceAId}`)
      .set('Host', 'beta.edusphere.io')
      .set('Authorization', `Bearer ${adminBToken}`);

    // Must be 404 (or 403) due to strict tenant isolation
    expect(res.status).toBe(404);
  });

  it('should prevent cross-student inspection of financial ledgers (Student 1 cannot read Student 2 ledger)', async () => {
    const res = await request(app)
      .get(`/api/v1/finance/students/${student2Id}/ledger`)
      .set('Host', 'alpha.edusphere.io')
      .set('Authorization', `Bearer ${student1Token}`);

    // Must be 403 Forbidden
    expect(res.status).toBe(403);
  });
});
