import { Request, Response, NextFunction } from 'express';
import { timetableService } from './timetable.service.js';
import {
  createPeriodSchema,
  updatePeriodSchema,
  periodFilterSchema,
  createClassroomSchema,
  updateClassroomSchema,
  classroomFilterSchema,
  createTimetableSchema,
  updateTimetableSchema,
  cloneTimetableSchema,
  timetableFilterSchema,
  createTimetableEntrySchema,
  updateTimetableEntrySchema,
  timetableEntryFilterSchema,
  validateCandidateSlotSchema,
} from './timetable.validator.js';
import { BadRequestError } from '@edusphere/common';

const ApiResponse = {
  success: <T>(data: T, message = 'Success', meta?: Record<string, any>) => ({
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: meta?.requestId || '',
      ...meta,
    },
  }),
  paginated: <T>(
    items: T[],
    totalRecords: number,
    page: number,
    limit: number,
    totalPages: number,
    message = 'Success'
  ) => ({
    success: true,
    message,
    data: items,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: '',
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  }),
};

export class TimetableController {
  private getMeta(req: Request) {
    return {
      tenantId: req.auth!.tenantId,
      userId: req.auth!.userId,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: (req as any).id,
    };
  }

  // =========================================================================
  // 1. Period Handlers
  // =========================================================================

  async createPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createPeriodSchema.parse(req.body);
      const tenantId = req.auth!.tenantId;
      const campusId = req.auth!.campusId || parsed.campusId;

