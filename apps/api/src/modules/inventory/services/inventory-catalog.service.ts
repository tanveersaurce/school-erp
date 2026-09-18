import { Types } from 'mongoose';
import {
  InventoryCategory,
  InventoryUnit,
  InventorySupplier,
  InventoryItem,
  IInventoryCategoryDoc,
  IInventoryUnitDoc,
  IInventorySupplierDoc,
  IInventoryItemDoc,
} from '@edusphere/database';
import {
  ConflictError,
  NotFoundError,
  InventoryItemType,
} from '@edusphere/common';

export class InventoryCatalogService {
  // =========================================================================
  // 1. Categories
  // =========================================================================

  public static async createCategory(
    tenantId: Types.ObjectId,
    data: {
      schoolId: string;
      name: string;
      code: string;
      description?: string;
      parentCategoryId?: string | null;
      active?: boolean;
    }
  ): Promise<IInventoryCategoryDoc> {
    const existing = await InventoryCategory.findOne({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      code: data.code.toUpperCase(),
    });

    if (existing) {
      throw new ConflictError(`Inventory category with code "${data.code}" already exists.`);
    }

    const category = await InventoryCategory.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description,
      parentCategoryId: data.parentCategoryId ? new Types.ObjectId(data.parentCategoryId) : undefined,
      active: data.active ?? true,
    });

    return category;
  }

  public static async updateCategory(
    tenantId: Types.ObjectId,
    categoryId: string,
    data: Partial<{
      name: string;
      code: string;
      description: string;
      parentCategoryId: string | null;
      active: boolean;
    }>
  ): Promise<IInventoryCategoryDoc> {
    const category = await InventoryCategory.findOne({ _id: new Types.ObjectId(categoryId), tenantId });
    if (!category) {
      throw new NotFoundError('Inventory category not found.');
    }

    if (data.code && data.code.toUpperCase() !== category.code) {
      const conflict = await InventoryCategory.findOne({
        tenantId,
        schoolId: category.schoolId,
        code: data.code.toUpperCase(),
        _id: { $ne: category._id },
      });
      if (conflict) {
        throw new ConflictError(`Category code "${data.code}" already in use.`);
      }
      category.code = data.code.toUpperCase();
    }

    if (data.name !== undefined) category.name = data.name;
    if (data.description !== undefined) category.description = data.description;
    if (data.active !== undefined) category.active = data.active;
    if (data.parentCategoryId !== undefined) {
      category.parentCategoryId = data.parentCategoryId
        ? new Types.ObjectId(data.parentCategoryId)
        : undefined;
    }

    await (category as any).save();
    return category;
  }

  public static async getCategories(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      active?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.active !== undefined) query.active = filter.active === 'true';
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
      InventoryCategory.find(query)
        .populate('parentCategoryId', 'name code')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      InventoryCategory.countDocuments(query),
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

  public static async getCategoryById(
    tenantId: Types.ObjectId,
    categoryId: string
  ): Promise<IInventoryCategoryDoc> {
    const category = await InventoryCategory.findOne({ _id: new Types.ObjectId(categoryId), tenantId })
      .populate('parentCategoryId', 'name code');
    if (!category) {
      throw new NotFoundError('Inventory category not found.');
    }
    return category;
  }

  public static async deleteCategory(
    tenantId: Types.ObjectId,
    categoryId: string,
    deletedByUserId?: Types.ObjectId
  ): Promise<void> {
    const category = await InventoryCategory.findOne({ _id: new Types.ObjectId(categoryId), tenantId });
    if (!category) {
      throw new NotFoundError('Inventory category not found.');
    }
    category.isDeleted = true;
    (category as any).deletedAt = new Date();
    (category as any).deletedBy = deletedByUserId;
    await (category as any).save();
  }

  // =========================================================================
  // 2. Units
  // =========================================================================

  public static async createUnit(
    tenantId: Types.ObjectId,
    data: {
      schoolId: string;
      name: string;
      code: string;
      symbol: string;
      decimalPrecision?: number;
      active?: boolean;
    }
  ): Promise<IInventoryUnitDoc> {
    const existing = await InventoryUnit.findOne({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      code: data.code.toUpperCase(),
    });

    if (existing) {
      throw new ConflictError(`Inventory unit with code "${data.code}" already exists.`);
    }

    const unit = await InventoryUnit.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      name: data.name,
      code: data.code.toUpperCase(),
      symbol: data.symbol,
      decimalPrecision: data.decimalPrecision ?? 0,
      active: data.active ?? true,
    });

    return unit;
  }

  public static async updateUnit(
    tenantId: Types.ObjectId,
    unitId: string,
    data: Partial<{
      name: string;
      code: string;
      symbol: string;
      decimalPrecision: number;
      active: boolean;
    }>
  ): Promise<IInventoryUnitDoc> {
    const unit = await InventoryUnit.findOne({ _id: new Types.ObjectId(unitId), tenantId });
    if (!unit) {
      throw new NotFoundError('Inventory unit not found.');
    }

    if (data.code && data.code.toUpperCase() !== unit.code) {
      const conflict = await InventoryUnit.findOne({
        tenantId,
        schoolId: unit.schoolId,
        code: data.code.toUpperCase(),
        _id: { $ne: unit._id },
      });
      if (conflict) {
        throw new ConflictError(`Unit code "${data.code}" already in use.`);
      }
      unit.code = data.code.toUpperCase();
    }

    if (data.name !== undefined) unit.name = data.name;
    if (data.symbol !== undefined) unit.symbol = data.symbol;
    if (data.decimalPrecision !== undefined) unit.decimalPrecision = data.decimalPrecision;
    if (data.active !== undefined) unit.active = data.active;

    await (unit as any).save();
    return unit;
  }

  public static async getUnits(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      active?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.active !== undefined) query.active = filter.active === 'true';
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { code: { $regex: filter.search, $options: 'i' } },
        { symbol: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryUnit.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      InventoryUnit.countDocuments(query),
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

  public static async getUnitById(
    tenantId: Types.ObjectId,
    unitId: string
  ): Promise<IInventoryUnitDoc> {
    const unit = await InventoryUnit.findOne({ _id: new Types.ObjectId(unitId), tenantId });
    if (!unit) {
      throw new NotFoundError('Inventory unit not found.');
    }
    return unit;
  }

  public static async deleteUnit(
    tenantId: Types.ObjectId,
    unitId: string,
    deletedByUserId?: Types.ObjectId
  ): Promise<void> {
    const unit = await InventoryUnit.findOne({ _id: new Types.ObjectId(unitId), tenantId });
    if (!unit) {
      throw new NotFoundError('Inventory unit not found.');
    }
    unit.isDeleted = true;
    (unit as any).deletedAt = new Date();
    (unit as any).deletedBy = deletedByUserId;
    await (unit as any).save();
  }

  // =========================================================================
  // 3. Suppliers
  // =========================================================================

  public static async createSupplier(
    tenantId: Types.ObjectId,
    data: {
      schoolId: string;
      name: string;
      code: string;
      contactPerson?: string;
      email?: string;
      phone?: string;
      address?: string;
      taxId?: string;
      paymentTerms?: string;
      active?: boolean;
    }
  ): Promise<IInventorySupplierDoc> {
    const existing = await InventorySupplier.findOne({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      code: data.code.toUpperCase(),
    });

    if (existing) {
      throw new ConflictError(`Supplier with code "${data.code}" already exists.`);
    }

    const supplier = await InventorySupplier.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      name: data.name,
      code: data.code.toUpperCase(),
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      address: data.address,
      taxId: data.taxId,
      paymentTerms: data.paymentTerms,
      active: data.active ?? true,
    });

    return supplier;
  }

  public static async updateSupplier(
    tenantId: Types.ObjectId,
    supplierId: string,
    data: Partial<{
      name: string;
      code: string;
      contactPerson: string;
      email: string;
      phone: string;
      address: string;
      taxId: string;
      paymentTerms: string;
      active: boolean;
    }>
  ): Promise<IInventorySupplierDoc> {
    const supplier = await InventorySupplier.findOne({ _id: new Types.ObjectId(supplierId), tenantId });
    if (!supplier) {
      throw new NotFoundError('Supplier not found.');
    }

    if (data.code && data.code.toUpperCase() !== supplier.code) {
      const conflict = await InventorySupplier.findOne({
        tenantId,
        schoolId: supplier.schoolId,
        code: data.code.toUpperCase(),
        _id: { $ne: supplier._id },
      });
      if (conflict) {
        throw new ConflictError(`Supplier code "${data.code}" already in use.`);
      }
      supplier.code = data.code.toUpperCase();
    }

    if (data.name !== undefined) supplier.name = data.name;
    if (data.contactPerson !== undefined) supplier.contactPerson = data.contactPerson;
    if (data.email !== undefined) supplier.email = data.email;
    if (data.phone !== undefined) supplier.phone = data.phone;
    if (data.address !== undefined) supplier.address = data.address;
    if (data.taxId !== undefined) supplier.taxId = data.taxId;
    if (data.paymentTerms !== undefined) supplier.paymentTerms = data.paymentTerms;
    if (data.active !== undefined) supplier.active = data.active;

    await (supplier as any).save();
    return supplier;
  }

  public static async getSuppliers(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      active?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.active !== undefined) query.active = filter.active === 'true';
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { code: { $regex: filter.search, $options: 'i' } },
        { contactPerson: { $regex: filter.search, $options: 'i' } },
        { email: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventorySupplier.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      InventorySupplier.countDocuments(query),
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

  public static async getSupplierById(
    tenantId: Types.ObjectId,
    supplierId: string
  ): Promise<IInventorySupplierDoc> {
    const supplier = await InventorySupplier.findOne({ _id: new Types.ObjectId(supplierId), tenantId });
    if (!supplier) {
      throw new NotFoundError('Supplier not found.');
    }
    return supplier;
  }

  public static async deleteSupplier(
    tenantId: Types.ObjectId,
    supplierId: string,
    deletedByUserId?: Types.ObjectId
  ): Promise<void> {
    const supplier = await InventorySupplier.findOne({ _id: new Types.ObjectId(supplierId), tenantId });
    if (!supplier) {
      throw new NotFoundError('Supplier not found.');
    }
    supplier.isDeleted = true;
    (supplier as any).deletedAt = new Date();
    (supplier as any).deletedBy = deletedByUserId;
    await (supplier as any).save();
  }

  // =========================================================================
  // 4. Catalog Items
  // =========================================================================

  public static async createItem(
    tenantId: Types.ObjectId,
    data: {
      schoolId: string;
      itemCode: string;
      name: string;
      description?: string;
      categoryId: string;
      unitId: string;
      itemType?: InventoryItemType;
      type?: InventoryItemType;
      brand?: string;
      model?: string;
      sku?: string;
      barcode?: string;
      costPriceMinorUnits?: number;
      reorderLevel?: number;
      minimumStock?: number;
      maximumStock?: number;
      preferredSupplierId?: string | null;
      trackBatch?: boolean;
      trackExpiry?: boolean;
      trackSerialNumber?: boolean;
      active?: boolean;
    }
  ): Promise<IInventoryItemDoc> {
    const resolvedType = data.itemType || data.type || InventoryItemType.CONSUMABLE;
    const existing = await InventoryItem.findOne({
      tenantId,
      itemCode: data.itemCode.toUpperCase(),
    });

    if (existing) {
      throw new ConflictError(`Item with code "${data.itemCode}" already exists.`);
    }

    if (data.sku) {
      const existingSku = await InventoryItem.findOne({
        tenantId,
        sku: data.sku.toUpperCase(),
      });
      if (existingSku) {
        throw new ConflictError(`Item with SKU "${data.sku}" already exists.`);
      }
    }

    const item = await InventoryItem.create({
      tenantId,
      schoolId: new Types.ObjectId(data.schoolId),
      itemCode: data.itemCode.toUpperCase(),
      name: data.name,
      description: data.description,
      categoryId: new Types.ObjectId(data.categoryId),
      unitId: new Types.ObjectId(data.unitId),
      itemType: resolvedType,
      brand: data.brand,
      model: data.model,
      sku: data.sku ? data.sku.toUpperCase() : undefined,
      barcode: data.barcode,
      reorderLevel: data.reorderLevel ?? 5,
      minimumStock: data.minimumStock ?? 0,
      maximumStock: data.maximumStock,
      preferredSupplierId: data.preferredSupplierId ? new Types.ObjectId(data.preferredSupplierId) : undefined,
      trackBatch: data.trackBatch ?? false,
      trackExpiry: data.trackExpiry ?? false,
      trackSerialNumber: data.trackSerialNumber ?? (resolvedType === InventoryItemType.ASSET),
      active: data.active ?? true,
    });

    return item;
  }

  public static async updateItem(
    tenantId: Types.ObjectId,
    itemId: string,
    data: Partial<{
      name: string;
      description: string;
      categoryId: string;
      unitId: string;
      itemType: InventoryItemType;
      brand: string;
      model: string;
      sku: string;
      barcode: string;
      reorderLevel: number;
      minimumStock: number;
      maximumStock: number;
      preferredSupplierId: string | null;
      trackBatch: boolean;
      trackExpiry: boolean;
      trackSerialNumber: boolean;
      active: boolean;
    }>
  ): Promise<IInventoryItemDoc> {
    const item = await InventoryItem.findOne({ _id: new Types.ObjectId(itemId), tenantId });
    if (!item) {
      throw new NotFoundError('Item not found.');
    }

    if (data.sku && data.sku.toUpperCase() !== item.sku) {
      const existingSku = await InventoryItem.findOne({
        tenantId,
        sku: data.sku.toUpperCase(),
        _id: { $ne: item._id },
      });
      if (existingSku) {
        throw new ConflictError(`SKU "${data.sku}" already in use.`);
      }
      item.sku = data.sku.toUpperCase();
    }

    if (data.name !== undefined) item.name = data.name;
    if (data.description !== undefined) item.description = data.description;
    if (data.categoryId) item.categoryId = new Types.ObjectId(data.categoryId);
    if (data.unitId) item.unitId = new Types.ObjectId(data.unitId);
    if (data.itemType) item.itemType = data.itemType;
    if (data.brand !== undefined) item.brand = data.brand;
    if (data.model !== undefined) (item as any).set('model', data.model);
    if (data.barcode !== undefined) item.barcode = data.barcode;
    if (data.reorderLevel !== undefined) item.reorderLevel = data.reorderLevel;
    if (data.minimumStock !== undefined) item.minimumStock = data.minimumStock;
    if (data.maximumStock !== undefined) item.maximumStock = data.maximumStock;
    if (data.trackBatch !== undefined) item.trackBatch = data.trackBatch;
    if (data.trackExpiry !== undefined) item.trackExpiry = data.trackExpiry;
    if (data.trackSerialNumber !== undefined) item.trackSerialNumber = data.trackSerialNumber;
    if (data.active !== undefined) item.active = data.active;
    if (data.preferredSupplierId !== undefined) {
      item.preferredSupplierId = data.preferredSupplierId
        ? new Types.ObjectId(data.preferredSupplierId)
        : undefined;
    }

    await (item as any).save();
    return item;
  }

  public static async getItems(
    tenantId: Types.ObjectId,
    filter: {
      schoolId?: string;
      categoryId?: string;
      itemType?: InventoryItemType;
      active?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const query: any = { tenantId };
    if (filter.schoolId) query.schoolId = new Types.ObjectId(filter.schoolId);
    if (filter.categoryId) query.categoryId = new Types.ObjectId(filter.categoryId);
    if (filter.itemType) query.itemType = filter.itemType;
    if (filter.active !== undefined) query.active = filter.active === 'true';
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { itemCode: { $regex: filter.search, $options: 'i' } },
        { sku: { $regex: filter.search, $options: 'i' } },
        { brand: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryItem.find(query)
        .populate('categoryId', 'name code')
        .populate('unitId', 'name symbol decimalPrecision')
        .populate('preferredSupplierId', 'name code email phone')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      InventoryItem.countDocuments(query),
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

  public static async getItemById(
    tenantId: Types.ObjectId,
    itemId: string
  ): Promise<IInventoryItemDoc> {
    const item = await InventoryItem.findOne({ _id: new Types.ObjectId(itemId), tenantId })
      .populate('categoryId', 'name code')
      .populate('unitId', 'name symbol decimalPrecision')
      .populate('preferredSupplierId', 'name code email phone');
    if (!item) {
      throw new NotFoundError('Item not found.');
    }
    return item;
  }

  public static async deleteItem(
    tenantId: Types.ObjectId,
    itemId: string,
    deletedByUserId?: Types.ObjectId
  ): Promise<void> {
    const item = await InventoryItem.findOne({ _id: new Types.ObjectId(itemId), tenantId });
    if (!item) {
      throw new NotFoundError('Item not found.');
    }
    item.isDeleted = true;
    (item as any).deletedAt = new Date();
    (item as any).deletedBy = deletedByUserId;
    await (item as any).save();
  }
}
