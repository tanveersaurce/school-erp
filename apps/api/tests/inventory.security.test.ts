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
  InventoryAsset,
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
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 18: Inventory Security & Multi-Tenant Isolation Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  // Tenant 1 (Alpha Academy)
  const tenant1Id = new Types.ObjectId();
  const school1Id = new Types.ObjectId();
  const campus1Id = new Types.ObjectId();
  const academicYear1Id = new Types.ObjectId();
  const hostHeader1 = 'alpha-inventory.edusphere.io';

  // Tenant 2 (Beta College)
  const tenant2Id = new Types.ObjectId();
  const school2Id = new Types.ObjectId();
  const campus2Id = new Types.ObjectId();
  const academicYear2Id = new Types.ObjectId();
  const hostHeader2 = 'beta-inventory.edusphere.io';

  let admin1Token: string;
  let limited1Token: string;
  let admin2Token: string;

  let store1Id: Types.ObjectId;
  let item1Id: Types.ObjectId;
  let asset1Id: Types.ObjectId;

  let store2Id: Types.ObjectId;
  let item2Id: Types.ObjectId;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Tenant.init();
    await School.init();
    await Campus.init();
    await AcademicYear.init();
    await User.init();
    await Role.init();
    await Permission.init();
    await RolePermission.init();
    await UserRole.init();
    await InventoryCategory.init();
    await InventoryUnit.init();
    await InventoryItem.init();
    await InventoryStore.init();
    await InventoryStock.init();
    await InventoryAsset.init();

    // 1. Setup Tenant 1
    await Tenant.create({
      _id: tenant1Id,
      name: 'Alpha Academy',
      slug: 'alpha-inventory',
      customDomain: hostHeader1,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      contact: { email: 'admin@alpha.edu', phone: '+1234567891' },
    });

    await School.create({
      _id: school1Id,
      tenantId: tenant1Id,
      name: 'Alpha School',
      code: 'ALPHA-01',
      status: 'ACTIVE',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'CBSE',
    });

    await Campus.create({
      _id: campus1Id,
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Alpha Main Campus',
      code: 'ALPHA-MAIN',
      isPrimary: true,
      status: 'ACTIVE',
      address: { street: '1 Alpha Way', city: 'Metro', state: 'NY', postalCode: '10001', country: 'USA' },
    });

    await AcademicYear.create({
      _id: academicYear1Id,
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus1Id,
      name: '2026-2027',
      code: 'AY26-27',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    });

    // 2. Setup Tenant 2
    await Tenant.create({
      _id: tenant2Id,
      name: 'Beta College',
      slug: 'beta-inventory',
      customDomain: hostHeader2,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      contact: { email: 'admin@beta.edu', phone: '+1234567892' },
    });

    await School.create({
      _id: school2Id,
      tenantId: tenant2Id,
      name: 'Beta School',
      code: 'BETA-01',
      status: 'ACTIVE',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'ICSE',
    });

    await Campus.create({
      _id: campus2Id,
      tenantId: tenant2Id,
      schoolId: school2Id,
      name: 'Beta Campus',
      code: 'BETA-MAIN',
      isPrimary: true,
      status: 'ACTIVE',
      address: { street: '2 Beta Blvd', city: 'Metro', state: 'NY', postalCode: '10002', country: 'USA' },
    });

    await AcademicYear.create({
      _id: academicYear2Id,
      tenantId: tenant2Id,
      schoolId: school2Id,
      campusId: campus2Id,
      name: '2026-2027',
      code: 'AY26-27',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    });

    // 3. Permissions & System Roles
    const permDocs = await Permission.insertMany(SYSTEM_PERMISSIONS);
    const permMap = new Map<string, Types.ObjectId>();
    for (const p of permDocs) {
      permMap.set(p.permissionString.toLowerCase().trim(), p._id as Types.ObjectId);
    }

    // Tenant 1 Roles
    const roleDocs1 = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId: tenant1Id,
        name: r.name,
        description: r.description,
        isSystemRole: true,
      }))
    );
    const roleMap1 = new Map<string, Types.ObjectId>();
    for (const r of roleDocs1) {
      roleMap1.set(r.name, r._id as Types.ObjectId);
    }

    const rolePerms1: any[] = [];
    for (const r of SYSTEM_ROLES) {
      const rId = roleMap1.get(r.name);
      if (!rId) continue;
      if (r.permissions.includes('*')) {
        for (const pId of permMap.values()) {
          rolePerms1.push({ tenantId: tenant1Id, roleId: rId, permissionId: pId });
        }
      } else {
        for (const pStr of r.permissions) {
          const pId = permMap.get(pStr.toLowerCase().trim());
          if (pId) {
            rolePerms1.push({ tenantId: tenant1Id, roleId: rId, permissionId: pId });
          }
        }
      }
    }
    await RolePermission.insertMany(rolePerms1);

    // Tenant 2 Roles
    const roleDocs2 = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId: tenant2Id,
        name: r.name,
        description: r.description,
        isSystemRole: true,
      }))
    );
    const roleMap2 = new Map<string, Types.ObjectId>();
    for (const r of roleDocs2) {
      roleMap2.set(r.name, r._id as Types.ObjectId);
    }

    const rolePerms2: any[] = [];
    for (const r of SYSTEM_ROLES) {
      const rId = roleMap2.get(r.name);
      if (!rId) continue;
      if (r.permissions.includes('*')) {
        for (const pId of permMap.values()) {
          rolePerms2.push({ tenantId: tenant2Id, roleId: rId, permissionId: pId });
        }
      } else {
        for (const pStr of r.permissions) {
          const pId = permMap.get(pStr.toLowerCase().trim());
          if (pId) {
            rolePerms2.push({ tenantId: tenant2Id, roleId: rId, permissionId: pId });
          }
        }
      }
    }
    await RolePermission.insertMany(rolePerms2);

    const passwordHash = await passwordService.hashPassword('SecurityPassword123!');

    // Tenant 1 Admin
    const admin1 = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus1Id,
      email: 'admin1@alpha.edu',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenant1Id,
      userId: admin1._id,
      roleId: roleMap1.get('SUPER_ADMIN')!,
    });

    // Tenant 1 Limited User (Staff without inventory:write)
    const limited1 = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus1Id,
      email: 'staff1@alpha.edu',
      passwordHash,
      userType: UserType.STAFF,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenant1Id,
      userId: limited1._id,
      roleId: roleMap1.get('STAFF')!,
    });

    // Tenant 2 Admin
    const admin2 = await User.create({
      tenantId: tenant2Id,
      schoolId: school2Id,
      campusId: campus2Id,
      email: 'admin2@beta.edu',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenant2Id,
      userId: admin2._id,
      roleId: roleMap2.get('SUPER_ADMIN')!,
    });

    // Logins
    const login1 = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader1)
      .send({ email: 'admin1@alpha.edu', password: 'SecurityPassword123!' });
    admin1Token = login1.body.data.accessToken || login1.body.data.tokens?.accessToken;

    const loginLim = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader1)
      .send({ email: 'staff1@alpha.edu', password: 'SecurityPassword123!' });
    limited1Token = loginLim.body.data.accessToken || loginLim.body.data.tokens?.accessToken;

    const login2 = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader2)
      .send({ email: 'admin2@beta.edu', password: 'SecurityPassword123!' });
    admin2Token = login2.body.data.accessToken || login2.body.data.tokens?.accessToken;

    // 4. Seed Data for Tenant 1
    const cat1 = await InventoryCategory.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Alpha Stationery',
      code: 'CAT-ALPHA',
    });
    const unit1 = await InventoryUnit.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Pack',
      code: 'PCK',
      symbol: 'pk',
    });
    const store1 = await InventoryStore.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus1Id,
      name: 'Alpha Central Store',
      code: 'STR-ALPHA',
      managerUserId: admin1._id,
      isActive: true,
    });
    store1Id = store1._id as Types.ObjectId;

    const item1 = await InventoryItem.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      categoryId: cat1._id,
      unitId: unit1._id,
      name: 'Alpha Whiteboard Markers',
      itemCode: 'ITM-ALPHA-01',
      type: InventoryItemType.CONSUMABLE,
      costPriceMinorUnits: 300,
      isActive: true,
    });
    item1Id = item1._id as Types.ObjectId;

    const asset1 = await InventoryAsset.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      itemId: item1Id,
      assetTag: 'AST-ALPHA-001',
      serialNumber: 'SN-ALPHA-999',
      currentStoreId: store1Id,
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.GOOD,
      costMinorUnits: 45000,
    });
    asset1Id = asset1._id as Types.ObjectId;

    // 5. Seed Data for Tenant 2
    const cat2 = await InventoryCategory.create({
      tenantId: tenant2Id,
      schoolId: school2Id,
      name: 'Beta Robotics',
      code: 'CAT-BETA',
    });
    const unit2 = await InventoryUnit.create({
      tenantId: tenant2Id,
      schoolId: school2Id,
      name: 'Kit',
      code: 'KIT',
      symbol: 'kt',
    });
    const store2 = await InventoryStore.create({
      tenantId: tenant2Id,
      schoolId: school2Id,
      campusId: campus2Id,
      name: 'Beta Robotics Lab',
      code: 'STR-BETA',
      managerUserId: admin2._id,
      isActive: true,
    });
    store2Id = store2._id as Types.ObjectId;

    const item2 = await InventoryItem.create({
      tenantId: tenant2Id,
      schoolId: school2Id,
      categoryId: cat2._id,
      unitId: unit2._id,
      name: 'Beta Arduino Starter Kit',
      itemCode: 'ITM-BETA-01',
      type: InventoryItemType.CONSUMABLE,
      costPriceMinorUnits: 5500,
      isActive: true,
    });
    item2Id = item2._id as Types.ObjectId;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('1. Rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/items')
      .set('Host', hostHeader1);

    expect(res.status).toBe(401);
  });

  it('2. Rejects unauthorized mutation actions when user lacks write permissions with 403 Forbidden', async () => {
    // Limited staff user has inventory:read but lacks inventory:items:create
    const res = await request(app)
      .post('/api/v1/inventory/items')
      .set('Host', hostHeader1)
      .set('Authorization', `Bearer ${limited1Token}`)
      .send({
        schoolId: school1Id.toString(),
        name: 'Unauthorized Item Creation',
        itemCode: 'UNAUTH-01',
        type: InventoryItemType.CONSUMABLE,
      });

    expect(res.status).toBe(403);
  });

  it('3. Strictly enforces cross-tenant boundary isolation (Tenant 1 cannot read Tenant 2 items)', async () => {
    // Tenant 1 admin tries to access Tenant 2's item directly
    const res = await request(app)
      .get(`/api/v1/inventory/items/${item2Id}`)
      .set('Host', hostHeader1)
      .set('Authorization', `Bearer ${admin1Token}`);

    // Must be 404 Not Found (tenant query filter prevents finding Tenant 2 item)
    expect(res.status).toBe(404);
  });

  it('4. Strictly enforces cross-tenant boundary isolation on asset records', async () => {
    // Tenant 2 admin tries to access Tenant 1's durable asset
    const res = await request(app)
      .get(`/api/v1/inventory/assets/${asset1Id}`)
      .set('Host', hostHeader2)
      .set('Authorization', `Bearer ${admin2Token}`);

    expect(res.status).toBe(404);
  });

  it('5. Prevents cross-tenant store stock operations', async () => {
    // Tenant 1 admin attempts to receive stock in Tenant 2's store
    const res = await request(app)
      .post('/api/v1/inventory/receipts')
      .set('Host', hostHeader1)
      .set('Authorization', `Bearer ${admin1Token}`)
      .send({
        schoolId: school1Id.toString(),
        storeId: store2Id.toString(), // Tenant 2 store
        supplierId: new Types.ObjectId().toString(),
        items: [
          {
            itemId: item1Id.toString(),
            receivedQuantity: 10,
            unitCostMinorUnits: 300,
          },
        ],
      });

    // Store is not found in Tenant 1
    expect(res.status).toBe(404);
  });

  it('6. Lists only tenant-specific inventory items in catalog query', async () => {
    const res1 = await request(app)
      .get('/api/v1/inventory/items')
      .set('Host', hostHeader1)
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res1.status).toBe(200);
    const itemCodes1 = res1.body.data.items.map((i: any) => i.itemCode);
    expect(itemCodes1).toContain('ITM-ALPHA-01');
    expect(itemCodes1).not.toContain('ITM-BETA-01');

    const res2 = await request(app)
      .get('/api/v1/inventory/items')
      .set('Host', hostHeader2)
      .set('Authorization', `Bearer ${admin2Token}`);

    expect(res2.status).toBe(200);
    const itemCodes2 = res2.body.data.items.map((i: any) => i.itemCode);
    expect(itemCodes2).toContain('ITM-BETA-01');
    expect(itemCodes2).not.toContain('ITM-ALPHA-01');
  });
});
