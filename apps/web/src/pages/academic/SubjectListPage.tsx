import React, { useState } from 'react';
import {
  useGetSubjectsQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
} from '../../features/academic/academicApi.js';
import { SubjectCategory, EducationLevel, AcademicStatus } from '@edusphere/common';
import type { SubjectDto, SubjectType } from '@edusphere/types';
import { Can } from '../../components/auth/Can.js';

export const SubjectListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectDto | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    code: '',
    type: 'CORE' as SubjectType,
    category: SubjectCategory.CORE as SubjectCategory,
    educationLevel: EducationLevel.SECONDARY as EducationLevel,
    creditHours: 3,
    sequence: 1,
    status: AcademicStatus.ACTIVE as AcademicStatus,
  });

  const {
    data: subjectsRes,
    isLoading,
    refetch,
  } = useGetSubjectsQuery({
    search: search || undefined,
    category: categoryFilter || undefined,
    type: typeFilter || undefined,
    educationLevel: levelFilter || undefined,
    status: statusFilter || undefined,
  });

  const [createSubject, { isLoading: isCreating }] = useCreateSubjectMutation();
  const [updateSubject, { isLoading: isUpdating }] = useUpdateSubjectMutation();
  const [deleteSubject] = useDeleteSubjectMutation();

  const subjects = subjectsRes?.data || [];

  const handleOpenCreate = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      shortName: '',
      code: '',
      type: 'CORE',
      category: SubjectCategory.CORE,
      educationLevel: EducationLevel.SECONDARY,
      creditHours: 3,
      sequence: subjects.length + 1,
      status: AcademicStatus.ACTIVE,
    });
    setErrorBanner(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: SubjectDto) => {
    setEditingSubject(s);
    setFormData({
      name: s.name,
      shortName: s.shortName || '',
      code: s.code,
      type: s.type,
      category: s.category || SubjectCategory.CORE,
      educationLevel: s.educationLevel || EducationLevel.SECONDARY,
      creditHours: s.creditHours ?? 3,
      sequence: s.sequence ?? 1,
      status: s.status,
    });
    setErrorBanner(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    try {
      if (editingSubject) {
        await updateSubject({
          id: editingSubject.id,
          data: {
            name: formData.name,
            shortName: formData.shortName || undefined,
            code: formData.code,
            type: formData.type,
            category: formData.category,
            educationLevel: formData.educationLevel,
            creditHours: Number(formData.creditHours),
            sequence: Number(formData.sequence),
            status: formData.status,
          },
        }).unwrap();
      } else {
        await createSubject({
          name: formData.name,
          shortName: formData.shortName || undefined,
          code: formData.code,
          type: formData.type,
          category: formData.category,
          educationLevel: formData.educationLevel,
          creditHours: Number(formData.creditHours),
          sequence: Number(formData.sequence),
          status: formData.status,
        }).unwrap();
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      setErrorBanner(err?.data?.error?.message || err?.data?.message || 'Failed to save subject.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete subject "${name}"?`)) return;
    try {
      await deleteSubject(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.error?.message || err?.data?.message || 'Failed to delete subject.');
    }
  };

  const getTypeBadge = (type: SubjectType) => {
    switch (type) {
      case 'CORE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ELECTIVE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'LAB':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'VOCATIONAL':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
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
            Master Subject Catalog
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Global curriculum subjects catalog categorized by type, education level, and credit
            hours.
          </p>
        </div>
        <Can permission="subject:create">
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
          >
            + New Subject
          </button>
        </Can>
      </div>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <input
          type="text"
          placeholder="Search name, code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {Object.values(SubjectCategory).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="CORE">CORE</option>
          <option value="ELECTIVE">ELECTIVE</option>
          <option value="LAB">LAB</option>
          <option value="VOCATIONAL">VOCATIONAL</option>
        </select>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Education Levels</option>
          {Object.values(EducationLevel).map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl.replace('_', ' ')}
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

      {/* Main Subjects Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading subjects catalog...</div>
        ) : subjects.length === 0 ? (
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
            <h3 className="text-base font-semibold text-gray-900">No subjects found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {search || categoryFilter || typeFilter || levelFilter || statusFilter
                ? 'Try adjusting your search criteria.'
                : 'Get started by creating your first curriculum subject.'}
            </p>
            <Can permission="subject:create">
              <button
                onClick={handleOpenCreate}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
              >
                + New Subject
              </button>
            </Can>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Education Level</th>
                  <th className="py-3 px-4 text-center">Credit Hours</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/75 transition">
                    <td className="py-3.5 px-4 font-bold text-gray-900">{sub.name}</td>
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-gray-700">
                      {sub.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getTypeBadge(
                          sub.type
                        )}`}
                      >
                        {sub.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-gray-700">
                      {sub.category || 'CORE'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">
                      {sub.educationLevel ? sub.educationLevel.replace('_', ' ') : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs font-semibold text-gray-800">
                      {sub.creditHours ?? 3} hrs
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          sub.status === AcademicStatus.ACTIVE
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Can permission="subject:update">
                        <button
                          onClick={() => handleOpenEdit(sub)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium text-xs px-2 py-1 rounded hover:bg-indigo-50 transition"
                        >
                          Edit
                        </button>
                      </Can>
                      <Can permission="subject:delete">
                        <button
                          onClick={() => handleDelete(sub.id, sub.name)}
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingSubject ? 'Edit Subject' : 'Create Subject'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            {errorBanner && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {errorBanner}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subject Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Subject Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MATH101"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Short Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MATH"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Subject Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as SubjectType })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="CORE">CORE</option>
                    <option value="ELECTIVE">ELECTIVE</option>
                    <option value="LAB">LAB</option>
                    <option value="VOCATIONAL">VOCATIONAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as SubjectCategory })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {Object.values(SubjectCategory).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Education Level
                  </label>
                  <select
                    value={formData.educationLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, educationLevel: e.target.value as EducationLevel })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {Object.values(EducationLevel).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Credit Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.creditHours}
                    onChange={(e) =>
                      setFormData({ ...formData, creditHours: Number(e.target.value) })
                    }
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
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium disabled:opacity-50"
                >
                  {isCreating || isUpdating
                    ? 'Saving...'
                    : editingSubject
                      ? 'Save Changes'
                      : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
