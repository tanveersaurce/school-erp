import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission } from '../../middlewares/authorize.js';
import { employeeController } from './employee.controller.js';

export const employeeRouter = Router();

// =========================================================================
// 1. Department Endpoints
// =========================================================================
employeeRouter.post(
  '/departments',
  authenticate,
  requirePermission('department:create'),
  employeeController.createDepartment.bind(employeeController)
);

employeeRouter.get(
  '/departments',
  authenticate,
  requirePermission('department:read'),
  employeeController.getDepartments.bind(employeeController)
);

employeeRouter.get(
  '/departments/:id',
  authenticate,
  requirePermission('department:read'),
  employeeController.getDepartmentById.bind(employeeController)
);

employeeRouter.patch(
  '/departments/:id',
  authenticate,
  requirePermission('department:update'),
  employeeController.updateDepartment.bind(employeeController)
);

employeeRouter.delete(
  '/departments/:id',
  authenticate,
  requirePermission('department:delete'),
  employeeController.deleteDepartment.bind(employeeController)
);

// =========================================================================
// 2. Designation Endpoints
// =========================================================================
employeeRouter.post(
  '/designations',
  authenticate,
  requirePermission('designation:create'),
  employeeController.createDesignation.bind(employeeController)
);

employeeRouter.get(
  '/designations',
  authenticate,
  requirePermission('designation:read'),
  employeeController.getDesignations.bind(employeeController)
);

employeeRouter.get(
  '/designations/:id',
  authenticate,
  requirePermission('designation:read'),
  employeeController.getDesignationById.bind(employeeController)
);

employeeRouter.patch(
  '/designations/:id',
  authenticate,
  requirePermission('designation:update'),
  employeeController.updateDesignation.bind(employeeController)
);

employeeRouter.delete(
  '/designations/:id',
  authenticate,
  requirePermission('designation:delete'),
  employeeController.deleteDesignation.bind(employeeController)
);

// =========================================================================
// 3. Employee Endpoints
// =========================================================================
employeeRouter.get(
  '/employees/next-id',
  authenticate,
  requirePermission('employee:create'),
  employeeController.getNextEmployeeId.bind(employeeController)
);

employeeRouter.post(
  '/employees',
  authenticate,
  requirePermission('employee:create'),
  employeeController.createEmployee.bind(employeeController)
);

employeeRouter.get(
  '/employees',
  authenticate,
  requirePermission('employee:read'),
  employeeController.listEmployees.bind(employeeController)
);

employeeRouter.get(
  '/employees/:id',
  authenticate,
  requirePermission('employee:read'),
  employeeController.getEmployeeById.bind(employeeController)
);

employeeRouter.patch(
  '/employees/:id',
  authenticate,
  requirePermission('employee:update'),
  employeeController.updateEmployee.bind(employeeController)
);

employeeRouter.post(
  '/employees/:id/status',
  authenticate,
  requirePermission('employee:update'),
  employeeController.transitionEmployeeStatus.bind(employeeController)
);

// =========================================================================
// 4. Teacher Profile Endpoints
// =========================================================================
employeeRouter.post(
  '/teachers',
  authenticate,
  requirePermission('teacher:create'),
  employeeController.createTeacherProfile.bind(employeeController)
);

employeeRouter.get(
  '/teachers',
  authenticate,
  requirePermission('teacher:read'),
  employeeController.listTeachers.bind(employeeController)
);

employeeRouter.get(
  '/teachers/:employeeId',
  authenticate,
  requirePermission('teacher:read'),
  employeeController.getTeacherProfile.bind(employeeController)
);

employeeRouter.patch(
  '/teachers/:employeeId',
  authenticate,
  requirePermission('teacher:update'),
  employeeController.updateTeacherProfile.bind(employeeController)
);
