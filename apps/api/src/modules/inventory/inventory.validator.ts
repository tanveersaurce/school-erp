import { z } from 'zod';
import {
  InventoryItemType,
  AssetStatus,
  AssetCondition,
  AssetAssignmentType,
  InventoryStoreStatus,
  InventoryLocationType,
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

// ============================================================================
// 1. Categories & Units
// ============================================================================

export const createCategorySchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  name: z.string().min(1, 'Name is required').trim(),
  code: z.string().min(1, 'Code is required').trim().toUpperCase(),
  description: z.string().optional(),
  parentCategoryId: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryQuerySchema = z.object({
  schoolId: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export const createUnitSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  name: z.string().min(1, 'Name is required').trim(),
  code: z.string().min(1, 'Code is required').trim().toUpperCase(),
  symbol: z.string().min(1, 'Symbol is required').trim(),
  decimalPrecision: z.number().int().min(0).max(4).default(0),
  active: z.boolean().default(true),
});

export const updateUnitSchema = createUnitSchema.partial();

export const unitQuerySchema = z.object({
  schoolId: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================================================
// 2. Suppliers
// ============================================================================

export const createSupplierSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  name: z.string().min(1, 'Name is required').trim(),
  code: z.string().min(1, 'Code is required').trim().toUpperCase(),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z
    .union([
      z.string(),
      z
        .object({
          addressLine1: z.string().optional(),
          addressLine2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
          country: z.string().optional(),
        })
        .transform((a) =>
          [a.addressLine1, a.addressLine2, a.city, a.state, a.postalCode, a.country]
            .filter(Boolean)
            .join(', ')
        ),
    ])
    .optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  active: z.boolean().default(true),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const supplierQuerySchema = z.object({
  schoolId: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================================================
// 3. Stores & Locations
// ============================================================================

export const createStoreSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  campusId: z.string().optional().nullable(),
  name: z.string().min(1, 'Name is required').trim(),
  code: z.string().min(1, 'Code is required').trim().toUpperCase(),
  location: z.string().optional(),
  description: z.string().optional(),
  managerEmployeeId: z.string().optional().nullable(),
  status: z.nativeEnum(InventoryStoreStatus).default(InventoryStoreStatus.ACTIVE),
  active: z.boolean().default(true),
});

export const updateStoreSchema = createStoreSchema.partial();

export const storeQuerySchema = z.object({
  schoolId: z.string().optional(),
  campusId: z.string().optional(),
  status: z.nativeEnum(InventoryStoreStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export const createLocationSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  storeId: z.string().min(1, 'Store ID is required'),
  parentLocationId: z.string().optional().nullable(),
  name: z.string().min(1, 'Name is required').trim(),
  code: z.string().min(1, 'Code is required').trim().toUpperCase(),
  type: z.nativeEnum(InventoryLocationType).default(InventoryLocationType.SHELF),
  active: z.boolean().default(true),
});

export const updateLocationSchema = createLocationSchema.partial();

export const locationQuerySchema = z.object({
  storeId: z.string().optional(),
  schoolId: z.string().optional(),
  type: z.nativeEnum(InventoryLocationType).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================================================
// 4. Catalog Items
// ============================================================================

export const createItemSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  itemCode: z.string().min(1, 'Item Code is required').trim().toUpperCase(),
  name: z.string().min(1, 'Name is required').trim(),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category ID is required'),
  unitId: z.string().min(1, 'Unit ID is required'),
  itemType: z.nativeEnum(InventoryItemType).optional(),
  type: z.nativeEnum(InventoryItemType).optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  costPriceMinorUnits: z.number().optional(),
  reorderLevel: z.number().min(0).default(5),
  minimumStock: z.number().min(0).default(0),
  maximumStock: z.number().min(0).optional(),
  preferredSupplierId: z.string().optional().nullable(),
  trackBatch: z.boolean().default(false),
  trackExpiry: z.boolean().default(false),
  trackSerialNumber: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const updateItemSchema = createItemSchema.partial();

export const itemQuerySchema = z.object({
  schoolId: z.string().optional(),
  categoryId: z.string().optional(),
  itemType: z.nativeEnum(InventoryItemType).optional(),
  active: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================================================
// 5. Stock & Reservations
// ============================================================================

export const stockQuerySchema = z.object({
  schoolId: z.string().optional(),
  storeId: z.string().optional(),
  itemId: z.string().optional(),
  lowStockOnly: z.enum(['true', 'false']).optional(),
  outOfStockOnly: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export const reserveStockSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  itemId: z.string().min(1, 'Item ID is required'),
  storeId: z.string().min(1, 'Store ID is required'),
  quantity: z.number().positive('Reserved quantity must be positive'),
  reservedForType: z.string().min(1, 'Reserved for type is required'),
  reservedForId: z.string().min(1, 'Reserved for ID is required'),
  expiresAt: z.string().datetime().optional().nullable(),
});

// ============================================================================
// 6. Stock Receipts
// ============================================================================

export const createReceiptItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  locationId: z.string().optional().nullable(),
  orderedQuantity: z.number().min(0).optional(),
  receivedQuantity: z.number().positive('Received quantity must be greater than zero'),
  unitCostMinorUnits: z.number().int().min(0, 'Cost in minor units must be non-negative'),
  batchNumber: z.string().optional(),
  manufacturingDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  remarks: z.string().optional(),
});

export const createReceiptSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  storeId: z.string().min(1, 'Store ID is required'),
  supplierId: z.string().min(1, 'Supplier ID is required'),
  purchaseOrderNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  receivedDate: z.string().default(() => new Date().toISOString()),
  notes: z.string().optional(),
  items: z.array(createReceiptItemSchema).min(1, 'At least one item is required'),
});

export const receiptQuerySchema = z.object({
  schoolId: z.string().optional(),
  storeId: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.nativeEnum(StockReceiptStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================================================
// 7. Stock Issues
// ============================================================================

export const createIssueItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantity: z.number().positive('Issued quantity must be greater than zero'),
  batchId: z.string().optional().nullable(),
  unitCostMinorUnits: z.number().int().min(0).default(0),
  totalCostMinorUnits: z.number().int().min(0).default(0),
});

export const createIssueSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  storeId: z.string().min(1, 'Store ID is required'),
  destinationType: z.nativeEnum(StockIssueDestinationType),
  destinationId: z.string().min(1, 'Destination target ID is required'),
  purpose: z.string().optional(),
  issueDate: z.string().default(() => new Date().toISOString()),
  items: z.array(createIssueItemSchema).min(1, 'At least one issue item is required'),
});

export const issueQuerySchema = z.object({
  schoolId: z.string().optional(),
  storeId: z.string().optional(),
  destinationType: z.nativeEnum(StockIssueDestinationType).optional(),
  status: z.nativeEnum(StockIssueStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================================================
// 8. Stock Returns
// ============================================================================

export const createReturnItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantity: z.number().positive('Returned quantity must be positive'),
  condition: z.string().default('GOOD'),
  reason: z.string().optional(),
});

export const createReturnSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  storeId: z.string().min(1, 'Store ID is required'),
  originalIssueId: z.string().optional().nullable(),
  returnedByUserId: z.string().optional().nullable(),
  returnDate: z.string().default(() => new Date().toISOString()),
  reason: z.string().min(1, 'Return reason is required').trim(),
  items: z.array(createReturnItemSchema).min(1, 'At least one return item is required'),
});

export const returnQuerySchema = z.object({
  schoolId: z.string().optional(),
  storeId: z.string().optional(),
  status: z.nativeEnum(StockReturnStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================================================
// 9. Stock Transfers
// ============================================================================

export const createTransferItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantity: z.number().positive('Transfer quantity must be positive'),
  batchId: z.string().optional().nullable(),
});

export const createTransferSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  sourceStoreId: z.string().min(1, 'Source Store ID is required'),
  destinationStoreId: z.string().min(1, 'Destination Store ID is required'),
  sourceLocationId: z.string().optional().nullable(),
  destinationLocationId: z.string().optional().nullable(),
  notes: z.string().optional(),
  items: z.array(createTransferItemSchema).min(1, 'At least one transfer item is required'),
});

export const updateTransferStatusSchema = z.object({
  status: z.nativeEnum(StockTransferStatus),
  remarks: z.string().optional(),
});

export const transferQuerySchema = z.object({
  schoolId: z.string().optional(),
  sourceStoreId: z.string().optional(),
  destinationStoreId: z.string().optional(),
  status: z.nativeEnum(StockTransferStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================================================
// 10. Stock Adjustments
// ============================================================================

export const createAdjustmentItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  locationId: z.string().optional().nullable(),
  batchId: z.string().optional().nullable(),
  quantity: z.number().optional(),
  quantityChange: z.number().optional().default(0),
  currentQuantity: z.number().min(0).optional().default(0),
  newQuantity: z.number().min(0).optional().default(0),
  unitCostMinorUnits: z.number().int().min(0).default(0),
  reason: z.string().optional(),
});

export const createAdjustmentSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  storeId: z.string().min(1, 'Store ID is required'),
  adjustmentType: z.nativeEnum(StockAdjustmentType),
  reason: z.nativeEnum(StockAdjustmentReason),
  notes: z.string().optional(),
  items: z.array(createAdjustmentItemSchema).min(1, 'At least one adjustment item is required'),
});

