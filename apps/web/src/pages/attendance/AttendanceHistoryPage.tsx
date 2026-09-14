import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  useGetAttendanceRegisterQuery,
  useSubmitAttendanceMutation,
  useApproveAttendanceMutation,
  useLockAttendanceMutation,
  useRequestCorrectionMutation,
} from '../../features/attendance/attendanceApi.js';
import { useGetAcademicClassesQuery } from '../../features/academic/academicApi.js';
import {
  AttendanceStatus,
  AttendanceMode,
  AttendanceLifecycleStatus,
} from '@edusphere/common';
import type { IStudentAttendance } from '@edusphere/types';
import { Can } from '../../components/auth/Can.js';

export const AttendanceHistoryPage: React.FC = () => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Modals state
  const [viewingSession, setViewingSession] = useState<IStudentAttendance | null>(null);
  const [correctingSession, setCorrectingSession] = useState<IStudentAttendance | null>(null);
  const [correctionStudentId, setCorrectionStudentId] = useState<string>('');
  const [correctionNewStatus, setCorrectionNewStatus] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Queries
  const { data: classesRes } = useGetAcademicClassesQuery();
  const academicClasses = classesRes?.data || [];

  const {
    data: registerRes,
    isLoading,
    refetch,
  } = useGetAttendanceRegisterQuery({
    academicClassId: selectedClassId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    status: statusFilter ? (statusFilter as AttendanceLifecycleStatus) : undefined,
    attendanceMode: modeFilter ? (modeFilter as AttendanceMode) : undefined,
    page,
    limit: 20,
  });

  const rawRegisters = registerRes?.data;
  const registers: IStudentAttendance[] = Array.isArray(rawRegisters)
    ? rawRegisters
    : (rawRegisters as any)?.data || [];

  // Mutations
  const [submitAttendance] = useSubmitAttendanceMutation();
  const [approveAttendance] = useApproveAttendanceMutation();
  const [lockAttendance] = useLockAttendanceMutation();
  const [requestCorrection, { isLoading: submittingCorrection }] = useRequestCorrectionMutation();

  const handleSubmit = async (id: string) => {
    try {
      await submitAttendance(id).unwrap();
      setSuccessBanner('Attendance session submitted for approval.');
      refetch();
    } catch (err: any) {
      setErrorBanner(err?.data?.message || 'Failed to submit attendance.');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveAttendance(id).unwrap();
      setSuccessBanner('Attendance session approved.');
      refetch();
    } catch (err: any) {
      setErrorBanner(err?.data?.message || 'Failed to approve attendance.');
    }
  };

  const handleLock = async (id: string) => {
    try {
      await lockAttendance(id).unwrap();
      setSuccessBanner('Attendance session locked against further changes.');
      refetch();
    } catch (err: any) {
      setErrorBanner(err?.data?.message || 'Failed to lock attendance.');
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingSession || !correctionStudentId || !correctionReason.trim()) {
      setErrorBanner('Please select a student and provide a reason for the correction.');
      return;
    }

    try {
      await requestCorrection({
        id: correctingSession.id,
        body: {
          studentId: correctionStudentId,
          newStatus: correctionNewStatus,
          reason: correctionReason.trim(),
        },
      }).unwrap();

      setSuccessBanner('Correction request recorded successfully.');
      setCorrectingSession(null);
      setCorrectionReason('');
      refetch();
    } catch (err: any) {
      setErrorBanner(err?.data?.message || 'Failed to request correction.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Registers & History</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review historical daily & period registers, approve pending sessions, and trigger audit corrections.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setPage(1);
            }}
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Academic Classes</option>
            {academicClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {(c as any).className || 'Class'} - {(c as any).sectionName || 'Section'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Mode</label>
          <select
            value={modeFilter}
            onChange={(e) => {
              setModeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Modes</option>
            <option value={AttendanceMode.DAILY}>Daily</option>
            <option value={AttendanceMode.PERIOD}>Period</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value={AttendanceLifecycleStatus.DRAFT}>Draft</option>
            <option value={AttendanceLifecycleStatus.SUBMITTED}>Submitted</option>
            <option value={AttendanceLifecycleStatus.APPROVED}>Approved</option>
            <option value={AttendanceLifecycleStatus.LOCKED}>Locked</option>
          </select>
        </div>
      </div>

      {/* Banners */}
      {errorBanner && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between">
          <span>{errorBanner}</span>
          <button onClick={() => setErrorBanner(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <span>{successBanner}</span>
          <button onClick={() => setSuccessBanner(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Registers List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Mode</th>
                <th className="px-6 py-3 text-center">Enrolled</th>
                <th className="px-6 py-3 text-center">P</th>
                <th className="px-6 py-3 text-center">A</th>
                <th className="px-6 py-3 text-center">L</th>
                <th className="px-6 py-3 text-center">Lifecycle</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Loading attendance registers...
                  </td>
                </tr>
              ) : registers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No attendance registers match the selected criteria.
                  </td>
                </tr>
              ) : (
                registers.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {new Date(session.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase">
                      {session.attendanceMode}
                    </td>
                    <td className="px-6 py-4 text-center font-mono">{session.totalStudents ?? 0}</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">
                      {session.presentCount ?? 0}
                    </td>
                    <td className="px-6 py-4 text-center text-rose-600 font-bold">
                      {session.absentCount ?? 0}
                    </td>
                    <td className="px-6 py-4 text-center text-amber-600 font-bold">
                      {session.lateCount ?? 0}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          session.status === AttendanceLifecycleStatus.LOCKED
                            ? 'bg-red-100 text-red-800'
                            : session.status === AttendanceLifecycleStatus.APPROVED
                            ? 'bg-emerald-100 text-emerald-800'
                            : session.status === AttendanceLifecycleStatus.SUBMITTED
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setViewingSession(session)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-900"
                      >
                        View Roster
                      </button>

                      {session.status === AttendanceLifecycleStatus.DRAFT && (
                        <button
                          onClick={() => handleSubmit(session.id)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-900"
                        >
                          Submit
                        </button>
                      )}

                      {session.status === AttendanceLifecycleStatus.SUBMITTED && (
                        <Can permission="attendance:approve">
                          <button
                            onClick={() => handleApprove(session.id)}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-900"
                          >
                            Approve
                          </button>
                        </Can>
                      )}

                      {session.status === AttendanceLifecycleStatus.APPROVED && (
                        <Can permission="attendance:lock">
                          <button
                            onClick={() => handleLock(session.id)}
                            className="text-xs font-medium text-rose-600 hover:text-rose-900"
                          >
                            Lock
                          </button>
                        </Can>
                      )}

                      {(session.status === AttendanceLifecycleStatus.APPROVED ||
                        session.status === AttendanceLifecycleStatus.LOCKED) && (
                        <Can permission="attendance:correct">
                          <button
                            onClick={() => {
                              setCorrectingSession(session);
                              setCorrectionStudentId(session.records[0]?.studentId || '');
                            }}
                            className="text-xs font-medium text-amber-600 hover:text-amber-900"
                          >
                            Correct
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

      {/* Roster View Modal */}
      {viewingSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  Attendance Register — {new Date(viewingSession.date).toLocaleDateString()}
                </h3>
                <p className="text-xs text-gray-500 uppercase mt-0.5">
                  {viewingSession.attendanceMode} • Status: {viewingSession.status}
                </p>
              </div>
              <button
                onClick={() => setViewingSession(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Student ID</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-left">Remarks / Arrival</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {viewingSession.records.map((r) => (
                    <tr key={r.studentId}>
                      <td className="px-4 py-2.5 font-mono text-gray-700">{r.studentId}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            r.status === AttendanceStatus.PRESENT
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === AttendanceStatus.ABSENT
                              ? 'bg-rose-100 text-rose-800'
                              : r.status === AttendanceStatus.LATE
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {r.arrivalTimestamp && (
                          <span className="text-amber-700 font-medium mr-2">
                            Arrival: {new Date(r.arrivalTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {r.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setViewingSession(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Request Modal */}
      {correctingSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <form onSubmit={handleCorrectionSubmit}>
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Request Attendance Correction</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Registers locked or approved require justification.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCorrectingSession(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Student</label>
                  <select
                    value={correctionStudentId}
                    onChange={(e) => setCorrectionStudentId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {correctingSession.records.map((r) => (
                      <option key={r.studentId} value={r.studentId}>
                        Student {r.studentId.substring(0, 8)}... (Current: {r.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    New Corrected Status
                  </label>
                  <select
                    value={correctionNewStatus}
                    onChange={(e) => setCorrectionNewStatus(e.target.value as AttendanceStatus)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={AttendanceStatus.PRESENT}>PRESENT</option>
                    <option value={AttendanceStatus.ABSENT}>ABSENT</option>
                    <option value={AttendanceStatus.LATE}>LATE</option>
                    <option value={AttendanceStatus.HALF_DAY}>HALF_DAY</option>
                    <option value={AttendanceStatus.EXCUSED}>EXCUSED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Audit Justification Reason *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="E.g. Student was present in school infirmary during roll call..."
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCorrectingSession(null)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCorrection}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  Submit Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
