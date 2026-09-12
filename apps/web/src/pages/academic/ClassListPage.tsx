import React, { useState } from 'react';
import {
  useGetClassesQuery,
  useCreateClassMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,
} from '../../features/academic/academicApi.js';
import { EducationLevel, AcademicStatus } from '@edusphere/common';
import type { ClassDto } from '@edusphere/types';
import { Can } from '../../components/auth/Can.js';

export const ClassListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [educationLevel, setEducationLevel] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassDto | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    code: '',
    order: 1,
    educationLevel: EducationLevel.SECONDARY as EducationLevel,
    status: AcademicStatus.ACTIVE as AcademicStatus,
  });

  const {
    data: classesRes,
    isLoading,
    refetch,
  } = useGetClassesQuery({
    search: search || undefined,
    educationLevel: educationLevel ? (educationLevel as EducationLevel) : undefined,
  });

  const [createClass, { isLoading: isCreating }] = useCreateClassMutation();
  const [updateClass, { isLoading: isUpdating }] = useUpdateClassMutation();
  const [deleteClass] = useDeleteClassMutation();

  const classes = classesRes?.data || [];

  const handleOpenCreate = () => {
    setEditingClass(null);
    setFormData({
      name: '',
      shortName: '',
      code: '',
      order: classes.length + 1,
      educationLevel: EducationLevel.SECONDARY,
      status: AcademicStatus.ACTIVE,
    });
    setErrorBanner(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: ClassDto) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      shortName: cls.shortName || '',
      code: cls.code,
      order: cls.order,
      educationLevel: cls.educationLevel || EducationLevel.SECONDARY,
      status: cls.status,
    });
    setErrorBanner(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    try {
      if (editingClass) {
        await updateClass({
          id: editingClass.id,
          data: {
            name: formData.name,
            shortName: formData.shortName || undefined,
            code: formData.code,
            order: Number(formData.order),
            educationLevel: formData.educationLevel,
            status: formData.status,
          },
        }).unwrap();
      } else {
        await createClass({
          name: formData.name,
          shortName: formData.shortName || undefined,
          code: formData.code,
          order: Number(formData.order),
          educationLevel: formData.educationLevel,
          status: formData.status,
        }).unwrap();
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      setErrorBanner(err?.data?.error?.message || err?.data?.message || 'Failed to save class.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete class "${name}"?`)) return;
    try {
      await deleteClass(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.error?.message || err?.data?.message || 'Failed to delete class.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Grade & Class Levels</h1>
          <p className="text-sm text-gray-500 mt-1">
            Institutional academic levels (Grade 1 through 12, Pre-K, Kindergarten).
          </p>
        </div>
        <Can permission="class:create">
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
          >
            + New Class
          </button>
        </Can>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <input
          type="text"
          placeholder="Search by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <select
          value={educationLevel}
          onChange={(e) => setEducationLevel(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Education Levels</option>
          {Object.values(EducationLevel).map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Order</th>
              <th className="px-6 py-3">Class Name</th>
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3">Education Level</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Loading classes...
                </td>
              </tr>
            ) : classes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No classes found. Click "+ New Class" to create one.
                </td>
              </tr>
            ) : (
              classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-bold text-gray-700">#{cls.order}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {cls.name}
                    {cls.shortName && (
                      <span className="ml-2 text-xs text-gray-400 font-normal">
                        ({cls.shortName})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded font-mono text-xs">
                      {cls.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {cls.educationLevel ? cls.educationLevel.replace('_', ' ') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        cls.status === AcademicStatus.ACTIVE
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {cls.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Can permission="class:update">
                      <button
                        onClick={() => handleOpenEdit(cls)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium text-xs"
                      >
                        Edit
                      </button>
                    </Can>
                    <Can permission="class:delete">
                      <button
                        onClick={() => handleDelete(cls.id, cls.name)}
                        className="text-rose-600 hover:text-rose-900 font-medium text-xs ml-3"
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

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              {editingClass ? 'Edit Class' : 'Create New Class'}
            </h2>

            {errorBanner && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {errorBanner}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Class Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Grade 10"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., G10"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Short Name</label>
                  <input
                    type="text"
                    placeholder="e.g., 10th"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Order Index *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.order}
                    onChange={(e) =>
                      setFormData({ ...formData, order: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Education Level</label>
                  <select
                    value={formData.educationLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, educationLevel: e.target.value as EducationLevel })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {Object.values(EducationLevel).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as AcademicStatus })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {Object.values(AcademicStatus).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition disabled:opacity-50"
                >
                  {editingClass ? 'Update Class' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
