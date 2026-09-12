import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetAcademicClassesQuery,
  useGetClassesQuery,
  useGetSectionsQuery,
  useCreateAcademicClassMutation,
  useUpdateAcademicClassMutation,
  useDeleteAcademicClassMutation,
} from '../../features/academic/academicApi.js';
import { useGetCampusesQuery, useGetAcademicYearsQuery } from '../../features/tenant/tenantApi.js';
import { useGetTeachersQuery } from '../../features/employee/employeeApi.js';
import { AcademicStatus } from '@edusphere/common';
import type { AcademicClassDto } from '@edusphere/types';
import { Can } from '../../components/auth/Can.js';

export const AcademicClassListPage: React.FC = () => {
  const navigate = useNavigate();

  const [campusFilter, setCampusFilter] = useState<string>('');
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AcademicClassDto | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    campusId: '',
    academicYearId: '',
    classId: '',
    sectionId: '',
    classTeacherId: '',
    capacity: 40,
    room: '',
    status: AcademicStatus.ACTIVE as AcademicStatus,
  });

  // Queries
  const { data: campusesRes } = useGetCampusesQuery();
  const campuses = campusesRes?.data || [];

  const { data: yearsRes } = useGetAcademicYearsQuery(
    campusFilter ? { campusId: campusFilter } : undefined
  );
  const academicYears = yearsRes?.data || [];

  const { data: classesRes } = useGetClassesQuery();
  const classes = classesRes?.data || [];

  const { data: allSectionsRes } = useGetSectionsQuery(
    formData.classId ? { classId: formData.classId } : undefined
  );
  const sectionsForSelectedClass = allSectionsRes?.data || [];

  const { data: teachersRes } = useGetTeachersQuery();
  const teachers = teachersRes?.data || [];

  const {
    data: academicClassesRes,
    isLoading,
    refetch,
  } = useGetAcademicClassesQuery({
    campusId: campusFilter || undefined,
    academicYearId: academicYearFilter || undefined,
    classId: classFilter || undefined,
    status: statusFilter ? (statusFilter as AcademicStatus) : undefined,
    search: search || undefined,
  });

  const [createAcademicClass, { isLoading: isCreating }] = useCreateAcademicClassMutation();
  const [updateAcademicClass, { isLoading: isUpdating }] = useUpdateAcademicClassMutation();
  const [deleteAcademicClass] = useDeleteAcademicClassMutation();

  const academicClasses = academicClassesRes?.data || [];

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      campusId: campusFilter || (campuses[0]?.id ?? ''),
      academicYearId: academicYearFilter || (academicYears[0]?.id ?? ''),
      classId: classFilter || (classes[0]?.id ?? ''),
      sectionId: '',
      classTeacherId: '',
      capacity: 40,
      room: '',
      status: AcademicStatus.ACTIVE,
    });
    setErrorBanner(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: AcademicClassDto) => {
    setEditingItem(item);
    setFormData({
      campusId: item.campusId,
      academicYearId: item.academicYearId,
      classId: item.classId,
      sectionId: item.sectionId,
      classTeacherId: item.classTeacherId || '',
      capacity: item.capacity,
      room: item.room || '',
      status: item.status,
    });
    setErrorBanner(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    try {
      if (editingItem) {
        await updateAcademicClass({
          id: editingItem.id,
          data: {
            classTeacherId: formData.classTeacherId ? formData.classTeacherId : null,
            capacity: Number(formData.capacity),
            room: formData.room || undefined,
            status: formData.status,
          },
        }).unwrap();
      } else {
        await createAcademicClass({
          campusId: formData.campusId,
          academicYearId: formData.academicYearId,
          classId: formData.classId,
          sectionId: formData.sectionId,
          classTeacherId: formData.classTeacherId || undefined,
          capacity: Number(formData.capacity),
          room: formData.room || undefined,
          status: formData.status,
        }).unwrap();
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      setErrorBanner(
        err?.data?.error?.message || err?.data?.message || 'Failed to save academic class.'
      );
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Are you sure you want to delete offering "${label}"?`)) return;
    try {
      await deleteAcademicClass(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.error?.message || err?.data?.message || 'Failed to delete academic class.');
    }
  };

  const getCapacityColor = (current: number, total: number) => {
    const pct = total > 0 ? (current / total) * 100 : 0;
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 85) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusBadge = (status: AcademicStatus) => {
    switch (status) {
      case AcademicStatus.ACTIVE:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case AcademicStatus.INACTIVE:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case AcademicStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Academic Classes & Offerings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Active class-section offerings mapped to campus and academic year, managing capacities,
            class teachers, and student rosters.
          </p>
        </div>
        <Can permission="academic_class:create">
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
          >
            + New Academic Class
          </button>
        </Can>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <input
          type="text"
          placeholder="Search offerings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <select
          value={campusFilter}
          onChange={(e) => setCampusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Campuses</option>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={academicYearFilter}
          onChange={(e) => setAcademicYearFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Academic Years</option>
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Grades/Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value={AcademicStatus.ACTIVE}>Active</option>
          <option value={AcademicStatus.INACTIVE}>Inactive</option>
          <option value={AcademicStatus.ARCHIVED}>Archived</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading academic classes...</div>
        ) : academicClasses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900">No academic offerings found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {campusFilter || academicYearFilter || classFilter || statusFilter || search
                ? 'Try adjusting your filters to find existing class offerings.'
                : 'Create your first academic offering to link classes and sections with academic years.'}
            </p>
            <Can permission="academic_class:create">
              <button
                onClick={handleOpenCreate}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
              >
                + New Academic Class
              </button>
            </Can>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                  <th className="py-3 px-4">Offering / Section</th>
                  <th className="py-3 px-4">Academic Year & Campus</th>
                  <th className="py-3 px-4">Class Teacher</th>
                  <th className="py-3 px-4">Enrollment & Capacity</th>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {academicClasses.map((item) => {
                  const utilization =
                    item.capacity > 0
                      ? Math.round((item.currentEnrollment / item.capacity) * 100)
                      : 0;
                  const label = `${item.className || 'Class'} - ${item.sectionName || 'Section'}`;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/75 transition">
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => navigate(`/academic/academic-classes/${item.id}`)}
                          className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-left block"
                        >
                          {label}
                        </button>
                        <span className="text-xs text-gray-500">ID: {item.id.slice(-6)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">
                        <div className="font-medium text-xs text-gray-900">
                          {item.academicYearName || 'Academic Year'}
                        </div>
                        <div className="text-xs text-gray-500">{item.campusName || 'Campus'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">
                        {item.classTeacherName ? (
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                              {item.classTeacherName.charAt(0)}
                            </span>
                            <span className="text-xs font-medium text-gray-900">
                              {item.classTeacherName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not Assigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 min-w-[160px]">
                        <div className="flex items-center justify-between text-xs text-gray-700 font-medium mb-1">
                          <span>
                            {item.currentEnrollment} / {item.capacity}
                          </span>
                          <span className="text-gray-500 font-semibold">{utilization}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${getCapacityColor(
                              item.currentEnrollment,
                              item.capacity
                            )}`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs">{item.room || '—'}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/academic/academic-classes/${item.id}`)}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-xs rounded transition"
                        >
                          Details & Roster
                        </button>
                        <Can permission="academic_class:update">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="text-gray-600 hover:text-gray-900 font-medium text-xs px-2 py-1 rounded hover:bg-gray-100 transition"
                          >
                            Edit
                          </button>
                        </Can>
                        <Can permission="academic_class:delete">
                          <button
                            onClick={() => handleDelete(item.id, label)}
                            className="text-red-600 hover:text-red-900 font-medium text-xs px-2 py-1 rounded hover:bg-red-50 transition"
                          >
                            Delete
                          </button>
                        </Can>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingItem ? 'Edit Academic Offering' : 'Create Academic Offering'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {errorBanner && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {errorBanner}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingItem && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Campus <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.campusId}
                        onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">Select Campus</option>
                        {campuses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Academic Year <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.academicYearId}
                        onChange={(e) =>
                          setFormData({ ...formData, academicYearId: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">Select Academic Year</option>
                        {academicYears.map((y) => (
                          <option key={y.id} value={y.id}>
                            {y.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Grade / Class <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.classId}
                        onChange={(e) =>
                          setFormData({ ...formData, classId: e.target.value, sectionId: '' })
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">Select Class</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name} ({cls.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Section / Division <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.sectionId}
                        onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                        required
                        disabled={!formData.classId}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100"
                      >
                        <option value="">Select Section</option>
                        {sectionsForSelectedClass.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.name} ({sec.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Designated Class Teacher
                </label>
                <select
                  value={formData.classTeacherId}
                  onChange={(e) => setFormData({ ...formData, classTeacherId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">No Class Teacher Assigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.employeeDetails?.name || t.teacherCode || t.id} (Code:{' '}
                      {t.teacherCode || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Student Capacity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Room / Hall
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 204"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as AcademicStatus })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={AcademicStatus.ACTIVE}>Active</option>
                  <option value={AcademicStatus.INACTIVE}>Inactive</option>
                  <option value={AcademicStatus.ARCHIVED}>Archived</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                >
                  {isCreating || isUpdating
                    ? 'Saving...'
                    : editingItem
                      ? 'Save Changes'
                      : 'Create Offering'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
