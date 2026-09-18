import { Types } from 'mongoose';
import {
  InventoryStocktake,
  InventoryStock,
  IInventoryStocktakeDoc,
} from '@edusphere/database';
import {
  NotFoundError,
  BadRequestError,
  StocktakeStatus,
  StockAdjustmentType,
  StockAdjustmentReason,
} from '@edusphere/common';
import { InventoryMovementService } from './inventory-movement.service.js';

export class InventoryStocktakeService {
  private static generateStocktakeNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `STK-${year}-${random}`;
  }

  public static async createStocktake(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    data: {
      schoolId: string;
      storeId: string;
      locationId?: string | null;
      startDate?: string;
      notes?: string;
    }
  ): Promise<IInventoryStocktakeDoc> {
    const stocktakeNumber = this.generateStocktakeNumber();

    // Query current stock levels to populate initial items to count
    const stockQuery: any = {
      tenantId,
      storeId: new Types.ObjectId(data.storeId),
    };
    if (data.locationId) {
      stockQuery.locationId = new Types.ObjectId(data.locationId);
    }

    const currentStocks = await InventoryStock.find(stockQuery);
    const initialItems = currentStocks.map((s) => ({
      itemId: s.itemId,
      systemQuantity: s.quantityOnHand,
      countedQuantity: s.quantityOnHand,
      variance: 0,
      varianceCostMinorUnits: 0,
    }));

    const stocktake = await InventoryStocktake.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      stocktakeNumber,
      storeId: new Types.ObjectId(data.storeId),
      locationId: data.locationId ? new Types.ObjectId(data.locationId) : undefined,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      status: StocktakeStatus.COUNTING,
      countedByUserId: userId,
      notes: data.notes,
      items: initialItems,
    });

    return stocktake;
  }

  public static async recordCount(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    stocktakeId: string,
    items: Array<{
      itemId: string;
      systemQuantity?: number;
      countedQuantity: number;
      varianceCostMinorUnits?: number;
      notes?: string;
    }>
  ): Promise<IInventoryStocktakeDoc> {
    const stocktake = await InventoryStocktake.findOne({
      _id: new Types.ObjectId(stocktakeId),
      tenantId,
    });

    if (!stocktake) {
      throw new NotFoundError('Stocktake audit session not found.');
    }

    if (stocktake.status !== StocktakeStatus.COUNTING && stocktake.status !== StocktakeStatus.DRAFT) {
      throw new BadRequestError(`Cannot record counts on a stocktake in state ${stocktake.status}.`);
    }

    const itemMap = new Map<string, any>();
    for (const it of stocktake.items || []) {
      itemMap.set(it.itemId.toString(), it);
    }

    for (const i of items) {
      let sysQty: number = i.systemQuantity ?? 0;
      if (i.systemQuantity === undefined || i.systemQuantity === null) {
        const existing = itemMap.get(i.itemId);
        if (existing && existing.systemQuantity !== undefined && existing.systemQuantity !== null) {
          sysQty = Number(existing.systemQuantity);
        } else {
          const currentStock = await InventoryStock.findOne({
            tenantId,
            storeId: stocktake.storeId,
            itemId: new Types.ObjectId(i.itemId),
          });
          sysQty = currentStock ? currentStock.quantityOnHand : 0;
        }
      }
      const variance = i.countedQuantity - sysQty;
      itemMap.set(i.itemId, {
        itemId: new Types.ObjectId(i.itemId),
        systemQuantity: sysQty,
        countedQuantity: i.countedQuantity,
        variance,
        varianceCostMinorUnits: i.varianceCostMinorUnits || 0,
        notes: i.notes,
      });
    }

    stocktake.items = Array.from(itemMap.values()) as any;

    stocktake.status = StocktakeStatus.REVIEW;
    stocktake.countedByUserId = userId;
    await (stocktake as any).save();

    return stocktake;
  }

  public static async reconcileStocktake(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    stocktakeId: string
  ): Promise<IInventoryStocktakeDoc> {
    const stocktake = await InventoryStocktake.findOne({
      _id: new Types.ObjectId(stocktakeId),
      tenantId,
    });

    if (!stocktake) {
      throw new NotFoundError('Stocktake audit session not found.');
    }

    if (stocktake.status === StocktakeStatus.CLOSED) {
      throw new BadRequestError('Stocktake is already closed and reconciled.');
    }

    // Filter items with non-zero variance
    const varianceItems = stocktake.items.filter((item) => item.variance !== 0);

    if (varianceItems.length > 0) {
      const positiveItems = varianceItems.filter((i) => i.variance > 0);
      const negativeItems = varianceItems.filter((i) => i.variance < 0);

      // Reconcile increments
      if (positiveItems.length > 0) {
        const adj = await InventoryMovementService.createAdjustment(tenantId, userId, {
          schoolId: stocktake.schoolId.toString(),
          storeId: stocktake.storeId.toString(),
          adjustmentType: StockAdjustmentType.INCREASE,
          reason: StockAdjustmentReason.PHYSICAL_COUNT,
          notes: `Automatic reconciliation from physical count ${stocktake.stocktakeNumber}`,
          items: positiveItems.map((v) => ({
            itemId: v.itemId.toString(),
            quantityChange: v.variance,
            currentQuantity: v.systemQuantity,
            newQuantity: v.countedQuantity,
            unitCostMinorUnits: Math.round(
              Math.abs(v.varianceCostMinorUnits || 0) / (Math.abs(v.variance) || 1)
            ),
            reason: v.notes || `Stocktake surplus of ${v.variance}`,
          })),
        });
        if (adj && (adj as any)._id) {
          stocktake.reconciledAdjustmentId = new Types.ObjectId((adj as any)._id.toString());
        }
      }

      // Reconcile decrements
      if (negativeItems.length > 0) {
        const adj = await InventoryMovementService.createAdjustment(tenantId, userId, {
          schoolId: stocktake.schoolId.toString(),
          storeId: stocktake.storeId.toString(),
          adjustmentType: StockAdjustmentType.DECREASE,
          reason: StockAdjustmentReason.PHYSICAL_COUNT,
          notes: `Automatic reconciliation from physical count ${stocktake.stocktakeNumber}`,
          items: negativeItems.map((v) => ({
            itemId: v.itemId.toString(),
            quantityChange: v.variance,
            currentQuantity: v.systemQuantity,
            newQuantity: v.countedQuantity,
            unitCostMinorUnits: Math.round(
              Math.abs(v.varianceCostMinorUnits || 0) / (Math.abs(v.variance) || 1)
            ),
            reason: v.notes || `Stocktake deficit of ${v.variance}`,
          })),
        });
        if (!stocktake.reconciledAdjustmentId && adj && (adj as any)._id) {
          stocktake.reconciledAdjustmentId = new Types.ObjectId((adj as any)._id.toString());
        }
      }
    }

    stocktake.status = StocktakeStatus.CLOSED;
    stocktake.approvedByUserId = userId;
    stocktake.endDate = new Date();
    await (stocktake as any).save();

    return stocktake;
  }

  public static async getStocktakes(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      storeId?: string;
      status?: StocktakeStatus;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.storeId) query.storeId = new Types.ObjectId(filter.storeId);
    if (filter.status) query.status = filter.status;

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryStocktake.find(query)
        .populate('storeId', 'name code')
        .populate('locationId', 'name code')
        .populate('countedByUserId', 'firstName lastName')
        .populate('approvedByUserId', 'firstName lastName')
        .populate('items.itemId', 'name itemCode')
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit),
      InventoryStocktake.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getStocktakeById(
    tenantId: Types.ObjectId,
    stocktakeId: string
  ): Promise<IInventoryStocktakeDoc> {
    const stocktake = await InventoryStocktake.findOne({
      _id: new Types.ObjectId(stocktakeId),
      tenantId,
    })
      .populate('storeId', 'name code')
      .populate('locationId', 'name code')
      .populate('countedByUserId', 'firstName lastName')
      .populate('approvedByUserId', 'firstName lastName')
      .populate('items.itemId', 'name itemCode unitId');
    if (!stocktake) {
      throw new NotFoundError('Stocktake audit session not found.');
    }
    return stocktake;
  }
}