export const adjustmentQuerySchema = z.object({
  schoolId: z.string().optional(),
  storeId: z.string().optional(),
  status: z.nativeEnum(StockAdjustmentStatus).optional(),
  reason: z.nativeEnum(StockAdjustmentReason).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================================================
// 11. Stocktakes
// ============================================================================

export const createStocktakeSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  storeId: z.string().min(1, 'Store ID is required'),
  locationId: z.string().optional().nullable(),
  startDate: z.string().default(() => new Date().toISOString()),
  notes: z.string().optional(),
});

export const recordStocktakeCountItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  systemQuantity: z.number().min(0).optional(),
  countedQuantity: z.number().min(0),
  varianceCostMinorUnits: z.number().int().default(0),
  notes: z.string().optional(),
});

export const recordStocktakeCountSchema = z.object({
  items: z.array(recordStocktakeCountItemSchema).min(1, 'At least one count item is required'),
});

export const stocktakeQuerySchema = z.object({
  schoolId: z.string().optional(),
  storeId: z.string().optional(),
  status: z.nativeEnum(StocktakeStatus).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================================================
// 12. Durable Assets
// ============================================================================

export const createAssetSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  itemId: z.string().min(1, 'Item ID is required'),
  assetTag: z.string().min(1, 'Asset Tag is required').trim().toUpperCase(),
  serialNumber: z.string().optional().nullable(),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  purchaseDate: z.string().optional().nullable(),
  purchaseCostMinorUnits: z.number().int().min(0).optional(),
  costMinorUnits: z.number().int().min(0).optional(),
  warrantyStartDate: z.string().optional().nullable(),
  warrantyEndDate: z.string().optional().nullable(),
  currentStoreId: z.string().optional().nullable(),
  currentLocationId: z.string().optional().nullable(),
  assignedToType: z.nativeEnum(AssetAssignmentType).default(AssetAssignmentType.NONE),
  status: z.nativeEnum(AssetStatus).default(AssetStatus.AVAILABLE),
  condition: z.nativeEnum(AssetCondition).default(AssetCondition.NEW),
  notes: z.string().optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

export const assetQuerySchema = z.object({
  schoolId: z.string().optional(),
  itemId: z.string().optional(),
  currentStoreId: z.string().optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  condition: z.nativeEnum(AssetCondition).optional(),
  assignedToType: z.nativeEnum(AssetAssignmentType).optional(),
  assignedToId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export const assignAssetSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  assignedToType: z.nativeEnum(AssetAssignmentType),
  assignedToId: z.string().min(1, 'Assigned to target ID is required'),
  conditionOnAssignment: z.nativeEnum(AssetCondition).default(AssetCondition.GOOD),
  remarks: z.string().optional(),
});

export const returnAssetSchema = z.object({
  returnDate: z.string().default(() => new Date().toISOString()),
  conditionOnReturn: z.nativeEnum(AssetCondition),
  returnStoreId: z.string().optional().nullable(),
  returnLocationId: z.string().optional().nullable(),
  remarks: z.string().optional(),
});

export const transferAssetSchema = z.object({
  assignedToType: z.nativeEnum(AssetAssignmentType),
  assignedToId: z.string().min(1, 'Target ID is required'),
  remarks: z.string().optional(),
});

export const logMaintenanceSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  maintenanceType: z.nativeEnum(AssetMaintenanceType).optional().default(AssetMaintenanceType.REPAIR),
  title: z.string().optional(),
  description: z.string().optional(),
  scheduledDate: z.string().default(() => new Date().toISOString()),
  vendorSupplierId: z.string().optional().nullable(),
  costMinorUnits: z.number().int().min(0).default(0),
  status: z.nativeEnum(AssetMaintenanceStatus).default(AssetMaintenanceStatus.SCHEDULED),
  notes: z.string().optional(),
});

