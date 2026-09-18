import { Schema, model, Types } from 'mongoose';
import {
  IInventoryCategory,
  IInventoryUnit,
  IInventorySupplier,
  IInventoryStore,
  IInventoryLocation,
  IInventoryItem,
  IInventoryStock,
  IInventoryStockBatch,
  IInventoryStockLedger,
  IInventoryStockReservation,
  IInventoryReceipt,
  IInventoryIssue,
  IInventoryReturn,
  IInventoryTransfer,
  IInventoryAdjustment,
  IInventoryStocktake,
  IInventoryAsset,
  IInventoryAssetAssignment,
  IInventoryAssetMaintenance,
  IInventoryAssetDisposal,
  IInventorySetting,
} from '@edusphere/types';
import {
  InventoryItemType,
  AssetStatus,
  AssetCondition,
  AssetAssignmentType,
  InventoryStoreStatus,
  InventoryLocationType,
  StockMovementType,
  StockReceiptStatus,
  StockIssueStatus,
  StockIssueDestinationType,
  StockReturnStatus,
  StockTransferStatus,
  StockAdjustmentType,
  StockAdjustmentReason,
  StockAdjustmentStatus,
  StocktakeStatus,
  StockReservationStatus,
  AssetMaintenanceType,
  AssetMaintenanceStatus,
  AssetDisposalReason,
  AssetDisposalMethod,
  InventoryValuationMethod,
} from '@edusphere/common';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

// ============================================================================
// Document Interfaces (Mongoose Document Types)
// ============================================================================

export interface IInventoryCategoryDoc extends Omit<IInventoryCategory, 'id' | 'tenantId' | 'schoolId' | 'parentCategoryId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  parentCategoryId?: Types.ObjectId;
}

export interface IInventoryUnitDoc extends Omit<IInventoryUnit, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface IInventorySupplierDoc extends Omit<IInventorySupplier, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface IInventoryStoreDoc extends Omit<IInventoryStore, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'managerEmployeeId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  managerEmployeeId?: Types.ObjectId;
}

export interface IInventoryLocationDoc extends Omit<IInventoryLocation, 'id' | 'tenantId' | 'schoolId' | 'storeId' | 'parentLocationId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  storeId: Types.ObjectId;
  parentLocationId?: Types.ObjectId;
}

export interface IInventoryItemDoc extends Omit<IInventoryItem, 'id' | 'tenantId' | 'schoolId' | 'categoryId' | 'unitId' | 'preferredSupplierId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  categoryId: Types.ObjectId;
  unitId: Types.ObjectId;
  preferredSupplierId?: Types.ObjectId;
}

export interface IInventoryStockDoc extends Omit<IInventoryStock, 'id' | 'tenantId' | 'schoolId' | 'itemId' | 'storeId' | 'locationId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  itemId: Types.ObjectId;
  storeId: Types.ObjectId;
  locationId?: Types.ObjectId;
}

export interface IInventoryStockBatchDoc extends Omit<IInventoryStockBatch, 'id' | 'tenantId' | 'schoolId' | 'itemId' | 'storeId' | 'supplierId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  itemId: Types.ObjectId;
  storeId: Types.ObjectId;
  supplierId?: Types.ObjectId;
}

export interface IInventoryStockLedgerDoc extends Omit<IInventoryStockLedger, 'id' | 'tenantId' | 'schoolId' | 'itemId' | 'storeId' | 'locationId' | 'batchId' | 'actorUserId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  itemId: Types.ObjectId;
  storeId: Types.ObjectId;
  locationId?: Types.ObjectId;
  batchId?: Types.ObjectId;
  actorUserId: Types.ObjectId;
}

export interface IInventoryStockReservationDoc extends Omit<IInventoryStockReservation, 'id' | 'tenantId' | 'schoolId' | 'itemId' | 'storeId' | 'createdByUserId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  itemId: Types.ObjectId;
  storeId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
}

export interface IInventoryReceiptDoc extends Omit<IInventoryReceipt, 'id' | 'tenantId' | 'schoolId' | 'storeId' | 'supplierId' | 'receivedByUserId' | 'items'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  storeId: Types.ObjectId;
  supplierId?: Types.ObjectId;
  receivedByUserId: Types.ObjectId;
  items: Array<{
    itemId: Types.ObjectId;
    quantity: number;
    unitCostMinorUnits: number;
    totalCostMinorUnits: number;
    batchNumber?: string;
    manufacturingDate?: Date;
    expiryDate?: Date;
    locationId?: Types.ObjectId;
  }>;
}

