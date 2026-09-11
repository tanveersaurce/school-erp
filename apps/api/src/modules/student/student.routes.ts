import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission } from '../../middlewares/authorize.js';
import { studentController } from './student.controller.js';

export const studentRouter = Router();

// =========================================================================
// 1. Unique Identifiers
// =========================================================================
studentRouter.get(
  ['/students/identifiers/next-admission-number', '/students/next-admission-number'],
  authenticate,
  requirePermission('student:create'),
  studentController.getNextAdmissionNumber.bind(studentController)
);

studentRouter.get(
  ['/students/identifiers/next-student-id', '/students/next-student-id'],
  authenticate,
  requirePermission('student:create'),
  studentController.getNextStudentId.bind(studentController)
);

studentRouter.get(
  ['/guardians/identifiers/next-guardian-id', '/guardians/next-id'],
  authenticate,
  requirePermission('guardian:create'),
  studentController.getNextGuardianId.bind(studentController)
);

// =========================================================================
// 2. Parent Perspective (Anti-IDOR)
// =========================================================================
studentRouter.get(
  '/me/students',
  authenticate,
  studentController.getMyChildren.bind(studentController)
);

studentRouter.get(
  '/me/students/:id',
  authenticate,
  studentController.getMyChildById.bind(studentController)
);

// =========================================================================
// 3. Student CRUD
// =========================================================================
studentRouter.get(
  '/students',
  authenticate,
  requirePermission('student:read'),
  studentController.getStudents.bind(studentController)
);

studentRouter.post(
  '/students',
  authenticate,
  requirePermission('student:create'),
  studentController.createStudent.bind(studentController)
);

studentRouter.get(
  '/students/:id',
  authenticate,
  requirePermission('student:read'),
  studentController.getStudentById.bind(studentController)
);

studentRouter.patch(
  '/students/:id',
  authenticate,
  requirePermission('student:update'),
  studentController.updateStudent.bind(studentController)
);

studentRouter.delete(
  '/students/:id',
  authenticate,
  requirePermission('student:delete'),
  studentController.deleteStudent.bind(studentController)
);

// =========================================================================
// 4. Student Lifecycle Endpoints
// =========================================================================
studentRouter.post(
  '/students/:id/status',
  authenticate,
  requirePermission('student:update'),
  studentController.transitionStatus.bind(studentController)
);

studentRouter.patch(
  '/students/:id/status',
  authenticate,
  requirePermission('student:update'),
  studentController.transitionStatus.bind(studentController)
);

studentRouter.post(
  '/students/:id/admit',
  authenticate,
  requirePermission('student:admit'),
  studentController.admitStudent.bind(studentController)
);

studentRouter.post(
  '/students/:id/activate',
  authenticate,
  requirePermission('student:activate'),
  studentController.activateStudent.bind(studentController)
);

studentRouter.post(
  '/students/:id/suspend',
  authenticate,
  requirePermission('student:suspend'),
  studentController.suspendStudent.bind(studentController)
);

studentRouter.post(
  '/students/:id/transfer',
  authenticate,
  requirePermission('student:transfer'),
  studentController.transferStudent.bind(studentController)
);

studentRouter.post(
  '/students/:id/withdraw',
  authenticate,
  requirePermission('student:withdraw'),
  studentController.withdrawStudent.bind(studentController)
);

studentRouter.post(
  '/students/:id/graduate',
  authenticate,
  requirePermission('student:graduate'),
  studentController.graduateStudent.bind(studentController)
);

studentRouter.post(
  '/students/:id/archive',
  authenticate,
  requirePermission('student:archive'),
  studentController.archiveStudent.bind(studentController)
);

// =========================================================================
// 5. Student Documents
// =========================================================================
studentRouter.post(
  '/students/:id/documents',
  authenticate,
  requirePermission('student_document:create'),
  studentController.addDocument.bind(studentController)
);

studentRouter.patch(
  '/students/:id/documents/:docId/verify',
  authenticate,
  requirePermission('student_document:verify'),
  studentController.verifyDocument.bind(studentController)
);

studentRouter.delete(
  '/students/:id/documents/:docId',
  authenticate,
  requirePermission('student_document:delete'),
  studentController.deleteDocument.bind(studentController)
);

// =========================================================================
// 6. Guardians
// =========================================================================
studentRouter.get(
  '/guardians',
  authenticate,
  requirePermission('guardian:read'),
  studentController.getGuardians.bind(studentController)
);

studentRouter.post(
  '/guardians',
  authenticate,
  requirePermission('guardian:create'),
  studentController.createGuardian.bind(studentController)
);

studentRouter.get(
  '/guardians/:id',
  authenticate,
  requirePermission('guardian:read'),
  studentController.getGuardianById.bind(studentController)
);

studentRouter.patch(
  '/guardians/:id',
  authenticate,
  requirePermission('guardian:update'),
  studentController.updateGuardian.bind(studentController)
);

studentRouter.delete(
  '/guardians/:id',
  authenticate,
  requirePermission('guardian:delete'),
  studentController.deleteGuardian.bind(studentController)
);

studentRouter.post(
  '/guardians/:id/invite',
  authenticate,
  requirePermission('guardian:update'),
  studentController.inviteGuardian.bind(studentController)
);

// =========================================================================
// 7. Student-Guardian Relationships
// =========================================================================
studentRouter.get(
  '/students/:studentId/guardians',
  authenticate,
  requirePermission('relationship:read'),
  studentController.getStudentGuardians.bind(studentController)
);

studentRouter.post(
  '/students/:studentId/guardians',
  authenticate,
  requirePermission('relationship:create'),
  studentController.linkStudentGuardian.bind(studentController)
);

studentRouter.patch(
  ['/students/:studentId/guardians/:id', '/student-guardian-relationships/:id'],
  authenticate,
  requirePermission('relationship:update'),
  studentController.updateRelationship.bind(studentController)
);

studentRouter.delete(
  ['/students/:studentId/guardians/:id', '/student-guardian-relationships/:id'],
  authenticate,
  requirePermission('relationship:delete'),
  studentController.unlinkStudentGuardian.bind(studentController)
);

// =========================================================================
// 8. Enrollments
// =========================================================================
studentRouter.get(
  '/enrollments',
  authenticate,
  requirePermission('enrollment:read'),
  studentController.getEnrollments.bind(studentController)
);

studentRouter.post(
  '/enrollments',
  authenticate,
  requirePermission('enrollment:create'),
  studentController.createEnrollment.bind(studentController)
);

studentRouter.get(
  '/enrollments/:id',
  authenticate,
  requirePermission('enrollment:read'),
  studentController.getEnrollmentById.bind(studentController)
);

studentRouter.patch(
  '/enrollments/:id',
  authenticate,
  requirePermission('enrollment:update'),
  studentController.updateEnrollment.bind(studentController)
);
