import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission } from '../../middlewares/authorize.js';
import { HrController } from './hr.controller.js';

export const hrRouter = Router();

// =========================================================================
// 1. Employee HR & Documents
// =========================================================================
hrRouter.get(
  '/employees/:id/hr',
  authenticate,
  requirePermission('employee_hr:read'),
  HrController.getHrProfile
);

hrRouter.patch(
  '/employees/:id/hr',
  authenticate,
  requirePermission('employee_hr:update'),
  HrController.updateHrProfile
);

hrRouter.post(
  '/employees/:id/status',
  authenticate,
  requirePermission('employee_hr:manage'),
  HrController.transitionStatus
);

hrRouter.post(
  '/employees/:id/documents',
  authenticate,
  requirePermission('employee_documents:manage'),
  HrController.addDocument
);

hrRouter.delete(
  '/employees/:id/documents/:docId',
  authenticate,
  requirePermission('employee_documents:manage'),
  HrController.deleteDocument
);

// =========================================================================
// 2. Leave Types & Policies
// =========================================================================
hrRouter.post(
  '/leave-types',
  authenticate,
  requirePermission('leave_type:manage'),
  HrController.createLeaveType
);

hrRouter.get(
  '/leave-types',
  authenticate,
  requirePermission('leave_type:manage'),
  HrController.getLeaveTypes
);

hrRouter.patch(
  '/leave-types/:id',
  authenticate,
  requirePermission('leave_type:manage'),
  HrController.updateLeaveType
);

hrRouter.delete(
  '/leave-types/:id',
  authenticate,
  requirePermission('leave_type:manage'),
  HrController.deleteLeaveType
);

hrRouter.post(
  '/leave-policies',
  authenticate,
  requirePermission('leave_policy:manage'),
  HrController.createLeavePolicy
);

hrRouter.get(
  '/leave-policies',
  authenticate,
  requirePermission('leave_policy:manage'),
  HrController.getLeavePolicies
);

hrRouter.patch(
  '/leave-policies/:id',
  authenticate,
  requirePermission('leave_policy:manage'),
  HrController.updateLeavePolicy
);

// =========================================================================
// 3. Leave Balances & Applications
// =========================================================================
hrRouter.get(
  '/leaves/balances/my',
  authenticate,
  HrController.getMyLeaveBalance
);

hrRouter.get(
  '/employees/:employeeId/leave-balances',
  authenticate,
  requirePermission('leave_balance:read'),
  HrController.getEmployeeLeaveBalance
);

hrRouter.post(
  '/leaves/apply',
  authenticate,
  requirePermission('leave_application:create'),
  HrController.applyMyLeave
);

hrRouter.post(
  '/employees/:employeeId/leaves/apply',
  authenticate,
  requirePermission('leave_application:create'),
  HrController.applyLeave
);

hrRouter.get(
  '/leaves/applications',
  authenticate,
  requirePermission('leave_application:read'),
  HrController.listLeaveApplications
);

hrRouter.post(
  '/leaves/applications/:id/review',
  authenticate,
  requirePermission('leave_application:approve'),
  HrController.reviewLeave
);

hrRouter.post(
  '/leaves/applications/:id/cancel',
  authenticate,
  HrController.cancelMyLeave
);

// =========================================================================
// 4. Salary Components & Structures
// =========================================================================
hrRouter.post(
  '/salary-components',
  authenticate,
  requirePermission('salary_component:manage'),
  HrController.createSalaryComponent
);

hrRouter.get(
  '/salary-components',
  authenticate,
  requirePermission('salary_component:manage'),
  HrController.getSalaryComponents
);

hrRouter.patch(
  '/salary-components/:id',
  authenticate,
  requirePermission('salary_component:manage'),
  HrController.updateSalaryComponent
);

hrRouter.delete(
  '/salary-components/:id',
  authenticate,
  requirePermission('salary_component:manage'),
  HrController.deleteSalaryComponent
);

hrRouter.post(
  '/salary-structures',
  authenticate,
  requirePermission('salary_structure:manage'),
  HrController.createSalaryStructure
);

hrRouter.get(
  '/salary-structures',
  authenticate,
  requirePermission('salary_structure:manage'),
  HrController.getSalaryStructures
);

