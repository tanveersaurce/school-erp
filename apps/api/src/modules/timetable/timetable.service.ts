import { Types, FilterQuery } from 'mongoose';
import {
  Period,
  Classroom,
  Timetable,
  TimetableEntry,
  AcademicClass,
  Teacher,
  Subject,
  School,
  Campus,
  AcademicYear,
  Class,
  Section,
  IPeriodDoc,
  IClassroomDoc,
  ITimetableDoc,
  ITimetableEntryDoc,
} from '@edusphere/database';
import {
  AcademicStatus,
  PeriodType,
  TimetableStatus,
  RoomType,
  TimetableEntryStatus,
  WeekDay,
  NotFoundError,
  ConflictError,
  BadRequestError,
  ValidationError,
} from '@edusphere/common';
import type {
  PeriodDto,
  CreatePeriodInput,
  UpdatePeriodInput,
  PeriodFilterQuery,
  ClassroomDto,
  CreateClassroomInput,
  UpdateClassroomInput,
  ClassroomFilterQuery,
  TimetableDto,
  CreateTimetableInput,
  UpdateTimetableInput,
  CloneTimetableInput,
  TimetableFilterQuery,
  TimetableEntryDto,
  CreateTimetableEntryInput,
  UpdateTimetableEntryInput,
  TimetableEntryFilterQuery,
  TimetableValidationReport,
  TeacherWorkloadSummary,
  TeacherWorkloadItem,
  ClassTimetableViewDto,
  TeacherTimetableViewDto,
  RoomTimetableViewDto,
  TimetableGridSlot,
  AuthContext,
} from '@edusphere/types';
import { recordAuditLog, RecordAuditInput } from '../../core/audit/audit.service.js';
import {
  schedulingEngine,
  DAY_NUMBER_TO_NAME,
  DAY_NUMBER_TO_WEEKDAY,
  CandidateSlotInput,
} from './scheduling.engine.js';

// =========================================================================
// Helper DTO Converters
// =========================================================================

