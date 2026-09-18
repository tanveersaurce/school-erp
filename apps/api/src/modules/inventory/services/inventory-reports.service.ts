import { Types } from 'mongoose';
import {
  InventoryItem,
  InventoryStore,
  InventoryStock,
  InventoryStockLedger,
  InventoryAsset,
  InventoryTransfer,
  InventorySetting,
  IInventorySettingDoc,
} from '@edusphere/database';
import {
  Money,
  StockTransferStatus,
  AssetStatus,
  InventoryValuationMethod,
} from '@edusphere/common';

export class InventoryReportsService {
  public static async getDashboardKPIs(
    tenantId: Types.ObjectId,
    schoolId?: string
  ) {
    const schoolQuery: any = { tenantId };
    if (schoolId) schoolQuery.schoolId = new Types.ObjectId(schoolId);

    const [
      totalItems,
      totalStores,
      totalAssets,
      activeAssets,
      pendingTransfers,
      stocks,
      recentMovements,
    ] = await Promise.all([
      InventoryItem.countDocuments(schoolQuery),
      InventoryStore.countDocuments(schoolQuery),
      InventoryAsset.countDocuments(schoolQuery),
      InventoryAsset.countDocuments({ ...schoolQuery, status: AssetStatus.AVAILABLE }),
      InventoryTransfer.countDocuments({ ...schoolQuery, status: StockTransferStatus.REQUESTED }),
      InventoryStock.find(schoolQuery),
      InventoryStockLedger.find(schoolQuery)
        .populate('itemId', 'name itemCode')
        .populate('storeId', 'name code')
        .populate('actorUserId', 'firstName lastName')
        .sort({ timestamp: -1 })
        .limit(10),
    ]);

    let totalValuationMinorUnits = 0;
    let lowStockAlertsCount = 0;
    let outOfStockCount = 0;

    for (const stock of stocks) {
      const val = Money.multiply(stock.averageCostMinorUnits || 0, stock.quantityOnHand);
      totalValuationMinorUnits = Money.add(totalValuationMinorUnits, val);

      if (stock.quantityOnHand <= 0) {
        outOfStockCount++;
      } else if (stock.quantityOnHand <= stock.reorderLevel) {
        lowStockAlertsCount++;
      }
    }

    return {
      totalItems,
      totalStores,
      totalValuationMinorUnits,
      totalAssets,
      activeAssets,
      lowStockAlertsCount,
      outOfStockCount,
      pendingTransfersCount: pendingTransfers,
      recentMovements,
    };
  }

