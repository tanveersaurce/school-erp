import { describe, it, beforeAll, afterAll, expect } from 'vitest';
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
  InventoryCategory,
  InventoryUnit,
  InventoryItem,
  InventoryStore,
  InventoryStock,
  InventoryStockLedger,
  InventoryAsset,
  InventoryAssetAssignment,
} from '@edusphere/database';
import {
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  UserType,
  UserStatus,
  InventoryItemType,
  AssetStatus,
  AssetCondition,
  StockIssueDestinationType,
  AssetAssignmentType,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 18: Inventory Concurrency & Race-Condition Invariants Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();
  const hostHeader = 'inventory-concurrency.edusphere.io';

  let adminToken: string;
  let adminUserId: Types.ObjectId;
  let storeId: Types.ObjectId;
  let consumableItemId: Types.ObjectId;
  let assetItemId: Types.ObjectId;
  let durableAssetId: Types.ObjectId;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Tenant.init();
    await School.init();
    await Campus.init();
    await InventoryCategory.init();
    await InventoryUnit.init();
    await InventoryItem.init();
    await InventoryStore.init();
    await InventoryStock.init();
    await InventoryStockLedger.init();
    await InventoryAsset.init();
    await InventoryAssetAssignment.init();

    // 1. Tenant, School, Campus, AcademicYear
    await Tenant.create({
      _id: tenantId,
      name: 'Inventory Concurrency Academy',
      slug: 'inventory-concurrency',
      customDomain: hostHeader,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      contact: { email: 'admin@invconcurrency.edu', phone: '+1234567890' },
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Inventory High',
      code: 'IH-01',
      status: 'ACTIVE',
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
      isPrimary: true,
      status: 'ACTIVE',
      address: { street: '100 Inventory Way', city: 'Metro', state: 'NY', postalCode: '10001', country: 'USA' },
    });

    await AcademicYear.create({
      _id: academicYearId,
      tenantId,
      schoolId,
      campusId,
      name: '2026-2027',
      code: 'AY26-27',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    });

    // 2. Permissions & Roles
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
          if (pId) {
            rolePerms.push({ tenantId, roleId: rId, permissionId: pId });
          }
        }
      }
    }
    await RolePermission.insertMany(rolePerms);

    const passwordHash = await passwordService.hashPassword('AdminPassword123!');
    adminUserId = new Types.ObjectId();
    const adminUser = await User.create({
      _id: adminUserId,
      tenantId,
      schoolId,
      campusId,
      email: 'invadmin@test.com',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });

    await UserRole.create({
      tenantId,
      userId: adminUser._id,
      roleId: roleMap.get('SUPER_ADMIN')!,
    });

    // Login admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader)
      .send({ email: 'invadmin@test.com', password: 'AdminPassword123!' });

    adminToken = loginRes.body.data.accessToken || loginRes.body.data.tokens?.accessToken;

    // 3. Seed Category, Unit, Store, Consumable Item, Asset Item
    const category = await InventoryCategory.create({
      tenantId,
      schoolId,
      name: 'Stationery & Printing',
      code: 'STAT-01',
    });

    const unit = await InventoryUnit.create({
      tenantId,
      schoolId,
      name: 'Ream',
      code: 'RM',
      symbol: 'rm',
    });

    const store = await InventoryStore.create({
      tenantId,
      schoolId,
      campusId,
      name: 'Central Supplies Store',
      code: 'STR-CENTRAL',
      managerUserId: adminUserId,
      isActive: true,
    });
    storeId = store._id as Types.ObjectId;

    const consumableItem = await InventoryItem.create({
      tenantId,
      schoolId,
      categoryId: category._id,
      unitId: unit._id,
      name: 'A4 Printing Paper (80gsm)',
      itemCode: 'PAP-A4-80',
      type: InventoryItemType.CONSUMABLE,
      reorderLevel: 5,
      costPriceMinorUnits: 450,
      isActive: true,
    });
    consumableItemId = consumableItem._id as Types.ObjectId;

    // Initialize stock with exactly 10 units on hand
    await InventoryStock.create({
      tenantId,
      schoolId,
      storeId,
      itemId: consumableItemId,
      quantityOnHand: 10,
      quantityReserved: 0,
      quantityAvailable: 10,
      reorderLevel: 5,
      averageCostMinorUnits: 450,
    });

    const assetItem = await InventoryItem.create({
      tenantId,
      schoolId,
      categoryId: category._id,
      unitId: unit._id,
      name: 'Epson Interactive Projector',
      itemCode: 'PRJ-EPS-01',
      type: InventoryItemType.ASSET,
      reorderLevel: 1,
      costPriceMinorUnits: 65000,
      isActive: true,
    });
    assetItemId = assetItem._id as Types.ObjectId;

    const durableAsset = await InventoryAsset.create({
      tenantId,
      schoolId,
      itemId: assetItemId,
      assetTag: 'AST-PRJ-2026-001',
      serialNumber: 'EPS-SN-882910',
      currentStoreId: storeId,
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.GOOD,
      costMinorUnits: 65000,
    });
    durableAssetId = durableAsset._id as Types.ObjectId;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('1. Enforces atomic stock decrements under heavy concurrent issues and strictly prevents negative stock', async () => {
    // Current stock on hand: 10 units.
    // 5 concurrent requests attempting to issue 3 units each (total 15 units requested, exceeds 10 units available).
    // Exactly 3 requests must succeed (3 x 3 = 9 units consumed), leaving 1 unit on hand.
    // 2 requests must be rejected with 400 Bad Request due to insufficient stock.
    const destinationId = new Types.ObjectId().toString();

    const requests = Array.from({ length: 5 }).map(() =>
      request(app)
        .post('/api/v1/inventory/issues')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: schoolId.toString(),
          storeId: storeId.toString(),
          destinationType: StockIssueDestinationType.DEPARTMENT,
          destinationId,
          purpose: 'Concurrent Exam Printing Supplies Request',
          items: [
            {
              itemId: consumableItemId.toString(),
              quantity: 3,
            },
          ],
        })
    );

    const responses = await Promise.all(requests);

    const succeeded = responses.filter((res) => res.status === 201);
    const failed = responses.filter((res) => res.status === 400);

    expect(succeeded.length).toBe(3);
    expect(failed.length).toBe(2);

    // Verify error message on failed requests
    for (const failRes of failed) {
      const errStr = failRes.body.message || failRes.body.error?.message || JSON.stringify(failRes.body);
      expect(errStr).toMatch(/negative stock|insufficient|Available on hand/i);
    }

    // Verify exact stock database invariant: 10 - (3 * 3) = 1
    const stock = await InventoryStock.findOne({
      tenantId,
      storeId,
      itemId: consumableItemId,
    });

    expect(stock).toBeDefined();
    expect(stock!.quantityOnHand).toBe(1);
    expect(stock!.quantityAvailable).toBe(1);

    // Verify immutable ledger has exactly 3 ISSUE entries
    const ledgerEntries = await InventoryStockLedger.find({
      tenantId,
      itemId: consumableItemId,
      movementType: 'ISSUE',
    }).sort({ balanceAfter: -1 });
    expect(ledgerEntries.length).toBe(3);

    // Verify each successful transaction balance tracking
    const finalBalance = ledgerEntries[ledgerEntries.length - 1].balanceAfter;
    expect(finalBalance).toBe(1);
  });

  it('2. Enforces single-winner atomic durable asset assignment under concurrent assignment attempts', async () => {
    // Durable asset is currently AVAILABLE.
    // 5 concurrent requests attempting to assign the same asset simultaneously.
    // Exactly 1 request must succeed, while 4 requests must fail with 400 (asset not available).
    const assignmentRequests = Array.from({ length: 5 }).map((_, idx) =>
      request(app)
        .post(`/api/v1/inventory/assets/${durableAssetId}/assign`)
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: schoolId.toString(),
          assignedToType: AssetAssignmentType.EMPLOYEE,
          assignedToId: new Types.ObjectId().toString(),
          remarks: `Concurrent assignment racer #${idx + 1}`,
        })
    );

    const responses = await Promise.all(assignmentRequests);

    const succeeded = responses.filter((res) => res.status === 200 || res.status === 201);
    const failed = responses.filter((res) => res.status === 400);

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(4);

    for (const failRes of failed) {
      const errStr = failRes.body.message || failRes.body.error?.message || JSON.stringify(failRes.body);
      expect(errStr).toMatch(/AVAILABLE|Cannot assign asset in status ASSIGNED/i);
    }

    // Verify asset status in database is ASSIGNED
    const assetInDb = await InventoryAsset.findById(durableAssetId);
    expect(assetInDb!.status).toBe(AssetStatus.ASSIGNED);

    // Verify exactly 1 active assignment record was created
    const assignmentDocs = await InventoryAssetAssignment.find({
      tenantId,
      assetId: durableAssetId,
    });
    expect(assignmentDocs.length).toBe(1);
  });
});
