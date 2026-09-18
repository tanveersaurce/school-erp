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
  InventorySupplier,
  InventoryItem,
  InventoryStore,
  InventoryLocation,
  InventoryStock,
  InventoryReceipt,
  InventoryIssue,
  InventoryReturn,
  InventoryTransfer,
  InventoryStocktake,
  InventoryStockLedger,
  InventoryAsset,
  InventoryAssetAssignment,
  InventoryAssetMaintenance,
} from '@edusphere/database';
import {
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  UserType,
  UserStatus,
  InventoryItemType,
  StockIssueDestinationType,
  StockTransferStatus,
  StocktakeStatus,
  StockAdjustmentType,
  StockAdjustmentReason,
  AssetStatus,
  AssetCondition,
  AssetAssignmentType,
  AssetMaintenanceType,
  AssetMaintenanceStatus,
  AssetDisposalMethod,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 18: Inventory Management End-to-End Lifecycle Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();
  const hostHeader = 'inventory-management.edusphere.io';

  let adminToken: string;
  let adminUserId: Types.ObjectId;

  // Master Data IDs
  let categoryId: string;
  let unitId: string;
  let supplierId: string;
  let storeAId: string;
  let storeBId: string;
  let locationAId: string;
  let consumableItemId: string;
  let assetItemId: string;
  let durableAssetId: string;
  let receiptId: string;
  let transferId: string;
  let stocktakeId: string;

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
    await InventorySupplier.init();
    await InventoryItem.init();
    await InventoryStore.init();
    await InventoryLocation.init();
    await InventoryStock.init();
    await InventoryReceipt.init();
    await InventoryIssue.init();
    await InventoryReturn.init();
    await InventoryTransfer.init();
    await InventoryStocktake.init();
    await InventoryStockLedger.init();
    await InventoryAsset.init();
    await InventoryAssetAssignment.init();
    await InventoryAssetMaintenance.init();

    // 1. Tenant, School, Campus, AcademicYear
    await Tenant.create({
      _id: tenantId,
      name: 'Global Inventory Institute',
      slug: 'inventory-management',
      customDomain: hostHeader,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      contact: { email: 'admin@globalinv.edu', phone: '+1234567890' },
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Global Science Academy',
      code: 'GSA-01',
      status: 'ACTIVE',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'IB',
    });

    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'North Campus',
      code: 'NORTH',
      isPrimary: true,
      status: 'ACTIVE',
      address: { street: '50 Science Park', city: 'Metro', state: 'NY', postalCode: '10002', country: 'USA' },
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
      email: 'manager@globalinv.edu',
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
      .send({ email: 'manager@globalinv.edu', password: 'AdminPassword123!' });

    adminToken = loginRes.body.data.accessToken || loginRes.body.data.tokens?.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  it('1. Manages Catalog Master Data: Categories, Units, Suppliers', async () => {
    // 1a. Create Category
    const catRes = await request(app)
      .post('/api/v1/inventory/categories')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        name: 'Science Laboratory Chemicals',
        code: 'LAB-CHEM',
        description: 'Chemicals, reagents, and indicators',
      });
    expect(catRes.status).toBe(201);
    expect(catRes.body.data.name).toBe('Science Laboratory Chemicals');
    categoryId = catRes.body.data._id;

    // 1b. Create Unit of Measurement
    const unitRes = await request(app)
      .post('/api/v1/inventory/units')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        name: 'Bottle (500ml)',
        code: 'BTL-500',
        symbol: 'btl',
      });
    expect(unitRes.status).toBe(201);
    expect(unitRes.body.data.code).toBe('BTL-500');
    unitId = unitRes.body.data._id;

    // 1c. Create Supplier
    const supRes = await request(app)
      .post('/api/v1/inventory/suppliers')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        name: 'Apex Scientific Supplies Ltd',
        code: 'SUP-APEX',
        contactPerson: 'Dr. Evelyn Reed',
        email: 'evelyn@apexsci.com',
        phone: '+18005551234',
        address: {
          addressLine1: '400 Industrial Parkway',
          city: 'Metro',
          state: 'NY',
          postalCode: '10005',
          country: 'USA',
        },
      });
    expect(supRes.status).toBe(201);
    expect(supRes.body.data.code).toBe('SUP-APEX');
    supplierId = supRes.body.data._id;
  });

  it('2. Manages Store and Location Hierarchy', async () => {
    // 2a. Create Store A (Chemistry Store)
    const storeARes = await request(app)
      .post('/api/v1/inventory/stores')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        campusId: campusId.toString(),
        name: 'Chemistry Department Store',
        code: 'STR-CHEM',
        location: 'Science Block Ground Floor Room 102',
        managerUserId: adminUserId.toString(),
        isActive: true,
      });
    expect(storeARes.status).toBe(201);
    storeAId = storeARes.body.data._id;

    // 2b. Create Store B (Physics Store for transfers)
    const storeBRes = await request(app)
      .post('/api/v1/inventory/stores')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        campusId: campusId.toString(),
        name: 'Physics Department Store',
        code: 'STR-PHYS',
        location: 'Science Block 2nd Floor Room 204',
        managerUserId: adminUserId.toString(),
        isActive: true,
      });
    expect(storeBRes.status).toBe(201);
    storeBId = storeBRes.body.data._id;

    // 2c. Create Location inside Store A
    const locRes = await request(app)
      .post(`/api/v1/inventory/stores/${storeAId}/locations`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Flammable Cabinet A - Shelf 2',
        code: 'CAB-FLAM-A2',
        aisle: 'A',
        rack: '2',
        shelf: '2',
      });
    expect(locRes.status).toBe(201);
    locationAId = locRes.body.data._id;
  });

  it('3. Creates Consumable & Durable Items in Catalog', async () => {
    // 3a. Consumable Item
    const item1Res = await request(app)
      .post('/api/v1/inventory/items')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        categoryId,
        unitId,
        name: 'Hydrochloric Acid (37% Analytical Grade)',
        itemCode: 'CHM-HCL-37',
        sku: 'SKU-HCL-01',
        type: InventoryItemType.CONSUMABLE,
        reorderLevel: 10,
        costPriceMinorUnits: 2500, // $25.00
        isActive: true,
      });
    expect(item1Res.status).toBe(201);
    expect(item1Res.body.data.type).toBe(InventoryItemType.CONSUMABLE);
    consumableItemId = item1Res.body.data._id;

    // 3b. Durable Asset Item
    const item2Res = await request(app)
      .post('/api/v1/inventory/items')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        categoryId,
        unitId,
        name: 'Digital Binocular Compound Microscope',
        itemCode: 'EQUIP-MIC-01',
        sku: 'SKU-MIC-01',
        type: InventoryItemType.ASSET,
        reorderLevel: 2,
        costPriceMinorUnits: 85000, // $850.00
        isActive: true,
      });
    expect(item2Res.status).toBe(201);
    expect(item2Res.body.data.type).toBe(InventoryItemType.ASSET);
    assetItemId = item2Res.body.data._id;
  });

  it('4. Receives Incoming Stock Shipment (Receipt Voucher) with Batches', async () => {
    // Receive 50 bottles of HCl with batch and expiry
    const receiptRes = await request(app)
      .post('/api/v1/inventory/receipts')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        storeId: storeAId,
        supplierId,
        purchaseOrderNumber: 'PO-2026-8812',
        invoiceNumber: 'INV-APEX-901',
        receivedDate: '2026-09-01',
        items: [
          {
            itemId: consumableItemId,
            locationId: locationAId,
            receivedQuantity: 50,
            unitCostMinorUnits: 2500, // $25.00 each
            batchNumber: 'BATCH-HCL-2026A',
            manufacturingDate: '2026-08-01',
            expiryDate: '2028-08-01',
          },
        ],
        notes: 'Initial chemical shipment verified against delivery voucher',
      });

    expect(receiptRes.status).toBe(201);
    expect(receiptRes.body.data.receiptNumber).toMatch(/^(REC|RCV)-/);
    expect(receiptRes.body.data.totalAmountMinorUnits).toBe(125000); // 50 * 2500 = $1250.00
    receiptId = receiptRes.body.data._id;

    // Verify stock created on hand
    const stock = await InventoryStock.findOne({
      tenantId,
      storeId: new Types.ObjectId(storeAId),
      itemId: new Types.ObjectId(consumableItemId),
    });
    expect(stock).toBeDefined();
    expect(stock!.quantityOnHand).toBe(50);
    expect(stock!.quantityAvailable).toBe(50);
    expect(stock!.averageCostMinorUnits).toBe(2500);

    // Verify immutable Stock Ledger entry
    const ledger = await InventoryStockLedger.findOne({
      tenantId,
      itemId: new Types.ObjectId(consumableItemId),
      movementType: 'RECEIPT',
    });
    expect(ledger).toBeDefined();
    expect(ledger!.quantity).toBe(50);
    expect(ledger!.balanceAfter).toBe(50);
  });

  it('5. Issues Consumable Stock to Department and verifies Ledger & Balance', async () => {
    const deptId = new Types.ObjectId().toString();

    // Issue 15 bottles
    const issueRes = await request(app)
      .post('/api/v1/inventory/issues')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        storeId: storeAId,
        destinationType: StockIssueDestinationType.DEPARTMENT,
        destinationId: deptId,
        purpose: 'Grade 11 Chemistry Lab Practical Examination',
        items: [
          {
            itemId: consumableItemId,
            quantity: 15,
          },
        ],
      });

    expect(issueRes.status).toBe(201);
    expect(issueRes.body.data.issueNumber).toMatch(/^ISS-/);

    // Stock on hand should now be 35
    const stock = await InventoryStock.findOne({
      tenantId,
      storeId: new Types.ObjectId(storeAId),
      itemId: new Types.ObjectId(consumableItemId),
    });
    expect(stock!.quantityOnHand).toBe(35);
    expect(stock!.quantityAvailable).toBe(35);

    // Verify ledger entry
    const ledger = await InventoryStockLedger.findOne({
      tenantId,
      itemId: new Types.ObjectId(consumableItemId),
      movementType: 'ISSUE',
    });
    expect(ledger).toBeDefined();
    expect(ledger!.quantity).toBe(-15);
    expect(ledger!.balanceAfter).toBe(35);
  });

  it('6. Returns Unused Consumables Back to Store', async () => {
    const deptId = new Types.ObjectId().toString();

    // Return 3 unused bottles back
    const returnRes = await request(app)
      .post('/api/v1/inventory/returns')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        storeId: storeAId,
        reason: 'Surplus reagent returned post-experiment',
        items: [
          {
            itemId: consumableItemId,
            quantity: 3,
            unitCostMinorUnits: 2500,
          },
        ],
      });

    expect(returnRes.status).toBe(201);
    expect(returnRes.body.data.returnNumber).toMatch(/^RET-/);

    // Stock on hand should now be 35 + 3 = 38
    const stock = await InventoryStock.findOne({
      tenantId,
      storeId: new Types.ObjectId(storeAId),
      itemId: new Types.ObjectId(consumableItemId),
    });
    expect(stock!.quantityOnHand).toBe(38);
  });

  it('7. Transfers Stock between Stores (Request -> In Transit -> Received)', async () => {
    // 7a. Request transfer of 8 bottles from Store A to Store B
    const transferReqRes = await request(app)
      .post('/api/v1/inventory/transfers')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        fromStoreId: storeAId,
        toStoreId: storeBId,
        reason: 'Inter-department laboratory equipment sharing',
        items: [
          {
            itemId: consumableItemId,
            requestedQuantity: 8,
          },
        ],
      });

    expect(transferReqRes.status).toBe(201);
    expect(transferReqRes.body.data.status).toBe(StockTransferStatus.REQUESTED);
    transferId = transferReqRes.body.data._id;

    // 7b. Approve / Dispatch transfer (changes to IN_TRANSIT, decrements source store)
    const dispatchRes = await request(app)
      .post(`/api/v1/inventory/transfers/${transferId}/dispatch`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.data.status).toBe(StockTransferStatus.IN_TRANSIT);

    // Source store stock: 38 - 8 = 30
    const sourceStock = await InventoryStock.findOne({
      tenantId,
      storeId: new Types.ObjectId(storeAId),
      itemId: new Types.ObjectId(consumableItemId),
    });
    expect(sourceStock!.quantityOnHand).toBe(30);

    // 7c. Receive transfer at Store B (increments destination store)
    const receiveRes = await request(app)
      .post(`/api/v1/inventory/transfers/${transferId}/receive`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(receiveRes.status).toBe(200);
    expect(receiveRes.body.data.status).toBe(StockTransferStatus.RECEIVED);

    // Destination store stock: 8
    const destStock = await InventoryStock.findOne({
      tenantId,
      storeId: new Types.ObjectId(storeBId),
      itemId: new Types.ObjectId(consumableItemId),
    });
    expect(destStock!.quantityOnHand).toBe(8);
  });

  it('8. Performs Stock Adjustment (Write-down for Damaged Stock)', async () => {
    // Store A has 30 units. 2 bottles broke.
    const adjRes = await request(app)
      .post('/api/v1/inventory/adjustments')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        storeId: storeAId,
        itemId: consumableItemId,
        adjustmentType: StockAdjustmentType.DECREASE,
        quantity: 2,
        reason: StockAdjustmentReason.DAMAGE,
        notes: 'Glass bottle cracked during earthquake drill',
      });

    expect(adjRes.status).toBe(201);
    expect(adjRes.body.data.adjustmentNumber).toMatch(/^ADJ-/);

    // Stock on hand: 30 - 2 = 28
    const stock = await InventoryStock.findOne({
      tenantId,
      storeId: new Types.ObjectId(storeAId),
      itemId: new Types.ObjectId(consumableItemId),
    });
    expect(stock!.quantityOnHand).toBe(28);
  });

  it('9. Executes Physical Stocktake Cycle and Variance Reconciliation', async () => {
    // 9a. Create stocktake in DRAFT
    const createStRes = await request(app)
      .post('/api/v1/inventory/stocktakes')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        storeId: storeAId,
        stocktakeNumber: 'ST-2026-Q3-001',
        startDate: '2026-09-15',
        notes: 'Q3 Physical Inventory Verification',
      });

    expect(createStRes.status).toBe(201);
    expect(createStRes.body.data.status).toBe(StocktakeStatus.COUNTING);
    stocktakeId = createStRes.body.data._id;

    // 9b. Start counting
    const startRes = await request(app)
      .post(`/api/v1/inventory/stocktakes/${stocktakeId}/start`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();
    expect(startRes.status).toBe(200);
    expect(startRes.body.data.status).toBe(StocktakeStatus.COUNTING);

    // 9c. Record count: system has 28, physical count finds 27 (variance of -1)
    const countRes = await request(app)
      .post(`/api/v1/inventory/stocktakes/${stocktakeId}/items`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: consumableItemId,
        countedQuantity: 27,
        notes: '1 bottle missing unaccounted',
      });
    expect(countRes.status).toBe(200);

    // 9d. Submit for review
    const submitRes = await request(app)
      .post(`/api/v1/inventory/stocktakes/${stocktakeId}/review`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe(StocktakeStatus.REVIEW);

    // 9e. Approve & Reconcile (adjusts stock to exactly match physical count 27)
    const approveRes = await request(app)
      .post(`/api/v1/inventory/stocktakes/${stocktakeId}/approve`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe(StocktakeStatus.CLOSED);

    // Verify stock is now exactly 27
    const stock = await InventoryStock.findOne({
      tenantId,
      storeId: new Types.ObjectId(storeAId),
      itemId: new Types.ObjectId(consumableItemId),
    });
    expect(stock!.quantityOnHand).toBe(27);
  });

  it('10. Manages Durable Asset Lifecycle: Creation, Assignment, Custody Return, Maintenance, Disposal', async () => {
    // 10a. Register durable asset
    const assetRes = await request(app)
      .post('/api/v1/inventory/assets')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        itemId: assetItemId,
        assetTag: 'AST-MIC-2026-101',
        serialNumber: 'SN-OLYMPUS-99182',
        currentStoreId: storeAId,
        currentLocationId: locationAId,
        condition: AssetCondition.NEW,
        costMinorUnits: 85000,
        model: 'Olympus CX23',
        manufacturer: 'Olympus Corp',
        notes: 'High resolution binocular microscope for biology lab',
      });

    expect(assetRes.status).toBe(201);
    expect(assetRes.body.data.status).toBe(AssetStatus.AVAILABLE);
    expect(assetRes.body.data.assetTag).toBe('AST-MIC-2026-101');
    durableAssetId = assetRes.body.data._id;

    // 10b. Assign asset to Teacher/Employee
    const employeeId = new Types.ObjectId().toString();
    const assignRes = await request(app)
      .post(`/api/v1/inventory/assets/${durableAssetId}/assign`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        assignedToType: AssetAssignmentType.EMPLOYEE,
        assignedToId: employeeId,
        conditionOnAssignment: AssetCondition.GOOD,
        remarks: 'Issued to Senior Biology Faculty for semester project',
      });

    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.status).toBe('ACTIVE');

    // Verify asset status updated to ASSIGNED
    const assignedAsset = await InventoryAsset.findById(durableAssetId);
    expect(assignedAsset!.status).toBe(AssetStatus.ASSIGNED);

    // 10c. Return asset from custody back to store
    const returnAssetRes = await request(app)
      .post(`/api/v1/inventory/assets/${durableAssetId}/return`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        conditionOnReturn: AssetCondition.FAIR,
        returnStoreId: storeAId,
        returnLocationId: locationAId,
        remarks: 'Returned after semester practical exams. Minor objective lens smudge.',
      });

    expect(returnAssetRes.status).toBe(200);
    expect(returnAssetRes.body.data.status).toBe(AssetStatus.AVAILABLE);
    expect(returnAssetRes.body.data.condition).toBe(AssetCondition.FAIR);

    // 10d. Log Asset Maintenance
    const maintRes = await request(app)
      .post(`/api/v1/inventory/assets/${durableAssetId}/maintenance`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: schoolId.toString(),
        maintenanceType: AssetMaintenanceType.REPAIR,
        title: 'Objective Lens Alignment and Optical Cleaning',
        description: 'Complete optical system realignment and internal prism cleaning',
        scheduledDate: '2026-09-20',
        costMinorUnits: 4500, // $45.00
      });

    expect(maintRes.status).toBe(201);
    expect(maintRes.body.data.costMinorUnits).toBe(4500);

    // Verify asset status changed to MAINTENANCE
    const underMaintAsset = await InventoryAsset.findById(durableAssetId);
    expect(underMaintAsset!.status).toBe(AssetStatus.MAINTENANCE);

    // Complete maintenance
    const maintId = maintRes.body.data._id;
    const completeMaintRes = await request(app)
      .put(`/api/v1/inventory/maintenance/${maintId}`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: AssetMaintenanceStatus.COMPLETED,
        completedDate: '2026-09-21',
        notes: 'Prisms aligned to factory specs. Image crispness restored.',
      });
    expect(completeMaintRes.status).toBe(200);

    // Set asset back to AVAILABLE
    await InventoryAsset.findByIdAndUpdate(durableAssetId, { status: AssetStatus.AVAILABLE });

    // 10e. Decommission and Dispose Asset
    const disposeRes = await request(app)
      .post(`/api/v1/inventory/assets/${durableAssetId}/dispose`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        disposalMethod: AssetDisposalMethod.DONATION,
        disposalReason: 'Donated to affiliated rural high school outreach lab',
        salvageValueMinorUnits: 0,
        disposalDate: '2026-09-25',
      });

    expect(disposeRes.status).toBe(200);
    expect(disposeRes.body.data.status).toBe(AssetStatus.DISPOSED);

    const disposedAsset = await InventoryAsset.findById(durableAssetId);
    expect(disposedAsset!.status).toBe(AssetStatus.DISPOSED);
  });

  it('11. Fetches Dashboard KPIs, Valuation, and Audit Reports', async () => {
    // 11a. Dashboard KPIs
    const kpiRes = await request(app)
      .get(`/api/v1/inventory/reports/dashboard?schoolId=${schoolId}`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(kpiRes.status).toBe(200);
    expect(kpiRes.body.data.totalItems).toBeGreaterThanOrEqual(2);
    expect(kpiRes.body.data.totalStores).toBeGreaterThanOrEqual(2);
    expect(kpiRes.body.data.totalAssets).toBeGreaterThanOrEqual(1);
    expect(typeof kpiRes.body.data.totalValuationMinorUnits).toBe('number');

    // 11b. Valuation Report
    const valRes = await request(app)
      .get(`/api/v1/inventory/reports/valuation?schoolId=${schoolId}`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(valRes.status).toBe(200);
    expect(Array.isArray(valRes.body.data.items)).toBe(true);

    // 11c. Asset Audit Report
    const auditRes = await request(app)
      .get(`/api/v1/inventory/reports/assets?schoolId=${schoolId}`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(Array.isArray(auditRes.body.data.assets)).toBe(true);
  });
});
