import React from 'react';
import { useGetMyScheduleQuery } from '../../features/timetable/timetableApi.js';
import { PeriodType } from '@edusphere/common';

export const MySchedulePage: React.FC = () => {
  const { data: scheduleRes, isLoading, error, refetch } = useGetMyScheduleQuery();
  const schedule = scheduleRes?.data;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Weekly Teaching Schedule</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Personal period schedule and classroom assignments from the current active timetable
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Schedule
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center text-gray-500 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-3" />
          <p>Retrieving your personalized timetable...</p>
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 shadow-sm">
          <svg className="w-12 h-12 text-amber-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">No Teaching Profile or Schedule Found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {(error as any)?.data?.error?.message ||
              'Your user account is either not mapped to an active teacher record, or there is no published active timetable.'}
          </p>
        </div>
      ) : !schedule ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center text-gray-500 border border-gray-200 dark:border-gray-700 shadow-sm">
          No schedule information available.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Strip */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-indigo-950 dark:text-indigo-200">
                Active Master: {schedule.timetableName}
              </div>
              <div className="text-xs text-indigo-700 dark:text-indigo-400">
                Faculty: {schedule.teacherName} {schedule.teacherCode ? `(${schedule.teacherCode})` : ''}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300">
                {schedule.totalWeeklyPeriods} Scheduled Periods / Week
              </span>
            </div>
          </div>

          {/* 2D Schedule Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="w-40 px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                      Period / Time
                    </th>
                    {schedule.workingDays.map((wd) => (
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
                  {schedule.periods.map((period) => {
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
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                            }`}
                          >
                            {period.type}
                          </span>
                        </td>

                        {/* Day Columns */}
                        {schedule.workingDays.map((wd) => {
                          const slot = schedule.grid[period.id]?.[wd.dayOfWeek];

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
                                <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-lg p-2.5 h-full flex flex-col justify-between">
                                  <div>
                                    <div className="font-bold text-sm text-indigo-950 dark:text-indigo-200 leading-snug">
                                      {slot.subjectName}
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

                          return (
                            <td
                              key={wd.dayOfWeek}
                              className="px-2 py-3 border-r border-gray-200 dark:border-gray-600 last:border-r-0 align-middle text-center"
                            >
                              <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                Free Period
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
        </div>
      )}
    </div>
  );
};
