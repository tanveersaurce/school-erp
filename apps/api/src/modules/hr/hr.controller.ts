import { Request, Response, NextFunction } from 'express';
import { createSuccessResponse, AuthenticationError, BadRequestError } from '@edusphere/common';
import { employeeHrService } from './services/employee-hr.service.js';
import { leaveService } from './services/leave.service.js';
import { salaryService } from './services/salary.service.js';
import { payrollService } from './services/payroll.service.js';
import { payslipService } from './services/payslip.service.js';
import { hrAnalyticsService } from './services/hr-analytics.service.js';
import { HrPolicy } from './policies/hr.policy.js';
import { Employee } from '@edusphere/database';
import {
  updateEmployeeHrSchema,
  transitionEmployeeStatusSchema,
  addEmployeeDocumentSchema,
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  createLeavePolicySchema,
  updateLeavePolicySchema,
  applyLeaveSchema,
  reviewLeaveSchema,
  createSalaryComponentSchema,
  updateSalaryComponentSchema,
  createSalaryStructureSchema,
  updateSalaryStructureSchema,
  versionSalaryStructureSchema,
  assignSalarySchema,
  createPayrollPeriodSchema,
  calculatePayrollSchema,
  processPayrollSchema,
  createPayrollAdjustmentSchema,
  reviewPayrollAdjustmentSchema,
  recordOvertimeSchema,
  reviewOvertimeSchema,
} from './hr.validator.js';

