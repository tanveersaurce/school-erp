import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetEmployeesQuery,
  useGetDepartmentsQuery,
  useGetDesignationsQuery,
} from '../../features/employee/employeeApi.js';
import { useGetCampusesQuery } from '../../features/tenant/tenantApi.js';
import { Can } from '../../components/auth/Can.js';
import { CreateStaffModal } from './CreateStaffModal.js';
import { EmploymentStatus, EmploymentType } from '@edusphere/common';

export const StaffListPage: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [campusId, setCampusId] = useState('');
  const [status, setStatus] = useState<EmploymentStatus | ''>('');
  const [employmentType, setEmploymentType] = useState<EmploymentType | ''>('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Queries
  const {
    data: empRes,
    isLoading,
    refetch,
  } = useGetEmployeesQuery({
    search: search || undefined,
    departmentId: departmentId || undefined,
    designationId: designationId || undefined,
    campusId: campusId || undefined,
    status: (status as EmploymentStatus) || undefined,
    employmentType: (employmentType as EmploymentType) || undefined,
    page,
    limit: 15,
  });

  const { data: deptRes } = useGetDepartmentsQuery();
  const { data: desigRes } = useGetDesignationsQuery();
  const { data: campusRes } = useGetCampusesQuery();

  const getStatusBadge = (st: EmploymentStatus) => {
    switch (st) {
      case EmploymentStatus.ACTIVE:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case EmploymentStatus.PROBATION:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case EmploymentStatus.ON_LEAVE:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case EmploymentStatus.SUSPENDED:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case EmploymentStatus.TERMINATED:
      case EmploymentStatus.INACTIVE:
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleCreateSuccess = (employeeName: string, inviteToken?: string) => {
    if (inviteToken) {
      setSuccessBanner(
        `Staff member '${employeeName}' added! An invitation token was generated: ${inviteToken}`
      );
    } else {
      setSuccessBanner(`Staff member '${employeeName}' added successfully!`);
    }
    refetch();
  };

  const totalPages = (empRes as any)?.meta?.pagination?.totalPages || 1;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Staff & Faculty Directory
          </h1>
          <p className="text-sm text-gray-500">
            Manage administrative personnel, teaching faculty, and support staff records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/departments-designations')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
          >
            Departments & Designations
          </button>
          <button
            onClick={() => navigate('/teachers')}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-100 focus:outline-none"
          >
            Teaching Faculty View
          </button>
          <Can permission="employee:create">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              + Add Staff Member
            </button>
          </Can>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
          <span>{successBanner}</span>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-green-600 hover:text-green-800 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Search Staff</label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name, ID, email or phone..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {deptRes?.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Designation Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Designation</label>
            <select
              value={designationId}
              onChange={(e) => {
                setDesignationId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Designations</option>
              {desigRes?.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Employment Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as EmploymentStatus | '');
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              {Object.values(EmploymentStatus).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Employment Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Employment Type
            </label>
            <select
              value={employmentType}
              onChange={(e) => {
                setEmploymentType(e.target.value as EmploymentType | '');
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Types</option>
              {Object.values(EmploymentType).map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
          </div>

          {/* Campus Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Campus Location
            </label>
            <select
              value={campusId}
              onChange={(e) => {
                setCampusId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Campuses</option>
              {campusRes?.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : empRes?.data && empRes.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Designation</th>
                  <th className="px-6 py-3.5">Campus</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">User Account</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {empRes.data.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    {/* Employee Identity */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                          {emp.displayName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{emp.displayName}</div>
                          <div className="text-xs text-gray-500 font-mono">{emp.employeeId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {emp.departmentName || '—'}
                    </td>

                    {/* Designation */}
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {emp.designationName || '—'}
                    </td>

                    {/* Campus */}
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {emp.campusName || 'All Campuses'}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(
                          emp.employmentStatus
                        )}`}
                      >
                        {emp.employmentStatus}
                      </span>
                    </td>

                    {/* User Account */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp.userId ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Linked ({emp.userStatus || 'Active'})
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No Access</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => navigate(`/staff/${emp.id}`)}
                        className="rounded bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 focus:outline-none"
                      >
                        View & Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <p className="text-base font-medium">No staff members found.</p>
            <p className="text-sm mt-1">
              Try adjusting your search criteria or register a new staff profile.
            </p>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3">
            <span className="text-xs text-gray-600">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      <CreateStaffModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};
