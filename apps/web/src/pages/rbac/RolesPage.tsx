import React, { useState, useMemo } from 'react';
import {
  Shield,
  Lock,
  Plus,
  Trash2,
  Save,
  Check,
  AlertCircle,
  Users,
  Key,
  Layers,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Can } from '../../components/auth/Can.js';
import {
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useAssignPermissionsMutation,
  useGetPermissionsQuery,
} from '../../features/rbac/rbacApi.js';
import type { RbacRoleDto, PermissionDto } from '@edusphere/types';

export function RolesPage(): React.JSX.Element {
  const { data: rolesData, isLoading: isLoadingRoles, refetch: refetchRoles } = useGetRolesQuery();
  const { data: permissionsData, isLoading: isLoadingPermissions } = useGetPermissionsQuery();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();
  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation();
  const [assignPermissions, { isLoading: isSavingPermissions }] = useAssignPermissionsMutation();

  const roles = useMemo(() => rolesData?.data || [], [rolesData]);
  const allPermissions = useMemo(() => permissionsData?.data || [], [permissionsData]);

  // Active role detail query
  const { data: activeRoleData } = useGetRoleByIdQuery(selectedRoleId || '', {
    skip: !selectedRoleId,
  });

  const activeRole = activeRoleData?.data;

  // Sync selected permissions when active role changes
  React.useEffect(() => {
    if (activeRole) {
      setEditRoleName(activeRole.name);
      setEditRoleDesc(activeRole.description || '');
      setSelectedPermissions(activeRole.permissions.map((p) => p.id));
    }
  }, [activeRole]);

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    const map = new Map<string, PermissionDto[]>();
    for (const p of allPermissions) {
      const group = map.get(p.category) || [];
      group.push(p);
      map.set(p.category, group);
    }
    return map;
  }, [allPermissions]);

  const handleSelectRole = (role: RbacRoleDto) => {
    setIsCreatingRole(false);
    setSelectedRoleId(role.id);
    setNotification(null);
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      const result = await createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || undefined,
      }).unwrap();

      setNotification({
        type: 'success',
        message: `Role '${result.data.name}' created successfully.`,
      });
      setIsCreatingRole(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setSelectedRoleId(result.data.id);
      refetchRoles();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.data?.error?.message || 'Failed to create role.',
      });
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRoleId || !activeRole) return;

    try {
      await updateRole({
        id: selectedRoleId,
        data: {
          name: activeRole.isSystemRole ? undefined : editRoleName.trim(),
          description: editRoleDesc.trim(),
        },
      }).unwrap();

      setNotification({ type: 'success', message: 'Role details updated successfully.' });
      refetchRoles();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.data?.error?.message || 'Failed to update role.',
      });
    }
  };

  const handleDeleteRole = async (role: RbacRoleDto) => {
    if (role.isSystemRole) {
      setNotification({ type: 'error', message: 'System default roles cannot be deleted.' });
      return;
    }

    if ((role.usersCount || 0) > 0) {
      setNotification({
        type: 'error',
        message: `Cannot delete role '${role.name}': ${role.usersCount} user(s) currently assigned.`,
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete role '${role.name}'?`)) return;

    try {
      await deleteRole(role.id).unwrap();
      setNotification({ type: 'success', message: `Role '${role.name}' deleted successfully.` });
      if (selectedRoleId === role.id) {
        setSelectedRoleId(null);
      }
      refetchRoles();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.data?.error?.message || 'Failed to delete role.',
      });
    }
  };

  const handleTogglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const handleToggleCategory = (category: string) => {
    const catPerms = permissionsByCategory.get(category) || [];
    const catIds = catPerms.map((p) => p.id);
    const allSelected = catIds.every((id) => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((id) => !catIds.includes(id)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...catIds])));
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;

    try {
      await assignPermissions({
        id: selectedRoleId,
        permissionIds: selectedPermissions,
      }).unwrap();

      setNotification({ type: 'success', message: 'Role permissions updated successfully.' });
      refetchRoles();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.data?.error?.message || 'Failed to update permissions.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-7 h-7 text-indigo-600" />
              Role-Based Access Control (RBAC)
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage system and custom roles, assign permissions, and control tenant-wide access
              boundaries.
            </p>
          </div>

          <Can anyOf={['rbac:manage', 'role:create']}>
            <Button
              onClick={() => {
                setIsCreatingRole(true);
                setSelectedRoleId(null);
                setNotification(null);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Custom Role
            </Button>
          </Can>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`p-4 rounded-lg flex items-center gap-3 text-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-5 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Configured Roles ({roles.length})</span>
                  {isLoadingRoles && <Spinner size="sm" />}
                </CardTitle>
                <CardDescription>
                  14 System default roles and tenant-specific custom roles.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {roles.map((role) => {
                  const isSelected = selectedRoleId === role.id;
                  return (
                    <div
                      key={role.id}
                      onClick={() => handleSelectRole(role)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                        isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{role.name}</span>
                          {role.isSystemRole ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              <Lock className="w-3 h-3" />
                              System
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                              <Layers className="w-3 h-3" />
                              Custom
                            </span>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-xs text-slate-500 line-clamp-1">{role.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Key className="w-3 h-3" />
                            {role.permissionsCount || 0} permissions
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {role.usersCount || 0} users
                          </span>
                        </div>
                      </div>

                      {!role.isSystemRole && (
                        <Can anyOf={['rbac:manage', 'role:delete']}>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isDeleting || (role.usersCount || 0) > 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role);
                            }}
                            className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                            title={
                              (role.usersCount || 0) > 0
                                ? 'Cannot delete role with assigned users'
                                : 'Delete role'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </Can>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Details / Permission Matrix / Create Form */}
          <div className="lg:col-span-7 space-y-4">
            {isCreatingRole ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="w-5 h-5 text-indigo-600" />
                    Create Custom Tenant Role
                  </CardTitle>
                  <CardDescription>
                    Custom roles can be tailored with granular permissions for your institution.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateRole} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Role Name *
                      </label>
                      <Input
                        type="text"
                        required
                        placeholder="e.g. Exam Coordinator, Lab Assistant"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Description
                      </label>
                      <Input
                        type="text"
                        placeholder="Brief summary of duties and responsibilities"
                        value={newRoleDesc}
                        onChange={(e) => setNewRoleDesc(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <Button type="submit" disabled={isCreating || !newRoleName.trim()}>
                        {isCreating ? <Spinner size="sm" /> : 'Create Role'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreatingRole(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : selectedRoleId && activeRole ? (
              <div className="space-y-4">
                {/* Role Details Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{activeRole.name}</CardTitle>
                        {activeRole.isSystemRole && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            <Lock className="w-3 h-3" />
                            System Role (Name Protected)
                          </span>
                        )}
                      </div>
                      <Can anyOf={['rbac:manage', 'role:update']}>
                        <Button
                          size="sm"
                          onClick={handleUpdateRole}
                          disabled={isUpdating}
                          className="flex items-center gap-1"
                        >
                          <Save className="w-4 h-4" />
                          Save Details
                        </Button>
                      </Can>
                    </div>
                    <CardDescription>
                      Created on {new Date(activeRole.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Role Name
                      </label>
                      <Input
                        type="text"
                        value={editRoleName}
                        disabled={activeRole.isSystemRole}
                        onChange={(e) => setEditRoleName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Description
                      </label>
                      <Input
                        type="text"
                        value={editRoleDesc}
                        onChange={(e) => setEditRoleDesc(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Permission Matrix */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Key className="w-5 h-5 text-indigo-600" />
                          Permission Matrix ({selectedPermissions.length} enabled)
                        </CardTitle>
                        <CardDescription>
                          Assign specific functional permissions to this role.
                        </CardDescription>
                      </div>
                      <Can anyOf={['rbac:manage', 'role:assign_permission', 'role:update']}>
                        <Button
                          size="sm"
                          onClick={handleSavePermissions}
                          disabled={isSavingPermissions}
                          className="flex items-center gap-1"
                        >
                          {isSavingPermissions ? (
                            <Spinner size="sm" />
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save Permissions
                            </>
                          )}
                        </Button>
                      </Can>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 max-h-[500px] overflow-y-auto">
                    {isLoadingPermissions ? (
                      <div className="flex justify-center p-8">
                        <Spinner size="lg" />
                      </div>
                    ) : (
                      Array.from(permissionsByCategory.entries()).map(([category, perms]) => {
                        const catIds = perms.map((p) => p.id);
                        const allCatSelected = catIds.every((id) =>
                          selectedPermissions.includes(id)
                        );

                        return (
                          <div key={category} className="border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                              <span className="font-semibold text-xs tracking-wider text-slate-700 uppercase">
                                {category} ({perms.length})
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleCategory(category)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 h-6 px-2"
                              >
                                {allCatSelected ? 'Deselect All' : 'Select All'}
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {perms.map((perm) => {
                                const isChecked = selectedPermissions.includes(perm.id);
                                return (
                                  <label
                                    key={perm.id}
                                    className={`flex items-start gap-2 p-2 rounded cursor-pointer text-xs transition-colors ${
                                      isChecked ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleTogglePermission(perm.id)}
                                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div>
                                      <span className="font-mono font-medium text-slate-800">
                                        {perm.permissionString}
                                      </span>
                                      <p className="text-slate-500 text-[11px]">
                                        {perm.description}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
                <Shield className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-700">No Role Selected</h3>
                <p className="text-sm mt-1 max-w-sm">
                  Select a role from the left to inspect its permissions, or create a new custom
                  role.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
