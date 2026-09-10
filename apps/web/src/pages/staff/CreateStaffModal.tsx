import React, { useState } from 'react';
import {
  useCreateEmployeeMutation,
  useGetDepartmentsQuery,
  useGetDesignationsQuery,
} from '../../features/employee/employeeApi.js';
import { useGetCampusesQuery } from '../../features/tenant/tenantApi.js';
import { useGetRolesQuery } from '../../features/rbac/rbacApi.js';
import { Gender, EmploymentType, UserType } from '@edusphere/common';

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (employeeName: string, inviteToken?: string) => void;
}

export const CreateStaffModal: React.FC<CreateStaffModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [createEmployee, { isLoading }] = useCreateEmployeeMutation();
  const { data: deptRes } = useGetDepartmentsQuery();
  const { data: desigRes } = useGetDesignationsQuery();
  const { data: campusRes } = useGetCampusesQuery();
  const { data: rolesRes } = useGetRolesQuery();

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    gender: Gender.MALE,
    dateOfBirth: '1990-01-01',
    workEmail: '',
    workPhone: '',
    personalEmail: '',
    personalPhone: '',
    departmentId: '',
    designationId: '',
    campusId: '',
    employmentType: EmploymentType.FULL_TIME,
    joiningDate: new Date().toISOString().split('T')[0],
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    // Provision User
    provisionUser: false,
    roleId: '',
    initialPassword: '',
  });

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (!formData.departmentId) {
      setError('Please select a department.');
      return;
    }
    if (!formData.designationId) {
      setError('Please select a designation.');
      return;
    }
    if (formData.provisionUser && !formData.workEmail) {
      setError('Work email is required to provision a user account.');
      return;
    }

    try {
      const payload: any = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        workEmail: formData.workEmail.trim() || undefined,
        workPhone: formData.workPhone.trim() || undefined,
        personalEmail: formData.personalEmail.trim() || undefined,
        personalPhone: formData.personalPhone.trim() || undefined,
        departmentId: formData.departmentId,
        designationId: formData.designationId,
        campusId: formData.campusId || undefined,
        employmentType: formData.employmentType,
        joiningDate: formData.joiningDate,
        emergencyContact: formData.emergencyName
          ? {
              name: formData.emergencyName.trim(),
              relationship: formData.emergencyRelationship.trim() || 'Emergency Contact',
              phone: formData.emergencyPhone.trim() || 'N/A',
            }
          : undefined,
        provisionUser: formData.provisionUser,
        userType: UserType.STAFF,
        roles: formData.roleId ? [formData.roleId] : [],
        initialPassword: formData.initialPassword || undefined,
      };

      const res = await createEmployee(payload).unwrap();
      onSuccess(res.data.displayName, res.meta?.invitationToken);
      onClose();
    } catch (err: any) {
      setError(
        err?.data?.error?.message || err?.data?.message || 'Failed to create employee profile.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Add New Staff Member</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {/* Section 1: Basic Identity */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-3">
              1. Personal Identity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gender *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={Gender.MALE}>Male</option>
                  <option value={Gender.FEMALE}>Female</option>
                  <option value={Gender.OTHER}>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Details */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-3">
              2. Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Work Email</label>
                <input
                  type="email"
                  value={formData.workEmail}
                  onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                  placeholder="staff@school.edu"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Work Phone</label>
                <input
                  type="text"
                  value={formData.workPhone}
                  onChange={(e) => setFormData({ ...formData, workPhone: e.target.value })}
                  placeholder="555-0100"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Employment Assignment */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-3">
              3. Employment Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department *</label>
                <select
                  required
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Select Department --</option>
                  {deptRes?.data?.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Designation *
                </label>
                <select
                  required
                  value={formData.designationId}
                  onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Select Designation --</option>
                  {desigRes?.data?.map((desig) => (
                    <option key={desig.id} value={desig.id}>
                      {desig.name} ({desig.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Campus Location
                </label>
                <select
                  value={formData.campusId}
                  onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- All Campuses / Main Campus --</option>
                  {campusRes?.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Employment Type
                </label>
                <select
                  value={formData.employmentType}
                  onChange={(e) =>
                    setFormData({ ...formData, employmentType: e.target.value as EmploymentType })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={EmploymentType.FULL_TIME}>Full Time</option>
                  <option value={EmploymentType.PART_TIME}>Part Time</option>
                  <option value={EmploymentType.CONTRACT}>Contract</option>
                  <option value={EmploymentType.INTERN}>Intern</option>
                  <option value={EmploymentType.AD_HOC}>Ad Hoc</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Joining Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Emergency Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-3">
              4. Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={formData.emergencyName}
                  onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                  placeholder="Primary Contact"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Relationship</label>
                <input
                  type="text"
                  value={formData.emergencyRelationship}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyRelationship: e.target.value })
                  }
                  placeholder="Spouse / Parent"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Emergency Phone
                </label>
                <input
                  type="text"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  placeholder="555-0999"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 5: User Account Provisioning */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900">User Account Provisioning</h4>
                <p className="text-xs text-gray-600">
                  Enable staff system access to the ERP platform.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={formData.provisionUser}
                  onChange={(e) => setFormData({ ...formData, provisionUser: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full"></div>
              </label>
            </div>

            {formData.provisionUser && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-indigo-100">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">-- Default Staff Role --</option>
                    {rolesRes?.data?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Initial Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={formData.initialPassword}
                    onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                    placeholder="Leave blank for email invite"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.initialPassword
                      ? 'Account will be immediately activated with this password.'
                      : 'A secure 48-hour invitation link will be dispatched to work email.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Register Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