export interface IInventoryIssueDoc extends Omit<IInventoryIssue, 'id' | 'tenantId' | 'schoolId' | 'storeId' | 'issuedByUserId' | 'receivedByUserId' | 'items'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  storeId: Types.ObjectId;
  issuedByUserId: Types.ObjectId;
  receivedByUserId?: Types.ObjectId;
  items: Array<{
    itemId: Types.ObjectId;
    quantity: number;
    batchId?: Types.ObjectId;
    unitCostMinorUnits: number;
    totalCostMinorUnits: number;
  }>;
}

export interface IInventoryReturnDoc extends Omit<IInventoryReturn, 'id' | 'tenantId' | 'schoolId' | 'originalIssueId' | 'storeId' | 'returnedByUserId' | 'receivedByUserId' | 'items'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  originalIssueId?: Types.ObjectId;
  storeId: Types.ObjectId;
  returnedByUserId?: Types.ObjectId;
  receivedByUserId: Types.ObjectId;
  items: Array<{
    itemId: Types.ObjectId;
    quantity: number;
    condition: string;
    reason?: string;
  }>;
}

export interface IInventoryTransferDoc extends Omit<IInventoryTransfer, 'id' | 'tenantId' | 'schoolId' | 'sourceStoreId' | 'destinationStoreId' | 'sourceLocationId' | 'destinationLocationId' | 'requestedByUserId' | 'approvedByUserId' | 'items'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  sourceStoreId: Types.ObjectId;
  destinationStoreId: Types.ObjectId;
  sourceLocationId?: Types.ObjectId;
  destinationLocationId?: Types.ObjectId;
  requestedByUserId: Types.ObjectId;
  approvedByUserId?: Types.ObjectId;
  items: Array<{
    itemId: Types.ObjectId;
    quantity: number;
    batchId?: Types.ObjectId;
  }>;
}

export interface IInventoryAdjustmentDoc extends Omit<IInventoryAdjustment, 'id' | 'tenantId' | 'schoolId' | 'storeId' | 'actorUserId' | 'approvedByUserId' | 'items'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  storeId: Types.ObjectId;
  actorUserId: Types.ObjectId;
  approvedByUserId?: Types.ObjectId;
  items: Array<{
    itemId: Types.ObjectId;
    locationId?: Types.ObjectId;
    batchId?: Types.ObjectId;
    quantityChange: number;
    currentQuantity: number;
    newQuantity: number;
    unitCostMinorUnits: number;
    reason?: string;
  }>;
}

export interface IInventoryStocktakeDoc extends Omit<IInventoryStocktake, 'id' | 'tenantId' | 'schoolId' | 'storeId' | 'locationId' | 'countedByUserId' | 'approvedByUserId' | 'reconciledAdjustmentId' | 'items'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  storeId: Types.ObjectId;
  locationId?: Types.ObjectId;
  countedByUserId?: Types.ObjectId;
  approvedByUserId?: Types.ObjectId;
  reconciledAdjustmentId?: Types.ObjectId;
  items: Array<{
    itemId: Types.ObjectId;
    systemQuantity: number;
    countedQuantity: number;
    variance: number;
    varianceCostMinorUnits: number;
    notes?: string;
  }>;
}

export interface IInventoryAssetDoc extends Omit<IInventoryAsset, 'id' | 'tenantId' | 'schoolId' | 'itemId' | 'currentStoreId' | 'currentLocationId' | 'assignedToId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  itemId: Types.ObjectId;
  currentStoreId?: Types.ObjectId;
  currentLocationId?: Types.ObjectId;
  assignedToId?: Types.ObjectId;
}

export interface IInventoryAssetAssignmentDoc extends Omit<IInventoryAssetAssignment, 'id' | 'tenantId' | 'schoolId' | 'assetId' | 'assignedToId' | 'assignedByUserId' | 'returnedByUserId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  assetId: Types.ObjectId;
  assignedToId: Types.ObjectId;
  assignedByUserId: Types.ObjectId;
  returnedByUserId?: Types.ObjectId;
}

