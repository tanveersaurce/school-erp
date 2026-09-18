import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission, requireAnyPermission } from '../../middlewares/authorize.js';
import { InventoryController } from './inventory.controller.js';

export const inventoryRouter = Router();

// All inventory routes require authentication
inventoryRouter.use(authenticate);

// =========================================================================
// 1. Dashboard & Reports
// =========================================================================
inventoryRouter.get(
  '/dashboard',
  requireAnyPermission(['inventory:read', 'inventory_report:read', 'inventory:manage']),
  InventoryController.getDashboardKPIs
);
inventoryRouter.get(
  '/reports/dashboard',
  requireAnyPermission(['inventory:read', 'inventory_report:read', 'inventory:manage']),
  InventoryController.getDashboardKPIs
);
inventoryRouter.get(
  '/reports/ledger',
  requireAnyPermission(['inventory:read', 'inventory_report:read', 'inventory:manage']),
  InventoryController.getStockLedger
);
inventoryRouter.get(
  '/reports/valuation',
  requireAnyPermission(['inventory:read', 'inventory_report:read', 'inventory:manage']),
  InventoryController.getStockValuationReport
);
inventoryRouter.get(
  '/reports/assets',
  requireAnyPermission(['inventory:read', 'inventory_report:read', 'inventory:manage']),
  InventoryController.getAssetAuditReport
);

// =========================================================================
// 2. Settings
// =========================================================================
inventoryRouter.get(
  '/settings',
  requireAnyPermission(['inventory:read', 'inventory:manage']),
  InventoryController.getSettings
);
inventoryRouter.put(
  '/settings',
  requirePermission('inventory:manage'),
  InventoryController.updateSettings
);