      const result = await timetableService.createPeriod(tenantId, campusId, parsed, this.getMeta(req));
      res.status(201).json(ApiResponse.success(result, 'Period created successfully'));
    } catch (err) {
      next(err);
    }
  }

  async updatePeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updatePeriodSchema.parse(req.body);
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;

      const result = await timetableService.updatePeriod(tenantId, id, parsed, this.getMeta(req));
      res.json(ApiResponse.success(result, 'Period updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  async deletePeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;

      await timetableService.deletePeriod(tenantId, id, this.getMeta(req));
      res.json(ApiResponse.success(null, 'Period deleted successfully'));
    } catch (err) {
      next(err);
    }
  }

  async getPeriodById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;

      const result = await timetableService.getPeriodById(tenantId, id);
      res.json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  async listPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = periodFilterSchema.parse(req.query);
      const tenantId = req.auth!.tenantId;
      if (req.auth!.campusId && !parsed.campusId) {
        parsed.campusId = req.auth!.campusId;
      }

      const result = await timetableService.listPeriods(tenantId, parsed);
      res.json(
        ApiResponse.paginated(
          result.items,
          result.totalRecords,
          result.page,
          result.limit,
          result.totalPages
        )
      );
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 2. Classroom (Room) Handlers
  // =========================================================================

  async createClassroom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createClassroomSchema.parse(req.body);
      const tenantId = req.auth!.tenantId;
      const campusId = req.auth!.campusId || parsed.campusId;

      const result = await timetableService.createClassroom(tenantId, campusId, parsed, this.getMeta(req));
      res.status(201).json(ApiResponse.success(result, 'Classroom created successfully'));
    } catch (err) {
      next(err);
    }
  }

  async updateClassroom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateClassroomSchema.parse(req.body);
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;

      const result = await timetableService.updateClassroom(tenantId, id, parsed, this.getMeta(req));
      res.json(ApiResponse.success(result, 'Classroom updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  async deleteClassroom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;

      await timetableService.deleteClassroom(tenantId, id, this.getMeta(req));
      res.json(ApiResponse.success(null, 'Classroom deleted successfully'));
    } catch (err) {
      next(err);
    }
  }

  async getClassroomById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;

      const result = await timetableService.getClassroomById(tenantId, id);
      res.json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  async listClassrooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = classroomFilterSchema.parse(req.query);
      const tenantId = req.auth!.tenantId;
      if (req.auth!.campusId && !parsed.campusId) {
        parsed.campusId = req.auth!.campusId;
      }

      const result = await timetableService.listClassrooms(tenantId, parsed);
      res.json(
        ApiResponse.paginated(
          result.items,
          result.totalRecords,
          result.page,
          result.limit,
          result.totalPages
        )
      );
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 3. Timetable Master Handlers
  // =========================================================================

  async createTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createTimetableSchema.parse(req.body);
      const tenantId = req.auth!.tenantId;
      const campusId = req.auth!.campusId || parsed.campusId;

      const result = await timetableService.createTimetable(tenantId, campusId, parsed, this.getMeta(req));
      res.status(201).json(ApiResponse.success(result, 'Timetable created successfully'));
    } catch (err) {
      next(err);
    }
  }

  async updateTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateTimetableSchema.parse(req.body);
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;

      const result = await timetableService.updateTimetable(tenantId, id, parsed, this.getMeta(req));
      res.json(ApiResponse.success(result, 'Timetable updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  async publishTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;

      const result = await timetableService.publishTimetable(tenantId, id, this.getMeta(req));
      res.json(ApiResponse.success(result, 'Timetable published successfully'));
    } catch (err) {
      next(err);
    }
  }

  async archiveTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;

      const result = await timetableService.archiveTimetable(tenantId, id, this.getMeta(req));
      res.json(ApiResponse.success(result, 'Timetable archived successfully'));
    } catch (err) {
      next(err);
    }
  }

  async cloneTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = cloneTimetableSchema.parse(req.body);
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;

      const result = await timetableService.cloneTimetable(tenantId, id, parsed, this.getMeta(req));
      res.status(201).json(ApiResponse.success(result, 'Timetable cloned successfully'));
    } catch (err) {
      next(err);
    }
  }

  async deleteTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;

      await timetableService.deleteTimetable(tenantId, id, this.getMeta(req));
      res.json(ApiResponse.success(null, 'Timetable deleted successfully'));
    } catch (err) {
      next(err);
    }
  }

  async getTimetableById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;

      const result = await timetableService.getTimetableById(tenantId, id);
      res.json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  async listTimetables(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = timetableFilterSchema.parse(req.query);
      const tenantId = req.auth!.tenantId;
      if (req.auth!.campusId && !parsed.campusId) {
        parsed.campusId = req.auth!.campusId;
      }

      const result = await timetableService.listTimetables(tenantId, parsed);
      res.json(
        ApiResponse.paginated(
          result.items,
          result.totalRecords,
          result.page,
          result.limit,
          result.totalPages
        )
      );
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 4. Timetable Entries & Scheduling
  // =========================================================================

  async createTimetableEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createTimetableEntrySchema.parse(req.body);
      const tenantId = req.auth!.tenantId;
      const { timetableId } = req.params;

      const result = await timetableService.createTimetableEntry(
        tenantId,
        timetableId,
        {
          ...parsed,
          roomId: parsed.roomId || undefined,
        },
        this.getMeta(req)
      );
      res.status(201).json(ApiResponse.success(result, 'Timetable slot scheduled successfully'));
    } catch (err) {
      next(err);
    }
  }

  async updateTimetableEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateTimetableEntrySchema.parse(req.body);
      const tenantId = req.auth!.tenantId;
      const { timetableId, entryId } = req.params;

      const result = await timetableService.updateTimetableEntry(
        tenantId,
        timetableId,
        entryId,
        parsed,
        this.getMeta(req)
      );
      res.json(ApiResponse.success(result, 'Timetable slot updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  async deleteTimetableEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { timetableId, entryId } = req.params;

      await timetableService.deleteTimetableEntry(tenantId, timetableId, entryId, this.getMeta(req));
      res.json(ApiResponse.success(null, 'Timetable slot deleted successfully'));
    } catch (err) {
      next(err);
    }
  }

  async getTimetableEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = timetableEntryFilterSchema.parse(req.query);
      const tenantId = req.auth!.tenantId;
      const { timetableId } = req.params;

      const result = await timetableService.getTimetableEntries(tenantId, timetableId, parsed);
      res.json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 5. Validation, Conflicts & Workload Handlers
  // =========================================================================

  async validateTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { timetableId } = req.params;

      const result = await timetableService.validateTimetable(tenantId, timetableId);
      res.json(ApiResponse.success(result, 'Timetable conflict scan completed'));
    } catch (err) {
      next(err);
    }
  }

  async validateCandidateSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = validateCandidateSlotSchema.parse(req.body);
      const tenantId = req.auth!.tenantId;
      const { timetableId } = req.params;

      const result = await timetableService.validateCandidateSlot(tenantId, timetableId, parsed);
      res.json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  async getTeacherWorkload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { timetableId } = req.params;

      const result = await timetableService.getTeacherWorkload(tenantId, timetableId);
      res.json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 6. Structured 2D Matrix Views
  // =========================================================================

  async getClassTimetableView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { timetableId, academicClassId } = req.params;

      const result = await timetableService.getClassTimetableView(tenantId, timetableId, academicClassId);
      res.json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  async getTeacherTimetableView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { timetableId, teacherId } = req.params;

      const result = await timetableService.getTeacherTimetableView(tenantId, timetableId, teacherId);
      res.json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  async getRoomTimetableView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { timetableId, roomId } = req.params;

      const result = await timetableService.getRoomTimetableView(tenantId, timetableId, roomId);
      res.json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  async getMySchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const result = await timetableService.getMySchedule(tenantId, req.auth!);
      res.json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }
}

export const timetableController = new TimetableController();
