import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetStudentsQuery,
  useDeleteStudentMutation,
} from '../../features/student/studentApi.js';
import { useGetCampusesQuery } from '../../features/tenant/tenantApi.js';
import { Can } from '../../components/auth/Can.js';
import { CreateStudentModal } from './CreateStudentModal.js';
import { StudentStatus, Gender } from '@edusphere/common';
import type { StudentDto } from '@edusphere/types';

export const StudentListPage: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [campusId, setCampusId] = useState('');
  const [status, setStatus] = useState<StudentStatus | ''>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const {
    data: studentsRes,
    isLoading,
    refetch,
  } = useGetStudentsQuery({
    search: search || undefined,
    campusId: campusId || undefined,
    status: (status as StudentStatus) || undefined,
    gender: (gender as Gender) || undefined,
    page,
    limit: 15,
  });

  const { data: campusRes } = useGetCampusesQuery();
  const [deleteStudent] = useDeleteStudentMutation();

  const students: StudentDto[] = studentsRes?.data || [];
  const pagination = (studentsRes as any)?.meta?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const totalCount = pagination?.total || students.length;

  const getStatusBadge = (st: StudentStatus) => {
    switch (st) {
      case StudentStatus.ACTIVE:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case StudentStatus.ADMITTED:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case StudentStatus.SUSPENDED:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case StudentStatus.TRANSFERRED:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case StudentStatus.WITHDRAWN:
      case StudentStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case StudentStatus.GRADUATED:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleCreateSuccess = (studentName: string, admissionNumber: string) => {
    setBannerMessage(
      `Student '${studentName}' registered successfully with Admission # ${admissionNumber}!`
    );
    refetch();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete student profile '${name}'?`)) return;
    try {
      await deleteStudent(id).unwrap();
      setBannerMessage(`Student profile '${name}' deleted.`);
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || err?.message || 'Failed to delete student.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Student Directory</h1>
          <p className="text-sm text-gray-500">
            Manage student admissions, profiles, and enrollment records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/guardians')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
          >
            Guardian Directory
          </button>
          <Can permission="student:create">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none"
            >
              + Register Student
            </button>
          </Can>
        </div>
      </div>

      {bannerMessage && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-4 border border-emerald-200 text-sm text-emerald-800">
          <span>{bannerMessage}</span>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Search Students</label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, ID, admission #..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Filter by Campus</label>
            <select
              value={campusId}
              onChange={(e) => {
                setCampusId(e.target.value);
                setPage(1);
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Campuses</option>
              {campusRes?.data?.map((c: any) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StudentStatus | '');
                setPage(1);
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {Object.values(StudentStatus).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Gender</label>
            <select
              value={gender}
              onChange={(e) => {
                setGender(e.target.value as Gender | '');
                setPage(1);
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Genders</option>
              <option value={Gender.MALE}>Male</option>
              <option value={Gender.FEMALE}>Female</option>
              <option value={Gender.OTHER}>Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">Admission # / ID</th>
                <th className="px-6 py-3">Student Name</th>
                <th className="px-6 py-3">Campus</th>
                <th className="px-6 py-3">Gender / DOB</th>
                <th className="px-6 py-3">Guardians</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No student records found matching filters.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono font-semibold text-gray-900">
                        {student.admissionNumber}
                      </div>
                      <div className="text-xs font-mono text-gray-500">{student.studentId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {student.personalDetails.firstName} {student.personalDetails.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {student.contactDetails?.email ||
                          student.contactDetails?.phone ||
                          'No direct contact'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {student.campusName || 'Main Campus'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{student.personalDetails.gender}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(student.personalDetails.dateOfBirth).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.guardians && student.guardians.length > 0 ? (
                        <div className="text-xs text-gray-900">
                          {student.guardians[0].guardian?.name || 'Primary Guardian'} (
                          {student.guardians[0].relationshipType})
                          {student.guardians.length > 1 && (
                            <span className="text-gray-500 ml-1">
                              +{student.guardians.length - 1} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">None linked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(student.currentStatus)}`}
                      >
                        {student.currentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                      <button
                        onClick={() => navigate(`/students/${student.id}`)}
                        className="text-indigo-600 hover:text-indigo-900 font-semibold"
                      >
                        View Profile
                      </button>
                      <Can permission="student:delete">
                        <button
                          onClick={() =>
                            handleDelete(
                              student.id,
                              `${student.personalDetails.firstName} ${student.personalDetails.lastName}`
                            )
                          }
                          className="text-red-600 hover:text-red-900 font-semibold ml-2"
                        >
                          Delete
                        </button>
                      </Can>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
          <div className="text-xs text-gray-500">
            Showing Page <span className="font-semibold text-gray-900">{page}</span> of{' '}
            <span className="font-semibold text-gray-900">{totalPages}</span> ({totalCount} total
            students)
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <CreateStudentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};
