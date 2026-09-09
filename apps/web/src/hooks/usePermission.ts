import { useMemo } from 'react';
import { useAppSelector } from '../store/index.js';
import { UserType } from '@edusphere/common';

export interface UsePermissionResult {
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string | string[]) => boolean;
}

export function usePermission(): UsePermissionResult {
  const user = useAppSelector((state) => state.auth.user);

  const roles = useMemo(() => user?.roles || [], [user?.roles]);
  const permissions = useMemo(
    () => (user?.permissions || []).map((p) => p.toLowerCase().trim()),
    [user?.permissions]
  );

  const isSuperAdmin = useMemo(() => {
    return user?.userType === UserType.SUPER_ADMIN || roles.includes('SUPER_ADMIN');
  }, [user?.userType, roles]);

  const hasPermission = (targetPermission: string): boolean => {
    if (isSuperAdmin || permissions.includes('*')) {
      return true;
    }

    const normalized = targetPermission.toLowerCase().trim();

    // Exact match
    if (permissions.includes(normalized)) {
      return true;
    }

    // Wildcard prefix match, e.g. "student:*" matches "student:read"
    const [resource] = normalized.split(':');
    if (resource && permissions.includes(`${resource}:*`)) {
      return true;
    }

    return false;
  };

  const hasAnyPermission = (targetPermissions: string[]): boolean => {
    if (isSuperAdmin || permissions.includes('*')) {
      return true;
    }
    return targetPermissions.some((p) => hasPermission(p));
  };

  const hasAllPermissions = (targetPermissions: string[]): boolean => {
    if (isSuperAdmin || permissions.includes('*')) {
      return true;
    }
    return targetPermissions.every((p) => hasPermission(p));
  };

  const hasRole = (targetRoles: string | string[]): boolean => {
    if (isSuperAdmin) {
      return true;
    }
    const checkRoles = Array.isArray(targetRoles) ? targetRoles : [targetRoles];
    return checkRoles.some((r) => roles.includes(r));
  };

  return {
    roles,
    permissions,
    isSuperAdmin,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
  };
}
