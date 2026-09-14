import React, { useState } from 'react';
import {
  useGetPeriodsQuery,
  useCreatePeriodMutation,
  useUpdatePeriodMutation,
  useDeletePeriodMutation,
} from '../../features/timetable/timetableApi.js';
import { PeriodType, AcademicStatus } from '@edusphere/common';
import type { PeriodDto } from '@edusphere/types';
import { Can } from '../../components/auth/Can.js';

export const PeriodListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<PeriodDto | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    sequence: 1,
    startTime: '08:30',
    endTime: '09:15',
    type: PeriodType.TEACHING,
    status: AcademicStatus.ACTIVE,
  });

  const { data: periodsRes, isLoading } = useGetPeriodsQuery({
    search: search || undefined,
    type: selectedType ? (selectedType as PeriodType) : undefined,
  });

  const [createPeriod, { isLoading: isCreating }] = useCreatePeriodMutation();
  const [updatePeriod, { isLoading: isUpdating }] = useUpdatePeriodMutation();
  const [deletePeriod] = useDeletePeriodMutation();

  const periods = periodsRes?.data || [];

  const handleOpenCreate = () => {
    setEditingPeriod(null);
    setFormData({
      name: '',
      code: '',
      sequence: periods.length + 1,
      startTime: '08:30',
      endTime: '09:15',
      type: PeriodType.TEACHING,
      status: AcademicStatus.ACTIVE,
    });
    setErrorBanner(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: PeriodDto) => {
    setEditingPeriod(p);
    setFormData({
      name: p.name,
      code: p.code,
      sequence: p.sequence,
      startTime: p.startTime,
      endTime: p.endTime,
      type: p.type,
      status: p.status,
    });
    setErrorBanner(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (formData.startTime >= formData.endTime) {
      setErrorBanner('End time must be later than start time.');
      return;
    }

    try {
      if (editingPeriod) {
        await updatePeriod({
          id: editingPeriod.id,
          body: formData,
        }).unwrap();
      } else {
        await createPeriod(formData).unwrap();
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorBanner(err?.data?.error?.message || err?.data?.message || 'Failed to save period.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete period "${name}"?`)) return;
    try {
      await deletePeriod(id).unwrap();
    } catch (err: any) {
      alert(err?.data?.error?.message || err?.data?.message || 'Cannot delete period.');
    }
  };

  const getPeriodTypeBadge = (type: PeriodType) => {
    switch (type) {
      case PeriodType.TEACHING:
        return 'bg-blue-100 text-blue-800';
      case PeriodType.BREAK:
        return 'bg-amber-100 text-amber-800';
      case PeriodType.LUNCH:
        return 'bg-orange-100 text-orange-800';
      case PeriodType.ASSEMBLY:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bell Schedule & Periods</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure campus timing intervals, duration, teaching periods, and recess breaks.
          </p>
        </div>
        <Can permission="period:create">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            + Add Period
          </button>
        </Can>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by period name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            {Object.values(PeriodType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Seq
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Period Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Time Interval
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    Loading periods...
                  </td>
                </tr>
              ) : periods.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    No periods defined yet. Click "+ Add Period" to create one.
                  </td>
                </tr>
              ) : (
                periods.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                      #{p.sequence}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{p.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {p.startTime} — {p.endTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {p.duration} mins
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPeriodTypeBadge(
                          p.type
                        )}`}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          p.status === AcademicStatus.ACTIVE
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <Can permission="period:update">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                      </Can>
                      <Can permission="period:delete">
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="text-rose-600 hover:text-rose-900"
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
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingPeriod ? 'Edit Period' : 'Add New Period'}
            </h3>

            {errorBanner && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {errorBanner}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Period Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Period 1 or Morning Recess"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. P1"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Sequence Order *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.sequence}
                    onChange={(e) =>
                      setFormData({ ...formData, sequence: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Time (HH:mm) *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Time (HH:mm) *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Period Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as PeriodType })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.values(PeriodType).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as AcademicStatus })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={AcademicStatus.ACTIVE}>ACTIVE</option>
                    <option value={AcademicStatus.INACTIVE}>INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreating || isUpdating ? 'Saving...' : editingPeriod ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