export interface IInventoryAssetMaintenanceDoc extends Omit<IInventoryAssetMaintenance, 'id' | 'tenantId' | 'schoolId' | 'assetId' | 'vendorSupplierId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  assetId: Types.ObjectId;
  vendorSupplierId?: Types.ObjectId;
}

export interface IInventoryAssetDisposalDoc extends Omit<IInventoryAssetDisposal, 'id' | 'tenantId' | 'schoolId' | 'assetId' | 'approvedByUserId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  assetId: Types.ObjectId;
  approvedByUserId: Types.ObjectId;
}

export interface IInventorySettingDoc extends Omit<IInventorySetting, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

// ============================================================================
// Schemas
// ============================================================================

// 1. InventoryCategory
const InventoryCategorySchema = new Schema<IInventoryCategoryDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    parentCategoryId: { type: Schema.Types.ObjectId, ref: 'InventoryCategory' },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryCategorySchema.plugin(tenantPlugin);
InventoryCategorySchema.plugin(softDeletePlugin);
InventoryCategorySchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true });

// 2. InventoryUnit
const InventoryUnitSchema = new Schema<IInventoryUnitDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    symbol: { type: String, required: true, trim: true },
    decimalPrecision: { type: Number, default: 0, min: 0, max: 4 },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryUnitSchema.plugin(tenantPlugin);
InventoryUnitSchema.plugin(softDeletePlugin);
InventoryUnitSchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true });

// 3. InventorySupplier
const InventorySupplierSchema = new Schema<IInventorySupplierDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    taxId: { type: String, trim: true },
    paymentTerms: { type: String, trim: true },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventorySupplierSchema.plugin(tenantPlugin);
InventorySupplierSchema.plugin(softDeletePlugin);
InventorySupplierSchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true });

// 4. InventoryStore
const InventoryStoreSchema = new Schema<IInventoryStoreDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    location: { type: String, trim: true },
    managerEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    status: {
      type: String,
      enum: Object.values(InventoryStoreStatus),
      default: InventoryStoreStatus.ACTIVE,
    },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryStoreSchema.plugin(tenantPlugin);
InventoryStoreSchema.plugin(softDeletePlugin);
InventoryStoreSchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true });

// 5. InventoryLocation
const InventoryLocationSchema = new Schema<IInventoryLocationDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'InventoryStore', required: true, index: true },
    parentLocationId: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    type: {
      type: String,
      enum: Object.values(InventoryLocationType),
      default: InventoryLocationType.SHELF,
    },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryLocationSchema.plugin(tenantPlugin);
InventoryLocationSchema.plugin(softDeletePlugin);
InventoryLocationSchema.index({ tenantId: 1, storeId: 1, code: 1 }, { unique: true });

// 6. InventoryItem
const InventoryItemSchema = new Schema<IInventoryItemDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    itemCode: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'InventoryCategory', required: true, index: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'InventoryUnit', required: true },
    itemType: {
      type: String,
      enum: Object.values(InventoryItemType),
      default: InventoryItemType.CONSUMABLE,
      required: true,
      index: true,
    },
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    sku: { type: String, uppercase: true, trim: true },
    barcode: { type: String, trim: true },
    reorderLevel: { type: Number, required: true, default: 5, min: 0 },
    minimumStock: { type: Number, required: true, default: 0, min: 0 },
    maximumStock: { type: Number, min: 0 },
    preferredSupplierId: { type: Schema.Types.ObjectId, ref: 'InventorySupplier' },
    trackBatch: { type: Boolean, default: false },
    trackExpiry: { type: Boolean, default: false },
    trackSerialNumber: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v', toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
InventoryItemSchema.virtual('type').get(function (this: IInventoryItemDoc) {
  return this.itemType;
});
InventoryItemSchema.plugin(tenantPlugin);
InventoryItemSchema.plugin(softDeletePlugin);
InventoryItemSchema.index({ tenantId: 1, schoolId: 1, itemCode: 1 }, { unique: true });
InventoryItemSchema.index({ tenantId: 1, schoolId: 1, sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: 'string' } } });
InventoryItemSchema.index({ tenantId: 1, schoolId: 1, barcode: 1 }, { sparse: true });

