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

// ============================================================================
// 1. Categories & Units of Measurement
// ============================================================================

export interface IInventoryCategory {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  description?: string;
  parentCategoryId?: string | any;
  active: boolean;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IInventoryUnit {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  symbol: string;
  decimalPrecision: number;
  active: boolean;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 2. Suppliers / Vendors
// ============================================================================

export interface IInventorySupplier {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  active: boolean;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 3. Stores / Warehouses & Physical Locations
// ============================================================================

export interface IInventoryStore {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  campusId?: string | any;
  name: string;
  code: string;
  location?: string;
  managerEmployeeId?: string | any;
  status: InventoryStoreStatus;
  description?: string;
  active: boolean;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IInventoryLocation {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  storeId: string | any;
  parentLocationId?: string | any;
  name: string;
  code: string;
  type: InventoryLocationType;
  active: boolean;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 4. Inventory Catalog Items
// ============================================================================

export interface IInventoryItem {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  itemCode: string;
  name: string;
  description?: string;
  categoryId: string | any;
  unitId: string | any;
  itemType: InventoryItemType;
  brand?: string;
  model?: string;
  sku?: string;
  barcode?: string;
  reorderLevel: number;
  minimumStock: number;
  maximumStock?: number;
  preferredSupplierId?: string | any;
  trackBatch: boolean;
  trackExpiry: boolean;
  trackSerialNumber: boolean;
  active: boolean;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 5. Stock, Batches, Ledger & Reservations
// ============================================================================

export interface IInventoryStock {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  itemId: string | any;
  storeId: string | any;
  locationId?: string | any;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number; // onHand - reserved
  reorderLevel: number;
  averageCostMinorUnits: number;
  lastUpdated?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IInventoryStockBatch {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  itemId: string | any;
  storeId: string | any;
  batchNumber: string;
  manufacturingDate?: Date | string;
  expiryDate?: Date | string;
  quantityOnHand: number;
  quantityReserved: number;
  unitCostMinorUnits: number;
  supplierId?: string | any;
  receivedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IInventoryStockLedger {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  itemId: string | any;
  storeId: string | any;
  locationId?: string | any;
  batchId?: string | any;
  movementType: StockMovementType;
  quantity: number; // positive for incoming, negative for outgoing
  balanceAfter: number;
  unitCostMinorUnits: number;
  totalCostMinorUnits: number;
  referenceType?: string; // 'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER' | 'ADJUSTMENT' | 'STOCKTAKE'
  referenceId?: string;
  actorUserId: string | any;
  timestamp: Date | string;
  reason?: string;
  requestId?: string;
  createdAt?: Date | string;
}

export interface IInventoryStockReservation {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  itemId: string | any;
  storeId: string | any;
  quantity: number;
  reservedForType: string;
  reservedForId: string;
  expiresAt?: Date | string;
  status: StockReservationStatus;
  createdByUserId: string | any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 6. Stock Receipts
// ============================================================================

export interface IInventoryReceiptItem {
  itemId: string | any;
  quantity: number;
  unitCostMinorUnits: number;
  totalCostMinorUnits: number;
  batchNumber?: string;
  manufacturingDate?: Date | string;
  expiryDate?: Date | string;
  locationId?: string | any;
}

export interface IInventoryReceipt {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  receiptNumber: string;
  storeId: string | any;
  supplierId?: string | any;
  receiptDate: Date | string;
  referenceNumber?: string;
  items: IInventoryReceiptItem[];
  totalAmountMinorUnits: number;
  receivedByUserId: string | any;
  status: StockReceiptStatus;
  notes?: string;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 7. Stock Issues
// ============================================================================

export interface IInventoryIssueItem {
  itemId: string | any;
  quantity: number;
  batchId?: string | any;
  unitCostMinorUnits: number;
  totalCostMinorUnits: number;
}

export interface IInventoryIssue {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  issueNumber: string;
  storeId: string | any;
  destinationType: StockIssueDestinationType;
  destinationId: string;
  issueDate: Date | string;
  items: IInventoryIssueItem[];
  issuedByUserId: string | any;
  receivedByUserId?: string | any;
  purpose?: string;
  status: StockIssueStatus;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 8. Stock Returns
// ============================================================================

export interface IInventoryReturnItem {
  itemId: string | any;
  quantity: number;
  condition: string;
  reason?: string;
}

export interface IInventoryReturn {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  returnNumber: string;
  originalIssueId?: string | any;
  storeId: string | any;
  returnDate: Date | string;
  items: IInventoryReturnItem[];
  returnedByUserId?: string | any;
  receivedByUserId: string | any;
  reason?: string;
  status: StockReturnStatus;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 9. Stock Transfers
// ============================================================================

export interface IInventoryTransferItem {
  itemId: string | any;
  quantity: number;
  batchId?: string | any;
}

export interface IInventoryTransfer {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  transferNumber: string;
  sourceStoreId: string | any;
  destinationStoreId: string | any;
  sourceLocationId?: string | any;
  destinationLocationId?: string | any;
  items: IInventoryTransferItem[];
  requestedByUserId: string | any;
  approvedByUserId?: string | any;
  dispatchedAt?: Date | string;
  receivedAt?: Date | string;
  status: StockTransferStatus;
  notes?: string;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 10. Stock Adjustments & Stocktakes
// ============================================================================

export interface IInventoryAdjustmentItem {
  itemId: string | any;
  locationId?: string | any;
  batchId?: string | any;
  quantityChange: number; // positive or negative
  currentQuantity: number;
  newQuantity: number;
  unitCostMinorUnits: number;
  reason?: string;
}

export interface IInventoryAdjustment {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  adjustmentNumber: string;
  storeId: string | any;
  adjustmentType: StockAdjustmentType;
  reason: StockAdjustmentReason;
  status: StockAdjustmentStatus;
  items: IInventoryAdjustmentItem[];
  actorUserId: string | any;
  approvedByUserId?: string | any;
  approvedAt?: Date | string;
  notes?: string;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IInventoryStocktakeItem {
  itemId: string | any;
  systemQuantity: number;
  countedQuantity: number;
  variance: number; // counted - system
  varianceCostMinorUnits: number;
  notes?: string;
}

export interface IInventoryStocktake {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  stocktakeNumber: string;
  storeId: string | any;
  locationId?: string | any;
  status: StocktakeStatus;
  startDate: Date | string;
  endDate?: Date | string;
  items: IInventoryStocktakeItem[];
  countedByUserId?: string | any;
  approvedByUserId?: string | any;
  reconciledAdjustmentId?: string | any;
  notes?: string;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 11. Durable Assets, Assignments, Maintenance & Disposals
// ============================================================================

export interface IInventoryAsset {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  assetTag: string;
  itemId: string | any;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  purchaseDate?: Date | string;
  purchaseCostMinorUnits?: number;
  warrantyStartDate?: Date | string;
  warrantyEndDate?: Date | string;
  currentStoreId?: string | any;
  currentLocationId?: string | any;
  assignedToType: AssetAssignmentType;
  assignedToId?: string | any;
  assignmentDate?: Date | string;
  status: AssetStatus;
  condition: AssetCondition;
  notes?: string;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IInventoryAssetAssignment {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  assetId: string | any;
  assignedToType: AssetAssignmentType;
  assignedToId: string | any;
  assignedByUserId: string | any;
  assignedAt: Date | string;
  returnedAt?: Date | string;
  returnedByUserId?: string | any;
  conditionOnAssignment: AssetCondition;
  conditionOnReturn?: AssetCondition;
  remarks?: string;
  status: 'ACTIVE' | 'RETURNED' | 'TRANSFERRED';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IInventoryAssetMaintenance {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  assetId: string | any;
  maintenanceType: AssetMaintenanceType;
  reportedAt: Date | string;
  scheduledDate?: Date | string;
  completedDate?: Date | string;
  description: string;
  vendorSupplierId?: string | any;
  costMinorUnits?: number;
  status: AssetMaintenanceStatus;
  resolution?: string;
  performedBy?: string;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IInventoryAssetDisposal {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  assetId: string | any;
  disposalDate: Date | string;
  reason: AssetDisposalReason;
  method: AssetDisposalMethod;
  saleProceedsMinorUnits?: number;
  approvedByUserId: string | any;
  notes?: string;
  documentRef?: string;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 12. Settings & Dashboard KPIs
// ============================================================================

export interface IInventorySetting {
  id?: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  defaultValuationMethod: InventoryValuationMethod;
  allowNegativeStock: boolean;
  enforceExpiryOnIssue: boolean;
  nearExpiryThresholdDays: number;
  autoGenerateAssetTag: boolean;
  assetTagPrefix: string;
  receiptNumberPrefix: string;
  issueNumberPrefix: string;
  transferNumberPrefix: string;
  adjustmentNumberPrefix: string;
  stocktakeNumberPrefix: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IInventoryDashboardKPIs {
  totalItems: number;
  activeItems: number;
  totalStockQuantity: number;
  totalStockValuationMinorUnits: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  expiringStockCount: number;
  totalAssets: number;
  assignedAssets: number;
  availableAssets: number;
  maintenanceAssets: number;
  lostAssets: number;
  damagedAssets: number;
  pendingReceipts: number;
  pendingTransfers: number;
  openStocktakes: number;
}
