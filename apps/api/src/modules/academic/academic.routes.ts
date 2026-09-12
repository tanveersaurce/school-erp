import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission } from '../../middlewares/authorize.js';
import { academicController } from './academic.controller.js';

export const academicRouter = Router();

// =========================================================================
// 1. Academic Dashboard Summary
// =========================================================================
academicRouter.get(
  '/academic/dashboard/summary',
  authenticate,
  requirePermission('class:read'),
  academicController.getDashboardSummary.bind(academicController)
);

// =========================================================================
// 2. Class / Grade Level Routes
// =========================================================================
academicRouter.get(
  '/academic/classes',
  authenticate,
  requirePermission('class:read'),
  academicController.getClasses.bind(academicController)
);

academicRouter.post(
  '/academic/classes',
  authenticate,
  requirePermission('class:create'),
  academicController.createClass.bind(academicController)
);

academicRouter.get(
  '/academic/classes/:id',
  authenticate,
  requirePermission('class:read'),
  academicController.getClassById.bind(academicController)
);

academicRouter.patch(
  '/academic/classes/:id',
  authenticate,
  requirePermission('class:update'),
  academicController.updateClass.bind(academicController)
);

academicRouter.delete(
  '/academic/classes/:id',
  authenticate,
  requirePermission('class:delete'),
  academicController.deleteClass.bind(academicController)
);

// =========================================================================
// 3. Section Routes
// =========================================================================
academicRouter.get(
  '/academic/sections',
  authenticate,
  requirePermission('section:read'),
  academicController.getSections.bind(academicController)
);

academicRouter.post(
  '/academic/sections',
  authenticate,
  requirePermission('section:create'),
  academicController.createSection.bind(academicController)
);

academicRouter.get(
  '/academic/sections/:id',
  authenticate,
  requirePermission('section:read'),
  academicController.getSectionById.bind(academicController)
);

academicRouter.patch(
  '/academic/sections/:id',
  authenticate,
  requirePermission('section:update'),
  academicController.updateSection.bind(academicController)
);

academicRouter.delete(
  '/academic/sections/:id',
  authenticate,
  requirePermission('section:delete'),
  academicController.deleteSection.bind(academicController)
);

// =========================================================================
// 4. Academic Class (Offering) Routes
// =========================================================================
academicRouter.get(
  '/academic/academic-classes',
  authenticate,
  requirePermission('academic_class:read'),
  academicController.getAcademicClasses.bind(academicController)
);

academicRouter.post(
  '/academic/academic-classes',
  authenticate,
  requirePermission('academic_class:create'),
  academicController.createAcademicClass.bind(academicController)
);

academicRouter.get(
  '/academic/academic-classes/:id',
  authenticate,
  requirePermission('academic_class:read'),
  academicController.getAcademicClassById.bind(academicController)
);

academicRouter.patch(
  '/academic/academic-classes/:id',
  authenticate,
  requirePermission('academic_class:update'),
  academicController.updateAcademicClass.bind(academicController)
);

academicRouter.delete(
  '/academic/academic-classes/:id',
  authenticate,
  requirePermission('academic_class:delete'),
  academicController.deleteAcademicClass.bind(academicController)
);

academicRouter.get(
  '/academic/academic-classes/:id/details',
  authenticate,
  requirePermission('academic_class:read'),
  academicController.getAcademicClassDetails.bind(academicController)
);

academicRouter.post(
  '/academic/academic-classes/:id/class-teacher',
  authenticate,
  requirePermission('class_teacher:assign'),
  academicController.assignClassTeacher.bind(academicController)
);

academicRouter.patch(
  '/academic/academic-classes/:id/class-teacher',
  authenticate,
  requirePermission('class_teacher:assign'),
  academicController.assignClassTeacher.bind(academicController)
);

academicRouter.get(
  '/academic/academic-classes/:id/students',
  authenticate,
  requirePermission('academic_enrollment:read'),
  academicController.getClassStudents.bind(academicController)
);

academicRouter.post(
  '/academic/academic-classes/:id/auto-roll-numbers',
  authenticate,
  requirePermission('academic_enrollment:update'),
  academicController.autoAssignRollNumbers.bind(academicController)
);

// =========================================================================
// 5. Subject Routes
// =========================================================================
academicRouter.get(
  '/academic/subjects',
  authenticate,
  requirePermission('subject:read'),
  academicController.getSubjects.bind(academicController)
);

academicRouter.post(
  '/academic/subjects',
  authenticate,
  requirePermission('subject:create'),
  academicController.createSubject.bind(academicController)
);

academicRouter.get(
  '/academic/subjects/:id',
  authenticate,
  requirePermission('subject:read'),
  academicController.getSubjectById.bind(academicController)
);

academicRouter.patch(
  '/academic/subjects/:id',
  authenticate,
  requirePermission('subject:update'),
  academicController.updateSubject.bind(academicController)
);

academicRouter.delete(
  '/academic/subjects/:id',
  authenticate,
  requirePermission('subject:delete'),
  academicController.deleteSubject.bind(academicController)
);

// =========================================================================
// 6. Class ↔ Subject Curriculum Mapping Routes
// =========================================================================
academicRouter.get(
  '/academic/class-subjects',
  authenticate,
  requirePermission('class_subject:read'),
  academicController.getClassSubjects.bind(academicController)
);

academicRouter.post(
  '/academic/class-subjects',
  authenticate,
  requirePermission('class_subject:create'),
  academicController.createClassSubject.bind(academicController)
);

academicRouter.patch(
  '/academic/class-subjects/:id',
  authenticate,
  requirePermission('class_subject:update'),
  academicController.updateClassSubject.bind(academicController)
);

academicRouter.delete(
  '/academic/class-subjects/:id',
  authenticate,
  requirePermission('class_subject:delete'),
  academicController.deleteClassSubject.bind(academicController)
);

// =========================================================================
// 7. Teacher Subject Assignment Routes
// =========================================================================
academicRouter.get(
  '/academic/teacher-assignments',
  authenticate,
  requirePermission('teacher_assignment:read'),
  academicController.getTeacherAssignments.bind(academicController)
);

academicRouter.post(
  '/academic/teacher-assignments',
  authenticate,
  requirePermission('teacher_assignment:create'),
  academicController.createTeacherAssignment.bind(academicController)
);

academicRouter.get(
  '/academic/teacher-assignments/:id',
  authenticate,
  requirePermission('teacher_assignment:read'),
  academicController.getTeacherAssignmentById.bind(academicController)
);

academicRouter.patch(
  '/academic/teacher-assignments/:id',
  authenticate,
  requirePermission('teacher_assignment:update'),
  academicController.updateTeacherAssignment.bind(academicController)
);

academicRouter.delete(
  '/academic/teacher-assignments/:id',
  authenticate,
  requirePermission('teacher_assignment:delete'),
  academicController.deleteTeacherAssignment.bind(academicController)
);

// =========================================================================
// 8. Academic Enrollment & Roll Number Routes
// =========================================================================
academicRouter.post(
  '/academic/enrollments',
  authenticate,
  requirePermission('academic_enrollment:create'),
  academicController.enrollStudentAcademic.bind(academicController)
);

academicRouter.post(
  '/academic/enrollments/:id/roll-number',
  authenticate,
  requirePermission('academic_enrollment:update'),
  academicController.assignRollNumber.bind(academicController)
);

academicRouter.patch(
  '/academic/enrollments/:id/roll-number',
  authenticate,
  requirePermission('academic_enrollment:update'),
  academicController.assignRollNumber.bind(academicController)
);
