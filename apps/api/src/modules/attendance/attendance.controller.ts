import { Request, Response, NextFunction } from 'express';
import { attendanceService } from './attendance.service.js';
import { holidayService } from './holiday.service.js';
import {
  markDailyAttendanceSchema,
  markPeriodAttendanceSchema,
  requestCorrectionSchema,
  reviewCorrectionSchema,
  createHolidaySchema,
  queryAttendanceSchema,
} from './attendance.validator.js';
import { AuthUserContext } from './attendance.policy.js';
import { AuthenticationError } from '@edusphere/common';

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
};

export class AttendanceController {
  private getAuthContext(req: Request): AuthUserContext {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required');
    }
    return {
      userId: auth.userId,
      tenantId: auth.tenantId,
      role: auth.roles?.[0] || auth.userType,
      userType: auth.userType,
      permissions: auth.permissions || [],
      campusId: auth.campusId,
    };
  }

  private getTenantContext(req: Request) {
    if (req.tenantContext) {
      return req.tenantContext;
    }
    const auth = req.auth;
    return {
      tenantId: auth?.tenantId || (req.headers['x-tenant-id'] as string),
      schoolId: auth?.schoolId,
      campusId: auth?.campusId,
    };
  }

  // =========================================================================
  // 1. Attendance Marking Endpoints
  // =========================================================================

  async markDaily(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = markDailyAttendanceSchema.parse(req.body);
      const tenantCtx = this.getTenantContext(req);
      const authCtx = this.getAuthContext(req);

      const result = await attendanceService.markDailyAttendance(tenantCtx, authCtx, validated);
      res.status(201).json(ApiResponse.success(result, 'Daily attendance saved successfully.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  async markPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = markPeriodAttendanceSchema.parse(req.body);
      const tenantCtx = this.getTenantContext(req);
      const authCtx = this.getAuthContext(req);

      const result = await attendanceService.markPeriodAttendance(tenantCtx, authCtx, validated);
      res.status(201).json(ApiResponse.success(result, 'Period attendance saved successfully.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  async getAttendanceSheet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const academicClassId = req.query.academicClassId as string;
      const date = req.query.date as string;
      const periodId = req.query.periodId as string | undefined;

      if (!academicClassId || !date) {
        res.status(400).json({ success: false, message: 'academicClassId and date are required' });
        return;
      }

      const tenantCtx = this.getTenantContext(req);
      const result = await attendanceService.getAttendanceSheet(
        tenantCtx,
        academicClassId,
        date,
        periodId
      );
      res.status(200).json(ApiResponse.success(result, 'Attendance sheet loaded.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  async queryAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = queryAttendanceSchema.parse(req.query);
      const tenantCtx = this.getTenantContext(req);

      const result = await attendanceService.queryAttendance(tenantCtx, validated);
      res.status(200).json(ApiResponse.success(result, 'Attendance records retrieved.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 2. Lifecycle Endpoints (Submit / Approve / Lock)
  // =========================================================================

  async submitAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantCtx = this.getTenantContext(req);
      const authCtx = this.getAuthContext(req);
      const attendanceId = req.params.id;

      const result = await attendanceService.submitAttendance(tenantCtx, authCtx, attendanceId);
      res.status(200).json(ApiResponse.success(result, 'Attendance submitted for review.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  async approveAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantCtx = this.getTenantContext(req);
      const authCtx = this.getAuthContext(req);
      const attendanceId = req.params.id;

      const result = await attendanceService.approveAttendance(tenantCtx, authCtx, attendanceId);
      res.status(200).json(ApiResponse.success(result, 'Attendance approved successfully.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  async lockAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantCtx = this.getTenantContext(req);
      const authCtx = this.getAuthContext(req);
      const attendanceId = req.params.id;

      const result = await attendanceService.lockAttendance(tenantCtx, authCtx, attendanceId);
      res.status(200).json(ApiResponse.success(result, 'Attendance register locked.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 3. Correction Endpoints
  // =========================================================================

  async requestCorrection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = requestCorrectionSchema.parse(req.body);
      const tenantCtx = this.getTenantContext(req);
      const authCtx = this.getAuthContext(req);

      const result = await attendanceService.requestCorrection(tenantCtx, authCtx, validated);
      res.status(201).json(ApiResponse.success(result, 'Attendance correction recorded.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  async processCorrection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = reviewCorrectionSchema.parse(req.body);
      const tenantCtx = this.getTenantContext(req);
      const authCtx = this.getAuthContext(req);
      const correctionId = req.params.id;

      const result = await attendanceService.processCorrection(
        tenantCtx,
        authCtx,
        correctionId,
        validated
      );
      res.status(200).json(ApiResponse.success(result, 'Attendance correction processed.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  async listCorrections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantCtx = this.getTenantContext(req);
      const status = req.query.status as any;

      const result = await attendanceService.listCorrections(tenantCtx, status);
      res.status(200).json(ApiResponse.success(result, 'Corrections retrieved.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 4. Summaries and Reports Endpoints
  // =========================================================================

  async getStudentSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.params.studentId;
      const academicYearId = req.query.academicYearId as string;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      if (!academicYearId) {
        res.status(400).json({ success: false, message: 'academicYearId query param is required' });
        return;
      }

      const tenantCtx = this.getTenantContext(req);
      const authCtx = this.getAuthContext(req);

      const result = await attendanceService.getStudentSummary(
        tenantCtx,
        authCtx,
        studentId,
        academicYearId,
        startDate,
        endDate
      );
      res.status(200).json(ApiResponse.success(result, 'Student attendance summary retrieved.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  async getClassSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const academicClassId = req.params.academicClassId;
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

      const tenantCtx = this.getTenantContext(req);
      const result = await attendanceService.getClassSummary(tenantCtx, academicClassId, date);
      res.status(200).json(ApiResponse.success(result, 'Class attendance summary retrieved.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  async getMonthlyMatrix(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const academicClassId = req.params.academicClassId;
      const year = Number(req.query.year) || new Date().getFullYear();
      const month = Number(req.query.month) || new Date().getMonth() + 1;

      const tenantCtx = this.getTenantContext(req);
      const result = await attendanceService.getMonthlyMatrix(
        tenantCtx,
        academicClassId,
        year,
        month
      );
      res.status(200).json(ApiResponse.success(result, 'Monthly attendance matrix retrieved.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  async getLowAttendanceReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const academicYearId = req.query.academicYearId as string;
      const threshold = Number(req.query.threshold) || 75;
      const campusId = req.query.campusId as string | undefined;

      if (!academicYearId) {
        res.status(400).json({ success: false, message: 'academicYearId is required' });
        return;
      }

      const tenantCtx = this.getTenantContext(req);
      const result = await attendanceService.getLowAttendanceReport(
        tenantCtx,
        academicYearId,
        threshold,
        campusId
      );
      res.status(200).json(ApiResponse.success(result, 'Low attendance report generated.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  async getDailyCampusReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const campusId = req.query.campusId as string | undefined;

      const tenantCtx = this.getTenantContext(req);
      const result = await attendanceService.getDailyCampusReport(tenantCtx, date, campusId);
      res.status(200).json(ApiResponse.success(result, 'Daily campus attendance report generated.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 5. Holiday Endpoints
  // =========================================================================

  async createHoliday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createHolidaySchema.parse(req.body);
      const tenantCtx = this.getTenantContext(req);

      const result = await holidayService.createHoliday(tenantCtx, validated);
      res.status(201).json(ApiResponse.success(result, 'Holiday declared successfully.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  async listHolidays(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const academicYearId = req.query.academicYearId as string;
      const campusId = req.query.campusId as string | undefined;

      if (!academicYearId) {
        res.status(400).json({ success: false, message: 'academicYearId is required' });
        return;
      }

      const tenantCtx = this.getTenantContext(req);
      const result = await holidayService.listHolidays(tenantCtx, academicYearId, campusId);
      res.status(200).json(ApiResponse.success(result, 'Holidays retrieved.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  async deleteHoliday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const holidayId = req.params.id;
      const tenantCtx = this.getTenantContext(req);

      await holidayService.deleteHoliday(tenantCtx, holidayId);
      res.status(200).json(ApiResponse.success(null, 'Holiday deleted successfully.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }
}

export const attendanceController = new AttendanceController();
