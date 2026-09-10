import { Router } from 'express';
import { UserType } from '@edusphere/common';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission, requireRole } from '../../middlewares/authorize.js';
import { tenantController } from './tenant.controller.js';

export const tenantRouter = Router();

// =========================================================================
// 1. Onboarding & Public Endpoints
// =========================================================================
tenantRouter.post('/tenants/onboard', tenantController.onboard.bind(tenantController));

// =========================================================================
// 2. Current Tenant Profile (Tenant-Scoped)
// =========================================================================
tenantRouter.get(
  '/tenants/me',
  authenticate,
  requirePermission('tenant:read'),
  tenantController.getCurrentTenant.bind(tenantController)
);

// =========================================================================
// 3. Platform Tenant Administration (SUPER_ADMIN Only)
// =========================================================================
tenantRouter.get(
  '/tenants',
  authenticate,
  requireRole([UserType.SUPER_ADMIN]),
  tenantController.listTenants.bind(tenantController)
);

tenantRouter.post(
  '/tenants',
  authenticate,
  requireRole([UserType.SUPER_ADMIN]),
  tenantController.createTenant.bind(tenantController)
);

tenantRouter.get(
  '/tenants/:id',
  authenticate,
  requireRole([UserType.SUPER_ADMIN]),
  tenantController.getTenantById.bind(tenantController)
);

tenantRouter.patch(
  '/tenants/:id',
  authenticate,
  requireRole([UserType.SUPER_ADMIN]),
  tenantController.updateTenant.bind(tenantController)
);

tenantRouter.post(
  '/tenants/:id/suspend',
  authenticate,
  requireRole([UserType.SUPER_ADMIN]),
  tenantController.suspendTenant.bind(tenantController)
);

tenantRouter.post(
  '/tenants/:id/restore',
  authenticate,
  requireRole([UserType.SUPER_ADMIN]),
  tenantController.restoreTenant.bind(tenantController)
);

tenantRouter.post(
  '/tenants/:id/archive',
  authenticate,
  requireRole([UserType.SUPER_ADMIN]),
  tenantController.archiveTenant.bind(tenantController)
);

// =========================================================================
// 4. School Profile, Settings & Branding
// =========================================================================
tenantRouter.get(
  '/schools/profile',
  authenticate,
  requirePermission('school:read'),
  tenantController.getSchoolProfile.bind(tenantController)
);

tenantRouter.patch(
  '/schools/profile',
  authenticate,
  requirePermission('school:update'),
  tenantController.updateSchoolProfile.bind(tenantController)
);

tenantRouter.get(
  '/schools/settings',
  authenticate,
  requirePermission('settings:read'),
  tenantController.getSchoolSettings.bind(tenantController)
);

tenantRouter.patch(
  '/schools/settings',
  authenticate,
  requirePermission('settings:update'),
  tenantController.updateSchoolSettings.bind(tenantController)
);

tenantRouter.get(
  '/schools/branding',
  authenticate,
  requirePermission('branding:read'),
  tenantController.getSchoolBranding.bind(tenantController)
);

tenantRouter.patch(
  '/schools/branding',
  authenticate,
  requirePermission('branding:update'),
  tenantController.updateSchoolBranding.bind(tenantController)
);

// =========================================================================
// 5. Campus Management (Campus / Branch)
// =========================================================================
tenantRouter.get(
  '/campuses',
  authenticate,
  requirePermission('campus:read'),
  tenantController.listCampuses.bind(tenantController)
);

tenantRouter.post(
  '/campuses',
  authenticate,
  requirePermission('campus:create'),
  tenantController.createCampus.bind(tenantController)
);

tenantRouter.get(
  '/campuses/:campusId',
  authenticate,
  requirePermission('campus:read'),
  tenantController.getCampusById.bind(tenantController)
);

tenantRouter.patch(
  '/campuses/:campusId',
  authenticate,
  requirePermission('campus:update'),
  tenantController.updateCampus.bind(tenantController)
);

tenantRouter.post(
  '/campuses/:campusId/archive',
  authenticate,
  requirePermission('campus:delete'),
  tenantController.archiveCampus.bind(tenantController)
);

// =========================================================================
// 6. Academic Year Management
// =========================================================================
tenantRouter.get(
  '/academic-years',
  authenticate,
  requirePermission('academic_year:read'),
  tenantController.listAcademicYears.bind(tenantController)
);

tenantRouter.get(
  '/academic-years/current',
  authenticate,
  requirePermission('academic_year:read'),
  tenantController.getCurrentAcademicYear.bind(tenantController)
);

tenantRouter.post(
  '/academic-years',
  authenticate,
  requirePermission('academic_year:create'),
  tenantController.createAcademicYear.bind(tenantController)
);

tenantRouter.get(
  '/academic-years/:academicYearId',
  authenticate,
  requirePermission('academic_year:read'),
  tenantController.getAcademicYearById.bind(tenantController)
);

tenantRouter.patch(
  '/academic-years/:academicYearId',
  authenticate,
  requirePermission('academic_year:update'),
  tenantController.updateAcademicYear.bind(tenantController)
);

tenantRouter.post(
  '/academic-years/:academicYearId/activate',
  authenticate,
  requirePermission('academic_year:activate'),
  tenantController.activateAcademicYear.bind(tenantController)
);

tenantRouter.post(
  '/academic-years/:academicYearId/close',
  authenticate,
  requirePermission('academic_year:close'),
  tenantController.closeAcademicYear.bind(tenantController)
);