// =========================================================================
// 3. Categories
// =========================================================================
inventoryRouter.post(
  '/categories',
  requireAnyPermission(['inventory_item:create', 'inventory:manage']),
  InventoryController.createCategory
);
inventoryRouter.get(
  '/categories',
  requireAnyPermission(['inventory_item:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getCategories
);
inventoryRouter.get(
  '/categories/:id',
  requireAnyPermission(['inventory_item:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getCategoryById
);
inventoryRouter.put(
  '/categories/:id',
  requireAnyPermission(['inventory_item:update', 'inventory:manage']),
  InventoryController.updateCategory
);
inventoryRouter.delete(
  '/categories/:id',
  requireAnyPermission(['inventory_item:delete', 'inventory:manage']),
  InventoryController.deleteCategory
);

// =========================================================================
// 4. Units of Measurement
// =========================================================================
inventoryRouter.post(
  '/units',
  requireAnyPermission(['inventory_item:create', 'inventory:manage']),
  InventoryController.createUnit
);
inventoryRouter.get(
  '/units',
  requireAnyPermission(['inventory_item:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getUnits
);
inventoryRouter.get(
  '/units/:id',
  requireAnyPermission(['inventory_item:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getUnitById
);
inventoryRouter.put(
  '/units/:id',
  requireAnyPermission(['inventory_item:update', 'inventory:manage']),
  InventoryController.updateUnit
);
inventoryRouter.delete(
  '/units/:id',
  requireAnyPermission(['inventory_item:delete', 'inventory:manage']),
  InventoryController.deleteUnit
);

// =========================================================================
// 5. Suppliers / Vendors
// =========================================================================
inventoryRouter.post(
  '/suppliers',
  requireAnyPermission(['inventory_supplier:create', 'inventory_supplier:manage', 'inventory:manage']),
  InventoryController.createSupplier
);
inventoryRouter.get(
  '/suppliers',
  requireAnyPermission(['inventory_supplier:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getSuppliers
);
inventoryRouter.get(
  '/suppliers/:id',
  requireAnyPermission(['inventory_supplier:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getSupplierById
);
inventoryRouter.put(
  '/suppliers/:id',
  requireAnyPermission(['inventory_supplier:update', 'inventory_supplier:manage', 'inventory:manage']),
  InventoryController.updateSupplier
);
inventoryRouter.delete(
  '/suppliers/:id',
  requireAnyPermission(['inventory_supplier:manage', 'inventory:manage']),
  InventoryController.deleteSupplier
);

// =========================================================================
// 6. Stores & Locations
// =========================================================================
inventoryRouter.post(
  '/stores',
  requireAnyPermission(['inventory_store:create', 'inventory_store:manage', 'inventory:manage']),
  InventoryController.createStore
);
inventoryRouter.get(
  '/stores',
  requireAnyPermission(['inventory_store:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getStores
);
inventoryRouter.get(
  '/stores/:id',
  requireAnyPermission(['inventory_store:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getStoreById
);
inventoryRouter.put(
  '/stores/:id',
  requireAnyPermission(['inventory_store:update', 'inventory_store:manage', 'inventory:manage']),
  InventoryController.updateStore
);
inventoryRouter.delete(
  '/stores/:id',
  requireAnyPermission(['inventory_store:manage', 'inventory:manage']),
  InventoryController.deleteStore
);

inventoryRouter.post(
  '/locations',
  requireAnyPermission(['inventory_store:manage', 'inventory:manage']),
  InventoryController.createLocation
);
inventoryRouter.post(
  '/stores/:storeId/locations',
  requireAnyPermission(['inventory_store:manage', 'inventory:manage']),
  InventoryController.createLocation
);
inventoryRouter.get(
  '/locations',
  requireAnyPermission(['inventory_store:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getLocations
);
inventoryRouter.get(
  '/stores/:storeId/locations',
  requireAnyPermission(['inventory_store:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getLocations
);
inventoryRouter.put(
  '/locations/:id',
  requireAnyPermission(['inventory_store:manage', 'inventory:manage']),
  InventoryController.updateLocation
);
inventoryRouter.delete(
  '/locations/:id',
  requireAnyPermission(['inventory_store:manage', 'inventory:manage']),
  InventoryController.deleteLocation
);

// =========================================================================
// 7. Catalog Items
// =========================================================================
inventoryRouter.post(
  '/items',
  requireAnyPermission(['inventory_item:create', 'inventory:manage']),
  InventoryController.createItem
);
inventoryRouter.get(
  '/items',
  requireAnyPermission(['inventory_item:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getItems
);
inventoryRouter.get(
  '/items/:id',
  requireAnyPermission(['inventory_item:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getItemById
);
inventoryRouter.put(
  '/items/:id',
  requireAnyPermission(['inventory_item:update', 'inventory:manage']),
  InventoryController.updateItem
);
inventoryRouter.delete(
  '/items/:id',
  requireAnyPermission(['inventory_item:delete', 'inventory:manage']),
  InventoryController.deleteItem
);

// =========================================================================
// 8. Stock, Batches & Reservations
// =========================================================================
inventoryRouter.get(
  '/stock',
  requireAnyPermission(['stock:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getStockLevels
);
inventoryRouter.get(
  '/stock/batches',
  requireAnyPermission(['stock:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getBatches
);
inventoryRouter.get(
  '/stock/reservations',
  requireAnyPermission(['stock:read', 'stock:reserve', 'inventory:manage']),
  InventoryController.getReservations
);
inventoryRouter.post(
  '/stock/reserve',
  requireAnyPermission(['stock:reserve', 'inventory:manage']),
  InventoryController.reserveStock
);
inventoryRouter.delete(
  '/stock/reservations/:id',
  requireAnyPermission(['stock:reserve', 'inventory:manage']),
  InventoryController.releaseReservation
);

// =========================================================================
// 9. Stock Receipts
// =========================================================================
inventoryRouter.post(
  '/receipts',
  requireAnyPermission(['stock:receive', 'inventory:manage']),
  InventoryController.createReceipt
);
inventoryRouter.get(
  '/receipts',
  requireAnyPermission(['stock:read', 'stock:receive', 'inventory:manage']),
  InventoryController.getReceipts
);
inventoryRouter.get(
  '/receipts/:id',
  requireAnyPermission(['stock:read', 'stock:receive', 'inventory:manage']),
  InventoryController.getReceiptById
);

// =========================================================================
// 10. Stock Issues
// =========================================================================
inventoryRouter.post(
  '/issues',
  requireAnyPermission(['stock:issue', 'inventory:manage']),
  InventoryController.createIssue
);
inventoryRouter.get(
  '/issues',
  requireAnyPermission(['stock:read', 'stock:issue', 'inventory:manage']),
  InventoryController.getIssues
);
inventoryRouter.get(
  '/issues/:id',
  requireAnyPermission(['stock:read', 'stock:issue', 'inventory:manage']),
  InventoryController.getIssueById
);

// =========================================================================
// 11. Stock Returns
// =========================================================================
inventoryRouter.post(
  '/returns',
  requireAnyPermission(['stock:return', 'inventory:manage']),
  InventoryController.createReturn
);
inventoryRouter.get(
  '/returns',
  requireAnyPermission(['stock:read', 'stock:return', 'inventory:manage']),
  InventoryController.getReturns
);

// =========================================================================
// 12. Stock Transfers
// =========================================================================
inventoryRouter.post(
  '/transfers',
  requireAnyPermission(['stock:transfer', 'inventory:manage']),
  InventoryController.createTransfer
);
inventoryRouter.get(
  '/transfers',
  requireAnyPermission(['stock:read', 'stock:transfer', 'inventory:manage']),
  InventoryController.getTransfers
);
inventoryRouter.patch(
  '/transfers/:id/status',
  requireAnyPermission(['stock:transfer', 'inventory:manage']),
  InventoryController.updateTransferStatus
);
inventoryRouter.post(
  '/transfers/:id/dispatch',
  requireAnyPermission(['stock:transfer', 'inventory:manage']),
  InventoryController.dispatchTransfer
);
inventoryRouter.post(
  '/transfers/:id/receive',
  requireAnyPermission(['stock:transfer', 'inventory:manage']),
  InventoryController.receiveTransfer
);

// =========================================================================
// 13. Stock Adjustments
// =========================================================================
inventoryRouter.post(
  '/adjustments',
  requireAnyPermission(['stock:adjust', 'inventory:manage']),
  InventoryController.createAdjustment
);
inventoryRouter.get(
  '/adjustments',
  requireAnyPermission(['stock:read', 'stock:adjust', 'inventory:manage']),
  InventoryController.getAdjustments
);

// =========================================================================
// 14. Stocktakes
// =========================================================================
inventoryRouter.post(
  '/stocktakes',
  requireAnyPermission(['stocktake:create', 'inventory:manage']),
  InventoryController.createStocktake
);
inventoryRouter.get(
  '/stocktakes',
  requireAnyPermission(['stocktake:read', 'inventory:manage']),
  InventoryController.getStocktakes
);
inventoryRouter.get(
  '/stocktakes/:id',
  requireAnyPermission(['stocktake:read', 'inventory:manage']),
  InventoryController.getStocktakeById
);
inventoryRouter.post(
  '/stocktakes/:id/counts',
  requireAnyPermission(['stocktake:create', 'inventory:manage']),
  InventoryController.recordStocktakeCount
);
inventoryRouter.post(
  '/stocktakes/:id/items',
  requireAnyPermission(['stocktake:create', 'inventory:manage']),
  InventoryController.recordStocktakeCount
);
inventoryRouter.post(
  '/stocktakes/:id/start',
  requireAnyPermission(['stocktake:create', 'inventory:manage']),
  InventoryController.startStocktake
);
inventoryRouter.post(
  '/stocktakes/:id/review',
  requireAnyPermission(['stocktake:create', 'inventory:manage']),
  InventoryController.reviewStocktake
);
inventoryRouter.post(
  '/stocktakes/:id/reconcile',
  requireAnyPermission(['stocktake:approve', 'stocktake:close', 'inventory:manage']),
  InventoryController.reconcileStocktake
);
inventoryRouter.post(
  '/stocktakes/:id/approve',
  requireAnyPermission(['stocktake:approve', 'stocktake:close', 'inventory:manage']),
  InventoryController.reconcileStocktake
);

// =========================================================================
// 15. Durable Assets
// =========================================================================
inventoryRouter.post(
  '/assets',
  requireAnyPermission(['asset:create', 'inventory:manage']),
  InventoryController.createAsset
);
inventoryRouter.get(
  '/assets',
  requireAnyPermission(['asset:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getAssets
);
inventoryRouter.get(
  '/assets/:id',
  requireAnyPermission(['asset:read', 'inventory:read', 'inventory:manage']),
  InventoryController.getAssetById
);
inventoryRouter.put(
  '/assets/:id',
  requireAnyPermission(['asset:update', 'inventory:manage']),
  InventoryController.updateAsset
);
inventoryRouter.post(
  '/assets/:id/assign',
  requireAnyPermission(['asset:assign', 'inventory:manage']),
  InventoryController.assignAsset
);
inventoryRouter.post(
  '/assets/:id/return',
  requireAnyPermission(['asset:return', 'inventory:manage']),
  InventoryController.returnAsset
);
inventoryRouter.post(
  '/assets/:id/transfer',
  requireAnyPermission(['asset:transfer', 'inventory:manage']),
  InventoryController.transferAsset
);
inventoryRouter.post(
  '/assets/:id/maintenance',
  requireAnyPermission(['asset:maintenance', 'inventory:manage']),
  InventoryController.logMaintenance
);
inventoryRouter.post(
  '/assets/:id/dispose',
  requireAnyPermission(['asset:dispose', 'inventory:manage']),
  InventoryController.disposeAsset
);

// Maintenance logs list & status
inventoryRouter.get(
  '/maintenance',
  requireAnyPermission(['asset:maintenance', 'inventory:read', 'inventory:manage']),
  InventoryController.getMaintenances
);
inventoryRouter.patch(
  '/maintenance/:id/status',
  requireAnyPermission(['asset:maintenance', 'inventory:manage']),
  InventoryController.updateMaintenanceStatus
);
inventoryRouter.put(
  '/maintenance/:id',
  requireAnyPermission(['asset:maintenance', 'inventory:manage']),
  InventoryController.updateMaintenanceStatus
);
inventoryRouter.patch(
  '/maintenance/:id',
  requireAnyPermission(['asset:maintenance', 'inventory:manage']),
  InventoryController.updateMaintenanceStatus
);