// 7. InventoryStock
const InventoryStockSchema = new Schema<IInventoryStockDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'InventoryStore', required: true, index: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
    quantityOnHand: { type: Number, required: true, default: 0, min: 0 },
    quantityReserved: { type: Number, required: true, default: 0, min: 0 },
    quantityAvailable: { type: Number, required: true, default: 0 },
    reorderLevel: { type: Number, default: 5, min: 0 },
    averageCostMinorUnits: { type: Number, default: 0, min: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryStockSchema.plugin(tenantPlugin);
InventoryStockSchema.index({ tenantId: 1, storeId: 1, itemId: 1 }, { unique: true });

// 8. InventoryStockBatch
const InventoryStockBatchSchema = new Schema<IInventoryStockBatchDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'InventoryStore', required: true, index: true },
    batchNumber: { type: String, required: true, uppercase: true, trim: true },
    manufacturingDate: { type: Date },
    expiryDate: { type: Date, index: true },
    quantityOnHand: { type: Number, required: true, default: 0, min: 0 },
    quantityReserved: { type: Number, required: true, default: 0, min: 0 },
    unitCostMinorUnits: { type: Number, required: true, min: 0 },
    supplierId: { type: Schema.Types.ObjectId, ref: 'InventorySupplier' },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryStockBatchSchema.plugin(tenantPlugin);
InventoryStockBatchSchema.index({ tenantId: 1, storeId: 1, itemId: 1, batchNumber: 1 }, { unique: true });

// 9. InventoryStockLedger
const InventoryStockLedgerSchema = new Schema<IInventoryStockLedgerDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'InventoryStore', required: true, index: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
    batchId: { type: Schema.Types.ObjectId, ref: 'InventoryStockBatch' },
    movementType: {
      type: String,
      enum: Object.values(StockMovementType),
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    unitCostMinorUnits: { type: Number, default: 0, min: 0 },
    totalCostMinorUnits: { type: Number, default: 0 },
    referenceType: { type: String, trim: true },
    referenceId: { type: String, trim: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    reason: { type: String, trim: true },
    requestId: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: '__v' }
);
InventoryStockLedgerSchema.plugin(tenantPlugin);
InventoryStockLedgerSchema.index({ tenantId: 1, schoolId: 1, itemId: 1, timestamp: -1 });
InventoryStockLedgerSchema.index({ tenantId: 1, storeId: 1, timestamp: -1 });

// 10. InventoryStockReservation
const InventoryStockReservationSchema = new Schema<IInventoryStockReservationDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'InventoryStore', required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    reservedForType: { type: String, required: true },
    reservedForId: { type: String, required: true },
    expiresAt: { type: Date, index: true },
    status: {
      type: String,
      enum: Object.values(StockReservationStatus),
      default: StockReservationStatus.ACTIVE,
      index: true,
    },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryStockReservationSchema.plugin(tenantPlugin);

// 11. InventoryReceipt
const InventoryReceiptSchema = new Schema<IInventoryReceiptDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    receiptNumber: { type: String, required: true, uppercase: true, trim: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'InventoryStore', required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'InventorySupplier' },
    receiptDate: { type: Date, default: Date.now },
    referenceNumber: { type: String, trim: true },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        quantity: { type: Number, required: true, min: 0.0001 },
        unitCostMinorUnits: { type: Number, required: true, min: 0 },
        totalCostMinorUnits: { type: Number, required: true, min: 0 },
        batchNumber: { type: String, trim: true },
        manufacturingDate: { type: Date },
        expiryDate: { type: Date },
        locationId: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
      },
    ],
    totalAmountMinorUnits: { type: Number, default: 0, min: 0 },
    receivedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(StockReceiptStatus),
      default: StockReceiptStatus.DRAFT,
      index: true,
    },
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryReceiptSchema.plugin(tenantPlugin);
InventoryReceiptSchema.plugin(softDeletePlugin);
InventoryReceiptSchema.index({ tenantId: 1, schoolId: 1, receiptNumber: 1 }, { unique: true });

// 12. InventoryIssue
const InventoryIssueSchema = new Schema<IInventoryIssueDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    issueNumber: { type: String, required: true, uppercase: true, trim: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'InventoryStore', required: true, index: true },
    destinationType: {
      type: String,
      enum: Object.values(StockIssueDestinationType),
      required: true,
    },
    destinationId: { type: String, required: true },
    issueDate: { type: Date, default: Date.now },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        quantity: { type: Number, required: true, min: 0.0001 },
        batchId: { type: Schema.Types.ObjectId, ref: 'InventoryStockBatch' },
        unitCostMinorUnits: { type: Number, default: 0, min: 0 },
        totalCostMinorUnits: { type: Number, default: 0, min: 0 },
      },
    ],
    issuedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receivedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    purpose: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(StockIssueStatus),
      default: StockIssueStatus.DRAFT,
      index: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryIssueSchema.plugin(tenantPlugin);
