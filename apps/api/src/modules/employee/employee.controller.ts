import { Request, Response, NextFunction } from 'express';
import { createSuccessResponse, ValidationError, BadRequestError } from '@edusphere/common';
import { School } from '@edusphere/database';
import { employeeService } from './employee.service.js';
import { AuditContextMeta } from '../tenant/tenant.service.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  createDesignationSchema,
  updateDesignationSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeStatusTransitionSchema,
  employeeQuerySchema,
  createTeacherProfileSchema,
  updateTeacherProfileSchema,
  teacherQuerySchema,
} from './employee.validator.js';

function getAuditMeta(req: Request): AuditContextMeta {
  return {
    userId: req.auth?.userId || 'system',
    ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
    userAgent: req.headers['user-agent'],
    requestId: req.id,
  };
}

async function resolveSchoolId(req: Request): Promise<string> {
  if (req.auth?.schoolId) {
    return req.auth.schoolId;
  }
  const tenantId = req.auth!.tenantId;
  const defaultSchool = await School.findOne({ tenantId, isDeleted: false });
  if (!defaultSchool) {
    throw new BadRequestError('No school associated with this tenant organization.');
  }
  return defaultSchool._id.toString();
}

export class EmployeeController {
  // =========================================================================
  // Department Endpoints
  // =========================================================================

  async createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createDepartmentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Department payload validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const schoolId = await resolveSchoolId(req);
      const meta = getAuditMeta(req);

      const result = await employeeService.createDepartment(parsed.data, tenantId, schoolId, meta);

      res.status(201).json(
        createSuccessResponse(result, 'Department created successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const schoolId = await resolveSchoolId(req);

      const result = await employeeService.getDepartments(tenantId, schoolId);

      res.status(200).json(
        createSuccessResponse(result, 'Departments retrieved successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getDepartmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const result = await employeeService.getDepartmentById(req.params.id, tenantId);

      res.status(200).json(
        createSuccessResponse(result, 'Department retrieved successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateDepartmentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Department update validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      const result = await employeeService.updateDepartment(
        req.params.id,
        parsed.data,
        tenantId,
        meta
      );

      res.status(200).json(
        createSuccessResponse(result, 'Department updated successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async deleteDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      await employeeService.deleteDepartment(req.params.id, tenantId, meta);

      res.status(200).json(
        createSuccessResponse(null, 'Department deleted successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // Designation Endpoints
  // =========================================================================

  async createDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createDesignationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Designation payload validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const schoolId = await resolveSchoolId(req);
      const meta = getAuditMeta(req);

      const result = await employeeService.createDesignation(parsed.data, tenantId, schoolId, meta);

      res.status(201).json(
        createSuccessResponse(result, 'Designation created successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getDesignations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const schoolId = await resolveSchoolId(req);
      const departmentId = req.query.departmentId as string | undefined;

      const result = await employeeService.getDesignations(tenantId, schoolId, departmentId);

      res.status(200).json(
        createSuccessResponse(result, 'Designations retrieved successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getDesignationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const result = await employeeService.getDesignationById(req.params.id, tenantId);

      res.status(200).json(
        createSuccessResponse(result, 'Designation retrieved successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async updateDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateDesignationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Designation update validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      const result = await employeeService.updateDesignation(
        req.params.id,
        parsed.data,
        tenantId,
        meta
      );

      res.status(200).json(
        createSuccessResponse(result, 'Designation updated successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async deleteDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      await employeeService.deleteDesignation(req.params.id, tenantId, meta);

      res.status(200).json(
        createSuccessResponse(null, 'Designation deleted successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // Employee Endpoints
  // =========================================================================

  async getNextEmployeeId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const schoolId = await resolveSchoolId(req);
      const customPrefix = req.query.prefix as string | undefined;

      const nextId = await employeeService.generateNextEmployeeId(tenantId, schoolId, customPrefix);

      res.status(200).json(
        createSuccessResponse({ nextEmployeeId: nextId }, 'Next employee ID generated.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createEmployeeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Employee payload validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const schoolId = await resolveSchoolId(req);
      const meta = getAuditMeta(req);

      const result = await employeeService.createEmployee(parsed.data, tenantId, schoolId, meta);

      res.status(201).json(
        createSuccessResponse(result.employee, 'Employee registered successfully.', {
          requestId: req.id,
          ...(result.invitationToken ? { meta: { invitationToken: result.invitationToken } } : {}),
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async listEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = employeeQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid employee filter parameters.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const schoolId = await resolveSchoolId(req);
      const campusScope = req.auth?.campusId ? [req.auth.campusId] : undefined;

      const result = await employeeService.listEmployees(
        parsed.data,
        tenantId,
        schoolId,
        campusScope
      );

      res.status(200).json(
        createSuccessResponse(result.data, 'Employees retrieved successfully.', {
          requestId: req.id,
          pagination: {
            page: result.page,
            limit: result.limit,
            totalRecords: result.total,
            totalPages: Math.ceil(result.total / result.limit),
            hasNextPage: result.page * result.limit < result.total,
            hasPrevPage: result.page > 1,
          },
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getEmployeeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const result = await employeeService.getEmployeeById(req.params.id, tenantId);

      res.status(200).json(
        createSuccessResponse(result, 'Employee details retrieved.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateEmployeeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Employee update validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      const result = await employeeService.updateEmployee(
        req.params.id,
        parsed.data,
        tenantId,
        meta
      );

      res.status(200).json(
        createSuccessResponse(result, 'Employee updated successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async transitionEmployeeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = employeeStatusTransitionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Employee status transition validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      const result = await employeeService.transitionEmployeeStatus(
        req.params.id,
        parsed.data,
        tenantId,
        meta
      );

      res.status(200).json(
        createSuccessResponse(result, 'Employee status transitioned successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // Teacher Profile Endpoints
  // =========================================================================

  async createTeacherProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createTeacherProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Teacher profile payload validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const schoolId = await resolveSchoolId(req);
      const meta = getAuditMeta(req);

      const result = await employeeService.createTeacherProfile(
        parsed.data,
        tenantId,
        schoolId,
        meta
      );

      res.status(201).json(
        createSuccessResponse(result, 'Teacher profile registered successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getTeacherProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const result = await employeeService.getTeacherProfileByEmployeeId(
        req.params.employeeId,
        tenantId
      );

      res.status(200).json(
        createSuccessResponse(result, 'Teacher profile retrieved.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async updateTeacherProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateTeacherProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Teacher profile update validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      const result = await employeeService.updateTeacherProfile(
        req.params.employeeId,
        parsed.data,
        tenantId,
        meta
      );

      res.status(200).json(
        createSuccessResponse(result, 'Teacher profile updated successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async listTeachers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = teacherQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid teacher query parameters.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const schoolId = await resolveSchoolId(req);
      const campusScope = req.auth?.campusId ? [req.auth.campusId] : undefined;

      const result = await employeeService.listTeachers(
        parsed.data,
        tenantId,
        schoolId,
        campusScope
      );

      res.status(200).json(
        createSuccessResponse(result.data, 'Teachers retrieved successfully.', {
          requestId: req.id,
          pagination: {
            page: result.page,
            limit: result.limit,
            totalRecords: result.total,
            totalPages: Math.ceil(result.total / result.limit),
            hasNextPage: result.page * result.limit < result.total,
            hasPrevPage: result.page > 1,
          },
        })
      );
    } catch (err) {
      next(err);
    }
  }
}

export const employeeController = new EmployeeController();
