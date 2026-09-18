import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
  createSuccessResponse,
  AuthenticationError,
  StockTransferStatus,
  StocktakeStatus,
  StockAdjustmentType,
  AssetMaintenanceStatus,
  AssetDisposalReason,
  AssetDisposalMethod,
} from '@edusphere/common';
import { InventoryCatalogService } from './services/inventory-catalog.service.js';
import { InventoryStoreService } from './services/inventory-store.service.js';
import { InventoryStockService } from './services/inventory-stock.service.js';
import { InventoryMovementService } from './services/inventory-movement.service.js';
import { InventoryStocktakeService } from './services/inventory-stocktake.service.js';
import { InventoryAssetService } from './services/inventory-asset.service.js';
import { InventoryReportsService } from './services/inventory-reports.service.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryQuerySchema,
  createUnitSchema,
  updateUnitSchema,
  unitQuerySchema,
  createSupplierSchema,
  updateSupplierSchema,
  supplierQuerySchema,
  createStoreSchema,
  updateStoreSchema,
  storeQuerySchema,
  createLocationSchema,
  updateLocationSchema,
  locationQuerySchema,
  createItemSchema,
  updateItemSchema,
  itemQuerySchema,
  stockQuerySchema,
  reserveStockSchema,
  createReceiptSchema,
  receiptQuerySchema,
  createIssueSchema,
  issueQuerySchema,
  createReturnSchema,
  returnQuerySchema,
  createTransferSchema,
  updateTransferStatusSchema,
  transferQuerySchema,
  createAdjustmentSchema,
  adjustmentQuerySchema,
  createStocktakeSchema,
  recordStocktakeCountSchema,
  stocktakeQuerySchema,
  createAssetSchema,
  updateAssetSchema,
  assetQuerySchema,
  assignAssetSchema,
  returnAssetSchema,
  transferAssetSchema,
  logMaintenanceSchema,
  updateMaintenanceStatusSchema,
  maintenanceQuerySchema,
  disposeAssetSchema,
  updateSettingsSchema,
} from './inventory.validator.js';