hrRouter.get(
  '/salary-structures/:id',
  authenticate,
  requirePermission('salary_structure:manage'),
  HrController.getSalaryStructureById
);

hrRouter.post(
  '/salary-structures/:id/version',
  authenticate,
  requirePermission('salary_structure:manage'),
  HrController.versionSalaryStructure
);

// =========================================================================
// 5. Salary Assignments
// =========================================================================
hrRouter.post(
  '/employees/:employeeId/salary-assignment',
  authenticate,
  requirePermission('employee_salary:manage'),
  HrController.assignSalary
);

hrRouter.get(
  '/employees/:employeeId/salary-assignment',
  authenticate,
  requirePermission('employee_salary:read'),
  HrController.getEmployeeSalaryAssignment
);

hrRouter.get(
  '/employees/:employeeId/salary-history',
  authenticate,
  requirePermission('employee_salary:read'),
  HrController.getSalaryAssignmentHistory
);

// =========================================================================
// 6. Payroll Periods, Runs & Workflow
// =========================================================================
hrRouter.post(
  '/payroll-periods',
  authenticate,
  requirePermission('payroll_period:manage'),
  HrController.createPayrollPeriod
);

hrRouter.get(
  '/payroll-periods',
  authenticate,
  requirePermission('payroll:read'),
  HrController.getPayrollPeriods
);

hrRouter.get(
  '/payroll-periods/:id',
  authenticate,
  requirePermission('payroll:read'),
  HrController.getPayrollPeriodById
);

hrRouter.post(
  '/payroll/calculate',
  authenticate,
  requirePermission('payroll:calculate'),
  HrController.calculatePayroll
);

hrRouter.post(
  '/payroll-periods/:id/review',
  authenticate,
  requirePermission('payroll:review'),
  HrController.submitForReview
);

hrRouter.post(
  '/payroll-periods/:id/approve',
  authenticate,
  requirePermission('payroll:approve'),
  HrController.approvePayroll
);

hrRouter.post(
  '/payroll-periods/:id/process',
  authenticate,
  requirePermission('payroll:process'),
  HrController.processPayroll
);

hrRouter.post(
  '/payroll-periods/:id/lock',
  authenticate,
  requirePermission('payroll:lock'),
  HrController.lockPayroll
);

hrRouter.get(
  '/payroll-periods/:id/items',
  authenticate,
  requirePermission('payroll:read'),
  HrController.listPayrollItems
);

hrRouter.post(
  '/payroll/adjustments',
  authenticate,
  requirePermission('payroll:calculate'),
  HrController.addAdjustment
);

hrRouter.post(
  '/payroll/adjustments/:id/review',
  authenticate,
  requirePermission('payroll:approve'),
  HrController.reviewAdjustment
);

hrRouter.post(
  '/payroll/overtime',
  authenticate,
  requirePermission('payroll:calculate'),
  HrController.recordOvertime
);

hrRouter.post(
  '/payroll/overtime/:id/review',
  authenticate,
  requirePermission('payroll:approve'),
  HrController.reviewOvertime
);

// =========================================================================
// 7. Payslips
// =========================================================================
hrRouter.get(
  '/payslips/my',
  authenticate,
  requirePermission('payslip:read_own'),
  HrController.getMyPayslips
);

hrRouter.get(
  '/payslips/:id',
  authenticate,
  HrController.getPayslip
);

// =========================================================================
// 8. Analytics & Reports
// =========================================================================
hrRouter.get(
  '/dashboard/kpis',
  authenticate,
  requirePermission('employee_hr:read'),
  HrController.getHrDashboardKPIs
);

hrRouter.get(
  '/payroll-dashboard/kpis',
  authenticate,
  requirePermission('payroll:report'),
  HrController.getPayrollDashboardKPIs
);

hrRouter.get(
  '/reports/department-payroll/:periodId',
  authenticate,
  requirePermission('payroll:report'),
  HrController.getDepartmentPayrollReport
);

hrRouter.get(
  '/reports/leave-utilization',
  authenticate,
  requirePermission('employee_hr:read'),
  HrController.getLeaveUtilizationReport
);
