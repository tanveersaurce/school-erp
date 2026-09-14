import { Types } from 'mongoose';
import {
  Holiday,
  School,
} from '@edusphere/database';
import {
  CreateHolidayInput,
  UpdateHolidayInput,
  IHoliday,
} from '@edusphere/types';
import {
  NotFoundError,
  ConflictError,
  WeekDay,
} from '@edusphere/common';
import { TenantContext } from '@edusphere/types';

export interface NonWorkingDayCheckResult {
  isNonWorking: boolean;
  reason?: string;
  type?: 'WEEKEND' | 'HOLIDAY';
}

export class HolidayService {
  /**
   * Declare a new academic calendar holiday
   */
  async createHoliday(
    context: TenantContext,
    input: CreateHolidayInput
  ): Promise<IHoliday> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const schoolId = context.schoolId ? new Types.ObjectId(context.schoolId) : undefined;
    const campusId = input.campusId ? new Types.ObjectId(input.campusId) : undefined;
    const academicYearId = new Types.ObjectId(input.academicYearId);

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    const existing = await Holiday.findOne({
      tenantId,
      academicYearId,
      campusId,
      startDate,
      name: input.name,
      isDeleted: false,
    });

    if (existing) {
      throw new ConflictError(`Holiday '${input.name}' on this date already exists.`);
    }

    const doc = await Holiday.create({
      tenantId,
      schoolId: schoolId || (await this.resolveDefaultSchoolId(tenantId)),
      campusId,
      academicYearId,
      name: input.name,
      startDate,
      endDate,
      type: input.type,
      description: input.description,
    });

    return this.mapToDto(doc);
  }

  /**
   * List holidays for an academic year and optional campus
   */
  async listHolidays(
    context: TenantContext,
    academicYearId: string,
    campusId?: string
  ): Promise<IHoliday[]> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const filter: any = {
      tenantId,
      academicYearId: new Types.ObjectId(academicYearId),
      isDeleted: false,
    };

    if (campusId) {
      filter.$or = [
        { campusId: new Types.ObjectId(campusId) },
        { campusId: null },
        { campusId: { $exists: false } },
      ];
    }

    const docs = await Holiday.find(filter).sort({ startDate: 1 });
    return docs.map((d) => this.mapToDto(d));
  }

  /**
   * Remove a declared holiday
   */
  async deleteHoliday(context: TenantContext, holidayId: string): Promise<void> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const doc = await Holiday.findOne({ _id: holidayId, tenantId, isDeleted: false });
    if (!doc) {
      throw new NotFoundError('Holiday not found');
    }
    doc.isDeleted = true;
    await doc.save();
  }

  /**
   * Determine if a specific date is a weekend or declared holiday
   */
  async checkNonWorkingDay(
    tenantId: string | Types.ObjectId,
    date: Date,
    campusId?: string | Types.ObjectId,
    academicYearId?: string | Types.ObjectId
  ): Promise<NonWorkingDayCheckResult> {
    const tId = typeof tenantId === 'string' ? new Types.ObjectId(tenantId) : tenantId;

    // 1. Check School configured working days (Monday-Friday default)
    const school = await School.findOne({ tenantId: tId, isDeleted: false });
    const workingDays = school?.settings?.workingDays || [
      WeekDay.MONDAY,
      WeekDay.TUESDAY,
      WeekDay.WEDNESDAY,
      WeekDay.THURSDAY,
      WeekDay.FRIDAY,
    ];

    // Day of week mapping: JS getDay() returns 0=Sunday, 1=Monday, ..., 6=Saturday
    const dayMap: Record<number, WeekDay> = {
      0: WeekDay.SUNDAY,
      1: WeekDay.MONDAY,
      2: WeekDay.TUESDAY,
      3: WeekDay.WEDNESDAY,
      4: WeekDay.THURSDAY,
      5: WeekDay.FRIDAY,
      6: WeekDay.SATURDAY,
    };

    const currentDayOfWeek = dayMap[date.getDay()];
    if (!workingDays.includes(currentDayOfWeek)) {
      return {
        isNonWorking: true,
        reason: `Non-working day (${currentDayOfWeek})`,
        type: 'WEEKEND',
      };
    }

    // 2. Check declared Holidays
    const holidayFilter: any = {
      tenantId: tId,
      startDate: { $lte: date },
      endDate: { $gte: date },
      isDeleted: false,
    };

    if (campusId) {
      holidayFilter.$or = [
        { campusId: typeof campusId === 'string' ? new Types.ObjectId(campusId) : campusId },
        { campusId: null },
        { campusId: { $exists: false } },
      ];
    }

    const declaredHoliday = await Holiday.findOne(holidayFilter);
    if (declaredHoliday) {
      return {
        isNonWorking: true,
        reason: declaredHoliday.name,
        type: 'HOLIDAY',
      };
    }

    return { isNonWorking: false };
  }

  private async resolveDefaultSchoolId(tenantId: Types.ObjectId): Promise<Types.ObjectId> {
    const school = await School.findOne({ tenantId, isDeleted: false });
    if (!school) {
      throw new NotFoundError('School profile not found for tenant');
    }
    return school._id;
  }

  private mapToDto(doc: any): IHoliday {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId?.toString(),
      campusId: doc.campusId?.toString(),
      academicYearId: doc.academicYearId.toString(),
      name: doc.name,
      startDate: doc.startDate,
      endDate: doc.endDate,
      type: doc.type,
      description: doc.description,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export const holidayService = new HolidayService();
