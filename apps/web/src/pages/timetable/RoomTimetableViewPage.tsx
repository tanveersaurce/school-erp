import React, { useState, useEffect } from 'react';
import {
  useGetTimetablesQuery,
  useGetClassroomsQuery,
  useGetRoomTimetableViewQuery,
} from '../../features/timetable/timetableApi.js';
import { PeriodType, TimetableStatus } from '@edusphere/common';

export const RoomTimetableViewPage: React.FC = () => {
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  const { data: timetablesRes } = useGetTimetablesQuery();
  const { data: classroomsRes } = useGetClassroomsQuery();

  const timetables = timetablesRes?.data || [];
  const classrooms = classroomsRes?.data || [];

  // Default selection
  useEffect(() => {
    if (!selectedTimetableId && timetables.length > 0) {
      const current = timetables.find((t) => t.isCurrent) || timetables[0];
      setSelectedTimetableId(current.id);
    }
  }, [timetables, selectedTimetableId]);

  useEffect(() => {
    if (!selectedRoomId && classrooms.length > 0) {
      setSelectedRoomId(classrooms[0].id);
    }
  }, [classrooms, selectedRoomId]);

  // Timetable Room View Query
  const {
    data: roomViewRes,
    isLoading: isViewLoading,
    refetch,
  } = useGetRoomTimetableViewQuery(
    {
      timetableId: selectedTimetableId,
      roomId: selectedRoomId,
    },
    {
      skip: !selectedTimetableId || !selectedRoomId,
    }
  );

  const roomView = roomViewRes?.data;
  const currentTimetable = timetables.find((t) => t.id === selectedTimetableId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Room & Facility Occupancy</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Weekly occupancy, utilization, and period allocations for classrooms and specialized labs
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
            Select Classroom / Facility
          </label>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            {classrooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.code}) - {r.roomType} (Cap: {r.capacity})
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

      {/* Grid Display */}
      {isViewLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center text-gray-500 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-3" />
          <p>Loading room schedule...</p>
        </div>
      ) : !roomView ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center text-gray-500 border border-gray-200 dark:border-gray-700 shadow-sm">
          Select a timetable and facility to view room occupancy.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-750 px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-gray-800 dark:text-white text-sm">
                {roomView.roomName} ({roomView.roomCode})
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-medium">
                {roomView.roomType}
              </span>
              <span>Capacity: {roomView.capacity} students</span>
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              {roomView.workingDays.length} Working Days • {roomView.periods.length} Periods
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="w-40 px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                    Period / Time
                  </th>
                  {roomView.workingDays.map((wd) => (
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
                {roomView.periods.map((period) => {
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
                      {roomView.workingDays.map((wd) => {
                        const slot = roomView.grid[period.id]?.[wd.dayOfWeek];

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
                              <div className="bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-lg p-2.5 h-full flex flex-col justify-between">
                                <div>
                                  <div className="font-bold text-sm text-sky-950 dark:text-sky-200 leading-snug">
                                    {slot.className} - {slot.sectionName}
                                  </div>
                                  <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{slot.subjectName}</span>
                                  </div>
                                  {slot.teacherName && (
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      <span className="truncate">{slot.teacherName}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        }

                        // Vacant period
                        return (
                          <td
                            key={wd.dayOfWeek}
                            className="px-2 py-3 border-r border-gray-200 dark:border-gray-600 last:border-r-0 align-middle text-center"
                          >
                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                              Vacant
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
