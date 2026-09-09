import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requireAnyPermission } from '../../middlewares/authorize.js';
import { validateBody } from '../auth/auth.validator.js';
import { rbacController } from './rbac.controller.js';
import {
  createRoleSchema,
  updateRoleSchema,
  assignPermissionsSchema,
  assignRoleSchema,
} from './rbac.validator.js';

const router = Router();

// Current User Effective Permissions
router.get('/rbac/me/permissions', authenticate, (req, res, next) =>
  rbacController.getMyPermissions(req, res, next)
);

// Permissions Catalog
router.get(
  '/permissions',
  authenticate,
  requireAnyPermission(['rbac:manage', 'permission:read', 'role:read']),
  (req, res, next) => rbacController.listPermissions(req, res, next)
);

// Roles CRUD
router.get(
  '/roles',
  authenticate,
  requireAnyPermission(['rbac:manage', 'role:read']),
  (req, res, next) => rbacController.listRoles(req, res, next)
);

router.post(
  '/roles',
  authenticate,
  requireAnyPermission(['rbac:manage', 'role:create']),
  validateBody(createRoleSchema),
  (req, res, next) => rbacController.createRole(req, res, next)
);

router.get(
  '/roles/:id',
  authenticate,
  requireAnyPermission(['rbac:manage', 'role:read']),
  (req, res, next) => rbacController.getRoleById(req, res, next)
);

router.put(
  '/roles/:id',
  authenticate,
  requireAnyPermission(['rbac:manage', 'role:update']),
  validateBody(updateRoleSchema),
  (req, res, next) => rbacController.updateRole(req, res, next)
);

router.delete(
  '/roles/:id',
  authenticate,
  requireAnyPermission(['rbac:manage', 'role:delete']),
  (req, res, next) => rbacController.deleteRole(req, res, next)
);

// Role Permissions Assignment
router.put(
  '/roles/:id/permissions',
  authenticate,
  requireAnyPermission(['rbac:manage', 'role:assign_permission', 'role:update']),
  validateBody(assignPermissionsSchema),
  (req, res, next) => rbacController.assignPermissionsToRole(req, res, next)
);

// User Roles Assignment
router.get(
  '/users/:userId/roles',
  authenticate,
  requireAnyPermission(['rbac:manage', 'user_role:read', 'user:read']),
  (req, res, next) => rbacController.getUserRoles(req, res, next)
);

router.post(
  '/users/:userId/roles',
  authenticate,
  requireAnyPermission(['rbac:manage', 'user_role:assign', 'role:manage']),
  validateBody(assignRoleSchema),
  (req, res, next) => rbacController.assignRoleToUser(req, res, next)
);

router.delete(
  '/users/:userId/roles/:roleId',
  authenticate,
  requireAnyPermission(['rbac:manage', 'user_role:remove', 'role:manage']),
  (req, res, next) => rbacController.removeRoleFromUser(req, res, next)
);

export { router as rbacRouter };
