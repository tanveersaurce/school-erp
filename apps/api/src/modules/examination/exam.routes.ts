import { Router } from 'express';
import { examController } from './exam.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission } from '../../middlewares/authorize.js';

const router = Router();

// Enforce JWT Authentication for all examination routes
router.use(authenticate);

// --------------------------------------------------------------------------
// 1. Grading Schemes
// --------------------------------------------------------------------------
router.post(
  '/grading-schemes',
  requirePermission('grading_scheme:manage'),
  examController.createGradingScheme.bind(examController)
);

router.get(
  '/grading-schemes',
  requirePermission('grading_scheme:read'),
  examController.getGradingSchemes.bind(examController)
);

router.get(
  '/grading-schemes/:id',
  requirePermission('grading_scheme:read'),
  examController.getGradingSchemeById.bind(examController)
);

// --------------------------------------------------------------------------
// 2. Dashboard KPIs
// --------------------------------------------------------------------------
router.get(
  '/dashboard',
  requirePermission('exam:read'),
  examController.getDashboardKPIs.bind(examController)
);

// --------------------------------------------------------------------------
// 3. Student & Parent Results Access
// --------------------------------------------------------------------------
router.get(
  '/my-results',
  requirePermission('result:read'),
  examController.getMyResults.bind(examController)
);

router.get(
  '/parent/child/:studentId/results',
  requirePermission('result:read'),
  examController.getParentChildResults.bind(examController)
);

router.get(
  '/results/student/:studentId',
  requirePermission('result:read'),
  examController.getStudentResults.bind(examController)
);

// --------------------------------------------------------------------------
// 4. Scheduling & Conflicts
// --------------------------------------------------------------------------
router.post(
  '/schedules/check-conflict',
  requirePermission('exam:schedule'),
  examController.checkScheduleConflicts.bind(examController)
);

router.post(
  '/schedules/check-conflicts',
  requirePermission('exam:schedule'),
  examController.checkScheduleConflicts.bind(examController)
);

router.post(
  '/schedules',
  requirePermission('exam:schedule'),
  examController.createExamSchedule.bind(examController)
);

router.delete(
  '/schedules/:scheduleId',
  requirePermission('exam:schedule'),
  examController.deleteExamSchedule.bind(examController)
);

// --------------------------------------------------------------------------
// 5. Marks Entry, Verification, Locking & Corrections
// --------------------------------------------------------------------------
router.get(
  '/marks/roster',
  requirePermission('marks:read'),
  examController.getMarksRoster.bind(examController)
);

router.post(
  '/marks/bulk',
  requirePermission('marks:entry'),
  examController.enterBulkMarks.bind(examController)
);

router.post(
  '/marks/verify',
  requirePermission('marks:verify'),
  examController.verifyMarks.bind(examController)
);

router.post(
  '/marks/lock',
  requirePermission('marks:lock'),
  examController.lockMarks.bind(examController)
);

router.post(
  '/marks/:markId/correction',
  requirePermission('marks:correct'),
  examController.requestMarkCorrection.bind(examController)
);

router.post(
  '/marks/corrections/:correctionId/review',
  requirePermission('marks:verify'),
  examController.reviewMarkCorrection.bind(examController)
);

// --------------------------------------------------------------------------
// 6. Exam Master Collection CRUD
// --------------------------------------------------------------------------
router.post(
  '/',
  requirePermission('exam:create'),
  examController.createExam.bind(examController)
);

router.get(
  '/',
  requirePermission('exam:read'),
  examController.getExams.bind(examController)
);

// --------------------------------------------------------------------------
// 7. Exam-Scoped Sub-Resources
// --------------------------------------------------------------------------
router.get(
  '/:examId/schedules',
  requirePermission('exam:read'),
  examController.getExamSchedules.bind(examController)
);

router.post(
  '/:examId/results/calculate',
  requirePermission('result:calculate'),
  examController.calculateResults.bind(examController)
);

router.post(
  '/:examId/results/approve',
  requirePermission('result:approve'),
  examController.approveResults.bind(examController)
);

router.post(
  '/:examId/results/publish',
  requirePermission('result:publish'),
  examController.publishResults.bind(examController)
);

router.get(
  '/:examId/results',
  requirePermission('result:read'),
  examController.getResults.bind(examController)
);

router.post(
  '/:id/status',
  requirePermission('exam:update'),
  examController.transitionExamStatus.bind(examController)
);

router.get(
  '/:id',
  requirePermission('exam:read'),
  examController.getExamById.bind(examController)
);

router.put(
  '/:id',
  requirePermission('exam:update'),
  examController.updateExam.bind(examController)
);

router.delete(
  '/:id',
  requirePermission('exam:delete'),
  examController.deleteExam.bind(examController)
);

export const examRouter = router;
