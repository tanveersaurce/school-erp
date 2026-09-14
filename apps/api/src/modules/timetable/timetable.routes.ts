import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission } from '../../middlewares/authorize.js';
import { timetableController } from './timetable.controller.js';

export const timetableRouter = Router();

// =========================================================================
// 1. Period Routes
// =========================================================================
timetableRouter.get(
  '/timetable/periods',
  authenticate,
  requirePermission('period:read'),
  timetableController.listPeriods.bind(timetableController)
);

timetableRouter.post(
  '/timetable/periods',
  authenticate,
  requirePermission('period:create'),
  timetableController.createPeriod.bind(timetableController)
);

timetableRouter.get(
  '/timetable/periods/:id',
  authenticate,
  requirePermission('period:read'),
  timetableController.getPeriodById.bind(timetableController)
);

timetableRouter.patch(
  '/timetable/periods/:id',
  authenticate,
  requirePermission('period:update'),
  timetableController.updatePeriod.bind(timetableController)
);

timetableRouter.delete(
  '/timetable/periods/:id',
  authenticate,
  requirePermission('period:delete'),
  timetableController.deletePeriod.bind(timetableController)
);

// =========================================================================
// 2. Classroom (Room) Routes
// =========================================================================
timetableRouter.get(
  '/timetable/classrooms',
  authenticate,
  requirePermission('room:read'),
  timetableController.listClassrooms.bind(timetableController)
);

timetableRouter.post(
  '/timetable/classrooms',
  authenticate,
  requirePermission('room:create'),
  timetableController.createClassroom.bind(timetableController)
);

timetableRouter.get(
  '/timetable/classrooms/:id',
  authenticate,
  requirePermission('room:read'),
  timetableController.getClassroomById.bind(timetableController)
);

timetableRouter.patch(
  '/timetable/classrooms/:id',
  authenticate,
  requirePermission('room:update'),
  timetableController.updateClassroom.bind(timetableController)
);

timetableRouter.delete(
  '/timetable/classrooms/:id',
  authenticate,
  requirePermission('room:delete'),
  timetableController.deleteClassroom.bind(timetableController)
);

// =========================================================================
// 3. Timetable Master Routes
// =========================================================================
timetableRouter.get(
  '/timetable/timetables',
  authenticate,
  requirePermission('timetable:read'),
  timetableController.listTimetables.bind(timetableController)
);

timetableRouter.post(
  '/timetable/timetables',
  authenticate,
  requirePermission('timetable:create'),
  timetableController.createTimetable.bind(timetableController)
);

timetableRouter.get(
  '/timetable/timetables/:id',
  authenticate,
  requirePermission('timetable:read'),
  timetableController.getTimetableById.bind(timetableController)
);

timetableRouter.patch(
  '/timetable/timetables/:id',
  authenticate,
  requirePermission('timetable:update'),
  timetableController.updateTimetable.bind(timetableController)
);

timetableRouter.delete(
  '/timetable/timetables/:id',
  authenticate,
  requirePermission('timetable:delete'),
  timetableController.deleteTimetable.bind(timetableController)
);

timetableRouter.post(
  '/timetable/timetables/:id/publish',
  authenticate,
  requirePermission('timetable:publish'),
  timetableController.publishTimetable.bind(timetableController)
);

timetableRouter.post(
  '/timetable/timetables/:id/archive',
  authenticate,
  requirePermission('timetable:archive'),
  timetableController.archiveTimetable.bind(timetableController)
);

timetableRouter.post(
  '/timetable/timetables/:id/clone',
  authenticate,
  requirePermission('timetable:create'),
  timetableController.cloneTimetable.bind(timetableController)
);

// =========================================================================
// 4. Timetable Entries & Scheduling
// =========================================================================
timetableRouter.get(
  '/timetable/timetables/:timetableId/entries',
  authenticate,
  requirePermission('timetable_entry:read'),
  timetableController.getTimetableEntries.bind(timetableController)
);

timetableRouter.post(
  '/timetable/timetables/:timetableId/entries',
  authenticate,
  requirePermission('timetable_entry:create'),
  timetableController.createTimetableEntry.bind(timetableController)
);

timetableRouter.patch(
  '/timetable/timetables/:timetableId/entries/:entryId',
  authenticate,
  requirePermission('timetable_entry:update'),
  timetableController.updateTimetableEntry.bind(timetableController)
);

timetableRouter.delete(
  '/timetable/timetables/:timetableId/entries/:entryId',
  authenticate,
  requirePermission('timetable_entry:delete'),
  timetableController.deleteTimetableEntry.bind(timetableController)
);

// =========================================================================
// 5. Validation, Conflicts & Workload
// =========================================================================
timetableRouter.post(
  '/timetable/timetables/:timetableId/validate',
  authenticate,
  requirePermission('timetable:read'),
  timetableController.validateTimetable.bind(timetableController)
);

timetableRouter.post(
  '/timetable/timetables/:timetableId/validate-slot',
  authenticate,
  requirePermission('timetable_entry:create'),
  timetableController.validateCandidateSlot.bind(timetableController)
);

timetableRouter.get(
  '/timetable/timetables/:timetableId/teacher-workload',
  authenticate,
  requirePermission('timetable:read'),
  timetableController.getTeacherWorkload.bind(timetableController)
);

// =========================================================================
// 6. Structured 2D Weekly Matrix Views
// =========================================================================
timetableRouter.get(
  '/timetable/my-schedule',
  authenticate,
  requirePermission('timetable:read'),
  timetableController.getMySchedule.bind(timetableController)
);

timetableRouter.get(
  '/timetable/timetables/:timetableId/views/class/:academicClassId',
  authenticate,
  requirePermission('timetable:read'),
  timetableController.getClassTimetableView.bind(timetableController)
);

timetableRouter.get(
  '/timetable/timetables/:timetableId/views/teacher/:teacherId',
  authenticate,
  requirePermission('timetable:read'),
  timetableController.getTeacherTimetableView.bind(timetableController)
);

timetableRouter.get(
  '/timetable/timetables/:timetableId/views/room/:roomId',
  authenticate,
  requirePermission('timetable:read'),
  timetableController.getRoomTimetableView.bind(timetableController)
);
