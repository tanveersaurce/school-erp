import React, { useState, useEffect } from 'react';
import {
  useGetTimetablesQuery,
  useGetTeacherTimetableViewQuery,
  useGetTeacherWorkloadQuery,
} from '../../features/timetable/timetableApi.js';
import { useGetTeachersQuery } from '../../features/employee/employeeApi.js';
import { PeriodType, TimetableStatus } from '@edusphere/common';

export const TeacherTimetableViewPage: React.FC = () => {
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  const { data: timetablesRes } = useGetTimetablesQuery();
  const { data: teachersRes } = useGetTeachersQuery();

  const timetables = timetablesRes?.data || [];
  const teachers = teachersRes?.data || [];

  // Default selection
  useEffect(() => {
    if (!selectedTimetableId && timetables.length > 0) {
      const current = timetables.find((t) => t.isCurrent) || timetables[0];
      setSelectedTimetableId(current.id);
    }
  }, [timetables, selectedTimetableId]);

  useEffect(() => {
    if (!selectedTeacherId && teachers.length > 0) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [teachers, selectedTeacherId]);

  // Timetable Teacher View Query
  const {
    data: teacherViewRes,
    isLoading: isViewLoading,
    refetch,
  } = useGetTeacherTimetableViewQuery(
    {
      timetableId: selectedTimetableId,
      teacherId: selectedTeacherId,
    },
    {
      skip: !selectedTimetableId || !selectedTeacherId,
    }
  );

  // Overall Teacher Workload Query
  const { data: workloadRes } = useGetTeacherWorkloadQuery(selectedTimetableId, {
    skip: !selectedTimetableId,
  });

  const teacherView = teacherViewRes?.data;
  const currentTimetable = timetables.find((t) => t.id === selectedTimetableId);

  // Find this teacher's workload breakdown if available
  const teacherWorkload = workloadRes?.data?.workload?.find(
    (w) => w.teacherId === selectedTeacherId
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Faculty Schedule & Workload</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Comprehensive weekly timetable and workload distribution for individual teaching faculty
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Selectors Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
            Select Timetable
          </label>
          <select
            value={selectedTimetableId}
            onChange={(e) => setSelectedTimetableId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            {timetables.map((tt) => (
              <option key={tt.id} value={tt.id}>
                {tt.name} (v{tt.version}) - {tt.status} {tt.isCurrent ? '★ Current' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
            Select Teacher
          </label>
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.employeeDetails?.name || t.teacherCode || `Faculty ID: ${t.id.slice(-6)}`} {t.employeeId ? `(${t.employeeId})` : ''}
              </option>
            ))}
          </select>
        </div>

        {currentTimetable && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Timetable State:</span>
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                currentTimetable.status === TimetableStatus.PUBLISHED
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : currentTimetable.status === TimetableStatus.DRAFT
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {currentTimetable.status}
            </span>
          </div>
        )}
      </div>

      {/* Workload Stats Cards */}
      {teacherView && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Weekly Teaching Load
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {teacherView.totalWeeklyPeriods}
              </span>
              <span className="text-xs text-gray-500">periods / week</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Average Daily Load
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {teacherView.workingDays.length > 0
                  ? (teacherView.totalWeeklyPeriods / teacherView.workingDays.length).toFixed(1)
                  : '0.0'}
              </span>
              <span className="text-xs text-gray-500">periods / day</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Classes Assigned
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {teacherWorkload?.byClass?.length || 0}
              </span>
              <span className="text-xs text-gray-500">classes</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Distinct Subjects
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {teacherWorkload?.bySubject?.length || 0}
              </span>
              <span className="text-xs text-gray-500">courses</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid Display */}
      {isViewLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center text-gray-500 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-3" />
          <p>Loading teacher timetable...</p>
        </div>
      ) : !teacherView ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center text-gray-500 border border-gray-200 dark:border-gray-700 shadow-sm">
          Select a timetable and teacher to view their schedule.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-750 px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
            <div className="font-semibold text-gray-800 dark:text-white text-sm">
              Schedule for {teacherView.teacherName} {teacherView.teacherCode ? `(${teacherView.teacherCode})` : ''}
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              {teacherView.totalWeeklyPeriods} Total Periods • {teacherView.workingDays.length} Working Days
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="w-40 px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                    Period / Time
                  </th>
                  {teacherView.workingDays.map((wd) => (
                    <th
                      key={wd.dayOfWeek}
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600 last:border-r-0"
                    >
                      {wd.dayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {teacherView.periods.map((period) => {
                  const isBreakRow = period.type !== PeriodType.TEACHING;
                  return (
                    <tr
                      key={period.id}
                      className={
                        isBreakRow
                          ? 'bg-amber-50/50 dark:bg-amber-950/20'
                          : 'hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition'
                      }
                    >
                      {/* Period Header */}
                      <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600 align-top">
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">
                          {period.name}
                        </div>
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                          {period.startTime} - {period.endTime}
                        </div>
                        <span
                          className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded ${
                            period.type === PeriodType.TEACHING
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                              : period.type === PeriodType.LUNCH
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                              : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {period.type}
                        </span>
                      </td>

                      {/* Day Columns */}
                      {teacherView.workingDays.map((wd) => {
                        const slot = teacherView.grid[period.id]?.[wd.dayOfWeek];

                        if (isBreakRow || slot?.isBreak) {
                          return (
                            <td
                              key={wd.dayOfWeek}
                              className="px-2 py-3 text-center border-r border-gray-200 dark:border-gray-600 last:border-r-0 bg-amber-50/40 dark:bg-amber-950/10 text-xs text-amber-800 dark:text-amber-400 font-medium italic select-none"
                            >
                              {period.name}
                            </td>
                          );
                        }

                        if (slot && slot.entryId) {
                          return (
                            <td
                              key={wd.dayOfWeek}
                              className="px-2 py-2 border-r border-gray-200 dark:border-gray-600 last:border-r-0 align-top"
                            >
                              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-2.5 h-full flex flex-col justify-between">
                                <div>
                                  <div className="font-bold text-sm text-emerald-950 dark:text-emerald-200 leading-snug">
                                    {slot.subjectName || 'Subject'}
                                  </div>
                                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1 flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span>
                                      {slot.className} - {slot.sectionName}
                                    </span>
                                  </div>
                                  {slot.roomName && (
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                      <span className="font-mono">{slot.roomName} {slot.roomCode ? `(${slot.roomCode})` : ''}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        }

                        // Free period
                        return (
                          <td
                            key={wd.dayOfWeek}
                            className="px-2 py-3 border-r border-gray-200 dark:border-gray-600 last:border-r-0 align-middle text-center"
                          >
                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                              Free
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
