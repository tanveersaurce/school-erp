import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import {
  Tenant,
  School,
  InventoryCategory,
  InventoryUnit,
  InventoryStore,
  InventoryItem,
  InventoryStock,
  InventoryStockLedger,
  InventoryAsset,
} from '../src/models/index.js';
import {
  TenantPlan,
  TenantBillingStatus,
  InventoryItemType,
  AssetStatus,
  AssetCondition,
  StockMovementType,
} from '@edusphere/common';

describe('Inventory Database Invariants Suite', () => {
  let tenant1Id: Types.ObjectId;
  let tenant2Id: Types.ObjectId;
  let school1Id: Types.ObjectId;
  let school2Id: Types.ObjectId;
  let store1Id: Types.ObjectId;
  let category1Id: Types.ObjectId;
  let unit1Id: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
    await InventoryCategory.init();
    await InventoryUnit.init();
    await InventoryStore.init();
    await InventoryItem.init();
    await InventoryStock.init();
    await InventoryStockLedger.init();
    await InventoryAsset.init();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    tenant1Id = new Types.ObjectId();
    tenant2Id = new Types.ObjectId();
    school1Id = new Types.ObjectId();
    school2Id = new Types.ObjectId();

    await Tenant.create({
      _id: tenant1Id,
      name: 'Springfield Academy Trust',
      slug: 'springfield-academy',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await Tenant.create({
      _id: tenant2Id,
      name: 'Shelbyville Prep Trust',
      slug: 'shelbyville-prep',
      plan: TenantPlan.STARTER,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await School.create({
      _id: school1Id,
      tenantId: tenant1Id,
      name: 'Springfield Elementary',
      code: 'SE01',
      affiliationBoard: 'STATE',
    });

    await School.create({
      _id: school2Id,
      tenantId: tenant2Id,
      name: 'Shelbyville Prep',
      code: 'SP01',
      affiliationBoard: 'STATE',
    });

    const category = await InventoryCategory.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Science Supplies',
      code: 'SCI-01',
      itemType: InventoryItemType.CONSUMABLE,
    });
    category1Id = category._id as Types.ObjectId;

    const unit = await InventoryUnit.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Box of 10',
      code: 'BOX10',
      symbol: 'BOX10',
      decimalPrecision: 0,
    });
    unit1Id = unit._id as Types.ObjectId;

    const store = await InventoryStore.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Central Chemical Depot',
      code: 'DEP-01',
      storeType: 'CENTRAL',
    });
    store1Id = store._id as Types.ObjectId;
  });

  describe('Unique Constraints and Tenant Scoping', () => {
    it('enforces unique itemCode per tenant but allows cross-tenant duplicate codes', async () => {
      await InventoryItem.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        itemCode: 'CHM-001',
        name: 'Hydrochloric Acid 1M',
        itemType: InventoryItemType.CONSUMABLE,
        categoryId: category1Id,
        unitId: unit1Id,
        reorderLevel: 5,
      });

      // Duplicate within same tenant should fail
      await expect(
        InventoryItem.create({
          tenantId: tenant1Id,
          schoolId: school1Id,
          itemCode: 'CHM-001',
          name: 'Different Acid',
          itemType: InventoryItemType.CONSUMABLE,
          categoryId: category1Id,
          unitId: unit1Id,
          reorderLevel: 5,
        }),
      ).rejects.toThrow();

      // Same itemCode under different tenant should succeed
      const crossTenantCategory = await InventoryCategory.create({
        tenantId: tenant2Id,
        schoolId: school2Id,
        name: 'Science Supplies',
        code: 'SCI-02',
        itemType: InventoryItemType.CONSUMABLE,
      });
      const crossTenantUnit = await InventoryUnit.create({
        tenantId: tenant2Id,
        schoolId: school2Id,
        name: 'Box of 10',
        code: 'BOX10',
        symbol: 'BOX10',
      });

      const crossTenantItem = await InventoryItem.create({
        tenantId: tenant2Id,
        schoolId: school2Id,
        itemCode: 'CHM-001',
        name: 'Shelbyville Hydrochloric Acid',
        itemType: InventoryItemType.CONSUMABLE,
        categoryId: crossTenantCategory._id,
        unitId: crossTenantUnit._id,
        reorderLevel: 5,
      });
      expect(crossTenantItem).toBeDefined();
      expect(crossTenantItem.itemCode).toBe('CHM-001');
    });

    it('enforces unique assetTag per tenant and prevents duplicates', async () => {
      const item = await InventoryItem.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        itemCode: 'AST-MIC-01',
        name: 'Binocular Microscope',
        itemType: InventoryItemType.DURABLE_ASSET,
        categoryId: category1Id,
        unitId: unit1Id,
      });

      await InventoryAsset.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        itemId: item._id,
        assetTag: 'AST-2026-0001',
        serialNumber: 'SN-NIKON-99881',
        status: AssetStatus.AVAILABLE,
        condition: AssetCondition.EXCELLENT,
      });

      // Duplicate assetTag in same tenant should fail
      await expect(
        InventoryAsset.create({
          tenantId: tenant1Id,
          schoolId: school1Id,
          itemId: item._id,
          assetTag: 'AST-2026-0001',
          serialNumber: 'SN-NIKON-99882',
          status: AssetStatus.AVAILABLE,
          condition: AssetCondition.EXCELLENT,
        }),
      ).rejects.toThrow();

      // Same assetTag in tenant 2 should succeed
      const assetT2 = await InventoryAsset.create({
        tenantId: tenant2Id,
        schoolId: school2Id,
        itemId: new Types.ObjectId(),
        assetTag: 'AST-2026-0001',
        serialNumber: 'SN-OTHER-11',
        status: AssetStatus.AVAILABLE,
        condition: AssetCondition.EXCELLENT,
      });
      expect(assetT2.assetTag).toBe('AST-2026-0001');
    });

    it('enforces unique stock record per { tenantId, storeId, itemId }', async () => {
      const item = await InventoryItem.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        itemCode: 'GLV-001',
        name: 'Nitrile Gloves L',
        itemType: InventoryItemType.CONSUMABLE,
        categoryId: category1Id,
        unitId: unit1Id,
      });

      await InventoryStock.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        storeId: store1Id,
        itemId: item._id,
        quantityOnHand: 100,
        quantityReserved: 10,
        quantityAvailable: 90,
      });

      // Duplicate stock record for same store and item should fail
      await expect(
        InventoryStock.create({
          tenantId: tenant1Id,
          schoolId: school1Id,
          storeId: store1Id,
          itemId: item._id,
          quantityOnHand: 50,
          quantityReserved: 0,
          quantityAvailable: 50,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Negative Stock and Schema Invariants', () => {
    it('prevents saving negative quantityOnHand via schema min validator', async () => {
      const item = await InventoryItem.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        itemCode: 'NEG-001',
        name: 'Test Negative Stock Item',
        itemType: InventoryItemType.CONSUMABLE,
        categoryId: category1Id,
        unitId: unit1Id,
      });

      const invalidStock = new InventoryStock({
        tenantId: tenant1Id,
        schoolId: school1Id,
        storeId: store1Id,
        itemId: item._id,
        quantityOnHand: -10, // Invalid!
        quantityReserved: 0,
        quantityAvailable: -10,
      });

      await expect(invalidStock.save()).rejects.toThrow();
    });

    it('creates immutable inventory stock ledger entries with before and after balances', async () => {
      const item = await InventoryItem.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        itemCode: 'LED-001',
        name: 'Microscope Slides 100pk',
        itemType: InventoryItemType.CONSUMABLE,
        categoryId: category1Id,
        unitId: unit1Id,
      });

      const ledgerEntry = await InventoryStockLedger.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        storeId: store1Id,
        itemId: item._id,
        movementType: StockMovementType.RECEIPT,
        quantity: 50,
        unitCostMinorUnits: 25000,
        totalCostMinorUnits: 1250000,
        balanceAfter: 50,
        referenceType: 'RECEIPT',
        referenceId: 'RCV-2026-0001',
        actorUserId: new Types.ObjectId(),
        timestamp: new Date(),
        reason: 'Initial opening stock receipt',
      });

      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry.balanceAfter).toBe(50);
      expect(ledgerEntry.movementType).toBe(StockMovementType.RECEIPT);
      expect(ledgerEntry.unitCostMinorUnits).toBe(25000);
    });
  });

  describe('Soft Delete and Tenant Isolation', () => {
    it('supports soft deletion on items without destroying historical integrity', async () => {
      const item = await InventoryItem.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        itemCode: 'DEL-001',
        name: 'Temporary Lab Beaker',
        itemType: InventoryItemType.CONSUMABLE,
        categoryId: category1Id,
        unitId: unit1Id,
      });

      expect(item.isDeleted).toBe(false);

      // Perform soft delete
      await item.softDelete(new Types.ObjectId());

      // Normal query excludes soft-deleted records
      const normalQuery = await InventoryItem.findById(item._id);
      expect(normalQuery).toBeNull();

      // Query explicitly asking for deleted document finds it
      const reloaded = await InventoryItem.findOne({ _id: item._id, isDeleted: true });
      expect(reloaded).not.toBeNull();
      expect(reloaded?.isDeleted).toBe(true);
      expect(reloaded?.deletedAt).toBeDefined();
    });
  });
});
