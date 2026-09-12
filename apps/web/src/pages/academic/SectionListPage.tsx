import React, { useState } from 'react';
import {
  useGetSectionsQuery,
  useGetClassesQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
} from '../../features/academic/academicApi.js';
import { AcademicStatus } from '@edusphere/common';
import type { SectionDto } from '@edusphere/types';
import { Can } from '../../components/auth/Can.js';

export const SectionListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionDto | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    classId: '',
    name: '',
    code: '',
    capacity: 40,
    room: '',
    status: AcademicStatus.ACTIVE as AcademicStatus,
  });

  const { data: classesRes } = useGetClassesQuery();
  const classes = classesRes?.data || [];

  const {
    data: sectionsRes,
    isLoading,
    refetch,
  } = useGetSectionsQuery({
    search: search || undefined,
    classId: selectedClassId || undefined,
    status: statusFilter ? (statusFilter as AcademicStatus) : undefined,
  });

  const [createSection, { isLoading: isCreating }] = useCreateSectionMutation();
  const [updateSection, { isLoading: isUpdating }] = useUpdateSectionMutation();
  const [deleteSection] = useDeleteSectionMutation();

  const sections = sectionsRes?.data || [];

  const handleOpenCreate = () => {
    setEditingSection(null);
    setFormData({
      classId: selectedClassId || (classes[0]?.id ?? ''),
      name: '',
      code: '',
      capacity: 40,
      room: '',
      status: AcademicStatus.ACTIVE,
    });
    setErrorBanner(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sec: SectionDto) => {
    setEditingSection(sec);
    setFormData({
      classId: sec.classId,
      name: sec.name,
      code: sec.code || '',
      capacity: sec.capacity,
      room: sec.room || '',
      status: sec.status,
    });
    setErrorBanner(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    try {
      if (editingSection) {
        await updateSection({
          id: editingSection.id,
          data: {
            name: formData.name,
            code: formData.code || undefined,
            capacity: Number(formData.capacity),
            room: formData.room || undefined,
            status: formData.status,
          },
        }).unwrap();
      } else {
        await createSection({
          classId: formData.classId,
          name: formData.name,
          code: formData.code || undefined,
          capacity: Number(formData.capacity),
          room: formData.room || undefined,
          status: formData.status,
        }).unwrap();
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      setErrorBanner(err?.data?.error?.message || err?.data?.message || 'Failed to save section.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete section "${name}"?`)) return;
    try {
      await deleteSection(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.error?.message || err?.data?.message || 'Failed to delete section.');
    }
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
            Class Sections & Divisions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure section divisions (Section A, B, C, etc.) and physical room capacities.
          </p>
        </div>
        <Can permission="section:create">
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
          >
            + New Section
          </button>
        </Can>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <input
          type="text"
          placeholder="Search by name, code, or room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none min-w-[180px]"
        >
          <option value="">All Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} ({cls.code})
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

      {/* Table Content */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading sections...</div>
        ) : sections.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900">No sections found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {search || selectedClassId || statusFilter
                ? 'Try modifying your search query or class filter.'
                : 'Get started by creating your first class section.'}
            </p>
            {!search && !selectedClassId && !statusFilter && (
              <Can permission="section:create">
                <button
                  onClick={handleOpenCreate}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                >
                  + New Section
                </button>
              </Can>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                  <th className="py-3 px-4">Section Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Associated Class</th>
                  <th className="py-3 px-4 text-center">Capacity</th>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sections.map((sec) => (
                  <tr key={sec.id} className="hover:bg-gray-50/75 transition">
                    <td className="py-3.5 px-4 font-semibold text-gray-900">{sec.name}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                        {sec.code || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 font-medium">
                      {sec.className ||
                        classes.find((c) => c.id === sec.classId)?.name ||
                        sec.classId}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-gray-700">
                      {sec.capacity} students
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{sec.room || '—'}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                          sec.status
                        )}`}
                      >
                        {sec.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Can permission="section:update">
                        <button
                          onClick={() => handleOpenEdit(sec)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium text-xs px-2 py-1 rounded hover:bg-indigo-50 transition"
                        >
                          Edit
                        </button>
                      </Can>
                      <Can permission="section:delete">
                        <button
                          onClick={() => handleDelete(sec.id, sec.name)}
                          className="text-red-600 hover:text-red-900 font-medium text-xs px-2 py-1 rounded hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      </Can>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingSection ? 'Edit Section' : 'Create Section'}
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
              {!editingSection && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Grade / Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">Select a class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Section Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Section A"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="e.g. A"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Capacity <span className="text-red-500">*</span>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Room / Hall
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 101"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
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
                    : editingSection
                      ? 'Save Changes'
                      : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