export class InventoryController {
  private static getAuth(req: Request) {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }
    const tenantId = new Types.ObjectId(req.tenantContext?.tenantId || auth.tenantId);
    const userId = new Types.ObjectId(auth.userId);
    const schoolId = (req.query.schoolId as string) || (req.body?.schoolId as string) || auth.schoolId;
    return { auth, tenantId, userId, schoolId };
  }

  private static reply(
    res: Response,
    req: Request,
    data: any,
    message = 'Operation completed successfully',
    status = 200
  ) {
    return res.status(status).json(
      createSuccessResponse(data, message, {
        requestId: (req as any).id,
      })
    );
  }

  // =========================================================================
  // 1. Dashboard & Reports
  // =========================================================================

  public static async getDashboardKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = InventoryController.getAuth(req);
      const data = await InventoryReportsService.getDashboardKPIs(tenantId, schoolId);
      return InventoryController.reply(res, req, data, 'Inventory dashboard KPIs retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getStockLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryReportsService.getStockLedger(tenantId, req.query as any);
      return InventoryController.reply(res, req, data, 'Stock ledger retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getStockValuationReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = InventoryController.getAuth(req);
      const data = await InventoryReportsService.getStockValuationReport(tenantId, schoolId);
      return InventoryController.reply(res, req, data, 'Stock valuation report generated');
    } catch (err) {
      next(err);
    }
  }

  public static async getAssetAuditReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = InventoryController.getAuth(req);
      const data = await InventoryReportsService.getAssetAuditReport(tenantId, schoolId);
      return InventoryController.reply(res, req, data, 'Asset audit report generated');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 2. Categories
  // =========================================================================

  public static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = InventoryController.getAuth(req);
      const validated = createCategorySchema.parse({ ...req.body, schoolId: req.body.schoolId || schoolId });
      const data = await InventoryCatalogService.createCategory(tenantId, validated);
      return InventoryController.reply(res, req, data, 'Inventory category created', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const validated = updateCategorySchema.parse(req.body);
      const data = await InventoryCatalogService.updateCategory(tenantId, req.params.id, validated);
      return InventoryController.reply(res, req, data, 'Inventory category updated');
    } catch (err) {
      next(err);
    }
  }

  public static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const query = categoryQuerySchema.parse(req.query);
      const data = await InventoryCatalogService.getCategories(tenantId, query);
      return InventoryController.reply(res, req, data, 'Inventory categories retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryCatalogService.getCategoryById(tenantId, req.params.id);
      return InventoryController.reply(res, req, data, 'Inventory category details retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = InventoryController.getAuth(req);
      await InventoryCatalogService.deleteCategory(tenantId, req.params.id, userId);
      return InventoryController.reply(res, req, null, 'Inventory category deleted');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 3. Units
  // =========================================================================

  public static async createUnit(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = InventoryController.getAuth(req);
      const validated = createUnitSchema.parse({ ...req.body, schoolId: req.body.schoolId || schoolId });
      const data = await InventoryCatalogService.createUnit(tenantId, validated);
      return InventoryController.reply(res, req, data, 'Inventory unit created', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateUnit(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const validated = updateUnitSchema.parse(req.body);
      const data = await InventoryCatalogService.updateUnit(tenantId, req.params.id, validated);
      return InventoryController.reply(res, req, data, 'Inventory unit updated');
    } catch (err) {
      next(err);
    }
  }

  public static async getUnits(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const query = unitQuerySchema.parse(req.query);
      const data = await InventoryCatalogService.getUnits(tenantId, query);
      return InventoryController.reply(res, req, data, 'Inventory units retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getUnitById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryCatalogService.getUnitById(tenantId, req.params.id);
      return InventoryController.reply(res, req, data, 'Inventory unit details retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async deleteUnit(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = InventoryController.getAuth(req);
      await InventoryCatalogService.deleteUnit(tenantId, req.params.id, userId);
      return InventoryController.reply(res, req, null, 'Inventory unit deleted');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 4. Suppliers
  // =========================================================================

  public static async createSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = InventoryController.getAuth(req);
      const validated = createSupplierSchema.parse({ ...req.body, schoolId: req.body.schoolId || schoolId });
      const data = await InventoryCatalogService.createSupplier(tenantId, validated);
      return InventoryController.reply(res, req, data, 'Supplier created', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const validated = updateSupplierSchema.parse(req.body);
      const data = await InventoryCatalogService.updateSupplier(tenantId, req.params.id, validated);
      return InventoryController.reply(res, req, data, 'Supplier updated');
    } catch (err) {
      next(err);
    }
  }

  public static async getSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const query = supplierQuerySchema.parse(req.query);
      const data = await InventoryCatalogService.getSuppliers(tenantId, query);
      return InventoryController.reply(res, req, data, 'Suppliers retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getSupplierById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryCatalogService.getSupplierById(tenantId, req.params.id);
      return InventoryController.reply(res, req, data, 'Supplier details retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async deleteSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = InventoryController.getAuth(req);
      await InventoryCatalogService.deleteSupplier(tenantId, req.params.id, userId);
      return InventoryController.reply(res, req, null, 'Supplier deleted');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 5. Stores & Locations
  // =========================================================================

  public static async createStore(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = InventoryController.getAuth(req);
      const validated = createStoreSchema.parse({ ...req.body, schoolId: req.body.schoolId || schoolId });
      const data = await InventoryStoreService.createStore(tenantId, validated);
      return InventoryController.reply(res, req, data, 'Store created', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateStore(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const validated = updateStoreSchema.parse(req.body);
      const data = await InventoryStoreService.updateStore(tenantId, req.params.id, validated);
      return InventoryController.reply(res, req, data, 'Store updated');
    } catch (err) {
      next(err);
    }
  }

  public static async getStores(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const query = storeQuerySchema.parse(req.query);
      const data = await InventoryStoreService.getStores(tenantId, query);
      return InventoryController.reply(res, req, data, 'Stores retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getStoreById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryStoreService.getStoreById(tenantId, req.params.id);
      return InventoryController.reply(res, req, data, 'Store details retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async deleteStore(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = InventoryController.getAuth(req);
      await InventoryStoreService.deleteStore(tenantId, req.params.id, userId);
      return InventoryController.reply(res, req, null, 'Store deleted');
    } catch (err) {
      next(err);
    }
  }

  public static async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = InventoryController.getAuth(req);
      const storeId = req.params.storeId || req.body.storeId;
      const validated = createLocationSchema.parse({
        ...req.body,
        schoolId: req.body.schoolId || schoolId,
        storeId,
      });
      const data = await InventoryStoreService.createLocation(tenantId, validated);
      return InventoryController.reply(res, req, data, 'Store location created', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const validated = updateLocationSchema.parse(req.body);
      const data = await InventoryStoreService.updateLocation(tenantId, req.params.id, validated);
      return InventoryController.reply(res, req, data, 'Store location updated');
    } catch (err) {
      next(err);
    }
  }

  public static async getLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const storeId = req.params.storeId || req.query.storeId;
      const query = locationQuerySchema.parse({
        ...req.query,
        ...(storeId ? { storeId } : {}),
      });
      const data = await InventoryStoreService.getLocations(tenantId, query);
      return InventoryController.reply(res, req, data, 'Store locations retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async deleteLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = InventoryController.getAuth(req);
      await InventoryStoreService.deleteLocation(tenantId, req.params.id, userId);
      return InventoryController.reply(res, req, null, 'Store location deleted');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 6. Catalog Items
  // =========================================================================

  public static async createItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = InventoryController.getAuth(req);
      const validated = createItemSchema.parse({ ...req.body, schoolId: req.body.schoolId || schoolId });
      const data = await InventoryCatalogService.createItem(tenantId, validated);
      return InventoryController.reply(res, req, data, 'Catalog item created', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const validated = updateItemSchema.parse(req.body);
      const data = await InventoryCatalogService.updateItem(tenantId, req.params.id, validated);
      return InventoryController.reply(res, req, data, 'Catalog item updated');
    } catch (err) {
      next(err);
    }
  }

  public static async getItems(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const query = itemQuerySchema.parse(req.query);
      const data = await InventoryCatalogService.getItems(tenantId, query);
      return InventoryController.reply(res, req, data, 'Catalog items retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getItemById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryCatalogService.getItemById(tenantId, req.params.id);
      return InventoryController.reply(res, req, data, 'Catalog item details retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async deleteItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = InventoryController.getAuth(req);
      await InventoryCatalogService.deleteItem(tenantId, req.params.id, userId);
      return InventoryController.reply(res, req, null, 'Catalog item deleted');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 7. Stock & Reservations
  // =========================================================================

  public static async getStockLevels(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const query = stockQuerySchema.parse(req.query);
      const data = await InventoryStockService.getStockLevels(tenantId, query);
      return InventoryController.reply(res, req, data, 'Stock levels retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async reserveStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId, schoolId } = InventoryController.getAuth(req);
      const validated = reserveStockSchema.parse({ ...req.body, schoolId: req.body.schoolId || schoolId });
      const data = await InventoryStockService.reserveStock(tenantId, userId, validated);
      return InventoryController.reply(res, req, data, 'Stock reserved successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async releaseReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryStockService.releaseReservation(tenantId, req.params.id);
      return InventoryController.reply(res, req, data, 'Reservation cancelled');
    } catch (err) {
      next(err);
    }
  }

  public static async getReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryStockService.getReservations(tenantId, req.query as any);
      return InventoryController.reply(res, req, data, 'Stock reservations retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getBatches(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryStockService.getBatches(tenantId, req.query as any);
      return InventoryController.reply(res, req, data, 'Stock batches retrieved');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 8. Stock Receipts
  // =========================================================================

  public static async createReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId, schoolId } = InventoryController.getAuth(req);
      const validated = createReceiptSchema.parse({ ...req.body, schoolId: req.body.schoolId || schoolId });
      const data = await InventoryMovementService.createReceipt(tenantId, userId, validated);
      return InventoryController.reply(res, req, data, 'Stock shipment received successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getReceipts(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const query = receiptQuerySchema.parse(req.query);
      const data = await InventoryMovementService.getReceipts(tenantId, query);
      return InventoryController.reply(res, req, data, 'Stock receipts retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getReceiptById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryMovementService.getReceiptById(tenantId, req.params.id);
      return InventoryController.reply(res, req, data, 'Receipt details retrieved');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 9. Stock Issues
  // =========================================================================

  public static async createIssue(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId, schoolId } = InventoryController.getAuth(req);
      const validated = createIssueSchema.parse({ ...req.body, schoolId: req.body.schoolId || schoolId });
      const data = await InventoryMovementService.createIssue(tenantId, userId, validated);
      return InventoryController.reply(res, req, data, 'Stock issued successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getIssues(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const query = issueQuerySchema.parse(req.query);
      const data = await InventoryMovementService.getIssues(tenantId, query);
      return InventoryController.reply(res, req, data, 'Stock issues retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getIssueById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryMovementService.getIssueById(tenantId, req.params.id);
      return InventoryController.reply(res, req, data, 'Issue details retrieved');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 10. Stock Returns
  // =========================================================================

  public static async createReturn(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId, schoolId } = InventoryController.getAuth(req);
      const validated = createReturnSchema.parse({ ...req.body, schoolId: req.body.schoolId || schoolId });
      const data = await InventoryMovementService.createReturn(tenantId, userId, validated);
      return InventoryController.reply(res, req, data, 'Stock returned successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getReturns(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const query = returnQuerySchema.parse(req.query);
      const data = await InventoryMovementService.getReturns(tenantId, query);
      return InventoryController.reply(res, req, data, 'Stock returns retrieved');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 11. Stock Transfers
  // =========================================================================

  public static async createTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId, schoolId } = InventoryController.getAuth(req);
      const sourceStoreId = req.body.sourceStoreId || req.body.fromStoreId;
      const destinationStoreId = req.body.destinationStoreId || req.body.toStoreId;
      const notes = req.body.notes || req.body.reason;
      const items = (req.body.items || []).map((i: any) => ({
        itemId: i.itemId,
        quantity: i.quantity ?? i.requestedQuantity,
        batchId: i.batchId,
      }));
      const validated = createTransferSchema.parse({
        ...req.body,
        schoolId: req.body.schoolId || schoolId,
        sourceStoreId,
        destinationStoreId,
        notes,
        items,
      });
      const data = await InventoryMovementService.createTransfer(tenantId, userId, validated);
      return InventoryController.reply(res, req, data, 'Stock transfer requested', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async dispatchTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = InventoryController.getAuth(req);
      const data = await InventoryMovementService.updateTransferStatus(
        tenantId,
        userId,
        req.params.id,
        StockTransferStatus.IN_TRANSIT,
        req.body?.remarks
      );
      return InventoryController.reply(res, req, data, 'Stock transfer dispatched');
    } catch (err) {
      next(err);
    }
  }

  public static async receiveTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = InventoryController.getAuth(req);
      const data = await InventoryMovementService.updateTransferStatus(
        tenantId,
        userId,
        req.params.id,
        StockTransferStatus.RECEIVED,
        req.body?.remarks
      );
      return InventoryController.reply(res, req, data, 'Stock transfer received');
    } catch (err) {
      next(err);
    }
  }

  public static async updateTransferStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = InventoryController.getAuth(req);
      const validated = updateTransferStatusSchema.parse(req.body);
      const data = await InventoryMovementService.updateTransferStatus(
        tenantId,
        userId,
        req.params.id,
        validated.status,
        validated.remarks
      );
      return InventoryController.reply(res, req, data, `Transfer status updated to ${validated.status}`);
    } catch (err) {
      next(err);
    }
  }

  public static async getTransfers(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const query = transferQuerySchema.parse(req.query);
      const data = await InventoryMovementService.getTransfers(tenantId, query);
      return InventoryController.reply(res, req, data, 'Stock transfers retrieved');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 12. Stock Adjustments
  // =========================================================================

  public static async createAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId, schoolId } = InventoryController.getAuth(req);
      let items = req.body.items;
      if (!items && req.body.itemId) {
        const qty = req.body.quantity || 1;
        const change = req.body.adjustmentType === StockAdjustmentType.DECREASE ? -qty : qty;
        items = [
          {
            itemId: req.body.itemId,
            locationId: req.body.locationId,
            batchId: req.body.batchId,
            quantity: qty,
            quantityChange: change,
            currentQuantity: 0,
            newQuantity: 0,
            unitCostMinorUnits: req.body.unitCostMinorUnits || 0,
            reason: req.body.notes || req.body.reason,
          },
        ];
      }
      const validated = createAdjustmentSchema.parse({
        ...req.body,
        schoolId: req.body.schoolId || schoolId,
        items,
      });
      const data = await InventoryMovementService.createAdjustment(tenantId, userId, validated);
      return InventoryController.reply(res, req, data, 'Stock adjustment completed', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getAdjustments(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const query = adjustmentQuerySchema.parse(req.query);
      const data = await InventoryMovementService.getAdjustments(tenantId, query);
      return InventoryController.reply(res, req, data, 'Stock adjustments retrieved');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 13. Stocktakes
  // =========================================================================

  public static async createStocktake(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId, schoolId } = InventoryController.getAuth(req);
      const validated = createStocktakeSchema.parse({ ...req.body, schoolId: req.body.schoolId || schoolId });
      const data = await InventoryStocktakeService.createStocktake(tenantId, userId, validated);
      return InventoryController.reply(res, req, data, 'Stocktake session initiated', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async startStocktake(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryStocktakeService.getStocktakeById(tenantId, req.params.id);
      return InventoryController.reply(res, req, data, 'Stocktake started');
    } catch (err) {
      next(err);
    }
  }

  public static async recordStocktakeCount(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = InventoryController.getAuth(req);
      const itemsPayload = Array.isArray(req.body.items)
        ? req.body.items
        : req.body.itemId
        ? [req.body]
        : [];
      const validated = recordStocktakeCountSchema.parse({ items: itemsPayload });
      const data = await InventoryStocktakeService.recordCount(
        tenantId,
        userId,
        req.params.id,
        validated.items
      );
      return InventoryController.reply(res, req, data, 'Stocktake counts recorded');
    } catch (err) {
      next(err);
    }
  }

  public static async reviewStocktake(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryStocktakeService.getStocktakeById(tenantId, req.params.id);
      data.status = StocktakeStatus.REVIEW;
      await (data as any).save();
      return InventoryController.reply(res, req, data, 'Stocktake under review');
    } catch (err) {
      next(err);
    }
  }

  public static async reconcileStocktake(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = InventoryController.getAuth(req);
      const data = await InventoryStocktakeService.reconcileStocktake(tenantId, userId, req.params.id);
      return InventoryController.reply(res, req, data, 'Stocktake reconciled and variances adjusted');
    } catch (err) {
      next(err);
    }
  }

  public static async getStocktakes(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const query = stocktakeQuerySchema.parse(req.query);
      const data = await InventoryStocktakeService.getStocktakes(tenantId, query);
      return InventoryController.reply(res, req, data, 'Stocktake sessions retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getStocktakeById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryStocktakeService.getStocktakeById(tenantId, req.params.id);
      return InventoryController.reply(res, req, data, 'Stocktake details retrieved');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 14. Durable Assets
  // =========================================================================

  public static async createAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = InventoryController.getAuth(req);
      const validated = createAssetSchema.parse({ ...req.body, schoolId: req.body.schoolId || schoolId });
      const data = await InventoryAssetService.createAsset(tenantId, validated);
      return InventoryController.reply(res, req, data, 'Durable asset registered', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const validated = updateAssetSchema.parse(req.body);
      const data = await InventoryAssetService.updateAsset(tenantId, req.params.id, validated);
      return InventoryController.reply(res, req, data, 'Durable asset updated');
    } catch (err) {
      next(err);
    }
  }

  public static async getAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const query = assetQuerySchema.parse(req.query);
      const data = await InventoryAssetService.getAssets(tenantId, query);
      return InventoryController.reply(res, req, data, 'Durable assets retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getAssetById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const data = await InventoryAssetService.getAssetById(tenantId, req.params.id);
      return InventoryController.reply(res, req, data, 'Asset details retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async assignAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId, schoolId } = InventoryController.getAuth(req);
      const validated = assignAssetSchema.parse({ ...req.body, schoolId: req.body.schoolId || schoolId });
      const data = await InventoryAssetService.assignAsset(tenantId, userId, req.params.id, validated);
      return InventoryController.reply(res, req, data, 'Asset assigned successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async returnAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = InventoryController.getAuth(req);
      const validated = returnAssetSchema.parse(req.body);
      const data = await InventoryAssetService.returnAsset(tenantId, userId, req.params.id, validated);
      return InventoryController.reply(res, req, data, 'Asset returned successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async transferAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = InventoryController.getAuth(req);
      const validated = transferAssetSchema.parse(req.body);
      const data = await InventoryAssetService.transferAsset(tenantId, userId, req.params.id, validated);
      return InventoryController.reply(res, req, data, 'Asset custody transferred successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async logMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = InventoryController.getAuth(req);
      const validated = logMaintenanceSchema.parse({ ...req.body, schoolId: req.body.schoolId || schoolId });
      const description = validated.description || validated.title || 'Scheduled maintenance';
      const data = await InventoryAssetService.logMaintenance(tenantId, req.params.id, {
        ...validated,
        description,
      });
      return InventoryController.reply(res, req, data, 'Asset maintenance logged', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateMaintenanceStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const validated = updateMaintenanceStatusSchema.parse(req.body);
      const data = await InventoryAssetService.updateMaintenanceStatus(tenantId, req.params.id, {
        ...validated,
        status: validated.status || AssetMaintenanceStatus.COMPLETED,
      });
      return InventoryController.reply(res, req, data, 'Maintenance status updated');
    } catch (err) {
      next(err);
    }
  }

  public static async getMaintenances(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = InventoryController.getAuth(req);
      const query = maintenanceQuerySchema.parse(req.query);
      const data = await InventoryAssetService.getMaintenances(tenantId, query);
      return InventoryController.reply(res, req, data, 'Asset maintenance logs retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async disposeAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = InventoryController.getAuth(req);
      const validated = disposeAssetSchema.parse(req.body);
      let reason: AssetDisposalReason = AssetDisposalReason.OTHER;
      if (validated.reason && Object.values(AssetDisposalReason).includes(validated.reason)) {
        reason = validated.reason;
      } else if (validated.disposalReason && Object.values(AssetDisposalReason).includes(validated.disposalReason as any)) {
        reason = validated.disposalReason as AssetDisposalReason;
      }

      let method: AssetDisposalMethod = AssetDisposalMethod.OTHER;
      if (validated.method && Object.values(AssetDisposalMethod).includes(validated.method)) {
        method = validated.method;
      } else if (validated.disposalMethod && Object.values(AssetDisposalMethod).includes(validated.disposalMethod as any)) {
        method = validated.disposalMethod as AssetDisposalMethod;
      }

      const notes = validated.notes || validated.disposalReason || 'Asset decommissioned';
      const saleProceedsMinorUnits = validated.saleProceedsMinorUnits ?? validated.salvageValueMinorUnits ?? 0;
      const data = await InventoryAssetService.disposeAsset(tenantId, userId, req.params.id, {
        disposalDate: validated.disposalDate,
        reason,
        method,
        notes,
        saleProceedsMinorUnits,
      });
      return InventoryController.reply(res, req, data, 'Asset disposed and decommissioned');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 15. Settings
  // =========================================================================

  public static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = InventoryController.getAuth(req);
      const data = await InventoryReportsService.getSettings(tenantId, schoolId || '');
      return InventoryController.reply(res, req, data, 'Inventory settings retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = InventoryController.getAuth(req);
      const validated = updateSettingsSchema.parse({ ...req.body, schoolId: req.body.schoolId || schoolId });
      const data = await InventoryReportsService.updateSettings(tenantId, schoolId || '', validated);
      return InventoryController.reply(res, req, data, 'Inventory settings updated');
    } catch (err) {
      next(err);
    }
  }
}
