import { Types } from 'mongoose';
import { FeeCategory, FeeStructure } from '@edusphere/database';
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from '@edusphere/common';
import type { IFeeCategory } from '@edusphere/types';

export class FeeCategoryService {
  public static async createFeeCategory(
    tenantId: string,
    schoolId: string,
    input: Partial<IFeeCategory>
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const code = input.code!.toUpperCase().trim();

    const existing = await FeeCategory.findOne({
      tenantId: tenantOid,
      schoolId: schoolOid,
      code,
      isDeleted: false,
    });

    if (existing) {
      throw new ConflictError(`Fee category with code '${code}' already exists.`);
    }

    const category = await FeeCategory.create({
      tenantId: tenantOid,
      schoolId: schoolOid,
      name: input.name!.trim(),
      code,
      description: input.description?.trim(),
      type: input.type,
      isTaxable: input.isTaxable ?? false,
      taxPercentage: input.taxPercentage ?? 0,
      isActive: true,
    });

    return category;
  }

  public static async getFeeCategories(
    tenantId: string,
    schoolId: string,
    query: { search?: string; type?: string; isActive?: boolean; page?: number; limit?: number }
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      tenantId: tenantOid,
      schoolId: schoolOid,
      isDeleted: false,
    };

    if (query.type) {
      filter.type = query.type;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { code: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      FeeCategory.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      FeeCategory.countDocuments(filter),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getFeeCategoryById(
    tenantId: string,
    schoolId: string,
    id: string
  ) {
    const category = await FeeCategory.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    });

    if (!category) {
      throw new NotFoundError('Fee category not found.');
    }

    return category;
  }

  public static async updateFeeCategory(
    tenantId: string,
    schoolId: string,
    id: string,
    input: Partial<IFeeCategory>
  ) {
    const category = await this.getFeeCategoryById(tenantId, schoolId, id);

    if (input.name) category.name = input.name.trim();
    if (input.description !== undefined) category.description = input.description?.trim();
    if (input.type) category.type = input.type;
    if (input.isTaxable !== undefined) category.isTaxable = input.isTaxable;
    if (input.taxPercentage !== undefined) category.taxPercentage = input.taxPercentage;
    if (input.isActive !== undefined) category.isActive = input.isActive;

    await category.save();
    return category;
  }

  public static async deleteFeeCategory(
    tenantId: string,
    schoolId: string,
    id: string
  ) {
    const categoryOid = new Types.ObjectId(id);

    // Check if category is used in active structures
    const isReferenced = await FeeStructure.exists({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      'heads.feeCategoryId': categoryOid,
      isDeleted: false,
    });

    if (isReferenced) {
      throw new BadRequestError('Cannot delete fee category currently used in active fee structures.');
    }

    const category = await this.getFeeCategoryById(tenantId, schoolId, id);
    category.isDeleted = true;
    await category.save();

    return { success: true, message: 'Fee category deleted successfully.' };
  }
}
