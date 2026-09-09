import { Request, Response, NextFunction } from 'express';
import { createSuccessResponse } from '@edusphere/common';
import { rbacService } from './rbac.service.js';

export class RbacController {
  /**
   * List all roles in tenant.
   */
  async listRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const roles = await rbacService.listRoles(tenantId);
      res
        .status(200)
        .json(createSuccessResponse(roles, 'Roles retrieved successfully.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get role details and its permissions by ID.
   */
  async getRoleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const roleId = req.params.id;
      const role = await rbacService.getRoleById(tenantId, roleId);
      res
        .status(200)
        .json(createSuccessResponse(role, 'Role retrieved successfully.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a new custom role in tenant.
   */
  async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const role = await rbacService.createRole(tenantId, req.body);
      res
        .status(201)
        .json(createSuccessResponse(role, 'Role created successfully.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update role name, description, or permission assignments.
   */
  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const roleId = req.params.id;
      const updated = await rbacService.updateRole(tenantId, roleId, req.body);
      res
        .status(200)
        .json(createSuccessResponse(updated, 'Role updated successfully.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete a custom role from tenant.
   */
  async deleteRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const roleId = req.params.id;
      await rbacService.deleteRole(tenantId, roleId);
      res
        .status(200)
        .json(createSuccessResponse(null, 'Role deleted successfully.', { requestId: req.id }));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Assign / replace permissions for a role.
   */
  async assignPermissionsToRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const roleId = req.params.id;
      const updated = await rbacService.assignPermissionsToRole(
        tenantId,
        roleId,
        req.body.permissionIds
      );
      res.status(200).json(
        createSuccessResponse(updated, 'Permissions assigned successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * List all system permissions in dictionary.
   */
  async listPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const permissions = await rbacService.listPermissions();
      res.status(200).json(
        createSuccessResponse(permissions, 'Permissions retrieved successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get roles assigned to a user.
   */
  async getUserRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const userId = req.params.userId;
      const roles = await rbacService.getUserRoles(tenantId, userId);
      res
        .status(200)
        .json(
          createSuccessResponse(roles, 'User roles retrieved successfully.', { requestId: req.id })
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Assign a role to a user.
   */
  async assignRoleToUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const userId = req.params.userId;
      const assignment = await rbacService.assignRoleToUser(
        tenantId,
        userId,
        req.body.roleId,
        req.body.schoolId,
        req.body.campusId
      );
      res.status(201).json(
        createSuccessResponse(assignment, 'Role assigned to user successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Remove a role from a user.
   */
  async removeRoleFromUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { userId, roleId } = req.params;
      await rbacService.removeRoleFromUser(tenantId, userId, roleId);
      res
        .status(200)
        .json(
          createSuccessResponse(null, 'Role removed from user successfully.', { requestId: req.id })
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get current user's effective permissions and roles.
   */
  async getMyPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId, userType } = req.auth!;
      const effective = await rbacService.getEffectivePermissions(tenantId, userId, userType);
      res.status(200).json(
        createSuccessResponse(
          {
            userId,
            tenantId,
            roles: effective.roles,
            permissions: effective.permissions,
          },
          'Effective permissions retrieved successfully.',
          { requestId: req.id }
        )
      );
    } catch (err) {
      next(err);
    }
  }
}

export const rbacController = new RbacController();
