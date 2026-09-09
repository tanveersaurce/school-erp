import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, AuthorizationError, UserType } from '@edusphere/common';
import { rbacService } from '../modules/rbac/rbac.service.js';

/**
 * Helper to ensure req.auth is populated and enrich it with cached effective permissions and roles.
 */
async function resolveAuthContext(req: Request) {
  if (!req.auth || !req.auth.userId || !req.auth.tenantId) {
    throw new AuthenticationError('Authentication required before authorization can be evaluated.');
  }

  // If already resolved on this request lifecycle, reuse
  if (req.auth.permissions && req.auth.roles) {
    return {
      roles: req.auth.roles,
      permissions: req.auth.permissions,
    };
  }

  const effective = await rbacService.getEffectivePermissions(
    req.auth.tenantId,
    req.auth.userId,
    req.auth.userType
  );

  req.auth.roles = effective.roles;
  req.auth.permissions = effective.permissions;

  return effective;
}

/**
 * Requires a specific permission string (e.g., "student:read").
 * Case-insensitive comparison, defaults to DENY.
 */
export function requirePermission(permission: string) {
  const normalized = permission.toLowerCase().trim();

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roles, permissions } = await resolveAuthContext(req);

      // Super Admin bypass
      if (req.auth?.userType === UserType.SUPER_ADMIN || roles.includes('SUPER_ADMIN')) {
        return next();
      }

      // Check wildcard or exact permission match
      if (permissions.includes('*') || permissions.includes(normalized)) {
        return next();
      }

      throw new AuthorizationError(
        `Insufficient privileges. Required permission: '${normalized}'. Access denied.`
      );
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Requires at least ONE of the specified permissions.
 */
export function requireAnyPermission(permissionsList: string[]) {
  const normalizedList = permissionsList.map((p) => p.toLowerCase().trim());

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roles, permissions } = await resolveAuthContext(req);

      // Super Admin bypass
      if (req.auth?.userType === UserType.SUPER_ADMIN || roles.includes('SUPER_ADMIN')) {
        return next();
      }

      if (permissions.includes('*')) {
        return next();
      }

      const hasAny = normalizedList.some((required) => permissions.includes(required));
      if (hasAny) {
        return next();
      }

      throw new AuthorizationError(
        `Insufficient privileges. Requires at least one of: [${normalizedList.join(', ')}]. Access denied.`
      );
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Requires ALL of the specified permissions.
 */
export function requireAllPermissions(permissionsList: string[]) {
  const normalizedList = permissionsList.map((p) => p.toLowerCase().trim());

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roles, permissions } = await resolveAuthContext(req);

      // Super Admin bypass
      if (req.auth?.userType === UserType.SUPER_ADMIN || roles.includes('SUPER_ADMIN')) {
        return next();
      }

      if (permissions.includes('*')) {
        return next();
      }

      const hasAll = normalizedList.every((required) => permissions.includes(required));
      if (hasAll) {
        return next();
      }

      throw new AuthorizationError(
        `Insufficient privileges. Requires all of: [${normalizedList.join(', ')}]. Access denied.`
      );
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Requires a specific named role (or one of multiple roles).
 */
export function requireRole(allowedRoles: string | string[]) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roles } = await resolveAuthContext(req);

      // Super Admin platform role bypass
      if (req.auth?.userType === UserType.SUPER_ADMIN || roles.includes('SUPER_ADMIN')) {
        return next();
      }

      const hasRole = rolesArray.some((r) => roles.includes(r));
      if (hasRole) {
        return next();
      }

      throw new AuthorizationError(
        `Insufficient privileges. Required role: [${rolesArray.join(', ')}]. Access denied.`
      );
    } catch (err) {
      next(err);
    }
  };
}
