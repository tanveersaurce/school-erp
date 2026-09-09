import React from 'react';
import { usePermission } from '../../hooks/usePermission.js';

export interface CanProps {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  role?: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Declarative component for conditional rendering based on user permissions or roles.
 *
 * Example:
 * <Can permission="student:create" fallback={<span>Unauthorized</span>}>
 *   <AddStudentButton />
 * </Can>
 */
export const Can: React.FC<CanProps> = ({
  permission,
  anyOf,
  allOf,
  role,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } = usePermission();

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
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
