import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetTeachersQuery } from '../../features/employee/employeeApi.js';
import { useGetCampusesQuery } from '../../features/tenant/tenantApi.js';

export const TeacherListPage: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [campusId, setCampusId] = useState('');
  const [primarySubject, setPrimarySubject] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data: teachersRes, isLoading } = useGetTeachersQuery({
    search: search || undefined,
    campusId: campusId || undefined,
    primarySubject: primarySubject || undefined,
    isAvailableForTimetable: isAvailable,
    page,
    limit: 15,
  });

  const { data: campusRes } = useGetCampusesQuery();

  const totalPages = (teachersRes as any)?.meta?.pagination?.totalPages || 1;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Teaching Faculty</h1>
          <p className="text-sm text-gray-500">
            View academic specialties, subject assignments, and timetable capacities across
            campuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/staff')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            &larr; Full Staff Directory
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Search Teacher</label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name, ID or specialty..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
            <input
              type="text"
              value={primarySubject}
              onChange={(e) => {
                setPrimarySubject(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. Mathematics, Science..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Campus</label>
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

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Timetable Availability
            </label>
            <select
              value={isAvailable === undefined ? '' : isAvailable ? 'true' : 'false'}
              onChange={(e) => {
                setIsAvailable(e.target.value === '' ? undefined : e.target.value === 'true');
                setPage(1);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Faculty</option>
              <option value="true">Available Only</option>
              <option value="false">Unavailable Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Teachers Grid / Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : teachersRes?.data && teachersRes.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-3.5">Faculty Member</th>
                  <th className="px-6 py-3.5">Primary Subject</th>
                  <th className="px-6 py-3.5">Specialization / Secondaries</th>
                  <th className="px-6 py-3.5">Weekly Periods</th>
                  <th className="px-6 py-3.5">Timetable Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {teachersRes.data.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    {/* Faculty Member */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm">
                          {t.employeeDetails?.name?.substring(0, 2).toUpperCase() || 'TC'}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {t.employeeDetails?.name || 'Instructor'}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {t.teacherCode || t.employeeDetails?.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Primary Subject */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-indigo-600">
                        {t.primarySubject || 'General'}
                      </span>
                    </td>

                    {/* Specialization & Secondaries */}
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-800 font-medium">
                        {t.specialization || 'General Studies'}
                      </div>
                      {t.secondarySubjects && t.secondarySubjects.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.secondarySubjects.map((sub) => (
                            <span
                              key={sub}
                              className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 font-medium"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Weekly Periods */}
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      <span className="font-semibold text-gray-900">
                        {t.maxWeeklyPeriods || 30}
                      </span>{' '}
                      periods/week
                    </td>

                    {/* Timetable Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          t.isAvailableForTimetable
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.isAvailableForTimetable ? 'Available' : 'Unavailable'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => navigate(`/staff/${t.employeeId}`)}
                        className="rounded bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        Manage Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <p className="text-base font-medium">No teaching faculty found.</p>
            <p className="text-sm mt-1">
              Add teacher profiles to existing staff members from the staff directory.
            </p>
          </div>
        )}

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
    </div>
  );
};
