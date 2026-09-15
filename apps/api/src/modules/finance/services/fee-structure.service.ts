import { Types } from 'mongoose';
import {
  FeeStructure,
  AcademicYear,
  Class,
} from '@edusphere/database';
import {
  NotFoundError,
  BadRequestError,
  Money,
} from '@edusphere/common';
import type { IFeeStructure, IFeeHead, ILateFeePolicy } from '@edusphere/types';

export class FeeStructureService {
  public static async createFeeStructure(
    tenantId: string,
    schoolId: string,
    input: {
      academicYearId: string;
      classId: string;
      campusId?: string;
      title: string;
      code?: string;
      description?: string;
      heads: IFeeHead[];
      lateFeePolicy?: ILateFeePolicy;
      dueDate?: Date;
    }
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const ayOid = new Types.ObjectId(input.academicYearId);
    const classOid = new Types.ObjectId(input.classId);

    // Verify academic year and class
    const [academicYear, classDoc] = await Promise.all([
      AcademicYear.findOne({ _id: ayOid, tenantId: tenantOid, isDeleted: false }),
      Class.findOne({ _id: classOid, tenantId: tenantOid, isDeleted: false }),
    ]);

    if (!academicYear) {
      throw new NotFoundError('Academic year not found.');
    }
    if (!classDoc) {
      throw new NotFoundError('Class not found.');
    }

    // Zero-float calculation of total amount from heads
    const headAmounts = input.heads.map((h) => Math.round(h.amount || 0));
    const totalAmount = Money.add(...headAmounts);

    const structure = await FeeStructure.create({
      tenantId: tenantOid,
      schoolId: schoolOid,
      academicYearId: ayOid,
      classId: classOid,
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : undefined,
      title: input.title.trim(),
      code: input.code ? input.code.toUpperCase().trim() : undefined,
      description: input.description?.trim(),
      heads: input.heads.map((h) => ({
        feeCategoryId: h.feeCategoryId ? new Types.ObjectId(h.feeCategoryId) : undefined,
        name: h.name.trim(),
        amount: Math.round(h.amount),
        isOptional: h.isOptional ?? false,
        frequency: h.frequency,
      })),
      lateFeePolicy: input.lateFeePolicy,
      totalAmount,
      dueDate: input.dueDate,
      isActive: true,
    });

    return structure;
  }

  public static async getFeeStructures(
    tenantId: string,
    schoolId: string,
    query: {
      academicYearId?: string;
      classId?: string;
      campusId?: string;
      search?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    }
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      tenantId: tenantOid,
      schoolId: schoolOid,
      isDeleted: false,
    };

    if (query.academicYearId) filter.academicYearId = new Types.ObjectId(query.academicYearId);
    if (query.classId) filter.classId = new Types.ObjectId(query.classId);
    if (query.campusId) filter.campusId = new Types.ObjectId(query.campusId);
    if (query.isActive !== undefined) filter.isActive = query.isActive;

    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { code: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      FeeStructure.find(filter)
        .populate('academicYearId', 'name startDate endDate')
        .populate('classId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FeeStructure.countDocuments(filter),
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

  public static async getFeeStructureById(
    tenantId: string,
    schoolId: string,
    id: string
  ) {
    const structure = await FeeStructure.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    })
      .populate('academicYearId', 'name startDate endDate')
      .populate('classId', 'name code')
      .populate('heads.feeCategoryId', 'name code type');

    if (!structure) {
      throw new NotFoundError('Fee structure not found.');
    }

    return structure;
  }

  public static async updateFeeStructure(
    tenantId: string,
    schoolId: string,
    id: string,
    input: Partial<IFeeStructure>
  ) {
    const structure = await FeeStructure.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    });

    if (!structure) {
      throw new NotFoundError('Fee structure not found.');
    }

    if (input.title) structure.title = input.title.trim();
    if (input.code !== undefined) structure.code = input.code?.toUpperCase().trim();
    if (input.description !== undefined) structure.description = input.description?.trim();
    if (input.dueDate !== undefined) structure.dueDate = input.dueDate;
    if (input.isActive !== undefined) structure.isActive = input.isActive;
    if (input.lateFeePolicy) structure.lateFeePolicy = input.lateFeePolicy;

    if (input.heads && Array.isArray(input.heads)) {
      structure.heads = input.heads.map((h) => ({
        feeCategoryId: h.feeCategoryId ? new Types.ObjectId(h.feeCategoryId) : undefined,
        name: h.name.trim(),
        amount: Math.round(h.amount),
        isOptional: h.isOptional ?? false,
        frequency: h.frequency,
      }));
      const amounts = input.heads.map((h) => Math.round(h.amount || 0));
      structure.totalAmount = Money.add(...amounts);
    }

    await structure.save();
    return structure;
  }

  public static async cloneFeeStructure(
    tenantId: string,
    schoolId: string,
    id: string,
    targetAcademicYearId: string
  ) {
    const source = await this.getFeeStructureById(tenantId, schoolId, id);
    const targetAyOid = new Types.ObjectId(targetAcademicYearId);

    const targetAy = await AcademicYear.findOne({
      _id: targetAyOid,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!targetAy) {
      throw new NotFoundError('Target academic year not found.');
    }

    const cloned = await FeeStructure.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      academicYearId: targetAyOid,
      classId: (source.classId as any)._id || source.classId,
      campusId: source.campusId,
      title: `${source.title} (${targetAy.name})`,
      code: source.code ? `${source.code}_${targetAy.name.replace(/\s+/g, '')}` : undefined,
      description: source.description,
      heads: source.heads.map((h: any) => ({
        feeCategoryId: h.feeCategoryId?._id || h.feeCategoryId,
        name: h.name,
        amount: h.amount,
        isOptional: h.isOptional,
        frequency: h.frequency,
      })),
      lateFeePolicy: source.lateFeePolicy,
      totalAmount: source.totalAmount,
      dueDate: source.dueDate,
      isActive: true,
    });

    return cloned;
  }

  public static async deleteFeeStructure(
    tenantId: string,
    schoolId: string,
    id: string
  ) {
    const structure = await this.getFeeStructureById(tenantId, schoolId, id);
    structure.isDeleted = true;
    await structure.save();

    return { success: true, message: 'Fee structure deleted successfully.' };
  }
}
