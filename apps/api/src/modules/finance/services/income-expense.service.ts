import { Types } from 'mongoose';
import { Income, Expense } from '@edusphere/database';
import { NotFoundError } from '@edusphere/common';
import type { IIncome, IExpense } from '@edusphere/types';

export class IncomeExpenseService {
  public static async createIncome(
    tenantId: string,
    schoolId: string,
    input: Partial<IIncome>,
    recordedByUserId: string
  ) {
    const income = await Income.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : undefined,
      title: input.title!.trim(),
      category: input.category!.trim(),
      amount: Math.round(input.amount!),
      date: input.date || new Date(),
      referenceNumber: input.referenceNumber?.trim(),
      description: input.description?.trim(),
      recordedBy: new Types.ObjectId(recordedByUserId),
    });

    return income;
  }

  public static async getIncomes(
    tenantId: string,
    schoolId: string,
    query: {
      category?: string;
      campusId?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };

    if (query.category) filter.category = query.category;
    if (query.campusId) filter.campusId = new Types.ObjectId(query.campusId);
    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) (filter.date as any).$gte = new Date(query.startDate);
      if (query.endDate) (filter.date as any).$lte = new Date(query.endDate);
    }

    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { referenceNumber: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Income.find(filter)
        .populate('recordedBy', 'firstName lastName email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Income.countDocuments(filter),
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

  public static async createExpense(
    tenantId: string,
    schoolId: string,
    input: Partial<IExpense>,
    approvedByUserId?: string
  ) {
    const expense = await Expense.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : undefined,
      title: input.title!.trim(),
      category: input.category!.trim(),
      amount: Math.round(input.amount!),
      date: input.date || new Date(),
      payee: input.payee!.trim(),
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber?.trim(),
      approvedBy: approvedByUserId ? new Types.ObjectId(approvedByUserId) : undefined,
    });

    return expense;
  }

  public static async getExpenses(
    tenantId: string,
    schoolId: string,
    query: {
      category?: string;
      campusId?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };

    if (query.category) filter.category = query.category;
    if (query.campusId) filter.campusId = new Types.ObjectId(query.campusId);
    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) (filter.date as any).$gte = new Date(query.startDate);
      if (query.endDate) (filter.date as any).$lte = new Date(query.endDate);
    }

    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { payee: { $regex: query.search, $options: 'i' } },
        { referenceNumber: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Expense.find(filter)
        .populate('approvedBy', 'firstName lastName email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Expense.countDocuments(filter),
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

  public static async deleteIncome(tenantId: string, schoolId: string, id: string) {
    const income = await Income.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    });

    if (!income) throw new NotFoundError('Income record not found.');
    income.isDeleted = true;
    await income.save();
    return { success: true };
  }

  public static async deleteExpense(tenantId: string, schoolId: string, id: string) {
    const expense = await Expense.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    });

    if (!expense) throw new NotFoundError('Expense record not found.');
    expense.isDeleted = true;
    await expense.save();
    return { success: true };
  }
}