export class HrController {
  private static getAuth(req: Request) {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }
    const tenantId = req.tenantContext?.tenantId || auth.tenantId;
    const schoolId = (req.query.schoolId as string) || (req.body?.schoolId as string) || auth.schoolId || '';
    const campusId = (req.query.campusId as string) || (req.body?.campusId as string) || auth.campusId;
    return { auth, tenantId, schoolId, campusId, userId: auth.userId };
  }

  // =========================================================================
  // 1. Employee HR & Lifecycle
  // =========================================================================
  public static async getHrProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const employeeId = req.params.id;
      await HrPolicy.assertEmployeeAccess(req, employeeId);
      const profile = await employeeHrService.getHrProfile(tenantId, employeeId);
      res.status(200).json(createSuccessResponse(profile, 'Employee HR profile retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async updateHrProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HrController.getAuth(req);
      const employeeId = req.params.id;
      HrPolicy.assertCanManageHr(req);
      const validated = updateEmployeeHrSchema.parse(req.body);
      const updated = await employeeHrService.updateHrProfile(tenantId, employeeId, validated, userId);
      res.status(200).json(createSuccessResponse(updated, 'Employee HR profile updated.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async transitionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HrController.getAuth(req);
      const employeeId = req.params.id;
      HrPolicy.assertCanManageHr(req);
      const validated = transitionEmployeeStatusSchema.parse(req.body);
      const updated = await employeeHrService.transitionStatus(
        tenantId,
        employeeId,
        validated.status,
        validated.reason,
        validated.effectiveDate,
        userId
      );
      res.status(200).json(createSuccessResponse(updated, 'Employee status transitioned.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async addDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const employeeId = req.params.id;
      HrPolicy.assertCanManageHr(req);
      const validated = addEmployeeDocumentSchema.parse(req.body);
      const docs = await employeeHrService.addDocument(tenantId, employeeId, validated);
      res.status(201).json(createSuccessResponse(docs, 'Document attached successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const { id: employeeId, docId } = req.params;
      HrPolicy.assertCanManageHr(req);
      const docs = await employeeHrService.removeDocument(tenantId, employeeId, docId);
      res.status(200).json(createSuccessResponse(docs, 'Document removed successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 2. Leave Management
  // =========================================================================
  public static async createLeaveType(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HrController.getAuth(req);
      const validated = createLeaveTypeSchema.parse(req.body);
      const leaveType = await leaveService.createLeaveType(tenantId, schoolId, validated);
      res.status(201).json(createSuccessResponse(leaveType, 'Leave type created successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getLeaveTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HrController.getAuth(req);
      const types = await leaveService.getLeaveTypes(tenantId, schoolId);
      res.status(200).json(createSuccessResponse(types, 'Leave types retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async updateLeaveType(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const validated = updateLeaveTypeSchema.parse(req.body);
      const updated = await leaveService.updateLeaveType(tenantId, req.params.id, validated);
      res.status(200).json(createSuccessResponse(updated, 'Leave type updated.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async deleteLeaveType(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const result = await leaveService.deleteLeaveType(tenantId, req.params.id);
      res.status(200).json(createSuccessResponse(result, 'Leave type archived.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async createLeavePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HrController.getAuth(req);
      const validated = createLeavePolicySchema.parse(req.body);
      const policy = await leaveService.createLeavePolicy(tenantId, schoolId, validated);
      res.status(201).json(createSuccessResponse(policy, 'Leave policy created.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getLeavePolicies(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HrController.getAuth(req);
      const policies = await leaveService.getLeavePolicies(tenantId, schoolId);
      res.status(200).json(createSuccessResponse(policies, 'Leave policies retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async updateLeavePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const validated = updateLeavePolicySchema.parse(req.body);
      const updated = await leaveService.updateLeavePolicy(tenantId, req.params.id, validated);
      res.status(200).json(createSuccessResponse(updated, 'Leave policy updated.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getEmployeeLeaveBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HrController.getAuth(req);
      const employeeId = req.params.employeeId;
      await HrPolicy.assertEmployeeAccess(req, employeeId);
      const year = Number(req.query.year) || new Date().getFullYear();
      const balances = await leaveService.getEmployeeBalance(tenantId, schoolId, employeeId, year);
      res.status(200).json(createSuccessResponse(balances, 'Leave balances retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getMyLeaveBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = HrController.getAuth(req);
      const employee = await Employee.findOne({ tenantId, userId, isDeleted: false });
      if (!employee) {
        return res.status(200).json(createSuccessResponse([], 'No employee profile linked.', { requestId: (req as any).id }));
      }
      const year = Number(req.query.year) || new Date().getFullYear();
      const balances = await leaveService.getEmployeeBalance(tenantId, schoolId, employee._id, year);
      res.status(200).json(createSuccessResponse(balances, 'My leave balances retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async applyLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, campusId } = HrController.getAuth(req);
      const employeeId = req.params.employeeId || req.body.employeeId;
      await HrPolicy.assertEmployeeAccess(req, employeeId);
      const validated = applyLeaveSchema.parse(req.body);
      const application = await leaveService.applyLeave(tenantId, schoolId, campusId, employeeId, validated);
      res.status(201).json(createSuccessResponse(application, 'Leave application submitted.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async applyMyLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, campusId, userId } = HrController.getAuth(req);
      const employee = await Employee.findOne({ tenantId, userId, isDeleted: false });
      if (!employee) {
        throw new BadRequestError('No linked employee profile found.');
      }
      const validated = applyLeaveSchema.parse(req.body);
      const application = await leaveService.applyLeave(tenantId, schoolId, campusId, employee._id, validated);
      res.status(201).json(createSuccessResponse(application, 'Leave applied successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async reviewLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HrController.getAuth(req);
      const applicationId = req.params.id;
      const validated = reviewLeaveSchema.parse(req.body);

      // Check not self-approval
      const app = await leaveService.listLeaveApplications(tenantId, { _id: applicationId });
      if (app.items.length > 0) {
        await HrPolicy.assertNotSelfApproval(req, (app.items[0].employeeId as any)?._id || app.items[0].employeeId);
      }

      const reviewed = await leaveService.reviewLeave(tenantId, applicationId, validated.status, userId, validated.remarks);
      res.status(200).json(createSuccessResponse(reviewed, `Leave ${validated.status.toLowerCase()} successfully.`, { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async cancelMyLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HrController.getAuth(req);
      const employee = await Employee.findOne({ tenantId, userId, isDeleted: false });
      if (!employee) {
        throw new BadRequestError('No linked employee profile found.');
      }
      const cancelled = await leaveService.cancelLeave(tenantId, req.params.id, employee._id);
      res.status(200).json(createSuccessResponse(cancelled, 'Leave application cancelled.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async listLeaveApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HrController.getAuth(req);
      const filters = {
        schoolId,
        employeeId: req.query.employeeId,
        leaveTypeId: req.query.leaveTypeId,
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };
      const pagination = { page: req.query.page, limit: req.query.limit };
      const results = await leaveService.listLeaveApplications(tenantId, filters, pagination);
      res.status(200).json(createSuccessResponse(results.items, 'Leave applications retrieved.', {
        requestId: (req as any).id,
        meta: results.meta,
      }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 3. Salary Components, Structures & Assignments
  // =========================================================================
  public static async createSalaryComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HrController.getAuth(req);
      const validated = createSalaryComponentSchema.parse(req.body);
      const component = await salaryService.createSalaryComponent(tenantId, schoolId, validated);
      res.status(201).json(createSuccessResponse(component, 'Salary component created.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getSalaryComponents(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HrController.getAuth(req);
      const components = await salaryService.getSalaryComponents(tenantId, schoolId);
      res.status(200).json(createSuccessResponse(components, 'Salary components retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async updateSalaryComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const validated = updateSalaryComponentSchema.parse(req.body);
      const updated = await salaryService.updateSalaryComponent(tenantId, req.params.id, validated);
      res.status(200).json(createSuccessResponse(updated, 'Salary component updated.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async deleteSalaryComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const result = await salaryService.deleteSalaryComponent(tenantId, req.params.id);
      res.status(200).json(createSuccessResponse(result, 'Salary component archived.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async createSalaryStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HrController.getAuth(req);
      const validated = createSalaryStructureSchema.parse(req.body);
      const structure = await salaryService.createSalaryStructure(tenantId, schoolId, validated);
      res.status(201).json(createSuccessResponse(structure, 'Salary structure created.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getSalaryStructures(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HrController.getAuth(req);
      const structures = await salaryService.getSalaryStructures(tenantId, schoolId);
      res.status(200).json(createSuccessResponse(structures, 'Salary structures retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getSalaryStructureById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const structure = await salaryService.getSalaryStructureById(tenantId, req.params.id);
      res.status(200).json(createSuccessResponse(structure, 'Salary structure retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async versionSalaryStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HrController.getAuth(req);
      const validated = versionSalaryStructureSchema.parse(req.body);
      const structure = await salaryService.versionSalaryStructure(tenantId, schoolId, req.params.id, validated);
      res.status(201).json(createSuccessResponse(structure, 'New salary structure version created.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async assignSalary(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, campusId } = HrController.getAuth(req);
      const employeeId = req.params.employeeId;
      const validated = assignSalarySchema.parse(req.body);
      const assignment = await salaryService.assignSalaryToEmployee(tenantId, schoolId, campusId, employeeId, validated);
      res.status(201).json(createSuccessResponse(assignment, 'Salary assigned to employee.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getEmployeeSalaryAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const employeeId = req.params.employeeId;
      await HrPolicy.assertEmployeeAccess(req, employeeId);
      const assignment = await salaryService.getEmployeeSalaryAssignment(tenantId, employeeId);
      res.status(200).json(createSuccessResponse(assignment, 'Salary assignment retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getSalaryAssignmentHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const employeeId = req.params.employeeId;
      await HrPolicy.assertEmployeeAccess(req, employeeId);
      const history = await salaryService.getSalaryAssignmentHistory(tenantId, employeeId);
      res.status(200).json(createSuccessResponse(history, 'Salary assignment history retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 4. Payroll Periods, Calculation & Runs
  // =========================================================================
  public static async createPayrollPeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, campusId } = HrController.getAuth(req);
      const validated = createPayrollPeriodSchema.parse(req.body);
      const period = await payrollService.createPayrollPeriod(tenantId, schoolId, campusId, validated);
      res.status(201).json(createSuccessResponse(period, 'Payroll period created.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getPayrollPeriods(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HrController.getAuth(req);
      const filters = { schoolId, year: req.query.year, status: req.query.status };
      const pagination = { page: req.query.page, limit: req.query.limit };
      const results = await payrollService.getPayrollPeriods(tenantId, filters, pagination);
      res.status(200).json(createSuccessResponse(results.items, 'Payroll periods retrieved.', {
        requestId: (req as any).id,
        meta: results.meta,
      }));
    } catch (err) {
      next(err);
    }
  }

  public static async getPayrollPeriodById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const period = await payrollService.getPayrollPeriodById(tenantId, req.params.id);
      res.status(200).json(createSuccessResponse(period, 'Payroll period retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async calculatePayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, campusId, userId } = HrController.getAuth(req);
      const validated = calculatePayrollSchema.parse(req.body);
      const period = await payrollService.calculatePayrollRun(
        tenantId,
        schoolId,
        campusId,
        validated.payrollPeriodId,
        validated.employeeIds,
        userId
      );
      res.status(200).json(createSuccessResponse(period, 'Payroll run calculated successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async submitForReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const period = await payrollService.submitForReview(tenantId, req.params.id);
      res.status(200).json(createSuccessResponse(period, 'Payroll submitted for review.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async approvePayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HrController.getAuth(req);
      const period = await payrollService.approvePayrollPeriod(tenantId, req.params.id, userId);
      res.status(200).json(createSuccessResponse(period, 'Payroll approved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async processPayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HrController.getAuth(req);
      const validated = processPayrollSchema.parse(req.body);
      const period = await payrollService.processPayrollPeriod(
        tenantId,
        req.params.id,
        userId,
        validated.paymentMethod,
        validated.transactionReference
      );
      res.status(200).json(createSuccessResponse(period, 'Payroll processed and marked paid.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async lockPayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HrController.getAuth(req);
      const period = await payrollService.lockPayrollPeriod(tenantId, req.params.id, userId);
      res.status(200).json(createSuccessResponse(period, 'Payroll permanently locked.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async listPayrollItems(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const pagination = { page: req.query.page, limit: req.query.limit };
      const results = await payrollService.listPayrollItems(tenantId, req.params.id, pagination);
      res.status(200).json(createSuccessResponse(results.items, 'Payroll items retrieved.', {
        requestId: (req as any).id,
        meta: results.meta,
      }));
    } catch (err) {
      next(err);
    }
  }

  public static async addAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HrController.getAuth(req);
      const validated = createPayrollAdjustmentSchema.parse(req.body);
      const adjustment = await payrollService.addAdjustment(tenantId, schoolId, validated);
      res.status(201).json(createSuccessResponse(adjustment, 'Payroll adjustment added.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async reviewAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HrController.getAuth(req);
      const validated = reviewPayrollAdjustmentSchema.parse(req.body);
      const reviewed = await payrollService.reviewAdjustment(tenantId, req.params.id, validated.status, userId);
      res.status(200).json(createSuccessResponse(reviewed, `Adjustment ${validated.status.toLowerCase()}.`, { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async recordOvertime(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HrController.getAuth(req);
      const validated = recordOvertimeSchema.parse(req.body);
      const overtime = await payrollService.recordOvertime(tenantId, schoolId, validated);
      res.status(201).json(createSuccessResponse(overtime, 'Overtime recorded.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async reviewOvertime(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HrController.getAuth(req);
      const validated = reviewOvertimeSchema.parse(req.body);
      const reviewed = await payrollService.reviewOvertime(tenantId, req.params.id, validated.status, userId);
      res.status(200).json(createSuccessResponse(reviewed, `Overtime ${validated.status.toLowerCase()}.`, { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 5. Payslips
  // =========================================================================
  public static async getPayslip(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const payslip = await payslipService.getPayslipByPayrollItemId(tenantId, req.params.id);
      await HrPolicy.assertPayslipAccess(req, payslip.employeeId);
      res.status(200).json(createSuccessResponse(payslip, 'Payslip generated.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getMyPayslips(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HrController.getAuth(req);
      const pagination = { page: req.query.page, limit: req.query.limit };
      const results = await payslipService.getMyPayslips(tenantId, userId, pagination);
      res.status(200).json(createSuccessResponse(results.items, 'My payslips retrieved.', {
        requestId: (req as any).id,
        meta: results.meta,
      }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 6. Analytics & Reports
  // =========================================================================
  public static async getHrDashboardKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, campusId } = HrController.getAuth(req);
      const kpis = await hrAnalyticsService.getHrDashboardKPIs(tenantId, schoolId, campusId);
      res.status(200).json(createSuccessResponse(kpis, 'HR Dashboard KPIs retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getPayrollDashboardKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, campusId } = HrController.getAuth(req);
      const kpis = await hrAnalyticsService.getPayrollDashboardKPIs(tenantId, schoolId, campusId);
      res.status(200).json(createSuccessResponse(kpis, 'Payroll Dashboard KPIs retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getDepartmentPayrollReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const report = await hrAnalyticsService.getDepartmentPayrollReport(tenantId, req.params.periodId);
      res.status(200).json(createSuccessResponse(report, 'Department payroll report retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getLeaveUtilizationReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HrController.getAuth(req);
      const year = Number(req.query.year) || new Date().getFullYear();
      const report = await hrAnalyticsService.getLeaveUtilizationReport(tenantId, year);
      res.status(200).json(createSuccessResponse(report, 'Leave utilization report retrieved.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }
}