InventoryIssueSchema.plugin(softDeletePlugin);
InventoryIssueSchema.index({ tenantId: 1, schoolId: 1, issueNumber: 1 }, { unique: true });

// 13. InventoryReturn
const InventoryReturnSchema = new Schema<IInventoryReturnDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    returnNumber: { type: String, required: true, uppercase: true, trim: true },
    originalIssueId: { type: Schema.Types.ObjectId, ref: 'InventoryIssue' },
    storeId: { type: Schema.Types.ObjectId, ref: 'InventoryStore', required: true, index: true },
    returnDate: { type: Date, default: Date.now },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        quantity: { type: Number, required: true, min: 0.0001 },
        condition: { type: String, default: 'GOOD' },
        reason: { type: String, trim: true },
      },
    ],
    returnedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    receivedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(StockReturnStatus),
      default: StockReturnStatus.DRAFT,
      index: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryReturnSchema.plugin(tenantPlugin);
InventoryReturnSchema.plugin(softDeletePlugin);
InventoryReturnSchema.index({ tenantId: 1, schoolId: 1, returnNumber: 1 }, { unique: true });

// 14. InventoryTransfer
const InventoryTransferSchema = new Schema<IInventoryTransferDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    transferNumber: { type: String, required: true, uppercase: true, trim: true },
    sourceStoreId: { type: Schema.Types.ObjectId, ref: 'InventoryStore', required: true, index: true },
    destinationStoreId: { type: Schema.Types.ObjectId, ref: 'InventoryStore', required: true, index: true },
    sourceLocationId: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
    destinationLocationId: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        quantity: { type: Number, required: true, min: 0.0001 },
        batchId: { type: Schema.Types.ObjectId, ref: 'InventoryStockBatch' },
      },
    ],
    requestedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    dispatchedAt: { type: Date },
    receivedAt: { type: Date },
    status: {
      type: String,
      enum: Object.values(StockTransferStatus),
      default: StockTransferStatus.DRAFT,
      index: true,
    },
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryTransferSchema.plugin(tenantPlugin);
InventoryTransferSchema.plugin(softDeletePlugin);
InventoryTransferSchema.index({ tenantId: 1, schoolId: 1, transferNumber: 1 }, { unique: true });

// 15. InventoryAdjustment
const InventoryAdjustmentSchema = new Schema<IInventoryAdjustmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    adjustmentNumber: { type: String, required: true, uppercase: true, trim: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'InventoryStore', required: true, index: true },
    adjustmentType: {
      type: String,
      enum: Object.values(StockAdjustmentType),
      required: true,
    },
    reason: {
      type: String,
      enum: Object.values(StockAdjustmentReason),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(StockAdjustmentStatus),
      default: StockAdjustmentStatus.DRAFT,
      index: true,
    },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        locationId: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
        batchId: { type: Schema.Types.ObjectId, ref: 'InventoryStockBatch' },
        quantityChange: { type: Number, required: true },
        currentQuantity: { type: Number, required: true },
        newQuantity: { type: Number, required: true },
        unitCostMinorUnits: { type: Number, default: 0, min: 0 },
        reason: { type: String, trim: true },
      },
    ],
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryAdjustmentSchema.plugin(tenantPlugin);
InventoryAdjustmentSchema.plugin(softDeletePlugin);
InventoryAdjustmentSchema.index({ tenantId: 1, schoolId: 1, adjustmentNumber: 1 }, { unique: true });

