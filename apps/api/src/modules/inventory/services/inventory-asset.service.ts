import { Types } from 'mongoose';
import {
  InventoryAsset,
  InventoryAssetAssignment,
  InventoryAssetMaintenance,
  InventoryAssetDisposal,
  IInventoryAssetDoc,
  IInventoryAssetAssignmentDoc,
  IInventoryAssetMaintenanceDoc,
  IInventoryAssetDisposalDoc,
} from '@edusphere/database';
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
  AssetStatus,
  AssetCondition,
  AssetAssignmentType,
  AssetMaintenanceType,
  AssetMaintenanceStatus,
  AssetDisposalReason,
  AssetDisposalMethod,
} from '@edusphere/common';

export class InventoryAssetService {
  // =========================================================================
  // 1. Asset Registry
  // =========================================================================

  public static async createAsset(
    tenantId: Types.ObjectId,
    data: {
      schoolId: string;
      itemId: string;
      assetTag: string;
      serialNumber?: string | null;
      model?: string;
      manufacturer?: string;
      purchaseDate?: string | null;
      purchaseCostMinorUnits?: number;
      warrantyStartDate?: string | null;
      warrantyEndDate?: string | null;
      currentStoreId?: string | null;
      currentLocationId?: string | null;
      assignedToType?: AssetAssignmentType;
      status?: AssetStatus;
      condition?: AssetCondition;
      notes?: string;
    }
  ): Promise<IInventoryAssetDoc> {
    const existing = await InventoryAsset.findOne({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      assetTag: data.assetTag.toUpperCase(),
    });

    if (existing) {
      throw new ConflictError(`Asset with tag "${data.assetTag}" already exists.`);
    }

    if (data.serialNumber) {
      const existingSerial = await InventoryAsset.findOne({
        tenantId,
        schoolId: new Types.ObjectId(data.schoolId),
        serialNumber: data.serialNumber.toUpperCase(),
      });
      if (existingSerial) {
        throw new ConflictError(`Asset with serial number "${data.serialNumber}" already exists.`);
      }
    }

    const asset = await InventoryAsset.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      itemId: new Types.ObjectId(data.itemId),
      assetTag: data.assetTag.toUpperCase(),
      serialNumber: data.serialNumber ? data.serialNumber.toUpperCase() : undefined,
      model: data.model,
      manufacturer: data.manufacturer,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      purchaseCostMinorUnits: data.purchaseCostMinorUnits ?? 0,
      warrantyStartDate: data.warrantyStartDate ? new Date(data.warrantyStartDate) : undefined,
      warrantyEndDate: data.warrantyEndDate ? new Date(data.warrantyEndDate) : undefined,
      currentStoreId: data.currentStoreId ? new Types.ObjectId(data.currentStoreId) : undefined,
      currentLocationId: data.currentLocationId ? new Types.ObjectId(data.currentLocationId) : undefined,
      assignedToType: data.assignedToType || AssetAssignmentType.NONE,
      status: data.status || AssetStatus.AVAILABLE,
      condition: data.condition || AssetCondition.NEW,
      notes: data.notes,
    });

    return asset;
  }

  public static async updateAsset(
    tenantId: Types.ObjectId,
    assetId: string,
    data: Partial<{
      serialNumber: string | null;
      model: string;
      manufacturer: string;
      currentStoreId: string | null;
      currentLocationId: string | null;
      status: AssetStatus;
      condition: AssetCondition;
      warrantyStartDate: string | null;
      warrantyEndDate: string | null;
      notes: string;
    }>
  ): Promise<IInventoryAssetDoc> {
    const asset = await InventoryAsset.findOne({ _id: new Types.ObjectId(assetId), tenantId });
    if (!asset) {
      throw new NotFoundError('Asset not found.');
    }

    if (data.serialNumber && data.serialNumber.toUpperCase() !== asset.serialNumber) {
      const conflict = await InventoryAsset.findOne({
        tenantId,
        schoolId: asset.schoolId,
        serialNumber: data.serialNumber.toUpperCase(),
        _id: { $ne: asset._id },
      });
      if (conflict) {
        throw new ConflictError(`Serial number "${data.serialNumber}" is already in use.`);
      }
      asset.serialNumber = data.serialNumber.toUpperCase();
    }

    if (data.status) asset.status = data.status;
    if (data.condition) asset.condition = data.condition;
    if (data.model !== undefined) (asset as any).set('model', data.model);
    if (data.manufacturer !== undefined) asset.manufacturer = data.manufacturer;
    if (data.notes !== undefined) asset.notes = data.notes;
    if (data.warrantyStartDate !== undefined) {
      asset.warrantyStartDate = data.warrantyStartDate ? new Date(data.warrantyStartDate) : undefined;
    }
    if (data.warrantyEndDate !== undefined) {
      asset.warrantyEndDate = data.warrantyEndDate ? new Date(data.warrantyEndDate) : undefined;
    }
    if (data.currentStoreId !== undefined) {
      asset.currentStoreId = data.currentStoreId ? new Types.ObjectId(data.currentStoreId) : undefined;
    }
    if (data.currentLocationId !== undefined) {
      asset.currentLocationId = data.currentLocationId ? new Types.ObjectId(data.currentLocationId) : undefined;
    }

    await (asset as any).save();
    return asset;
  }

  public static async getAssets(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      itemId?: string;
      currentStoreId?: string;
      status?: AssetStatus;
      condition?: AssetCondition;
      assignedToType?: AssetAssignmentType;
      assignedToId?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.itemId) query.itemId = new Types.ObjectId(filter.itemId);
    if (filter.currentStoreId) query.currentStoreId = new Types.ObjectId(filter.currentStoreId);
    if (filter.status) query.status = filter.status;
    if (filter.condition) query.condition = filter.condition;
    if (filter.assignedToType) query.assignedToType = filter.assignedToType;
    if (filter.assignedToId) query.assignedToId = new Types.ObjectId(filter.assignedToId);
    if (filter.search) {
      query.$or = [
        { assetTag: { $regex: filter.search, $options: 'i' } },
        { serialNumber: { $regex: filter.search, $options: 'i' } },
        { model: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryAsset.find(query)
        .populate('itemId', 'name itemCode sku brand model categoryId')
        .populate('currentStoreId', 'name code')
        .populate('currentLocationId', 'name code')
        .sort({ assetTag: 1 })
        .skip(skip)
        .limit(limit),
      InventoryAsset.countDocuments(query),
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

  public static async getAssetById(
    tenantId: Types.ObjectId,
    assetId: string
  ): Promise<IInventoryAssetDoc> {
    const asset = await InventoryAsset.findOne({ _id: new Types.ObjectId(assetId), tenantId })
      .populate('itemId', 'name itemCode sku brand model categoryId unitId')
      .populate('currentStoreId', 'name code')
      .populate('currentLocationId', 'name code');
    if (!asset) {
      throw new NotFoundError('Durable asset not found.');
    }
    return asset;
  }

  // =========================================================================
  // 2. Asset Assignment & Return (Durable Custody)
  // =========================================================================

  public static async assignAsset(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    assetId: string,
    data: {
      schoolId: string;
      assignedToType: AssetAssignmentType;
      assignedToId: string;
      conditionOnAssignment?: AssetCondition;
      remarks?: string;
    }
  ): Promise<IInventoryAssetAssignmentDoc> {
    const updatedAsset = await InventoryAsset.findOneAndUpdate(
      { _id: new Types.ObjectId(assetId), tenantId, status: AssetStatus.AVAILABLE },
      {
        $set: {
          status: AssetStatus.ASSIGNED,
          assignedToType: data.assignedToType,
          assignedToId: new Types.ObjectId(data.assignedToId),
          assignmentDate: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedAsset) {
      const existing = await InventoryAsset.findOne({ _id: new Types.ObjectId(assetId), tenantId });
      if (!existing) {
        throw new NotFoundError('Asset not found.');
      }
      throw new BadRequestError(`Cannot assign asset in status ${existing.status}. Must be AVAILABLE.`);
    }

    const assignment = await InventoryAssetAssignment.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      assetId: updatedAsset._id,
      assignedToType: data.assignedToType,
      assignedToId: new Types.ObjectId(data.assignedToId),
      assignedByUserId: userId,
      assignedAt: new Date(),
      conditionOnAssignment: data.conditionOnAssignment || updatedAsset.condition || AssetCondition.GOOD,
      status: 'ACTIVE',
      remarks: data.remarks,
    });

    return assignment;
  }

  public static async returnAsset(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    assetId: string,
    data: {
      returnDate?: string;
      conditionOnReturn: AssetCondition;
      returnStoreId?: string | null;
      returnLocationId?: string | null;
      remarks?: string;
    }
  ): Promise<IInventoryAssetDoc> {
    const asset = await InventoryAsset.findOne({ _id: new Types.ObjectId(assetId), tenantId });
    if (!asset) {
      throw new NotFoundError('Asset not found.');
    }

    if (asset.status !== AssetStatus.ASSIGNED) {
      throw new BadRequestError(`Cannot return asset in status ${asset.status}. Must be ASSIGNED.`);
    }

    // Close open assignment
    const openAssignment = await InventoryAssetAssignment.findOne({
      tenantId,
      assetId: asset._id,
      status: 'ACTIVE',
    }).sort({ assignedAt: -1 });

    if (openAssignment) {
      openAssignment.returnedAt = data.returnDate ? new Date(data.returnDate) : new Date();
      openAssignment.returnedByUserId = userId;
      openAssignment.conditionOnReturn = data.conditionOnReturn;
      openAssignment.status = 'RETURNED';
      if (data.remarks) {
        openAssignment.remarks = openAssignment.remarks
          ? `${openAssignment.remarks}\n${data.remarks}`
          : data.remarks;
      }
      await (openAssignment as any).save();
    }

    asset.status = AssetStatus.AVAILABLE;
    asset.condition = data.conditionOnReturn;
    asset.assignedToType = AssetAssignmentType.NONE;
    asset.assignedToId = undefined;
    asset.assignmentDate = undefined;

    if (data.returnStoreId) {
      asset.currentStoreId = new Types.ObjectId(data.returnStoreId);
    }
    if (data.returnLocationId) {
      asset.currentLocationId = new Types.ObjectId(data.returnLocationId);
    }

    await (asset as any).save();
    return asset;
  }

  public static async transferAsset(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    assetId: string,
    data: {
      assignedToType: AssetAssignmentType;
      assignedToId: string;
      remarks?: string;
    }
  ): Promise<IInventoryAssetDoc> {
    const asset = await InventoryAsset.findOne({ _id: new Types.ObjectId(assetId), tenantId });
    if (!asset) {
      throw new NotFoundError('Asset not found.');
    }

    // Close previous assignment if currently active
    const openAssignment = await InventoryAssetAssignment.findOne({
      tenantId,
      assetId: asset._id,
      status: 'ACTIVE',
    }).sort({ assignedAt: -1 });

    const now = new Date();

    if (openAssignment) {
      openAssignment.returnedAt = now;
      openAssignment.returnedByUserId = userId;
      openAssignment.status = 'TRANSFERRED';
      openAssignment.remarks = openAssignment.remarks
        ? `${openAssignment.remarks}\nTransferred`
        : 'Transferred';
      await (openAssignment as any).save();
    }

    // Create new assignment
    await InventoryAssetAssignment.create({
      tenantId,
      schoolId: asset.schoolId,
      assetId: asset._id,
      assignedToType: data.assignedToType,
      assignedToId: new Types.ObjectId(data.assignedToId),
      assignedByUserId: userId,
      assignedAt: now,
      conditionOnAssignment: asset.condition,
      status: 'ACTIVE',
      remarks: data.remarks,
    });

    asset.status = AssetStatus.ASSIGNED;
    asset.assignedToType = data.assignedToType;
    asset.assignedToId = new Types.ObjectId(data.assignedToId);
    asset.assignmentDate = now;
    await (asset as any).save();

    return asset;
  }

  // =========================================================================
  // 3. Maintenance Logs
  // =========================================================================

  public static async logMaintenance(
    tenantId: Types.ObjectId,
    assetId: string,
    data: {
      schoolId: string;
      maintenanceType: AssetMaintenanceType;
      description: string;
      scheduledDate?: string;
      vendorSupplierId?: string | null;
      costMinorUnits?: number;
      status?: AssetMaintenanceStatus;
      notes?: string;
    }
  ): Promise<IInventoryAssetMaintenanceDoc> {
    const asset = await InventoryAsset.findOne({ _id: new Types.ObjectId(assetId), tenantId });
    if (!asset) {
      throw new NotFoundError('Asset not found.');
    }

    const maintenance = await InventoryAssetMaintenance.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      assetId: asset._id,
      maintenanceType: data.maintenanceType,
      description: data.description,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : new Date(),
      vendorSupplierId: data.vendorSupplierId ? new Types.ObjectId(data.vendorSupplierId) : undefined,
      costMinorUnits: data.costMinorUnits ?? 0,
      status: data.status || AssetMaintenanceStatus.SCHEDULED,
      notes: data.notes,
    });

    asset.status = AssetStatus.MAINTENANCE;
    await (asset as any).save();

    return maintenance;
  }

  public static async updateMaintenanceStatus(
    tenantId: Types.ObjectId,
    maintenanceId: string,
    data: {
      status: AssetMaintenanceStatus;
      completedDate?: string | null;
      resolution?: string;
      costMinorUnits?: number;
    }
  ): Promise<IInventoryAssetMaintenanceDoc> {
    const maintenance = await InventoryAssetMaintenance.findOne({
      _id: new Types.ObjectId(maintenanceId),
      tenantId,
    });

    if (!maintenance) {
      throw new NotFoundError('Maintenance record not found.');
    }

    maintenance.status = data.status;
    if (data.completedDate) {
      maintenance.completedDate = new Date(data.completedDate);
    } else if (data.status === AssetMaintenanceStatus.COMPLETED && !maintenance.completedDate) {
      maintenance.completedDate = new Date();
    }
    if (data.resolution !== undefined) maintenance.resolution = data.resolution;
    if (data.costMinorUnits !== undefined) maintenance.costMinorUnits = data.costMinorUnits;
    await (maintenance as any).save();

    if (
      data.status === AssetMaintenanceStatus.COMPLETED ||
      data.status === AssetMaintenanceStatus.CANCELLED
    ) {
      const asset = await InventoryAsset.findOne({ _id: maintenance.assetId, tenantId });
      if (asset && asset.status === AssetStatus.MAINTENANCE) {
        asset.status = AssetStatus.AVAILABLE;
        await (asset as any).save();
      }
    }

    return maintenance;
  }

  public static async getMaintenances(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      assetId?: string;
      status?: AssetMaintenanceStatus;
      maintenanceType?: AssetMaintenanceType;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.assetId) query.assetId = new Types.ObjectId(filter.assetId);
    if (filter.status) query.status = filter.status;
    if (filter.maintenanceType) query.maintenanceType = filter.maintenanceType;

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryAssetMaintenance.find(query)
        .populate('assetId', 'assetTag serialNumber condition model')
        .populate('vendorSupplierId', 'name contactPerson email phone')
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(limit),
      InventoryAssetMaintenance.countDocuments(query),
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

  // =========================================================================
  // 4. Asset Disposal (Audit Decommissioning — Never delete history)
  // =========================================================================

  public static async disposeAsset(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    assetId: string,
    data: {
      disposalDate?: string;
      reason: AssetDisposalReason;
      method: AssetDisposalMethod;
      saleProceedsMinorUnits?: number;
      notes: string;
    }
  ): Promise<IInventoryAssetDoc> {
    const asset = await InventoryAsset.findOne({ _id: new Types.ObjectId(assetId), tenantId });
    if (!asset) {
      throw new NotFoundError('Asset not found.');
    }

    if (asset.status === AssetStatus.DISPOSED) {
      throw new BadRequestError('Asset has already been disposed.');
    }

    await InventoryAssetDisposal.create({
      tenantId,
      schoolId: asset.schoolId,
      assetId: asset._id,
      disposalDate: data.disposalDate ? new Date(data.disposalDate) : new Date(),
      reason: data.reason,
      method: data.method,
      saleProceedsMinorUnits: data.saleProceedsMinorUnits ?? 0,
      approvedByUserId: userId,
      notes: data.notes,
    });

    // Update asset state without deleting document
    asset.status = AssetStatus.DISPOSED;
    asset.notes = asset.notes
      ? `${asset.notes}\nDISPOSED: ${data.reason} (${data.method})`
      : `DISPOSED: ${data.reason} (${data.method})`;
    await (asset as any).save();

    return asset;
  }
}
