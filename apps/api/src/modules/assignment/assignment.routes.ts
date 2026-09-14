import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requireAnyPermission } from '../../middlewares/authorize.js';
import { assignmentController } from './assignment.controller.js';

export const assignmentRouter = Router();

// =========================================================================
// 1. Dashboards & Longitudinal Views (Must precede parameterized /:id routes)
// =========================================================================

assignmentRouter.get(
  '/assignments/dashboard/teacher',
  authenticate,
  requireAnyPermission(['assignment_report:read', 'assignment:read', 'homework:read']),
  assignmentController.getTeacherDashboard.bind(assignmentController)
);

assignmentRouter.get(
  '/assignments/dashboard/student',
  authenticate,
  requireAnyPermission(['assignment:read', 'homework:read']),
  assignmentController.getStudentDashboard.bind(assignmentController)
);

assignmentRouter.get(
  '/assignments/my/list',
  authenticate,
  requireAnyPermission(['assignment:read', 'homework:read']),
  assignmentController.getMyAssignments.bind(assignmentController)
);

assignmentRouter.get(
  '/assignments/student/:studentId',
  authenticate,
  requireAnyPermission(['assignment:read', 'homework:read']),
  assignmentController.getChildAssignments.bind(assignmentController)
);

// =========================================================================
// 2. Assignment CRUD & Core Lifecycle
// =========================================================================

assignmentRouter.post(
  '/assignments',
  authenticate,
  requireAnyPermission(['assignment:create', 'homework:create']),
  assignmentController.create.bind(assignmentController)
);

assignmentRouter.get(
  '/assignments',
  authenticate,
  requireAnyPermission(['assignment:read', 'homework:read']),
  assignmentController.list.bind(assignmentController)
);

assignmentRouter.get(
  '/assignments/:id',
  authenticate,
  requireAnyPermission(['assignment:read', 'homework:read']),
  assignmentController.getById.bind(assignmentController)
);

assignmentRouter.patch(
  '/assignments/:id',
  authenticate,
  requireAnyPermission(['assignment:update', 'homework:update']),
  assignmentController.update.bind(assignmentController)
);

assignmentRouter.delete(
  '/assignments/:id',
  authenticate,
  requireAnyPermission(['assignment:delete', 'homework:update']),
  assignmentController.delete.bind(assignmentController)
);

assignmentRouter.post(
  '/assignments/:id/publish',
  authenticate,
  requireAnyPermission(['assignment:publish', 'assignment:update', 'homework:create']),
  assignmentController.publish.bind(assignmentController)
);

assignmentRouter.post(
  '/assignments/:id/close',
  authenticate,
  requireAnyPermission(['assignment:close', 'assignment:update', 'homework:update']),
  assignmentController.close.bind(assignmentController)
);

assignmentRouter.post(
  '/assignments/:id/archive',
  authenticate,
  requireAnyPermission(['assignment:archive', 'assignment:update', 'homework:update']),
  assignmentController.archive.bind(assignmentController)
);

// =========================================================================
// 3. Submissions & Grading
// =========================================================================

assignmentRouter.get(
  '/assignments/:id/submissions',
  authenticate,
  requireAnyPermission(['submission:read', 'homework:read']),
  assignmentController.listSubmissions.bind(assignmentController)
);

assignmentRouter.get(
  '/assignments/:id/submissions/:submissionId',
  authenticate,
  requireAnyPermission(['submission:read', 'homework:read']),
  assignmentController.getSubmissionById.bind(assignmentController)
);

assignmentRouter.post(
  '/assignments/:id/submissions/draft',
  authenticate,
  requireAnyPermission(['submission:create', 'submission:update', 'homework:submit']),
  assignmentController.saveDraft.bind(assignmentController)
);

assignmentRouter.post(
  '/assignments/:id/submissions/submit',
  authenticate,
  requireAnyPermission(['submission:create', 'homework:submit']),
  assignmentController.submit.bind(assignmentController)
);

assignmentRouter.post(
  '/assignments/:id/submissions/:submissionId/grade',
  authenticate,
  requireAnyPermission(['submission:grade', 'homework:grade']),
  assignmentController.grade.bind(assignmentController)
);

assignmentRouter.post(
  '/assignments/:id/submissions/:submissionId/return',
  authenticate,
  requireAnyPermission(['submission:return', 'submission:grade', 'homework:grade']),
  assignmentController.return.bind(assignmentController)
);
