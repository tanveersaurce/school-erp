import { Types } from 'mongoose';
import {
  InventoryStock,
  InventoryStockBatch,
  InventoryStockReservation,
  IInventoryStockDoc,
  IInventoryStockBatchDoc,
  IInventoryStockReservationDoc,
} from '@edusphere/database';
import {
  NotFoundError,
  BadRequestError,
  StockReservationStatus,
} from '@edusphere/common';

export class InventoryStockService {
  public static async getStockLevels(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      storeId?: string;
      itemId?: string;
      lowStockOnly?: string;
      outOfStockOnly?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.storeId) query.storeId = new Types.ObjectId(filter.storeId);
    if (filter.itemId) query.itemId = new Types.ObjectId(filter.itemId);

    if (filter.outOfStockOnly === 'true') {
      query.quantityOnHand = { $lte: 0 };
    } else if (filter.lowStockOnly === 'true') {
      query.$expr = { $lte: ['$quantityOnHand', '$reorderLevel'] };
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryStock.find(query)
        .populate('itemId', 'name itemCode itemType sku brand model reorderLevel unitId')
        .populate('storeId', 'name code')
        .populate('locationId', 'name code type')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      InventoryStock.countDocuments(query),
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

  public static async getStockByStoreAndItem(
    tenantId: Types.ObjectId,
    storeId: string,
    itemId: string
  ): Promise<IInventoryStockDoc | null> {
    return InventoryStock.findOne({
      tenantId,
      storeId: new Types.ObjectId(storeId),
      itemId: new Types.ObjectId(itemId),
    })
      .populate('itemId', 'name itemCode itemType sku brand unitId')
      .populate('storeId', 'name code');
  }

  public static async reserveStock(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    data: {
      schoolId: string;
      itemId: string;
      storeId: string;
      quantity: number;
      reservedForType: string;
      reservedForId: string;
      expiresAt?: string | null;
    }
  ): Promise<IInventoryStockReservationDoc> {
    const stock = await InventoryStock.findOne({
      tenantId,
      storeId: new Types.ObjectId(data.storeId),
      itemId: new Types.ObjectId(data.itemId),
    });

    if (!stock) {
      throw new NotFoundError('Stock record for this item in the specified store does not exist.');
    }

    const available = stock.quantityOnHand - stock.quantityReserved;
    if (available < data.quantity) {
      throw new BadRequestError(
        `Insufficient available stock. Requested: ${data.quantity}, Available: ${available}`
      );
    }

    // Atomically increment quantityReserved
    stock.quantityReserved += data.quantity;
    stock.quantityAvailable = stock.quantityOnHand - stock.quantityReserved;
    await stock.save();

    const reservation = await InventoryStockReservation.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      itemId: new Types.ObjectId(data.itemId),
      storeId: new Types.ObjectId(data.storeId),
      quantity: data.quantity,
      reservedForType: data.reservedForType,
      reservedForId: data.reservedForId,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      status: StockReservationStatus.ACTIVE,
      createdByUserId: userId,
    });

    return reservation;
  }

  public static async releaseReservation(
    tenantId: Types.ObjectId,
    reservationId: string
  ): Promise<IInventoryStockReservationDoc> {
    const reservation = await InventoryStockReservation.findOne({
      _id: new Types.ObjectId(reservationId),
      tenantId,
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found.');
    }

    if (reservation.status !== StockReservationStatus.ACTIVE) {
      throw new BadRequestError(`Reservation is already ${reservation.status}.`);
    }

    const stock = await InventoryStock.findOne({
      tenantId,
      storeId: reservation.storeId,
      itemId: reservation.itemId,
    });

    if (stock) {
      stock.quantityReserved = Math.max(0, stock.quantityReserved - reservation.quantity);
      stock.quantityAvailable = stock.quantityOnHand - stock.quantityReserved;
      await stock.save();
    }

    reservation.status = StockReservationStatus.CANCELLED;
    await reservation.save();

    return reservation;
  }

  public static async getReservations(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      storeId?: string;
      itemId?: string;
      status?: StockReservationStatus;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.storeId) query.storeId = new Types.ObjectId(filter.storeId);
    if (filter.itemId) query.itemId = new Types.ObjectId(filter.itemId);
    if (filter.status) query.status = filter.status;

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryStockReservation.find(query)
        .populate('itemId', 'name itemCode unitId')
        .populate('storeId', 'name code')
        .populate('createdByUserId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      InventoryStockReservation.countDocuments(query),
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

  public static async getBatches(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      storeId?: string;
      itemId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.storeId) query.storeId = new Types.ObjectId(filter.storeId);
    if (filter.itemId) query.itemId = new Types.ObjectId(filter.itemId);

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryStockBatch.find(query)
        .populate('itemId', 'name itemCode')
        .populate('storeId', 'name code')
        .populate('supplierId', 'name code')
        .sort({ expiryDate: 1 })
        .skip(skip)
        .limit(limit),
      InventoryStockBatch.countDocuments(query),
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
}