// 16. InventoryStocktake
const InventoryStocktakeSchema = new Schema<IInventoryStocktakeDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    stocktakeNumber: { type: String, required: true, uppercase: true, trim: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'InventoryStore', required: true, index: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
    status: {
      type: String,
      enum: Object.values(StocktakeStatus),
      default: StocktakeStatus.DRAFT,
      index: true,
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        systemQuantity: { type: Number, required: true },
        countedQuantity: { type: Number, required: true },
        variance: { type: Number, required: true },
        varianceCostMinorUnits: { type: Number, default: 0 },
        notes: { type: String, trim: true },
      },
    ],
    countedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    reconciledAdjustmentId: { type: Schema.Types.ObjectId, ref: 'InventoryAdjustment' },
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryStocktakeSchema.plugin(tenantPlugin);
InventoryStocktakeSchema.plugin(softDeletePlugin);
InventoryStocktakeSchema.index({ tenantId: 1, schoolId: 1, stocktakeNumber: 1 }, { unique: true });

// 17. InventoryAsset
const InventoryAssetSchema = new Schema<IInventoryAssetDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    assetTag: { type: String, required: true, uppercase: true, trim: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    serialNumber: { type: String, uppercase: true, trim: true },
    model: { type: String, trim: true },
    manufacturer: { type: String, trim: true },
    purchaseDate: { type: Date },
    purchaseCostMinorUnits: { type: Number, default: 0, min: 0 },
    warrantyStartDate: { type: Date },
    warrantyEndDate: { type: Date },
    currentStoreId: { type: Schema.Types.ObjectId, ref: 'InventoryStore' },
    currentLocationId: { type: Schema.Types.ObjectId, ref: 'InventoryLocation' },
    assignedToType: {
      type: String,
      enum: Object.values(AssetAssignmentType),
      default: AssetAssignmentType.NONE,
      index: true,
    },
    assignedToId: { type: Schema.Types.ObjectId, index: true },
    assignmentDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(AssetStatus),
      default: AssetStatus.AVAILABLE,
      index: true,
    },
    condition: {
      type: String,
      enum: Object.values(AssetCondition),
      default: AssetCondition.NEW,
    },
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryAssetSchema.plugin(tenantPlugin);
InventoryAssetSchema.plugin(softDeletePlugin);
InventoryAssetSchema.index({ tenantId: 1, schoolId: 1, assetTag: 1 }, { unique: true });
InventoryAssetSchema.index({ tenantId: 1, schoolId: 1, serialNumber: 1 }, { unique: true, partialFilterExpression: { serialNumber: { $type: 'string' } } });

// 18. InventoryAssetAssignment
const InventoryAssetAssignmentSchema = new Schema<IInventoryAssetAssignmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'InventoryAsset', required: true, index: true },
    assignedToType: {
      type: String,
      enum: Object.values(AssetAssignmentType),
      required: true,
    },
    assignedToId: { type: Schema.Types.ObjectId, required: true, index: true },
    assignedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt: { type: Date, default: Date.now },
    returnedAt: { type: Date },
    returnedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    conditionOnAssignment: {
      type: String,
      enum: Object.values(AssetCondition),
      default: AssetCondition.GOOD,
    },
    conditionOnReturn: {
      type: String,
      enum: Object.values(AssetCondition),
    },
    remarks: { type: String, trim: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'RETURNED', 'TRANSFERRED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryAssetAssignmentSchema.plugin(tenantPlugin);
InventoryAssetAssignmentSchema.index({ tenantId: 1, assetId: 1, status: 1 });

// 19. InventoryAssetMaintenance
const InventoryAssetMaintenanceSchema = new Schema<IInventoryAssetMaintenanceDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'InventoryAsset', required: true, index: true },
    maintenanceType: {
      type: String,
      enum: Object.values(AssetMaintenanceType),
      required: true,
    },
    reportedAt: { type: Date, default: Date.now },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    description: { type: String, required: true, trim: true },
    vendorSupplierId: { type: Schema.Types.ObjectId, ref: 'InventorySupplier' },
    costMinorUnits: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: Object.values(AssetMaintenanceStatus),
      default: AssetMaintenanceStatus.REPORTED,
      index: true,
    },
    resolution: { type: String, trim: true },
    performedBy: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryAssetMaintenanceSchema.plugin(tenantPlugin);
InventoryAssetMaintenanceSchema.plugin(softDeletePlugin);

// 20. InventoryAssetDisposal
const InventoryAssetDisposalSchema = new Schema<IInventoryAssetDisposalDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'InventoryAsset', required: true, index: true },
    disposalDate: { type: Date, default: Date.now },
    reason: {
      type: String,
      enum: Object.values(AssetDisposalReason),
      required: true,
    },
    method: {
      type: String,
      enum: Object.values(AssetDisposalMethod),
      required: true,
    },
    saleProceedsMinorUnits: { type: Number, default: 0, min: 0 },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true },
    documentRef: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
