import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission } from '../../middlewares/authorize.js';
import { attendanceController } from './attendance.controller.js';

export const attendanceRouter = Router();

// =========================================================================
// 1. Attendance Register & Marking Routes
// =========================================================================

attendanceRouter.post(
  '/attendance/daily',
  authenticate,
  requirePermission('attendance:mark'),
  attendanceController.markDaily.bind(attendanceController)
);

attendanceRouter.post(
  '/attendance/period',
  authenticate,
  requirePermission('attendance:mark'),
  attendanceController.markPeriod.bind(attendanceController)
);

attendanceRouter.get(
  '/attendance/sheet',
  authenticate,
  requirePermission('attendance:read'),
  attendanceController.getAttendanceSheet.bind(attendanceController)
);

attendanceRouter.get(
  '/attendance',
  authenticate,
  requirePermission('attendance:read'),
  attendanceController.queryAttendance.bind(attendanceController)
);

// =========================================================================
// 2. Lifecycle Routes (Submit / Approve / Lock)
// =========================================================================

attendanceRouter.post(
  '/attendance/:id/submit',
  authenticate,
  requirePermission('attendance:submit'),
  attendanceController.submitAttendance.bind(attendanceController)
);

attendanceRouter.post(
  '/attendance/:id/approve',
  authenticate,
  requirePermission('attendance:approve'),
  attendanceController.approveAttendance.bind(attendanceController)
);

attendanceRouter.post(
  '/attendance/:id/lock',
  authenticate,
  requirePermission('attendance:lock'),
  attendanceController.lockAttendance.bind(attendanceController)
);

// =========================================================================
// 3. Correction Workflow Routes
// =========================================================================

attendanceRouter.post(
  '/attendance/corrections',
  authenticate,
  requirePermission('attendance:correct'),
  attendanceController.requestCorrection.bind(attendanceController)
);

attendanceRouter.patch(
  '/attendance/corrections/:id',
  authenticate,
  requirePermission('attendance:correct'),
  attendanceController.processCorrection.bind(attendanceController)
);

attendanceRouter.get(
  '/attendance/corrections',
  authenticate,
  requirePermission('attendance:read'),
  attendanceController.listCorrections.bind(attendanceController)
);

// =========================================================================
// 4. Summaries & Reports Routes
// =========================================================================

attendanceRouter.get(
  '/attendance/student/:studentId',
  authenticate,
  requirePermission('attendance:read'),
  attendanceController.getStudentSummary.bind(attendanceController)
);

attendanceRouter.get(
  '/attendance/class/:academicClassId/summary',
  authenticate,
  requirePermission('attendance:read'),
  attendanceController.getClassSummary.bind(attendanceController)
);

attendanceRouter.get(
  '/attendance/class/:academicClassId/monthly',
  authenticate,
  requirePermission('attendance:read'),
  attendanceController.getMonthlyMatrix.bind(attendanceController)
);

attendanceRouter.get(
  '/attendance/reports/low-attendance',
  authenticate,
  requirePermission('attendance:report'),
  attendanceController.getLowAttendanceReport.bind(attendanceController)
);

attendanceRouter.get(
  '/attendance/reports/daily-campus',
  authenticate,
  requirePermission('attendance:report'),
  attendanceController.getDailyCampusReport.bind(attendanceController)
);

// =========================================================================
// 5. Calendar & Holiday Management Routes
// =========================================================================

attendanceRouter.post(
  '/holidays',
  authenticate,
  requirePermission('holiday:create'),
  attendanceController.createHoliday.bind(attendanceController)
);

attendanceRouter.get(
  '/holidays',
  authenticate,
  requirePermission('holiday:read'),
  attendanceController.listHolidays.bind(attendanceController)
);

attendanceRouter.delete(
  '/holidays/:id',
  authenticate,
  requirePermission('holiday:delete'),
  attendanceController.deleteHoliday.bind(attendanceController)
);
