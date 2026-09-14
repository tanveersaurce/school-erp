import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetTimetablesQuery,
  useCreateTimetableMutation,
  usePublishTimetableMutation,
  useArchiveTimetableMutation,
  useCloneTimetableMutation,
  useDeleteTimetableMutation,
  useValidateTimetableMutation,
} from '../../features/timetable/timetableApi.js';
import {
  useGetCampusesQuery,
  useGetAcademicYearsQuery,
} from '../../features/tenant/tenantApi.js';
import { TimetableStatus } from '@edusphere/common';
import type {
  TimetableDto,
  TimetableValidationReport,
  CampusDto,
  AcademicYearDto,
} from '@edusphere/types';
import { Can } from '../../components/auth/Can.js';

export const TimetableListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [targetTimetable, setTargetTimetable] = useState<TimetableDto | null>(null);
  const [validationModalReport, setValidationModalReport] = useState<TimetableValidationReport | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const { data: campusesRes } = useGetCampusesQuery();
  const { data: yearsRes } = useGetAcademicYearsQuery();
  const campuses = campusesRes?.data || [];
  const academicYears = yearsRes?.data || [];

  const [createFormData, setCreateFormData] = useState({
    campusId: '',
    academicYearId: '',
    name: '',
    code: '',
    description: '',
    effectiveFrom: '2026-09-01',
    effectiveTo: '2027-01-31',
  });

  const [cloneFormData, setCloneFormData] = useState({
    name: '',
    effectiveFrom: '',
    effectiveTo: '',
  });

  const { data: timetablesRes, isLoading } = useGetTimetablesQuery({
    search: search || undefined,
    status: selectedStatus ? (selectedStatus as TimetableStatus) : undefined,
  });

  const [createTimetable, { isLoading: isCreating }] = useCreateTimetableMutation();
  const [publishTimetable, { isLoading: isPublishing }] = usePublishTimetableMutation();
  const [archiveTimetable] = useArchiveTimetableMutation();
  const [cloneTimetable, { isLoading: isCloning }] = useCloneTimetableMutation();
  const [deleteTimetable] = useDeleteTimetableMutation();
  const [validateTimetable] = useValidateTimetableMutation();

  const timetables = timetablesRes?.data || [];

  const handleOpenCreate = () => {
    setCreateFormData({
      campusId: campuses[0]?.id || '',
      academicYearId: academicYears[0]?.id || '',
      name: '',
      code: '',
      description: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
    });
    setErrorBanner(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenClone = (t: TimetableDto) => {
    setTargetTimetable(t);
    setCloneFormData({
      name: `${t.name} (v${t.version + 1})`,
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
    });
    setErrorBanner(null);
    setIsCloneModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!createFormData.campusId || !createFormData.academicYearId) {
      setErrorBanner('Please select Campus and Academic Year.');
      return;
    }

    try {
      await createTimetable(createFormData).unwrap();
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setErrorBanner(err?.data?.error?.message || err?.data?.message || 'Failed to create timetable.');
    }
  };

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTimetable) return;
    setErrorBanner(null);

    try {
      await cloneTimetable({
        id: targetTimetable.id,
        body: cloneFormData,
      }).unwrap();
      setIsCloneModalOpen(false);
    } catch (err: any) {
      setErrorBanner(err?.data?.error?.message || err?.data?.message || 'Failed to clone timetable.');
    }
  };

  const handlePublish = async (t: TimetableDto) => {
    setErrorBanner(null);
    try {
      await publishTimetable(t.id).unwrap();
      alert(`Timetable "${t.name}" v${t.version} published successfully!`);
    } catch (err: any) {
      const msg = err?.data?.error?.message || err?.data?.message || 'Publication failed.';
      setErrorBanner(`Publication error: ${msg}`);
    }
  };

  const handleValidateScan = async (t: TimetableDto) => {
    try {
      const res = await validateTimetable(t.id).unwrap();
      setValidationModalReport(res.data);
    } catch (err: any) {
      alert(err?.data?.error?.message || err?.data?.message || 'Failed to run conflict scan.');
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (!window.confirm(`Archive timetable "${name}"? It will no longer be marked active.`)) return;
    try {
      await archiveTimetable(id).unwrap();
    } catch (err: any) {
      alert(err?.data?.error?.message || err?.data?.message || 'Failed to archive timetable.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete draft timetable "${name}" and all scheduled slots?`)) return;
    try {
      await deleteTimetable(id).unwrap();
    } catch (err: any) {
      alert(err?.data?.error?.message || err?.data?.message || 'Cannot delete timetable.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Timetables</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage academic timetable versions, publication lifecycle, and conflict scans.
          </p>
        </div>
        <Can permission="timetable:create">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            + Create Draft Timetable
          </button>
        </Can>
      </div>

      {errorBanner && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          {errorBanner}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by timetable name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            {Object.values(TimetableStatus).map((s) => (
              <option key={s} value={s}>
                {s}
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
                  Timetable
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Version & Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Effective Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Scheduled Slots
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Campus
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    Loading timetables...
                  </td>
                </tr>
              ) : timetables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No timetables created yet.
                  </td>
                </tr>
              ) : (
                timetables.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{t.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-800">
                          v{t.version}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            t.status === TimetableStatus.PUBLISHED
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.status === TimetableStatus.DRAFT
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {t.status}
                        </span>
                        {t.isCurrent && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                            CURRENT ACTIVE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                      <div>From: {new Date(t.effectiveFrom).toLocaleDateString()}</div>
                      {t.effectiveTo && (
                        <div>To: {new Date(t.effectiveTo).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">
                      {t.totalEntries || 0} slots
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {t.campusName || 'Main Campus'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                      <Link
                        to={`/timetable/class-view?timetableId=${t.id}`}
                        className="text-indigo-600 hover:text-indigo-900 font-semibold"
                      >
                        Grid View
                      </Link>

                      <button
                        onClick={() => handleValidateScan(t)}
                        className="text-teal-600 hover:text-teal-900"
                      >
                        Scan Conflicts
                      </button>

                      {t.status === TimetableStatus.DRAFT && (
                        <Can permission="timetable:publish">
                          <button
                            onClick={() => handlePublish(t)}
                            disabled={isPublishing}
                            className="text-emerald-600 hover:text-emerald-900 font-semibold"
                          >
                            Publish
                          </button>
                        </Can>
                      )}

                      <Can permission="timetable:create">
                        <button
                          onClick={() => handleOpenClone(t)}
                          className="text-violet-600 hover:text-violet-900"
                        >
                          Clone
                        </button>
                      </Can>

                      {t.status === TimetableStatus.PUBLISHED && (
                        <Can permission="timetable:archive">
                          <button
                            onClick={() => handleArchive(t.id, t.name)}
                            className="text-amber-600 hover:text-amber-900"
                          >
                            Archive
                          </button>
                        </Can>
                      )}

                      {t.status === TimetableStatus.DRAFT && (
                        <Can permission="timetable:delete">
                          <button
                            onClick={() => handleDelete(t.id, t.name)}
                            className="text-rose-600 hover:text-rose-900"
                          >
                            Delete
                          </button>
                        </Can>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conflict Scan Report Modal */}
      {validationModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Timetable Conflict Scan</h3>
                <p className="text-xs text-gray-500">
                  Total Entries Evaluated: {validationModalReport.totalEntries} • Conflicts:{' '}
                  {validationModalReport.totalConflicts}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  validationModalReport.isValid
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {validationModalReport.isValid ? 'VALID (Ready to Publish)' : 'ERRORS DETECTED'}
              </span>
            </div>

            {/* Conflict Summary Boxes */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">Teacher Conflicts</p>
                <p className="text-base font-bold text-gray-800">
                  {validationModalReport.summary.teacherConflicts}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">Class Conflicts</p>
                <p className="text-base font-bold text-gray-800">
                  {validationModalReport.summary.classConflicts}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">Room Conflicts</p>
                <p className="text-base font-bold text-gray-800">
                  {validationModalReport.summary.roomConflicts}
                </p>
              </div>
            </div>

            {/* List of Detected Issues */}
            {validationModalReport.conflicts.length === 0 ? (
              <div className="p-6 text-center text-sm text-emerald-700 bg-emerald-50 rounded-xl">
                ✓ Zero scheduling conflicts detected across teachers, classes, and rooms.
              </div>
            ) : (
              <div className="space-y-2">
                {validationModalReport.conflicts.map((c, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-xs border ${
                      c.severity === 'ERROR'
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>[{c.type}]</span>
                      <span>
                        {c.dayName} • Period {c.periodName}
                      </span>
                    </div>
                    <p className="mt-1">{c.message}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setValidationModalReport(null)}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create Master Timetable Draft</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Campus *</label>
                <select
                  required
                  value={createFormData.campusId}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, campusId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Campus</option>
                  {campuses.map((c: CampusDto) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Academic Year *
                </label>
                <select
                  required
                  value={createFormData.academicYearId}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, academicYearId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map((y: AcademicYearDto) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Timetable Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-2027 Term 1 Schedule"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="e.g. TT-TERM1"
                    value={createFormData.code}
                    onChange={(e) => setCreateFormData({ ...createFormData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Effective From *
                  </label>
                  <input
                    type="date"
                    required
                    value={createFormData.effectiveFrom}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, effectiveFrom: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clone Modal */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Clone Timetable Version</h3>
            <p className="text-xs text-gray-500 mb-4">
              All active scheduled slots will be duplicated into a new DRAFT timetable version.
            </p>
            <form onSubmit={handleCloneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New Name *</label>
                <input
                  type="text"
                  required
                  value={cloneFormData.name}
                  onChange={(e) => setCloneFormData({ ...cloneFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Effective From *
                  </label>
                  <input
                    type="date"
                    required
                    value={cloneFormData.effectiveFrom}
                    onChange={(e) =>
                      setCloneFormData({ ...cloneFormData, effectiveFrom: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Effective To
                  </label>
                  <input
                    type="date"
                    value={cloneFormData.effectiveTo}
                    onChange={(e) =>
                      setCloneFormData({ ...cloneFormData, effectiveTo: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCloning}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCloning ? 'Cloning...' : 'Clone Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
