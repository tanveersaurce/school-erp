import { Request, Response, NextFunction } from 'express';
import { createSuccessResponse, ValidationError } from '@edusphere/common';
import { tenantService, AuditContextMeta } from './tenant.service.js';
import {
  tenantOnboardSchema,
  createTenantSchema,
  updateTenantSchema,
  updateSchoolProfileSchema,
  updateSchoolSettingsSchema,
  updateSchoolBrandingSchema,
  createCampusSchema,
  updateCampusSchema,
  createAcademicYearSchema,
  updateAcademicYearSchema,
} from './tenant.validator.js';

function getAuditMeta(req: Request): AuditContextMeta {
  return {
    userId: req.auth?.userId || 'system',
    ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
    userAgent: req.headers['user-agent'],
    requestId: req.id,
  };
}

export class TenantController {
  // -------------------------------------------------------------------------
  // Onboarding
  // -------------------------------------------------------------------------

  async onboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = tenantOnboardSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Tenant onboarding payload validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const meta = getAuditMeta(req);
      const result = await tenantService.onboardTenant(parsed.data, meta);

      res.status(201).json(
        createSuccessResponse(result, 'Tenant organization onboarded successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  // -------------------------------------------------------------------------
  // Platform Tenant Administration
  // -------------------------------------------------------------------------

  async listTenants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = req.query.search as string;
      const status = req.query.status as any;
      const plan = req.query.plan as any;

      const result = await tenantService.listTenants({ page, limit, search, status, plan });

      res.status(200).json(
        createSuccessResponse(result.tenants, 'Tenants retrieved successfully.', {
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

  async getTenantById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tenantService.getTenantById(req.params.id);
      res.status(200).json(
        createSuccessResponse(result, 'Tenant retrieved successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async createTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createTenantSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Create tenant payload validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const meta = getAuditMeta(req);
      const result = await tenantService.createTenant(parsed.data, meta);

      res.status(201).json(
        createSuccessResponse(result, 'Tenant created successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async updateTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateTenantSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Update tenant payload validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const meta = getAuditMeta(req);
      const result = await tenantService.updateTenant(req.params.id, parsed.data, meta);

      res.status(200).json(
        createSuccessResponse(result, 'Tenant updated successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async suspendTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = getAuditMeta(req);
      const result = await tenantService.suspendTenant(req.params.id, req.body?.reason, meta);

      res.status(200).json(
        createSuccessResponse(result, 'Tenant suspended successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async restoreTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = getAuditMeta(req);
      const result = await tenantService.restoreTenant(req.params.id, meta);

      res.status(200).json(
        createSuccessResponse(result, 'Tenant restored successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async archiveTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = getAuditMeta(req);
      const result = await tenantService.archiveTenant(req.params.id, req.body?.reason, meta);

      res.status(200).json(
        createSuccessResponse(result, 'Tenant archived successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  // -------------------------------------------------------------------------
  // Tenant & School Profile (Tenant-Scoped)
  // -------------------------------------------------------------------------

  async getCurrentTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const result = await tenantService.getTenantById(tenantId);

      res.status(200).json(
        createSuccessResponse(result, 'Current tenant retrieved.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getSchoolProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const schoolId = req.auth!.schoolId;
      const result = await tenantService.getSchoolProfile(tenantId, schoolId);

      res.status(200).json(
        createSuccessResponse(result, 'School profile retrieved.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async updateSchoolProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateSchoolProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Update school profile validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const schoolId = req.auth!.schoolId;
      const meta = getAuditMeta(req);

      const result = await tenantService.updateSchoolProfile(tenantId, parsed.data, schoolId, meta);

      res.status(200).json(
        createSuccessResponse(result, 'School profile updated successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getSchoolSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const schoolId = req.auth!.schoolId;
      const result = await tenantService.getSchoolSettings(tenantId, schoolId);

      res.status(200).json(
        createSuccessResponse(result, 'School settings retrieved.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async updateSchoolSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateSchoolSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Update school settings validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const schoolId = req.auth!.schoolId;
      const meta = getAuditMeta(req);

      const result = await tenantService.updateSchoolSettings(
        tenantId,
        parsed.data,
        schoolId,
        meta
      );

      res.status(200).json(
        createSuccessResponse(result, 'School settings updated successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async previewNumbering(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const schoolId = req.auth!.schoolId;
      const result = await tenantService.previewNumbering(tenantId, schoolId);

      res.status(200).json(
        createSuccessResponse(result, 'Numbering preview generated successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getSchoolBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const schoolId = req.auth!.schoolId;
      const result = await tenantService.getSchoolBranding(tenantId, schoolId);

      res.status(200).json(
        createSuccessResponse(result, 'School branding retrieved.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async updateSchoolBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateSchoolBrandingSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Update school branding validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const schoolId = req.auth!.schoolId;
      const meta = getAuditMeta(req);

      const result = await tenantService.updateSchoolBranding(
        tenantId,
        parsed.data,
        schoolId,
        meta
      );

      res.status(200).json(
        createSuccessResponse(result, 'School branding updated successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  // -------------------------------------------------------------------------
  // Campuses
  // -------------------------------------------------------------------------

  async listCampuses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const schoolId = (req.query.schoolId as string) || req.auth!.schoolId;
      const status = req.query.status as any;
      const search = req.query.search as string;

      const result = await tenantService.listCampuses(tenantId, schoolId, { status, search });

      res.status(200).json(
        createSuccessResponse(result.campuses, 'Campuses retrieved successfully.', {
          requestId: req.id,
          totalRecords: result.total,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getCampusById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const result = await tenantService.getCampusById(tenantId, req.params.campusId);

      res.status(200).json(
        createSuccessResponse(result, 'Campus details retrieved.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async createCampus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createCampusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Create campus validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      const result = await tenantService.createCampus(tenantId, parsed.data, meta);

      res.status(201).json(
        createSuccessResponse(result, 'Campus created successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async updateCampus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateCampusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Update campus validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      const result = await tenantService.updateCampus(
        tenantId,
        req.params.campusId,
        parsed.data,
        meta
      );

      res.status(200).json(
        createSuccessResponse(result, 'Campus updated successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async archiveCampus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      const result = await tenantService.archiveCampus(tenantId, req.params.campusId, meta);

      res.status(200).json(
        createSuccessResponse(result, 'Campus archived successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async setMainCampus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      const result = await tenantService.setMainCampus(tenantId, req.params.campusId, meta);

      res.status(200).json(
        createSuccessResponse(result, 'Campus designated as main campus successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  // -------------------------------------------------------------------------
  // Academic Years
  // -------------------------------------------------------------------------

  async listAcademicYears(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const campusId = req.query.campusId as string;
      const status = req.query.status as any;

      const result = await tenantService.listAcademicYears(tenantId, campusId, status);

      res.status(200).json(
        createSuccessResponse(result, 'Academic years retrieved successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getAcademicYearById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const result = await tenantService.getAcademicYearById(tenantId, req.params.academicYearId);

      res.status(200).json(
        createSuccessResponse(result, 'Academic year retrieved.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getCurrentAcademicYear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const campusId = req.query.campusId as string;

      const result = await tenantService.getCurrentAcademicYear(tenantId, campusId);

      res.status(200).json(
        createSuccessResponse(result, 'Current academic year retrieved.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async createAcademicYear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createAcademicYearSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Create academic year validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      const result = await tenantService.createAcademicYear(tenantId, parsed.data, meta);

      res.status(201).json(
        createSuccessResponse(result, 'Academic year created successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async updateAcademicYear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateAcademicYearSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Update academic year validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      const result = await tenantService.updateAcademicYear(
        tenantId,
        req.params.academicYearId,
        parsed.data,
        meta
      );

      res.status(200).json(
        createSuccessResponse(result, 'Academic year updated successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async activateAcademicYear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      const result = await tenantService.activateAcademicYear(
        tenantId,
        req.params.academicYearId,
        meta
      );

      res.status(200).json(
        createSuccessResponse(result, 'Academic year activated successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async closeAcademicYear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const meta = getAuditMeta(req);

      const result = await tenantService.closeAcademicYear(
        tenantId,
        req.params.academicYearId,
        meta
      );

      res.status(200).json(
        createSuccessResponse(result, 'Academic year closed successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }
}

export const tenantController = new TenantController();