  public static async getStockLedger(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      storeId?: string;
      itemId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.storeId) query.storeId = new Types.ObjectId(filter.storeId);
    if (filter.itemId) query.itemId = new Types.ObjectId(filter.itemId);
    if (filter.startDate || filter.endDate) {
      query.timestamp = {};
      if (filter.startDate) query.timestamp.$gte = new Date(filter.startDate);
      if (filter.endDate) query.timestamp.$lte = new Date(filter.endDate);
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryStockLedger.find(query)
        .populate('itemId', 'name itemCode unitId')
        .populate('storeId', 'name code')
        .populate('locationId', 'name code')
        .populate('actorUserId', 'firstName lastName')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      InventoryStockLedger.countDocuments(query),
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

  public static async getStockValuationReport(
    tenantId: Types.ObjectId,
    schoolId?: string
  ) {
    const query: any = { tenantId };
    if (schoolId) query.schoolId = new Types.ObjectId(schoolId);

    const stocks = await InventoryStock.find(query)
      .populate('itemId', 'name itemCode categoryId unitId')
      .populate('storeId', 'name code');

    const byStore: Record<string, { storeName: string; totalItems: number; totalValuationMinorUnits: number }> = {};
    let grandTotalMinorUnits = 0;

    for (const s of stocks) {
      const storeName = (s.storeId as any)?.name || 'Unknown Store';
      const storeIdStr = s.storeId.toString();

      if (!byStore[storeIdStr]) {
        byStore[storeIdStr] = { storeName, totalItems: 0, totalValuationMinorUnits: 0 };
      }

      const val = Money.multiply(s.averageCostMinorUnits || 0, s.quantityOnHand);
      byStore[storeIdStr].totalItems += 1;
      byStore[storeIdStr].totalValuationMinorUnits = Money.add(
        byStore[storeIdStr].totalValuationMinorUnits,
        val
      );
      grandTotalMinorUnits = Money.add(grandTotalMinorUnits, val);
    }

    const itemDetails = stocks.map((s) => ({
      _id: s._id,
      itemId: s.itemId,
      storeId: s.storeId,
      quantityOnHand: s.quantityOnHand,
      averageCostMinorUnits: s.averageCostMinorUnits,
      valuationMinorUnits: Money.multiply(s.averageCostMinorUnits || 0, s.quantityOnHand),
    }));

    return {
      grandTotalMinorUnits,
      stores: Object.values(byStore),
      items: itemDetails,
      valuationMethod: InventoryValuationMethod.WEIGHTED_AVERAGE,
    };
  }

  public static async getAssetAuditReport(
    tenantId: Types.ObjectId,
    schoolId?: string
  ) {
    const query: any = { tenantId };
    if (schoolId) query.schoolId = new Types.ObjectId(schoolId);

    const assets = await InventoryAsset.find(query)
      .populate('itemId', 'name itemCode')
      .populate('currentStoreId', 'name code');

    const byStatus: Record<string, number> = {};
    const byCondition: Record<string, number> = {};
    let totalAcquisitionCostMinorUnits = 0;

    for (const a of assets) {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      byCondition[a.condition] = (byCondition[a.condition] || 0) + 1;
      totalAcquisitionCostMinorUnits = Money.add(
        totalAcquisitionCostMinorUnits,
        a.purchaseCostMinorUnits || 0
      );
    }

    return {
      totalAssetsCount: assets.length,
      byStatus,
      byCondition,
      totalAcquisitionCostMinorUnits,
      assets,
    };
  }

  // =========================================================================
  // Settings
  // =========================================================================

  public static async getSettings(
    tenantId: Types.ObjectId,
    schoolId: string
  ): Promise<IInventorySettingDoc> {
    let settings = await InventorySetting.findOne({
      tenantId,
      schoolId: new Types.ObjectId(schoolId),
    });

    if (!settings) {
      settings = await InventorySetting.create({
        tenantId,
        schoolId: new Types.ObjectId(schoolId),
        defaultValuationMethod: InventoryValuationMethod.WEIGHTED_AVERAGE,
        allowNegativeStock: false,
        enforceExpiryOnIssue: true,
        nearExpiryThresholdDays: 30,
        autoGenerateAssetTag: true,
        assetTagPrefix: 'AST',
        receiptNumberPrefix: 'RCV',
        issueNumberPrefix: 'ISS',
        transferNumberPrefix: 'TRF',
        adjustmentNumberPrefix: 'ADJ',
        stocktakeNumberPrefix: 'STK',
      });
    }

    return settings;
  }

  public static async updateSettings(
    tenantId: Types.ObjectId,
    schoolId: string,
    data: Partial<{
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
    }>
  ): Promise<IInventorySettingDoc> {
    let settings = await InventorySetting.findOne({
      tenantId,
      schoolId: new Types.ObjectId(schoolId),
    });

    if (!settings) {
      settings = new InventorySetting({
        tenantId,
        schoolId: new Types.ObjectId(schoolId),
        ...data,
      });
    } else {
      if (data.defaultValuationMethod) settings.defaultValuationMethod = data.defaultValuationMethod;
      if (data.allowNegativeStock !== undefined) settings.allowNegativeStock = data.allowNegativeStock;
      if (data.enforceExpiryOnIssue !== undefined) settings.enforceExpiryOnIssue = data.enforceExpiryOnIssue;
      if (data.nearExpiryThresholdDays !== undefined) settings.nearExpiryThresholdDays = data.nearExpiryThresholdDays;
      if (data.autoGenerateAssetTag !== undefined) settings.autoGenerateAssetTag = data.autoGenerateAssetTag;
      if (data.assetTagPrefix !== undefined) settings.assetTagPrefix = data.assetTagPrefix;
      if (data.receiptNumberPrefix !== undefined) settings.receiptNumberPrefix = data.receiptNumberPrefix;
      if (data.issueNumberPrefix !== undefined) settings.issueNumberPrefix = data.issueNumberPrefix;
      if (data.transferNumberPrefix !== undefined) settings.transferNumberPrefix = data.transferNumberPrefix;
      if (data.adjustmentNumberPrefix !== undefined) settings.adjustmentNumberPrefix = data.adjustmentNumberPrefix;
      if (data.stocktakeNumberPrefix !== undefined) settings.stocktakeNumberPrefix = data.stocktakeNumberPrefix;
    }

    await (settings as any).save();
    return settings;
  }
}
