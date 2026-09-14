import React, { useState, useEffect } from 'react';
import {
  useGetTimetablesQuery,
  useGetPeriodsQuery,
  useGetClassroomsQuery,
  useGetClassTimetableViewQuery,
  useCreateTimetableEntryMutation,
  useUpdateTimetableEntryMutation,
  useDeleteTimetableEntryMutation,
  useValidateCandidateSlotMutation,
} from '../../features/timetable/timetableApi.js';
import {
  useGetAcademicClassesQuery,
  useGetSubjectsQuery,
} from '../../features/academic/academicApi.js';
import { useGetTeachersQuery } from '../../features/employee/employeeApi.js';
import { PeriodType, TimetableStatus } from '@edusphere/common';
import type { TimetableGridSlot } from '@edusphere/types';
import { Can } from '../../components/auth/Can.js';

export const ClassTimetablePage: React.FC = () => {
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Entry Edit / Add Modal State
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [modalDayOfWeek, setModalDayOfWeek] = useState<number>(1);
  const [modalPeriodId, setModalPeriodId] = useState<string>('');
  const [modalSubjectId, setModalSubjectId] = useState<string>('');
  const [modalTeacherId, setModalTeacherId] = useState<string>('');
  const [modalRoomId, setModalRoomId] = useState<string>('');

  const [preCheckResult, setPreCheckResult] = useState<{
    checked: boolean;
    isValid: boolean;
    conflicts: any[];
  } | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Queries
  const { data: timetablesRes } = useGetTimetablesQuery();
  const { data: academicClassesRes } = useGetAcademicClassesQuery();
  const { data: periodsRes } = useGetPeriodsQuery();
  const { data: classroomsRes } = useGetClassroomsQuery();
  const { data: subjectsRes } = useGetSubjectsQuery();
  const { data: teachersRes } = useGetTeachersQuery();

  const timetables = timetablesRes?.data || [];
  const academicClasses = academicClassesRes?.data || [];
  const periods = periodsRes?.data || [];
  const classrooms = classroomsRes?.data || [];
  const subjects = subjectsRes?.data || [];
  const teachers = teachersRes?.data || [];

  // Default selection
  useEffect(() => {
    if (!selectedTimetableId && timetables.length > 0) {
      const current = timetables.find((t) => t.isCurrent) || timetables[0];
      setSelectedTimetableId(current.id);
    }
  }, [timetables, selectedTimetableId]);

  useEffect(() => {
    if (!selectedClassId && academicClasses.length > 0) {
      setSelectedClassId(academicClasses[0].id);
    }
  }, [academicClasses, selectedClassId]);

  // Timetable View Query
  const {
    data: classViewRes,
    isLoading: isViewLoading,
    refetch: refetchView,
  } = useGetClassTimetableViewQuery(
    {
      timetableId: selectedTimetableId,
      academicClassId: selectedClassId,
    },
    {
      skip: !selectedTimetableId || !selectedClassId,
    }
  );

  // Mutations
  const [createEntry, { isLoading: isCreating }] = useCreateTimetableEntryMutation();
  const [updateEntry, { isLoading: isUpdating }] = useUpdateTimetableEntryMutation();
  const [deleteEntry] = useDeleteTimetableEntryMutation();
  const [validateSlot, { isLoading: isValidating }] = useValidateCandidateSlotMutation();

  const classView = classViewRes?.data;
  const currentTimetable = timetables.find((t) => t.id === selectedTimetableId);

  const handleOpenAdd = (dayOfWeek?: number, periodId?: string) => {
    setEditingEntryId(null);
    setModalDayOfWeek(dayOfWeek ?? 1);
    setModalPeriodId(periodId ?? (periods.length > 0 ? periods[0].id : ''));
    setModalSubjectId(subjects.length > 0 ? subjects[0].id : '');
    setModalTeacherId(teachers.length > 0 ? teachers[0].id : '');
    setModalRoomId('');
    setPreCheckResult(null);
    setErrorBanner(null);
    setIsEntryModalOpen(true);
  };

  const handleOpenEdit = (slot: TimetableGridSlot) => {
    if (!slot.entryId) return;
    setEditingEntryId(slot.entryId);
    setModalDayOfWeek(slot.dayOfWeek);
    setModalPeriodId(slot.periodId);
    setModalSubjectId(slot.subjectId || '');
    setModalTeacherId(slot.teacherId || '');
    setModalRoomId(slot.roomId || '');
    setPreCheckResult(null);
    setErrorBanner(null);
    setIsEntryModalOpen(true);
  };

  const handlePreCheck = async () => {
    if (!selectedTimetableId || !selectedClassId || !modalPeriodId || !modalTeacherId || !modalSubjectId) {
      setErrorBanner('Please fill out all required fields before checking conflicts.');
      return;
    }
    setErrorBanner(null);
    try {
      const res = await validateSlot({
        timetableId: selectedTimetableId,
        body: {
          academicClassId: selectedClassId,
          periodId: modalPeriodId,
          dayOfWeek: Number(modalDayOfWeek),
          teacherId: modalTeacherId,
          subjectId: modalSubjectId,
          roomId: modalRoomId || undefined,
          excludeEntryId: editingEntryId || undefined,
        },
      }).unwrap();

      setPreCheckResult({
        checked: true,
        isValid: res.data.isValid,
        conflicts: res.data.conflicts || [],
      });
    } catch (err: any) {
      setErrorBanner(err?.data?.error?.message || err?.data?.message || 'Pre-check failed.');
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!modalSubjectId || !modalTeacherId || !modalPeriodId) {
      setErrorBanner('Subject, Teacher, and Period are required.');
      return;
    }

    try {
      if (editingEntryId) {
        await updateEntry({
          timetableId: selectedTimetableId,
          entryId: editingEntryId,
          body: {
            dayOfWeek: Number(modalDayOfWeek),
            periodId: modalPeriodId,
            subjectId: modalSubjectId,
            teacherId: modalTeacherId,
            roomId: modalRoomId || undefined,
          },
        }).unwrap();
      } else {
        await createEntry({
          timetableId: selectedTimetableId,
          body: {
            academicClassId: selectedClassId,
            dayOfWeek: Number(modalDayOfWeek),
            periodId: modalPeriodId,
            subjectId: modalSubjectId,
            teacherId: modalTeacherId,
            roomId: modalRoomId || undefined,
          },
        }).unwrap();
      }
      setIsEntryModalOpen(false);
      refetchView();
    } catch (err: any) {
      setErrorBanner(err?.data?.error?.message || err?.data?.message || 'Failed to save timetable entry.');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to remove this scheduled slot?')) return;
    try {
      await deleteEntry({
        timetableId: selectedTimetableId,
        entryId,
      }).unwrap();
      refetchView();
    } catch (err: any) {
      alert(err?.data?.error?.message || err?.data?.message || 'Failed to delete slot.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Timetable Matrix</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Interactive weekly bell schedule and period slot assignment for classes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Can anyOf={['timetable_entry:manage', 'timetable:manage']}>
            <button
              onClick={() => handleOpenAdd()}
              disabled={!selectedTimetableId || !selectedClassId}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Schedule Slot
            </button>
          </Can>
        </div>
      </div>

      {/* Filter / Selector Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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
            Select Class & Section
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            {academicClasses.map((ac) => (
              <option key={ac.id} value={ac.id}>
                {ac.className || 'Class'} - Section {ac.sectionName || 'A'}
              </option>
            ))}
          </select>
        </div>

        {currentTimetable && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Status:</span>
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
            {currentTimetable.isCurrent && (
              <span className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-medium rounded">
                Active Master
              </span>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => refetchView()}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh Grid
          </button>
        </div>
      </div>

      {/* Matrix Display */}
      {isViewLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center text-gray-500 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-3" />
          <p>Generating weekly timetable matrix...</p>
        </div>
      ) : !classView ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center text-gray-500 border border-gray-200 dark:border-gray-700 shadow-sm">
          Select a valid timetable and academic class to display the schedule.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Class Summary Bar */}
          <div className="bg-gray-50 dark:bg-gray-750 px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-gray-800 dark:text-white text-sm">
                {classView.className} - Section {classView.sectionName}
              </span>
              {classView.campusName && <span>Campus: {classView.campusName}</span>}
              {classView.academicYearName && <span>Year: {classView.academicYearName}</span>}
              {classView.classTeacherName && (
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                  Class Teacher: {classView.classTeacherName}
                </span>
              )}
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              {classView.workingDays.length} Working Days • {classView.periods.length} Periods Scheduled
            </div>
          </div>

          {/* Weekly 2D Grid Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="w-40 px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                    Period / Time
                  </th>
                  {classView.workingDays.map((wd) => (
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
                {classView.periods.map((period) => {
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
                      {/* Period Header Column */}
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
                      {classView.workingDays.map((wd) => {
                        const slot = classView.grid[period.id]?.[wd.dayOfWeek];

                        // Case 1: Break period row
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

                        // Case 2: Scheduled Slot
                        if (slot && slot.entryId) {
                          return (
                            <td
                              key={wd.dayOfWeek}
                              className="px-2 py-2 border-r border-gray-200 dark:border-gray-600 last:border-r-0 align-top group relative"
                            >
                              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-lg p-2.5 h-full flex flex-col justify-between hover:shadow-md transition">
                                <div>
                                  <div className="font-bold text-sm text-indigo-950 dark:text-indigo-200 leading-snug">
                                    {slot.subjectName || 'Subject'}
                                  </div>
                                  <div className="text-xs text-gray-700 dark:text-gray-300 mt-1 flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="truncate">{slot.teacherName || 'Faculty'}</span>
                                  </div>
                                  {slot.roomName && (
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                      <span>{slot.roomName} {slot.roomCode ? `(${slot.roomCode})` : ''}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Slot Actions */}
                                <Can anyOf={['timetable_entry:manage', 'timetable:manage']}>
                                  <div className="mt-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/60 flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                                    <button
                                      onClick={() => handleOpenEdit(slot)}
                                      title="Edit Slot"
                                      className="p-1 rounded text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEntry(slot.entryId!)}
                                      title="Remove Slot"
                                      className="p-1 rounded text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </Can>
                              </div>
                            </td>
                          );
                        }

                        // Case 3: Empty Teaching Slot
                        return (
                          <td
                            key={wd.dayOfWeek}
                            className="px-2 py-3 border-r border-gray-200 dark:border-gray-600 last:border-r-0 align-middle text-center group"
                          >
                            <Can anyOf={['timetable_entry:manage', 'timetable:manage']}>
                              <button
                                onClick={() => handleOpenAdd(wd.dayOfWeek, period.id)}
                                className="w-full h-16 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-lg flex flex-col items-center justify-center text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                              >
                                <svg className="w-4 h-4 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Assign</span>
                              </button>
                            </Can>
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

      {/* Entry Modal */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 relative">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingEntryId ? 'Edit Timetable Slot' : 'Schedule New Period Slot'}
              </h3>
              <button
                onClick={() => setIsEntryModalOpen(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {errorBanner && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                {errorBanner}
              </div>
            )}

            {preCheckResult && (
              <div
                className={`mb-4 p-3 rounded-lg border text-sm ${
                  preCheckResult.isValid
                    ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  {preCheckResult.isValid ? (
                    <>
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Slot is completely conflict-free!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Scheduling Conflicts Detected:
                    </>
                  )}
                </div>
                {!preCheckResult.isValid && preCheckResult.conflicts.length > 0 && (
                  <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                    {preCheckResult.conflicts.map((c: any, i: number) => (
                      <li key={i}>{c.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <form onSubmit={handleSaveEntry} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Day of Week *
                  </label>
                  <select
                    value={modalDayOfWeek}
                    onChange={(e) => {
                      setModalDayOfWeek(Number(e.target.value));
                      setPreCheckResult(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                    <option value={7}>Sunday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Period / Bell Slot *
                  </label>
                  <select
                    value={modalPeriodId}
                    onChange={(e) => {
                      setModalPeriodId(e.target.value);
                      setPreCheckResult(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {periods
                      .filter((p) => p.type === PeriodType.TEACHING)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.startTime} - {p.endTime})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Subject *
                </label>
                <select
                  value={modalSubjectId}
                  onChange={(e) => {
                    setModalSubjectId(e.target.value);
                    setPreCheckResult(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Teacher / Faculty *
                </label>
                <select
                  value={modalTeacherId}
                  onChange={(e) => {
                    setModalTeacherId(e.target.value);
                    setPreCheckResult(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Faculty</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.employeeDetails?.name || t.teacherCode || `Faculty ID: ${t.id.slice(-6)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Classroom / Physical Room (Optional)
                </label>
                <select
                  value={modalRoomId}
                  onChange={(e) => {
                    setModalRoomId(e.target.value);
                    setPreCheckResult(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Default Class Room / None</option>
                  {classrooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code}) - Cap: {r.capacity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handlePreCheck}
                  disabled={isValidating || !modalTeacherId || !modalSubjectId}
                  className="px-3 py-2 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isValidating ? 'Checking...' : 'Pre-check Conflicts'}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEntryModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || isUpdating}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {isCreating || isUpdating ? 'Saving...' : editingEntryId ? 'Update Slot' : 'Confirm & Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
