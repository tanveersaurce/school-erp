export interface RbacRoleDto {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  permissionsCount?: number;
  usersCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionDto {
  id: string;
  resource: string;
  action: string;
  permissionString: string;
  description: string;
  category: string;
}

export interface RoleDetailDto extends RbacRoleDto {
  permissions: PermissionDto[];
}

export interface UserRoleAssignmentDto {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  roleName: string;
  isSystemRole: boolean;
  schoolId?: string;
  campusId?: string;
  createdAt: string;
}

export interface RoleCreateInput {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface RoleUpdateInput {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

export interface AssignRoleInput {
  roleId: string;
  schoolId?: string;
  campusId?: string;
}

export interface AssignPermissionsInput {
  permissionIds: string[];
}

export interface EffectivePermissionsResponse {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}