InventoryAssetDisposalSchema.plugin(tenantPlugin);
InventoryAssetDisposalSchema.plugin(softDeletePlugin);
InventoryAssetDisposalSchema.index({ tenantId: 1, assetId: 1 }, { unique: true });

// 21. InventorySetting
const InventorySettingSchema = new Schema<IInventorySettingDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    defaultValuationMethod: {
      type: String,
      enum: Object.values(InventoryValuationMethod),
      default: InventoryValuationMethod.WEIGHTED_AVERAGE,
    },
    allowNegativeStock: { type: Boolean, default: false },
    enforceExpiryOnIssue: { type: Boolean, default: true },
    nearExpiryThresholdDays: { type: Number, default: 30, min: 1 },
    autoGenerateAssetTag: { type: Boolean, default: true },
    assetTagPrefix: { type: String, default: 'AST-', trim: true },
    receiptNumberPrefix: { type: String, default: 'REC-', trim: true },
    issueNumberPrefix: { type: String, default: 'ISS-', trim: true },
    transferNumberPrefix: { type: String, default: 'TRN-', trim: true },
    adjustmentNumberPrefix: { type: String, default: 'ADJ-', trim: true },
    stocktakeNumberPrefix: { type: String, default: 'STK-', trim: true },
  },
  { timestamps: true, versionKey: '__v' }
);
InventorySettingSchema.plugin(tenantPlugin);
InventorySettingSchema.index({ tenantId: 1, schoolId: 1 }, { unique: true });

// ============================================================================
// Model Exports
// ============================================================================

export const InventoryCategory = model<IInventoryCategoryDoc>('InventoryCategory', InventoryCategorySchema);
export const InventoryUnit = model<IInventoryUnitDoc>('InventoryUnit', InventoryUnitSchema);
export const InventorySupplier = model<IInventorySupplierDoc>('InventorySupplier', InventorySupplierSchema);
export const InventoryStore = model<IInventoryStoreDoc>('InventoryStore', InventoryStoreSchema);
export const InventoryLocation = model<IInventoryLocationDoc>('InventoryLocation', InventoryLocationSchema);
export const InventoryItem = model<IInventoryItemDoc>('InventoryItem', InventoryItemSchema);
export const InventoryStock = model<IInventoryStockDoc>('InventoryStock', InventoryStockSchema);
export const InventoryStockBatch = model<IInventoryStockBatchDoc>('InventoryStockBatch', InventoryStockBatchSchema);
export const InventoryStockLedger = model<IInventoryStockLedgerDoc>('InventoryStockLedger', InventoryStockLedgerSchema);
export const InventoryStockReservation = model<IInventoryStockReservationDoc>('InventoryStockReservation', InventoryStockReservationSchema);
export const InventoryReceipt = model<IInventoryReceiptDoc>('InventoryReceipt', InventoryReceiptSchema);
export const InventoryIssue = model<IInventoryIssueDoc>('InventoryIssue', InventoryIssueSchema);
export const InventoryReturn = model<IInventoryReturnDoc>('InventoryReturn', InventoryReturnSchema);
export const InventoryTransfer = model<IInventoryTransferDoc>('InventoryTransfer', InventoryTransferSchema);
export const InventoryAdjustment = model<IInventoryAdjustmentDoc>('InventoryAdjustment', InventoryAdjustmentSchema);
export const InventoryStocktake = model<IInventoryStocktakeDoc>('InventoryStocktake', InventoryStocktakeSchema);
export const InventoryAsset = model<IInventoryAssetDoc>('InventoryAsset', InventoryAssetSchema);
export const InventoryAssetAssignment = model<IInventoryAssetAssignmentDoc>('InventoryAssetAssignment', InventoryAssetAssignmentSchema);
export const InventoryAssetMaintenance = model<IInventoryAssetMaintenanceDoc>('InventoryAssetMaintenance', InventoryAssetMaintenanceSchema);
export const InventoryAssetDisposal = model<IInventoryAssetDisposalDoc>('InventoryAssetDisposal', InventoryAssetDisposalSchema);
export const InventorySetting = model<IInventorySettingDoc>('InventorySetting', InventorySettingSchema);
