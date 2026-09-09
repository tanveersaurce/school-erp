import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/index.js';
import { usePermission } from '../../hooks/usePermission.js';

export interface PermissionRouteProps {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  role?: string | string[];
  redirectTo?: string;
  children?: React.ReactNode;
}

/**
 * Route Guard enforcing both authentication and RBAC permissions/roles.
 * Redirects unauthenticated users to /login and unauthorized users to /403.
 */
export function PermissionRoute({
  permission,
  anyOf,
  allOf,
  role,
  redirectTo = '/403',
  children,
}: PermissionRouteProps): React.JSX.Element {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } = usePermission();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  let isAllowed = true;

  if (permission && !hasPermission(permission)) {
    isAllowed = false;
  }
  if (isAllowed && anyOf && anyOf.length > 0 && !hasAnyPermission(anyOf)) {
    isAllowed = false;
  }
  if (isAllowed && allOf && allOf.length > 0 && !hasAllPermissions(allOf)) {
    isAllowed = false;
  }
  if (isAllowed && role && !hasRole(role)) {
    isAllowed = false;
  }

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return children ? <>{children}</> : <Outlet />;
}
