import { Types } from 'mongoose';
import {
  InventoryStore,
  InventoryLocation,
  IInventoryStoreDoc,
  IInventoryLocationDoc,
} from '@edusphere/database';
import {
  ConflictError,
  NotFoundError,
  InventoryStoreStatus,
  InventoryLocationType,
} from '@edusphere/common';

export class InventoryStoreService {
  // =========================================================================
  // 1. Stores / Warehouses
  // =========================================================================

  public static async createStore(
    tenantId: Types.ObjectId,
    data: {
      schoolId: string;
      campusId?: string | null;
      name: string;
      code: string;
      location?: string;
      description?: string;
      managerEmployeeId?: string | null;
      status?: InventoryStoreStatus;
      active?: boolean;
    }
  ): Promise<IInventoryStoreDoc> {
    const existing = await InventoryStore.findOne({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      code: data.code.toUpperCase(),
    });

    if (existing) {
      throw new ConflictError(`Inventory store with code "${data.code}" already exists.`);
    }

    const store = await InventoryStore.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      campusId: data.campusId ? new Types.ObjectId(data.campusId) : undefined,
      name: data.name,
      code: data.code.toUpperCase(),
      location: data.location,
      description: data.description,
      managerEmployeeId: data.managerEmployeeId ? new Types.ObjectId(data.managerEmployeeId) : undefined,
      status: data.status || InventoryStoreStatus.ACTIVE,
      active: data.active ?? true,
    });

    return store;
  }

  public static async updateStore(
    tenantId: Types.ObjectId,
    storeId: string,
    data: Partial<{
      campusId: string | null;
      name: string;
      code: string;
      location: string;
      description: string;
      managerEmployeeId: string | null;
      status: InventoryStoreStatus;
      active: boolean;
    }>
  ): Promise<IInventoryStoreDoc> {
    const store = await InventoryStore.findOne({ _id: new Types.ObjectId(storeId), tenantId });
    if (!store) {
      throw new NotFoundError('Inventory store not found.');
    }

    if (data.code && data.code.toUpperCase() !== store.code) {
      const conflict = await InventoryStore.findOne({
        tenantId,
        schoolId: store.schoolId,
        code: data.code.toUpperCase(),
        _id: { $ne: store._id },
      });
      if (conflict) {
        throw new ConflictError(`Store code "${data.code}" already in use.`);
      }
      store.code = data.code.toUpperCase();
    }

    if (data.name !== undefined) store.name = data.name;
    if (data.location !== undefined) store.location = data.location;
    if (data.description !== undefined) store.description = data.description;
    if (data.status !== undefined) store.status = data.status;
    if (data.active !== undefined) store.active = data.active;
    if (data.campusId !== undefined) {
      store.campusId = data.campusId ? new Types.ObjectId(data.campusId) : undefined;
    }
    if (data.managerEmployeeId !== undefined) {
      store.managerEmployeeId = data.managerEmployeeId
        ? new Types.ObjectId(data.managerEmployeeId)
        : undefined;
    }

    await (store as any).save();
    return store;
  }

  public static async getStores(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      campusId?: string;
      status?: InventoryStoreStatus;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.campusId) query.campusId = new Types.ObjectId(filter.campusId);
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { code: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryStore.find(query)
        .populate('managerEmployeeId', 'personalDetails.firstName personalDetails.lastName employeeNumber')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      InventoryStore.countDocuments(query),
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

  public static async getStoreById(
    tenantId: Types.ObjectId,
    storeId: string
  ): Promise<IInventoryStoreDoc> {
    const store = await InventoryStore.findOne({ _id: new Types.ObjectId(storeId), tenantId })
      .populate('managerEmployeeId', 'personalDetails.firstName personalDetails.lastName employeeNumber');
    if (!store) {
      throw new NotFoundError('Inventory store not found.');
    }
    return store;
  }

  public static async deleteStore(
    tenantId: Types.ObjectId,
    storeId: string,
    deletedByUserId?: Types.ObjectId
  ): Promise<void> {
    const store = await InventoryStore.findOne({ _id: new Types.ObjectId(storeId), tenantId });
    if (!store) {
      throw new NotFoundError('Inventory store not found.');
    }
    store.isDeleted = true;
    (store as any).deletedAt = new Date();
    (store as any).deletedBy = deletedByUserId;
    await (store as any).save();
  }

  // =========================================================================
  // 2. Locations within Stores (Aisles, Shelves, Bins)
  // =========================================================================

  public static async createLocation(
    tenantId: Types.ObjectId,
    data: {
      schoolId: string;
      storeId: string;
      parentLocationId?: string | null;
      name: string;
      code: string;
      type?: InventoryLocationType;
      active?: boolean;
    }
  ): Promise<IInventoryLocationDoc> {
    const existing = await InventoryLocation.findOne({
      tenantId,
      storeId: new Types.ObjectId(data.storeId),
      code: data.code.toUpperCase(),
    });

    if (existing) {
      throw new ConflictError(`Inventory location with code "${data.code}" already exists in this store.`);
    }

    const location = await InventoryLocation.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      storeId: new Types.ObjectId(data.storeId),
      parentLocationId: data.parentLocationId ? new Types.ObjectId(data.parentLocationId) : undefined,
      name: data.name,
      code: data.code.toUpperCase(),
      type: data.type || InventoryLocationType.SHELF,
      active: data.active ?? true,
    });

    return location;
  }

  public static async updateLocation(
    tenantId: Types.ObjectId,
    locationId: string,
    data: Partial<{
      parentLocationId: string | null;
      name: string;
      code: string;
      type: InventoryLocationType;
      active: boolean;
    }>
  ): Promise<IInventoryLocationDoc> {
    const location = await InventoryLocation.findOne({ _id: new Types.ObjectId(locationId), tenantId });
    if (!location) {
      throw new NotFoundError('Inventory location not found.');
    }

    if (data.code && data.code.toUpperCase() !== location.code) {
      const conflict = await InventoryLocation.findOne({
        tenantId,
        storeId: location.storeId,
        code: data.code.toUpperCase(),
        _id: { $ne: location._id },
      });
      if (conflict) {
        throw new ConflictError(`Location code "${data.code}" already in use in this store.`);
      }
      location.code = data.code.toUpperCase();
    }

    if (data.name !== undefined) location.name = data.name;
    if (data.type !== undefined) location.type = data.type;
    if (data.active !== undefined) location.active = data.active;
    if (data.parentLocationId !== undefined) {
      location.parentLocationId = data.parentLocationId
        ? new Types.ObjectId(data.parentLocationId)
        : undefined;
    }

    await (location as any).save();
    return location;
  }

  public static async getLocations(
    tenantId: Types.ObjectId,
    filter: {
      storeId?: string;
      schoolId?: string;
      type?: InventoryLocationType;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.storeId) query.storeId = new Types.ObjectId(filter.storeId);
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.type) query.type = filter.type;
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { code: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryLocation.find(query)
        .populate('storeId', 'name code')
        .populate('parentLocationId', 'name code type')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      InventoryLocation.countDocuments(query),
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

  public static async getLocationById(
    tenantId: Types.ObjectId,
    locationId: string
  ): Promise<IInventoryLocationDoc> {
    const location = await InventoryLocation.findOne({ _id: new Types.ObjectId(locationId), tenantId })
      .populate('storeId', 'name code')
      .populate('parentLocationId', 'name code type');
    if (!location) {
      throw new NotFoundError('Inventory location not found.');
    }
    return location;
  }

  public static async deleteLocation(
    tenantId: Types.ObjectId,
    locationId: string,
    deletedByUserId?: Types.ObjectId
  ): Promise<void> {
    const location = await InventoryLocation.findOne({ _id: new Types.ObjectId(locationId), tenantId });
    if (!location) {
      throw new NotFoundError('Inventory location not found.');
    }
    location.isDeleted = true;
    (location as any).deletedAt = new Date();
    (location as any).deletedBy = deletedByUserId;
    await (location as any).save();
  }
}