function toPeriodDto(doc: any): PeriodDto {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    schoolId: doc.schoolId.toString(),
    campusId: doc.campusId?._id ? doc.campusId._id.toString() : doc.campusId?.toString(),
    campusName: doc.campusId?.name,
    name: doc.name,
    code: doc.code,
    sequence: doc.sequence,
    startTime: doc.startTime,
    endTime: doc.endTime,
    duration: doc.duration,
    type: doc.type,
    status: doc.status,
    isDeleted: doc.isDeleted ?? false,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toClassroomDto(doc: any): ClassroomDto {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    schoolId: doc.schoolId.toString(),
    campusId: doc.campusId?._id ? doc.campusId._id.toString() : doc.campusId?.toString(),
    campusName: doc.campusId?.name,
    name: doc.name,
    code: doc.code,
    roomNumber: doc.roomNumber,
    capacity: doc.capacity,
    roomType: doc.roomType,
    status: doc.status,
    isDeleted: doc.isDeleted ?? false,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toTimetableDto(doc: any, totalEntries?: number, totalClassesScheduled?: number): TimetableDto {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    schoolId: doc.schoolId.toString(),
    campusId: doc.campusId?._id ? doc.campusId._id.toString() : doc.campusId?.toString(),
    campusName: doc.campusId?.name,
    academicYearId: doc.academicYearId?._id ? doc.academicYearId._id.toString() : doc.academicYearId?.toString(),
    academicYearName: doc.academicYearId?.name,
    name: doc.name,
    code: doc.code,
    description: doc.description,
    status: doc.status,
    version: doc.version,
    isCurrent: doc.isCurrent ?? false,
    effectiveFrom: doc.effectiveFrom,
    effectiveTo: doc.effectiveTo,
    publishedAt: doc.publishedAt,
    publishedBy: doc.publishedBy?._id ? doc.publishedBy._id.toString() : doc.publishedBy?.toString(),
    publishedByName: doc.publishedBy?.firstName
      ? `${doc.publishedBy.firstName} ${doc.publishedBy.lastName || ''}`.trim()
      : undefined,
    archivedAt: doc.archivedAt,
    isDeleted: doc.isDeleted ?? false,
    totalEntries,
    totalClassesScheduled,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toTimetableEntryDto(doc: any): TimetableEntryDto {
  return {
    id: doc._id.toString(),
    tenantId: doc.tenantId.toString(),
    schoolId: doc.schoolId.toString(),
    timetableId: doc.timetableId?._id ? doc.timetableId._id.toString() : doc.timetableId?.toString(),
    academicClassId: doc.academicClassId?._id ? doc.academicClassId._id.toString() : doc.academicClassId?.toString(),
    className: doc.academicClassId?.classId?.name || doc.classId?.name,
    sectionName: doc.academicClassId?.sectionId?.name || doc.sectionId?.name,
    classId: doc.classId?._id ? doc.classId._id.toString() : doc.classId?.toString(),
    sectionId: doc.sectionId?._id ? doc.sectionId._id.toString() : doc.sectionId?.toString(),
    dayOfWeek: doc.dayOfWeek,
    dayName: DAY_NUMBER_TO_NAME[doc.dayOfWeek],
    periodId: doc.periodId?._id ? doc.periodId._id.toString() : doc.periodId?.toString(),
    periodName: doc.periodId?.name,
    periodSequence: doc.periodId?.sequence,
    startTime: doc.periodId?.startTime,
    endTime: doc.periodId?.endTime,
    duration: doc.periodId?.duration,
    periodType: doc.periodId?.type,
    subjectId: doc.subjectId?._id ? doc.subjectId._id.toString() : doc.subjectId?.toString(),
    subjectName: doc.subjectId?.name,
    subjectCode: doc.subjectId?.code,
    teacherId: doc.teacherId?._id ? doc.teacherId._id.toString() : doc.teacherId?.toString(),
    teacherName: doc.teacherId?.userId
      ? `${doc.teacherId.userId.firstName} ${doc.teacherId.userId.lastName || ''}`.trim()
      : undefined,
    teacherCode: (doc.teacherId as any)?.employeeId || (doc.teacherId as any)?.employeeNumber,
    teacherEmail: doc.teacherId?.userId?.email,
    roomId: doc.roomId?._id ? doc.roomId._id.toString() : doc.roomId?.toString(),
    roomName: doc.roomId?.name,
    roomCode: doc.roomId?.code,
    roomCapacity: doc.roomId?.capacity,
    status: doc.status,
    substituteTeacherId: doc.substituteTeacherId?._id
      ? doc.substituteTeacherId._id.toString()
      : doc.substituteTeacherId?.toString(),
    substituteTeacherName: doc.substituteTeacherId?.userId
      ? `${doc.substituteTeacherId.userId.firstName} ${doc.substituteTeacherId.userId.lastName || ''}`.trim()
      : undefined,
    substitutionNote: doc.substitutionNote,
    isDeleted: doc.isDeleted ?? false,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class TimetableService {
  // =========================================================================
  // 1. Period Management
  // =========================================================================

  async createPeriod(
    tenantId: string,
    campusId: string | undefined,
    input: CreatePeriodInput,
    meta?: Partial<RecordAuditInput>
  ): Promise<PeriodDto> {
    const tId = new Types.ObjectId(tenantId);
    const targetCampusId = campusId || input.campusId;

    const school = await School.findOne({ tenantId: tId, isDeleted: false }).lean();
    if (!school) {
      throw new NotFoundError('School context not found for tenant');
    }

    if (targetCampusId) {
      const campus = await Campus.findOne({
        _id: new Types.ObjectId(targetCampusId),
        tenantId: tId,
        isDeleted: false,
      }).lean();
      if (!campus) {
        throw new NotFoundError('Target campus not found');
      }
    }

    // Validate sequence / code uniqueness in tenant & campus
    const existingCode = await Period.findOne({
      tenantId: tId,
      campusId: targetCampusId ? new Types.ObjectId(targetCampusId) : undefined,
      code: input.code.toUpperCase().trim(),
      isDeleted: false,
    }).lean();

    if (existingCode) {
      throw new ConflictError(`Period with code '${input.code}' already exists.`);
    }

    // Calculate duration in minutes if not specified
    let duration = input.duration;
    if (!duration) {
      const [sh, sm] = input.startTime.split(':').map(Number);
      const [eh, em] = input.endTime.split(':').map(Number);
      duration = eh * 60 + em - (sh * 60 + sm);
      if (duration <= 0) {
        throw new BadRequestError('Period endTime must be after startTime.');
      }
    }

    const period = await Period.create({
      tenantId: tId,
      schoolId: school._id,
      campusId: targetCampusId ? new Types.ObjectId(targetCampusId) : undefined,
      name: input.name.trim(),
      code: input.code.toUpperCase().trim(),
      sequence: input.sequence,
      startTime: input.startTime.trim(),
      endTime: input.endTime.trim(),
      duration,
      type: input.type || PeriodType.TEACHING,
      status: input.status || AcademicStatus.ACTIVE,
    });

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: school._id.toString(),
        userId: meta.userId,
        action: 'CREATE',
        entity: 'Period',
        entityId: period._id.toString(),
        after: period.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return toPeriodDto(period);
  }

  async updatePeriod(
    tenantId: string,
    periodId: string,
    input: UpdatePeriodInput,
    meta?: Partial<RecordAuditInput>
  ): Promise<PeriodDto> {
    const tId = new Types.ObjectId(tenantId);
    const pId = new Types.ObjectId(periodId);

    const period = await Period.findOne({ _id: pId, tenantId: tId, isDeleted: false });
    if (!period) {
      throw new NotFoundError('Period not found');
    }

    const before = period.toObject();

    if (input.code && input.code.toUpperCase().trim() !== period.code) {
      const existing = await Period.findOne({
        tenantId: tId,
        campusId: period.campusId,
        code: input.code.toUpperCase().trim(),
        _id: { $ne: pId },
        isDeleted: false,
      }).lean();

      if (existing) {
        throw new ConflictError(`Period with code '${input.code}' already exists.`);
      }
      period.code = input.code.toUpperCase().trim();
    }

    if (input.name) period.name = input.name.trim();
    if (input.sequence !== undefined) period.sequence = input.sequence;
    if (input.startTime) period.startTime = input.startTime.trim();
    if (input.endTime) period.endTime = input.endTime.trim();
    if (input.type) period.type = input.type;
    if (input.status) period.status = input.status;

    if (input.startTime || input.endTime || input.duration) {
      if (input.duration) {
        period.duration = input.duration;
      } else {
        const [sh, sm] = period.startTime.split(':').map(Number);
        const [eh, em] = period.endTime.split(':').map(Number);
        const calcDuration = eh * 60 + em - (sh * 60 + sm);
        if (calcDuration <= 0) {
          throw new BadRequestError('Period endTime must be after startTime.');
        }
        period.duration = calcDuration;
      }
    }

    await period.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: period.schoolId.toString(),
        userId: meta.userId,
        action: 'UPDATE',
        entity: 'Period',
        entityId: period._id.toString(),
        before,
        after: period.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return toPeriodDto(period);
  }

  async deletePeriod(
    tenantId: string,
    periodId: string,
    meta?: Partial<RecordAuditInput>
  ): Promise<void> {
    const tId = new Types.ObjectId(tenantId);
    const pId = new Types.ObjectId(periodId);

    const period = await Period.findOne({ _id: pId, tenantId: tId, isDeleted: false });
    if (!period) {
      throw new NotFoundError('Period not found');
    }

    // Check if period is referenced in any active timetable entries
    const inUse = await TimetableEntry.findOne({
      tenantId: tId,
      periodId: pId,
      isDeleted: false,
    }).lean();

    if (inUse) {
      throw new BadRequestError('Cannot delete period that has scheduled timetable entries');
    }

    period.isDeleted = true;
    await period.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: period.schoolId.toString(),
        userId: meta.userId,
        action: 'DELETE',
        entity: 'Period',
        entityId: period._id.toString(),
        before: period.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }
  }

  async getPeriodById(tenantId: string, periodId: string): Promise<PeriodDto> {
    const period = await Period.findOne({
      _id: new Types.ObjectId(periodId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('campusId', 'name')
      .lean();

    if (!period) {
      throw new NotFoundError('Period not found');
    }

    return toPeriodDto(period);
  }

  async listPeriods(
    tenantId: string,
    filter: PeriodFilterQuery
  ): Promise<{ items: PeriodDto[]; totalRecords: number; page: number; limit: number; totalPages: number }> {
    const query: FilterQuery<IPeriodDoc> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filter.campusId) {
      query.campusId = new Types.ObjectId(filter.campusId);
    }
    if (filter.type) {
      query.type = filter.type;
    }
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { code: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 50));
    const skip = (page - 1) * limit;

    const [items, totalRecords] = await Promise.all([
      Period.find(query)
        .populate('campusId', 'name')
        .sort({ sequence: 1, startTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Period.countDocuments(query),
    ]);

    return {
      items: items.map(toPeriodDto),
      totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit) || 1,
    };
  }

  // =========================================================================
  // 2. Classroom (Room) Management
  // =========================================================================

  async createClassroom(
    tenantId: string,
    campusId: string | undefined,
    input: CreateClassroomInput,
    meta?: Partial<RecordAuditInput>
  ): Promise<ClassroomDto> {
    const tId = new Types.ObjectId(tenantId);
    const targetCampusId = campusId || input.campusId;

    if (!targetCampusId) {
      throw new BadRequestError('Campus ID is required to create a classroom.');
    }

    const school = await School.findOne({ tenantId: tId, isDeleted: false }).lean();
    if (!school) {
      throw new NotFoundError('School context not found');
    }

    const campus = await Campus.findOne({
      _id: new Types.ObjectId(targetCampusId),
      tenantId: tId,
      isDeleted: false,
    }).lean();
    if (!campus) {
      throw new NotFoundError('Target campus not found');
    }

    const existing = await Classroom.findOne({
      tenantId: tId,
      campusId: new Types.ObjectId(targetCampusId),
      code: input.code.toUpperCase().trim(),
      isDeleted: false,
    }).lean();

    if (existing) {
      throw new ConflictError(`Room with code '${input.code}' already exists in this campus.`);
    }

    const classroom = await Classroom.create({
      tenantId: tId,
      schoolId: school._id,
      campusId: new Types.ObjectId(targetCampusId),
      name: input.name.trim(),
      code: input.code.toUpperCase().trim(),
      roomNumber: input.roomNumber?.trim(),
      capacity: input.capacity !== undefined ? input.capacity : 40,
      roomType: input.roomType || RoomType.CLASSROOM,
      status: input.status || AcademicStatus.ACTIVE,
    });

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: school._id.toString(),
        userId: meta.userId,
        action: 'CREATE',
        entity: 'Classroom',
        entityId: classroom._id.toString(),
        after: classroom.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return toClassroomDto(classroom);
  }

  async updateClassroom(
    tenantId: string,
    classroomId: string,
    input: UpdateClassroomInput,
    meta?: Partial<RecordAuditInput>
  ): Promise<ClassroomDto> {
    const tId = new Types.ObjectId(tenantId);
    const rId = new Types.ObjectId(classroomId);

    const classroom = await Classroom.findOne({ _id: rId, tenantId: tId, isDeleted: false });
    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    const before = classroom.toObject();

    if (input.code && input.code.toUpperCase().trim() !== classroom.code) {
      const existing = await Classroom.findOne({
        tenantId: tId,
        campusId: classroom.campusId,
        code: input.code.toUpperCase().trim(),
        _id: { $ne: rId },
        isDeleted: false,
      }).lean();

      if (existing) {
        throw new ConflictError(`Room with code '${input.code}' already exists in this campus.`);
      }
      classroom.code = input.code.toUpperCase().trim();
    }

    if (input.name) classroom.name = input.name.trim();
    if (input.roomNumber !== undefined) classroom.roomNumber = input.roomNumber.trim();
    if (input.capacity !== undefined) classroom.capacity = input.capacity;
    if (input.roomType) classroom.roomType = input.roomType;
    if (input.status) classroom.status = input.status;

    await classroom.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: classroom.schoolId.toString(),
        userId: meta.userId,
        action: 'UPDATE',
        entity: 'Classroom',
        entityId: classroom._id.toString(),
        before,
        after: classroom.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return toClassroomDto(classroom);
  }

  async deleteClassroom(
    tenantId: string,
    classroomId: string,
    meta?: Partial<RecordAuditInput>
  ): Promise<void> {
    const tId = new Types.ObjectId(tenantId);
    const rId = new Types.ObjectId(classroomId);

    const classroom = await Classroom.findOne({ _id: rId, tenantId: tId, isDeleted: false });
    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    const inUse = await TimetableEntry.findOne({
      tenantId: tId,
      roomId: rId,
      isDeleted: false,
    }).lean();

    if (inUse) {
      throw new BadRequestError('Cannot delete classroom that has scheduled timetable entries');
    }

    classroom.isDeleted = true;
    await classroom.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: classroom.schoolId.toString(),
        userId: meta.userId,
        action: 'DELETE',
        entity: 'Classroom',
        entityId: classroom._id.toString(),
        before: classroom.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }
  }

  async getClassroomById(tenantId: string, classroomId: string): Promise<ClassroomDto> {
    const classroom = await Classroom.findOne({
      _id: new Types.ObjectId(classroomId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('campusId', 'name')
      .lean();

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    return toClassroomDto(classroom);
  }

  async listClassrooms(
    tenantId: string,
    filter: ClassroomFilterQuery
  ): Promise<{ items: ClassroomDto[]; totalRecords: number; page: number; limit: number; totalPages: number }> {
    const query: FilterQuery<IClassroomDoc> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filter.campusId) {
      query.campusId = new Types.ObjectId(filter.campusId);
    }
    if (filter.roomType) {
      query.roomType = filter.roomType;
    }
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { code: { $regex: filter.search, $options: 'i' } },
        { roomNumber: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 50));
    const skip = (page - 1) * limit;

    const [items, totalRecords] = await Promise.all([
      Classroom.find(query)
        .populate('campusId', 'name')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Classroom.countDocuments(query),
    ]);

    return {
      items: items.map(toClassroomDto),
      totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit) || 1,
    };
  }

  // =========================================================================
  // 3. Timetable Master & Versioning Management
  // =========================================================================

  async createTimetable(
    tenantId: string,
    campusId: string | undefined,
    input: CreateTimetableInput,
    meta?: Partial<RecordAuditInput>
  ): Promise<TimetableDto> {
    const tId = new Types.ObjectId(tenantId);
    const targetCampusId = campusId || input.campusId;

    if (!targetCampusId) {
      throw new BadRequestError('Campus ID is required');
    }

    const school = await School.findOne({ tenantId: tId, isDeleted: false }).lean();
    if (!school) {
      throw new NotFoundError('School context not found');
    }

    const [campus, academicYear] = await Promise.all([
      Campus.findOne({ _id: new Types.ObjectId(targetCampusId), tenantId: tId, isDeleted: false }).lean(),
      AcademicYear.findOne({
        _id: new Types.ObjectId(input.academicYearId),
        tenantId: tId,
        isDeleted: false,
      }).lean(),
    ]);

    if (!campus) throw new NotFoundError('Campus not found');
    if (!academicYear) throw new NotFoundError('Academic Year not found');

    // Determine version number
    const latestVersionDoc = await Timetable.findOne({
      tenantId: tId,
      campusId: campus._id,
      academicYearId: academicYear._id,
    })
      .sort({ version: -1 })
      .lean();

    const version = latestVersionDoc ? latestVersionDoc.version + 1 : 1;

    const timetable = await Timetable.create({
      tenantId: tId,
      schoolId: school._id,
      campusId: campus._id,
      academicYearId: academicYear._id,
      name: input.name.trim(),
      code: input.code?.toUpperCase().trim() || `TT-${campus.code || 'MAIN'}-V${version}`,
      description: input.description?.trim(),
      status: TimetableStatus.DRAFT,
      version,
      isCurrent: false,
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : undefined,
    });

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: school._id.toString(),
        userId: meta.userId,
        action: 'CREATE',
        entity: 'Timetable',
        entityId: timetable._id.toString(),
        after: timetable.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return toTimetableDto(timetable, 0, 0);
  }

  async updateTimetable(
    tenantId: string,
    timetableId: string,
    input: UpdateTimetableInput,
    meta?: Partial<RecordAuditInput>
  ): Promise<TimetableDto> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);

    const timetable = await Timetable.findOne({ _id: ttId, tenantId: tId, isDeleted: false });
    if (!timetable) {
      throw new NotFoundError('Timetable not found');
    }

    const before = timetable.toObject();

    if (input.name) timetable.name = input.name.trim();
    if (input.code) timetable.code = input.code.toUpperCase().trim();
    if (input.description !== undefined) timetable.description = input.description.trim();
    if (input.effectiveFrom) timetable.effectiveFrom = new Date(input.effectiveFrom);
    if (input.effectiveTo !== undefined) {
      timetable.effectiveTo = input.effectiveTo ? new Date(input.effectiveTo) : undefined;
    }

    await timetable.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: timetable.schoolId.toString(),
        userId: meta.userId,
        action: 'UPDATE',
        entity: 'Timetable',
        entityId: timetable._id.toString(),
        before,
        after: timetable.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return toTimetableDto(timetable);
  }

  async publishTimetable(
    tenantId: string,
    timetableId: string,
    meta?: Partial<RecordAuditInput>
  ): Promise<{ timetable: TimetableDto; validationReport: TimetableValidationReport }> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);

    const timetable = await Timetable.findOne({ _id: ttId, tenantId: tId, isDeleted: false });
    if (!timetable) {
      throw new NotFoundError('Timetable not found');
    }

    // Run strict server-side validation report
    const validationReport = await schedulingEngine.validateTimetable(tenantId, timetableId);
    if (!validationReport.isValid) {
      const errorMessages = validationReport.conflicts
        .filter((c) => c.severity === 'ERROR')
        .map((c) => `[${c.type}] ${c.message}`)
        .join('; ');
      throw new BadRequestError(`Cannot publish timetable with scheduling errors: ${errorMessages}`);
    }

    // Archive any currently PUBLISHED timetable for this campus and academic year
    await Timetable.updateMany(
      {
        tenantId: tId,
        campusId: timetable.campusId,
        academicYearId: timetable.academicYearId,
        status: TimetableStatus.PUBLISHED,
        _id: { $ne: timetable._id },
        isDeleted: false,
      },
      {
        $set: {
          status: TimetableStatus.ARCHIVED,
          isCurrent: false,
          archivedAt: new Date(),
        },
      }
    );

    timetable.status = TimetableStatus.PUBLISHED;
    timetable.isCurrent = true;
    timetable.publishedAt = new Date();
    if (meta?.userId) {
      timetable.publishedBy = new Types.ObjectId(meta.userId);
    }

    await timetable.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: timetable.schoolId.toString(),
        userId: meta.userId,
        action: 'PUBLISH',
        entity: 'Timetable',
        entityId: timetable._id.toString(),
        after: timetable.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    const [totalEntries, totalClassesScheduled] = await Promise.all([
      TimetableEntry.countDocuments({ timetableId: timetable._id, isDeleted: false }),
      TimetableEntry.distinct('academicClassId', { timetableId: timetable._id, isDeleted: false }).then(
        (arr) => arr.length
      ),
    ]);

    return {
      timetable: toTimetableDto(timetable, totalEntries, totalClassesScheduled),
      validationReport,
    };
  }

  async archiveTimetable(
    tenantId: string,
    timetableId: string,
    meta?: Partial<RecordAuditInput>
  ): Promise<TimetableDto> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);

    const timetable = await Timetable.findOne({ _id: ttId, tenantId: tId, isDeleted: false });
    if (!timetable) {
      throw new NotFoundError('Timetable not found');
    }

    timetable.status = TimetableStatus.ARCHIVED;
    timetable.isCurrent = false;
    timetable.archivedAt = new Date();
    await timetable.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: timetable.schoolId.toString(),
        userId: meta.userId,
        action: 'ARCHIVE',
        entity: 'Timetable',
        entityId: timetable._id.toString(),
        after: timetable.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return toTimetableDto(timetable);
  }

  async cloneTimetable(
    tenantId: string,
    timetableId: string,
    input: CloneTimetableInput,
    meta?: Partial<RecordAuditInput>
  ): Promise<TimetableDto> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);

    const sourceTimetable = await Timetable.findOne({ _id: ttId, tenantId: tId, isDeleted: false });
    if (!sourceTimetable) {
      throw new NotFoundError('Source timetable not found');
    }

    const latest = await Timetable.findOne({
      tenantId: tId,
      campusId: sourceTimetable.campusId,
      academicYearId: sourceTimetable.academicYearId,
    })
      .sort({ version: -1 })
      .lean();

    const newVersion = (latest?.version || sourceTimetable.version) + 1;

    // Create cloned timetable record in DRAFT status
    const clonedTimetable = await Timetable.create({
      tenantId: tId,
      schoolId: sourceTimetable.schoolId,
      campusId: sourceTimetable.campusId,
      academicYearId: sourceTimetable.academicYearId,
      name: input.name.trim(),
      code: `TT-CLONE-V${newVersion}`,
      description: `Cloned from ${sourceTimetable.name} (v${sourceTimetable.version})`,
      status: TimetableStatus.DRAFT,
      version: newVersion,
      isCurrent: false,
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : undefined,
    });

    // Deep copy all active entries
    const sourceEntries = await TimetableEntry.find({
      tenantId: tId,
      timetableId: sourceTimetable._id,
      isDeleted: false,
    }).lean();

    if (sourceEntries.length > 0) {
      const clonedEntries = sourceEntries.map((e) => ({
        tenantId: tId,
        schoolId: sourceTimetable.schoolId,
        timetableId: clonedTimetable._id,
        academicClassId: e.academicClassId,
        classId: e.classId,
        sectionId: e.sectionId,
        dayOfWeek: e.dayOfWeek,
        periodId: e.periodId,
        subjectId: e.subjectId,
        teacherId: e.teacherId,
        roomId: e.roomId,
        status: TimetableEntryStatus.ACTIVE,
      }));

      await TimetableEntry.insertMany(clonedEntries);
    }

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: clonedTimetable.schoolId.toString(),
        userId: meta.userId,
        action: 'CLONE',
        entity: 'Timetable',
        entityId: clonedTimetable._id.toString(),
        after: {
          clonedFromId: sourceTimetable._id.toString(),
          newTimetableId: clonedTimetable._id.toString(),
          copiedEntries: sourceEntries.length,
        },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return toTimetableDto(clonedTimetable, sourceEntries.length, 0);
  }

  async deleteTimetable(
    tenantId: string,
    timetableId: string,
    meta?: Partial<RecordAuditInput>
  ): Promise<void> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);

    const timetable = await Timetable.findOne({ _id: ttId, tenantId: tId, isDeleted: false });
    if (!timetable) {
      throw new NotFoundError('Timetable not found');
    }

    if (timetable.status === TimetableStatus.PUBLISHED) {
      throw new BadRequestError('Cannot delete a published timetable. Please archive it first.');
    }

    timetable.isDeleted = true;
    await timetable.save();

    // Soft delete associated entries
    await TimetableEntry.updateMany(
      { tenantId: tId, timetableId: ttId },
      { $set: { isDeleted: true } }
    );

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: timetable.schoolId.toString(),
        userId: meta.userId,
        action: 'DELETE',
        entity: 'Timetable',
        entityId: timetable._id.toString(),
        before: timetable.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }
  }

  async getTimetableById(tenantId: string, timetableId: string): Promise<TimetableDto> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);

    const timetable = await Timetable.findOne({ _id: ttId, tenantId: tId, isDeleted: false })
      .populate('campusId', 'name code')
      .populate('academicYearId', 'name code')
      .populate('publishedBy', 'firstName lastName')
      .lean();

    if (!timetable) {
      throw new NotFoundError('Timetable not found');
    }

    const [totalEntries, totalClassesScheduled] = await Promise.all([
      TimetableEntry.countDocuments({ timetableId: ttId, isDeleted: false }),
      TimetableEntry.distinct('academicClassId', { timetableId: ttId, isDeleted: false }).then(
        (arr) => arr.length
      ),
    ]);

    return toTimetableDto(timetable, totalEntries, totalClassesScheduled);
  }

  async listTimetables(
    tenantId: string,
    filter: TimetableFilterQuery
  ): Promise<{ items: TimetableDto[]; totalRecords: number; page: number; limit: number; totalPages: number }> {
    const query: FilterQuery<ITimetableDoc> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filter.campusId) {
      query.campusId = new Types.ObjectId(filter.campusId);
    }
    if (filter.academicYearId) {
      query.academicYearId = new Types.ObjectId(filter.academicYearId);
    }
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.isCurrent !== undefined) {
      query.isCurrent = filter.isCurrent;
    }
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { code: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 50));
    const skip = (page - 1) * limit;

    const [items, totalRecords] = await Promise.all([
      Timetable.find(query)
        .populate('campusId', 'name code')
        .populate('academicYearId', 'name code')
        .populate('publishedBy', 'firstName lastName')
        .sort({ updatedAt: -1, version: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Timetable.countDocuments(query),
    ]);

    const dtos = await Promise.all(
      items.map(async (doc) => {
        const [totalEntries, totalClassesScheduled] = await Promise.all([
          TimetableEntry.countDocuments({ timetableId: doc._id, isDeleted: false }),
          TimetableEntry.distinct('academicClassId', { timetableId: doc._id, isDeleted: false }).then(
            (arr) => arr.length
          ),
        ]);
        return toTimetableDto(doc, totalEntries, totalClassesScheduled);
      })
    );

    return {
      items: dtos,
      totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit) || 1,
    };
  }

  // =========================================================================
  // 4. Timetable Entries & Scheduling
  // =========================================================================

  async createTimetableEntry(
    tenantId: string,
    timetableId: string,
    input: CreateTimetableEntryInput,
    meta?: Partial<RecordAuditInput>
  ): Promise<TimetableEntryDto> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);

    const timetable = await Timetable.findOne({ _id: ttId, tenantId: tId, isDeleted: false });
    if (!timetable) {
      throw new NotFoundError('Timetable not found');
    }

    // 1. Run scheduling conflict engine validation
    const conflicts = await schedulingEngine.validateCandidateEntry(tenantId, timetableId, {
      academicClassId: input.academicClassId,
      dayOfWeek: input.dayOfWeek,
      periodId: input.periodId,
      subjectId: input.subjectId,
      teacherId: input.teacherId,
      roomId: input.roomId,
    });

    const fatalConflicts = conflicts.filter((c) => c.severity === 'ERROR');
    if (fatalConflicts.length > 0) {
      throw new ConflictError(fatalConflicts.map((c) => c.message).join('; '));
    }

    // 2. Fetch class and section IDs from AcademicClass
    const academicClass = await AcademicClass.findOne({
      _id: new Types.ObjectId(input.academicClassId),
      tenantId: tId,
      isDeleted: false,
    }).lean();

    if (!academicClass) {
      throw new NotFoundError('Academic Class not found');
    }

    // 3. Insert entry safely handling concurrency race conditions (Mongo 11000)
    let entry: any;
    try {
      entry = await TimetableEntry.create({
        tenantId: tId,
        schoolId: timetable.schoolId,
        timetableId: ttId,
        academicClassId: academicClass._id,
        classId: academicClass.classId,
        sectionId: academicClass.sectionId,
        dayOfWeek: input.dayOfWeek,
        periodId: new Types.ObjectId(input.periodId),
        subjectId: new Types.ObjectId(input.subjectId),
        teacherId: new Types.ObjectId(input.teacherId),
        roomId: input.roomId ? new Types.ObjectId(input.roomId) : undefined,
        status: TimetableEntryStatus.ACTIVE,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictError('Concurrent scheduling conflict detected. Slot is already booked.');
      }
      throw err;
    }

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: timetable.schoolId.toString(),
        userId: meta.userId,
        action: 'CREATE',
        entity: 'TimetableEntry',
        entityId: entry._id.toString(),
        after: entry.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    // Fetch populated entry for response
    const populated = await TimetableEntry.findById(entry._id)
      .populate('periodId')
      .populate('subjectId')
      .populate({ path: 'teacherId', populate: { path: 'userId' } })
      .populate('roomId')
      .populate({ path: 'academicClassId', populate: [{ path: 'classId' }, { path: 'sectionId' }] })
      .lean();

    return toTimetableEntryDto(populated);
  }

  async updateTimetableEntry(
    tenantId: string,
    timetableId: string,
    entryId: string,
    input: UpdateTimetableEntryInput,
    meta?: Partial<RecordAuditInput>
  ): Promise<TimetableEntryDto> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);
    const eId = new Types.ObjectId(entryId);

    const entry = await TimetableEntry.findOne({
      _id: eId,
      timetableId: ttId,
      tenantId: tId,
      isDeleted: false,
    });

    if (!entry) {
      throw new NotFoundError('Timetable entry not found');
    }

    const before = entry.toObject();

    // Prepare candidate data for conflict validation
    const candidateSubjectId = input.subjectId || entry.subjectId.toString();
    const candidateTeacherId = input.teacherId || entry.teacherId.toString();
    const candidateRoomId =
      input.roomId !== undefined
        ? input.roomId || null
        : entry.roomId?.toString() || null;
    const candidateDayOfWeek = input.dayOfWeek !== undefined ? input.dayOfWeek : entry.dayOfWeek;
    const candidatePeriodId = input.periodId || entry.periodId.toString();

    const conflicts = await schedulingEngine.validateCandidateEntry(tenantId, timetableId, {
      entryId: entry._id.toString(),
      academicClassId: entry.academicClassId.toString(),
      dayOfWeek: candidateDayOfWeek,
      periodId: candidatePeriodId,
      subjectId: candidateSubjectId,
      teacherId: candidateTeacherId,
      roomId: candidateRoomId,
    });

    const fatalConflicts = conflicts.filter((c) => c.severity === 'ERROR');
    if (fatalConflicts.length > 0) {
      throw new ConflictError(fatalConflicts.map((c) => c.message).join('; '));
    }

    if (input.subjectId) entry.subjectId = new Types.ObjectId(input.subjectId);
    if (input.teacherId) entry.teacherId = new Types.ObjectId(input.teacherId);
    if (input.roomId !== undefined) {
      entry.roomId = input.roomId ? new Types.ObjectId(input.roomId) : undefined;
    }
    if (input.dayOfWeek !== undefined) entry.dayOfWeek = input.dayOfWeek;
    if (input.periodId) entry.periodId = new Types.ObjectId(input.periodId);
    if (input.status) entry.status = input.status;
    if (input.substituteTeacherId !== undefined) {
      entry.substituteTeacherId = input.substituteTeacherId
        ? new Types.ObjectId(input.substituteTeacherId)
        : undefined;
    }
    if (input.substitutionNote !== undefined) {
      entry.substitutionNote = input.substitutionNote;
    }

    try {
      await entry.save();
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictError('Concurrent scheduling conflict detected. Slot is already booked.');
      }
      throw err;
    }

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: entry.schoolId.toString(),
        userId: meta.userId,
        action: 'UPDATE',
        entity: 'TimetableEntry',
        entityId: entry._id.toString(),
        before,
        after: entry.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    const populated = await TimetableEntry.findById(entry._id)
      .populate('periodId')
      .populate('subjectId')
      .populate({ path: 'teacherId', populate: { path: 'userId' } })
      .populate('roomId')
      .populate({ path: 'academicClassId', populate: [{ path: 'classId' }, { path: 'sectionId' }] })
      .lean();

    return toTimetableEntryDto(populated);
  }

  async deleteTimetableEntry(
    tenantId: string,
    timetableId: string,
    entryId: string,
    meta?: Partial<RecordAuditInput>
  ): Promise<void> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);
    const eId = new Types.ObjectId(entryId);

    const entry = await TimetableEntry.findOne({
      _id: eId,
      timetableId: ttId,
      tenantId: tId,
      isDeleted: false,
    });

    if (!entry) {
      throw new NotFoundError('Timetable entry not found');
    }

    entry.isDeleted = true;
    await entry.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: entry.schoolId.toString(),
        userId: meta.userId,
        action: 'DELETE',
        entity: 'TimetableEntry',
        entityId: entry._id.toString(),
        before: entry.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }
  }

  async getTimetableEntries(
    tenantId: string,
    timetableId: string,
    filter?: TimetableEntryFilterQuery
  ): Promise<TimetableEntryDto[]> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);

    const query: FilterQuery<ITimetableEntryDoc> = {
      tenantId: tId,
      timetableId: ttId,
      isDeleted: false,
    };

    if (filter?.academicClassId) {
      query.academicClassId = new Types.ObjectId(filter.academicClassId);
    }
    if (filter?.teacherId) {
      query.teacherId = new Types.ObjectId(filter.teacherId);
    }
    if (filter?.roomId) {
      query.roomId = new Types.ObjectId(filter.roomId);
    }
    if (filter?.dayOfWeek !== undefined) {
      query.dayOfWeek = filter.dayOfWeek;
    }
    if (filter?.periodId) {
      query.periodId = new Types.ObjectId(filter.periodId);
    }
    if (filter?.subjectId) {
      query.subjectId = new Types.ObjectId(filter.subjectId);
    }

    const entries = await TimetableEntry.find(query)
      .populate('periodId')
      .populate('subjectId')
      .populate({ path: 'teacherId', populate: { path: 'userId' } })
      .populate('roomId')
      .populate({ path: 'academicClassId', populate: [{ path: 'classId' }, { path: 'sectionId' }] })
      .sort({ dayOfWeek: 1, 'periodId.sequence': 1 })
      .lean();

    return entries.map(toTimetableEntryDto);
  }

  // =========================================================================
  // 5. Validation, Conflicts & Workload Aggregations
  // =========================================================================

  async validateTimetable(
    tenantId: string,
    timetableId: string
  ): Promise<TimetableValidationReport> {
    return schedulingEngine.validateTimetable(tenantId, timetableId);
  }

  async validateCandidateSlot(
    tenantId: string,
    timetableId: string,
    candidate: CandidateSlotInput
  ) {
    const conflicts = await schedulingEngine.validateCandidateEntry(tenantId, timetableId, candidate);
    const isValid = !conflicts.some((c) => c.severity === 'ERROR');
    return { isValid, conflicts };
  }

  async getTeacherWorkload(
    tenantId: string,
    timetableId: string
  ): Promise<TeacherWorkloadSummary> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);

    const timetable = await Timetable.findOne({ _id: ttId, tenantId: tId, isDeleted: false })
      .populate('academicYearId', 'name')
      .lean();

    if (!timetable) {
      throw new NotFoundError('Timetable not found');
    }

    const entries = await TimetableEntry.find({
      tenantId: tId,
      timetableId: ttId,
      status: TimetableEntryStatus.ACTIVE,
      isDeleted: false,
    })
      .populate({ path: 'teacherId', populate: { path: 'userId' } })
      .populate('subjectId', 'name code')
      .populate({ path: 'academicClassId', populate: [{ path: 'classId' }, { path: 'sectionId' }] })
      .lean();

    const teacherMap = new Map<string, TeacherWorkloadItem>();

    for (const e of entries) {
      const teacher = e.teacherId as any;
      if (!teacher) continue;
      const teacherId = teacher._id.toString();

      if (!teacherMap.has(teacherId)) {
        teacherMap.set(teacherId, {
          teacherId,
          teacherName: teacher.userId
            ? `${teacher.userId.firstName} ${teacher.userId.lastName || ''}`.trim()
            : 'Unknown Teacher',
          teacherCode: (teacher as any).employeeId || (teacher as any).employeeNumber,
          email: teacher.userId?.email,
          totalPeriodsPerWeek: 0,
          bySubject: [],
          byClass: [],
          byDay: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
        });
      }

      const item = teacherMap.get(teacherId)!;
      item.totalPeriodsPerWeek += 1;
      item.byDay[e.dayOfWeek] = (item.byDay[e.dayOfWeek] || 0) + 1;

      // Subject breakdown
      const subject = e.subjectId as any;
      if (subject) {
        const subId = subject._id.toString();
        let subItem = item.bySubject.find((s) => s.subjectId === subId);
        if (!subItem) {
          subItem = {
            subjectId: subId,
            subjectName: subject.name,
            subjectCode: subject.code,
            periodCount: 0,
          };
          item.bySubject.push(subItem);
        }
        subItem.periodCount += 1;
      }

      // Class breakdown
      const ac = e.academicClassId as any;
      if (ac) {
        const acId = ac._id.toString();
        let clItem = item.byClass.find((c) => c.academicClassId === acId);
        if (!clItem) {
          clItem = {
            academicClassId: acId,
            className: ac.classId?.name || '',
            sectionName: ac.sectionId?.name || '',
            periodCount: 0,
          };
          item.byClass.push(clItem);
        }
        clItem.periodCount += 1;
      }
    }

    const workloadList = Array.from(teacherMap.values()).sort(
      (a, b) => b.totalPeriodsPerWeek - a.totalPeriodsPerWeek
    );
    const totalTeachers = workloadList.length;
    const averagePeriods =
      totalTeachers > 0
        ? Math.round((entries.length / totalTeachers) * 10) / 10
        : 0;

    return {
      timetableId,
      academicYearName: (timetable.academicYearId as any)?.name,
      totalTeachers,
      averagePeriodsPerTeacher: averagePeriods,
      workload: workloadList,
    };
  }

  // =========================================================================
  // 6. Structured 2D Weekly Matrix Views
  // =========================================================================

  private async getWorkingDaysForSchool(tenantId: Types.ObjectId): Promise<{ dayOfWeek: number; dayName: string }[]> {
    const school = await School.findOne({ tenantId, isDeleted: false }).lean();
    const configDays: WeekDay[] =
      school?.settings?.workingDays || [
        WeekDay.MONDAY,
        WeekDay.TUESDAY,
        WeekDay.WEDNESDAY,
        WeekDay.THURSDAY,
        WeekDay.FRIDAY,
      ];

    const weekdayToNumber: { [k in WeekDay]?: number } = {
      [WeekDay.MONDAY]: 1,
      [WeekDay.TUESDAY]: 2,
      [WeekDay.WEDNESDAY]: 3,
      [WeekDay.THURSDAY]: 4,
      [WeekDay.FRIDAY]: 5,
      [WeekDay.SATURDAY]: 6,
      [WeekDay.SUNDAY]: 7,
    };

    return configDays
      .map((d) => ({
        dayOfWeek: weekdayToNumber[d] || 1,
        dayName: DAY_NUMBER_TO_NAME[weekdayToNumber[d] || 1],
      }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  async getClassTimetableView(
    tenantId: string,
    timetableId: string,
    academicClassId: string
  ): Promise<ClassTimetableViewDto> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);
    const acId = new Types.ObjectId(academicClassId);

    const [timetable, academicClass] = await Promise.all([
      Timetable.findOne({ _id: ttId, tenantId: tId, isDeleted: false })
        .populate('campusId', 'name')
        .populate('academicYearId', 'name')
        .lean(),
      AcademicClass.findOne({ _id: acId, tenantId: tId, isDeleted: false })
        .populate('classId', 'name code')
        .populate('sectionId', 'name code')
        .populate({ path: 'classTeacherId', populate: { path: 'userId' } })
        .lean(),
    ]);

    if (!timetable) throw new NotFoundError('Timetable not found');
    if (!academicClass) throw new NotFoundError('Academic Class not found');

    const workingDays = await this.getWorkingDaysForSchool(tId);

    // Fetch periods for this campus
    const periods = await Period.find({
      tenantId: tId,
      campusId: timetable.campusId,
      status: AcademicStatus.ACTIVE,
      isDeleted: false,
    })
      .sort({ sequence: 1, startTime: 1 })
      .lean();

    // Fetch all entries for this class
    const entries = await TimetableEntry.find({
      tenantId: tId,
      timetableId: ttId,
      academicClassId: acId,
      status: TimetableEntryStatus.ACTIVE,
      isDeleted: false,
    })
      .populate('periodId')
      .populate('subjectId')
      .populate({ path: 'teacherId', populate: { path: 'userId' } })
      .populate('roomId')
      .lean();

    // Index entries by periodId_dayOfWeek
    const entryMap = new Map<string, any>();
    for (const e of entries) {
      const pId = (e.periodId as any)?._id?.toString() || (e.periodId as any)?.toString();
      entryMap.set(`${pId}_${e.dayOfWeek}`, e);
    }

    // Build 2D matrix
    const grid: { [periodId: string]: { [dayOfWeek: number]: TimetableGridSlot } } = {};

    for (const p of periods) {
      const pId = p._id.toString();
      grid[pId] = {};

      for (const wd of workingDays) {
        const found = entryMap.get(`${pId}_${wd.dayOfWeek}`);
        const isBreak = p.type !== PeriodType.TEACHING;

        if (found) {
          const subject = found.subjectId as any;
          const teacher = found.teacherId as any;
          const room = found.roomId as any;

          grid[pId][wd.dayOfWeek] = {
            entryId: found._id.toString(),
            academicClassId: academicClass._id.toString(),
            className: (academicClass.classId as any)?.name,
            sectionName: (academicClass.sectionId as any)?.name,
            subjectId: subject?._id?.toString(),
            subjectName: subject?.name,
            subjectCode: subject?.code,
            teacherId: teacher?._id?.toString(),
            teacherName: teacher?.userId
              ? `${teacher.userId.firstName} ${teacher.userId.lastName || ''}`.trim()
              : undefined,
            teacherCode: teacher?.employeeNumber,
            roomId: room?._id?.toString(),
            roomName: room?.name,
            roomCode: room?.code,
            periodId: pId,
            periodName: p.name,
            periodSequence: p.sequence,
            periodType: p.type,
            startTime: p.startTime,
            endTime: p.endTime,
            dayOfWeek: wd.dayOfWeek,
            dayName: wd.dayName,
            isBreak: false,
          };
        } else {
          grid[pId][wd.dayOfWeek] = {
            periodId: pId,
            periodName: p.name,
            periodSequence: p.sequence,
            periodType: p.type,
            startTime: p.startTime,
            endTime: p.endTime,
            dayOfWeek: wd.dayOfWeek,
            dayName: wd.dayName,
            isBreak,
          };
        }
      }
    }

    const classTeacher = academicClass.classTeacherId as any;
    const classTeacherName = classTeacher?.userId
      ? `${classTeacher.userId.firstName} ${classTeacher.userId.lastName || ''}`.trim()
      : undefined;

    return {
      timetableId,
      timetableName: timetable.name,
      academicClassId,
      className: (academicClass.classId as any)?.name || '',
      sectionName: (academicClass.sectionId as any)?.name || '',
      campusName: (timetable.campusId as any)?.name,
      academicYearName: (timetable.academicYearId as any)?.name,
      classTeacherName,
      workingDays,
      periods: periods.map(toPeriodDto),
      grid,
    };
  }

  async getTeacherTimetableView(
    tenantId: string,
    timetableId: string,
    teacherId: string
  ): Promise<TeacherTimetableViewDto> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);
    const tchId = new Types.ObjectId(teacherId);

    const [timetable, teacher] = await Promise.all([
      Timetable.findOne({ _id: ttId, tenantId: tId, isDeleted: false }).lean(),
      Teacher.findOne({ _id: tchId, tenantId: tId, isDeleted: false })
        .populate('userId', 'firstName lastName email')
        .lean(),
    ]);

    if (!timetable) throw new NotFoundError('Timetable not found');
    if (!teacher) throw new NotFoundError('Teacher not found');

    const workingDays = await this.getWorkingDaysForSchool(tId);

    const periods = await Period.find({
      tenantId: tId,
      campusId: timetable.campusId,
      status: AcademicStatus.ACTIVE,
      isDeleted: false,
    })
      .sort({ sequence: 1, startTime: 1 })
      .lean();

    const entries = await TimetableEntry.find({
      tenantId: tId,
      timetableId: ttId,
      teacherId: tchId,
      status: TimetableEntryStatus.ACTIVE,
      isDeleted: false,
    })
      .populate('periodId')
      .populate('subjectId')
      .populate({ path: 'academicClassId', populate: [{ path: 'classId' }, { path: 'sectionId' }] })
      .populate('roomId')
      .lean();

    const entryMap = new Map<string, any>();
    for (const e of entries) {
      const pId = (e.periodId as any)?._id?.toString() || (e.periodId as any)?.toString();
      entryMap.set(`${pId}_${e.dayOfWeek}`, e);
    }

    const grid: { [periodId: string]: { [dayOfWeek: number]: TimetableGridSlot } } = {};

    for (const p of periods) {
      const pId = p._id.toString();
      grid[pId] = {};

      for (const wd of workingDays) {
        const found = entryMap.get(`${pId}_${wd.dayOfWeek}`);
        const isBreak = p.type !== PeriodType.TEACHING;

        if (found) {
          const ac = found.academicClassId as any;
          const subject = found.subjectId as any;
          const room = found.roomId as any;

          grid[pId][wd.dayOfWeek] = {
            entryId: found._id.toString(),
            academicClassId: ac?._id?.toString(),
            className: ac?.classId?.name,
            sectionName: ac?.sectionId?.name,
            subjectId: subject?._id?.toString(),
            subjectName: subject?.name,
            subjectCode: subject?.code,
            teacherId: teacher._id.toString(),
            teacherName: teacher.userId
              ? `${(teacher.userId as any).firstName} ${(teacher.userId as any).lastName || ''}`.trim()
              : undefined,
            teacherCode: (teacher as any).employeeId || (teacher as any).employeeNumber,
            roomId: room?._id?.toString(),
            roomName: room?.name,
            roomCode: room?.code,
            periodId: pId,
            periodName: p.name,
            periodSequence: p.sequence,
            periodType: p.type,
            startTime: p.startTime,
            endTime: p.endTime,
            dayOfWeek: wd.dayOfWeek,
            dayName: wd.dayName,
            isBreak: false,
          };
        } else {
          grid[pId][wd.dayOfWeek] = {
            periodId: pId,
            periodName: p.name,
            periodSequence: p.sequence,
            periodType: p.type,
            startTime: p.startTime,
            endTime: p.endTime,
            dayOfWeek: wd.dayOfWeek,
            dayName: wd.dayName,
            isBreak,
          };
        }
      }
    }

    const teacherName = teacher.userId
      ? `${(teacher.userId as any).firstName} ${(teacher.userId as any).lastName || ''}`.trim()
      : 'Teacher';

    return {
      timetableId,
      timetableName: timetable.name,
      teacherId,
      teacherName,
      teacherCode: (teacher as any).employeeId || (teacher as any).employeeNumber,
      totalWeeklyPeriods: entries.length,
      workingDays,
      periods: periods.map(toPeriodDto),
      grid,
    };
  }

  async getRoomTimetableView(
    tenantId: string,
    timetableId: string,
    roomId: string
  ): Promise<RoomTimetableViewDto> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);
    const rId = new Types.ObjectId(roomId);

    const [timetable, classroom] = await Promise.all([
      Timetable.findOne({ _id: ttId, tenantId: tId, isDeleted: false }).lean(),
      Classroom.findOne({ _id: rId, tenantId: tId, isDeleted: false }).lean(),
    ]);

    if (!timetable) throw new NotFoundError('Timetable not found');
    if (!classroom) throw new NotFoundError('Classroom not found');

    const workingDays = await this.getWorkingDaysForSchool(tId);

    const periods = await Period.find({
      tenantId: tId,
      campusId: timetable.campusId,
      status: AcademicStatus.ACTIVE,
      isDeleted: false,
    })
      .sort({ sequence: 1, startTime: 1 })
      .lean();

    const entries = await TimetableEntry.find({
      tenantId: tId,
      timetableId: ttId,
      roomId: rId,
      status: TimetableEntryStatus.ACTIVE,
      isDeleted: false,
    })
      .populate('periodId')
      .populate('subjectId')
      .populate({ path: 'academicClassId', populate: [{ path: 'classId' }, { path: 'sectionId' }] })
      .populate({ path: 'teacherId', populate: { path: 'userId' } })
      .lean();

    const entryMap = new Map<string, any>();
    for (const e of entries) {
      const pId = (e.periodId as any)?._id?.toString() || (e.periodId as any)?.toString();
      entryMap.set(`${pId}_${e.dayOfWeek}`, e);
    }

    const grid: { [periodId: string]: { [dayOfWeek: number]: TimetableGridSlot } } = {};

    for (const p of periods) {
      const pId = p._id.toString();
      grid[pId] = {};

      for (const wd of workingDays) {
        const found = entryMap.get(`${pId}_${wd.dayOfWeek}`);
        const isBreak = p.type !== PeriodType.TEACHING;

        if (found) {
          const ac = found.academicClassId as any;
          const subject = found.subjectId as any;
          const teacher = found.teacherId as any;

          grid[pId][wd.dayOfWeek] = {
            entryId: found._id.toString(),
            academicClassId: ac?._id?.toString(),
            className: ac?.classId?.name,
            sectionName: ac?.sectionId?.name,
            subjectId: subject?._id?.toString(),
            subjectName: subject?.name,
            subjectCode: subject?.code,
            teacherId: teacher?._id?.toString(),
            teacherName: teacher?.userId
              ? `${teacher.userId.firstName} ${teacher.userId.lastName || ''}`.trim()
              : undefined,
            teacherCode: teacher?.employeeNumber,
            roomId: classroom._id.toString(),
            roomName: classroom.name,
            roomCode: classroom.code,
            periodId: pId,
            periodName: p.name,
            periodSequence: p.sequence,
            periodType: p.type,
            startTime: p.startTime,
            endTime: p.endTime,
            dayOfWeek: wd.dayOfWeek,
            dayName: wd.dayName,
            isBreak: false,
          };
        } else {
          grid[pId][wd.dayOfWeek] = {
            periodId: pId,
            periodName: p.name,
            periodSequence: p.sequence,
            periodType: p.type,
            startTime: p.startTime,
            endTime: p.endTime,
            dayOfWeek: wd.dayOfWeek,
            dayName: wd.dayName,
            isBreak,
          };
        }
      }
    }

    return {
      timetableId,
      timetableName: timetable.name,
      roomId,
      roomName: classroom.name,
      roomCode: classroom.code,
      roomType: classroom.roomType,
      capacity: classroom.capacity,
      workingDays,
      periods: periods.map(toPeriodDto),
      grid,
    };
  }

  async getMySchedule(tenantId: string, auth: AuthContext): Promise<TeacherTimetableViewDto> {
    const tId = new Types.ObjectId(tenantId);
    const uId = new Types.ObjectId(auth.userId);

    const teacher = await Teacher.findOne({
      tenantId: tId,
      userId: uId,
      isDeleted: false,
    }).lean();

    if (!teacher) {
      throw new NotFoundError('Teacher profile not found for authenticated user');
    }

    const campusQuery = auth.campusId ? { campusId: new Types.ObjectId(auth.campusId) } : {};

    // Find the current published timetable
    let timetable = await Timetable.findOne({
      tenantId: tId,
      ...campusQuery,
      status: TimetableStatus.PUBLISHED,
      isCurrent: true,
      isDeleted: false,
    }).lean();

    if (!timetable) {
      timetable = await Timetable.findOne({
        tenantId: tId,
        ...campusQuery,
        status: TimetableStatus.PUBLISHED,
        isDeleted: false,
      })
        .sort({ updatedAt: -1 })
        .lean();
    }

    if (!timetable) {
      throw new NotFoundError('No active published timetable found');
    }

    return this.getTeacherTimetableView(tenantId, timetable._id.toString(), teacher._id.toString());
  }
}

export const timetableService = new TimetableService();