export const updateMaintenanceStatusSchema = z.object({
  status: z.nativeEnum(AssetMaintenanceStatus).optional(),
  completedDate: z.string().optional().nullable(),
  resolution: z.string().optional(),
  notes: z.string().optional(),
  costMinorUnits: z.number().int().min(0).optional(),
});

export const maintenanceQuerySchema = z.object({
  schoolId: z.string().optional(),
  assetId: z.string().optional(),
  status: z.nativeEnum(AssetMaintenanceStatus).optional(),
  maintenanceType: z.nativeEnum(AssetMaintenanceType).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export const disposeAssetSchema = z.object({
  disposalDate: z.string().default(() => new Date().toISOString()),
  reason: z.nativeEnum(AssetDisposalReason).optional(),
  disposalReason: z.string().optional(),
  method: z.nativeEnum(AssetDisposalMethod).optional(),
  disposalMethod: z.string().optional(),
  saleProceedsMinorUnits: z.number().int().min(0).optional(),
  salvageValueMinorUnits: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

// ============================================================================
// 13. Settings & Reports
// ============================================================================

export const updateSettingsSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  defaultValuationMethod: z.nativeEnum(InventoryValuationMethod).optional(),
  allowNegativeStock: z.boolean().optional(),
  enforceExpiryOnIssue: z.boolean().optional(),
  nearExpiryThresholdDays: z.number().min(1).optional(),
  autoGenerateAssetTag: z.boolean().optional(),
  assetTagPrefix: z.string().optional(),
  receiptNumberPrefix: z.string().optional(),
  issueNumberPrefix: z.string().optional(),
  transferNumberPrefix: z.string().optional(),
  adjustmentNumberPrefix: z.string().optional(),
  stocktakeNumberPrefix: z.string().optional(),
});
