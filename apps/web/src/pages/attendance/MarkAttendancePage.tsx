import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Save,
  Send,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';
import {
  useGetAttendanceSheetQuery,
  useMarkDailyAttendanceMutation,
  useMarkPeriodAttendanceMutation,
} from '../../features/attendance/attendanceApi.js';
import { useGetAcademicClassesQuery } from '../../features/academic/academicApi.js';
import { useGetPeriodsQuery } from '../../features/timetable/timetableApi.js';
import { AttendanceStatus, AttendanceMode, AttendanceLifecycleStatus } from '@edusphere/common';

interface StudentRecordRow {
  studentId: string;
  name: string;
  rollNumber?: number;
  admissionNumber?: string;
  status: AttendanceStatus;
  remarks?: string;
  arrivalTimestamp?: string;
}

export const MarkAttendancePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlClassId = searchParams.get('academicClassId') || '';
  const urlDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const urlMode = (searchParams.get('mode') as AttendanceMode) || AttendanceMode.DAILY;
  const urlPeriodId = searchParams.get('periodId') || '';

  const [selectedClassId, setSelectedClassId] = useState<string>(urlClassId);
  const [selectedDate, setSelectedDate] = useState<string>(urlDate);
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>(urlMode);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(urlPeriodId);
  const [overrideNonWorking, setOverrideNonWorking] = useState<boolean>(false);

  const [records, setRecords] = useState<Record<string, StudentRecordRow>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Queries
  const { data: classesRes } = useGetAcademicClassesQuery();
  const { data: periodsRes } = useGetPeriodsQuery();

  const academicClasses = classesRes?.data || [];
  const teachingPeriods = (periodsRes?.data || []).filter((p) => p.type === 'TEACHING');

  // Auto-select first class if none selected
  useEffect(() => {
    if (!selectedClassId && academicClasses.length > 0) {
      setSelectedClassId(academicClasses[0].id);
    }
  }, [academicClasses, selectedClassId]);

  // Attendance Sheet query
  const {
    data: sheetRes,
    isLoading: loadingSheet,
    refetch: refetchSheet,
  } = useGetAttendanceSheetQuery(
    {
      academicClassId: selectedClassId,
      date: selectedDate,
      periodId: attendanceMode === AttendanceMode.PERIOD ? selectedPeriodId || undefined : undefined,
    },
    { skip: !selectedClassId || !selectedDate }
  );

  const sheetData = sheetRes?.data;
  const isLocked = sheetData?.session?.status === AttendanceLifecycleStatus.LOCKED;
  const isApproved = sheetData?.session?.status === AttendanceLifecycleStatus.APPROVED;

  // Initialize or re-populate records
  useEffect(() => {
    if (sheetData?.enrolledStudents) {
      const initial: Record<string, StudentRecordRow> = {};
      const existingRecordsMap = new Map(
        (sheetData.session?.records || []).map((r) => [r.studentId, r])
      );

      for (const student of sheetData.enrolledStudents) {
        const existing = existingRecordsMap.get(student.id);
        initial[student.id] = {
          studentId: student.id,
          name: student.name,
          rollNumber: student.rollNumber,
          admissionNumber: student.admissionNumber,
          status: existing ? existing.status : AttendanceStatus.PRESENT,
          remarks: existing?.remarks || '',
          arrivalTimestamp: existing?.arrivalTimestamp
            ? new Date(existing.arrivalTimestamp).toISOString().substring(11, 16)
            : undefined,
        };
      }
      setRecords(initial);
    }
  }, [sheetData]);

  // Mutations
  const [markDaily, { isLoading: savingDaily }] = useMarkDailyAttendanceMutation();
  const [markPeriod, { isLoading: savingPeriod }] = useMarkPeriodAttendanceMutation();
  const isSaving = savingDaily || savingPeriod;

  // Batch actions
  const handleBatchStatus = (status: AttendanceStatus) => {
    if (isLocked) return;
    setRecords((prev) => {
      const updated = { ...prev };
      for (const id in updated) {
        updated[id] = { ...updated[id], status };
      }
      return updated;
    });
  };

  const handleStudentStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (isLocked) return;
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleRemarkChange = (studentId: string, remarks: string) => {
    if (isLocked) return;
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  const handleArrivalChange = (studentId: string, timeStr: string) => {
    if (isLocked) return;
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], arrivalTimestamp: timeStr },
    }));
  };

  // Submit Handler
  const handleSave = async (targetStatus: AttendanceLifecycleStatus) => {
    setErrorBanner(null);
    setSuccessBanner(null);

    if (!selectedClassId) {
      setErrorBanner('Please select an academic class.');
      return;
    }

    if (attendanceMode === AttendanceMode.PERIOD && !selectedPeriodId) {
      setErrorBanner('Please select an instructional period.');
      return;
    }

    const payloadRecords = Object.values(records).map((r) => ({
      studentId: r.studentId,
      status: r.status,
      remarks: r.remarks || undefined,
      arrivalTimestamp: r.arrivalTimestamp
        ? `${selectedDate}T${r.arrivalTimestamp}:00.000Z`
        : undefined,
    }));

    try {
      if (attendanceMode === AttendanceMode.DAILY) {
        await markDaily({
          academicClassId: selectedClassId,
          date: selectedDate,
          status: targetStatus,
          overrideNonWorkingDay: overrideNonWorking,
          records: payloadRecords,
        }).unwrap();
      } else {
        await markPeriod({
          academicClassId: selectedClassId,
          date: selectedDate,
          periodId: selectedPeriodId,
          status: targetStatus,
          overrideNonWorkingDay: overrideNonWorking,
          records: payloadRecords,
        }).unwrap();
      }

      setSuccessBanner(
        targetStatus === AttendanceLifecycleStatus.DRAFT
          ? 'Draft attendance saved successfully.'
          : 'Attendance submitted successfully for approval.'
      );
      refetchSheet();
    } catch (err: any) {
      setErrorBanner(err?.data?.message || err?.message || 'Failed to save attendance.');
    }
  };

  // Count calculations
  const studentList = Object.values(records);
  const totalCount = studentList.length;
  const presentCount = studentList.filter((s) => s.status === AttendanceStatus.PRESENT).length;
  const absentCount = studentList.filter((s) => s.status === AttendanceStatus.ABSENT).length;
  const lateCount = studentList.filter((s) => s.status === AttendanceStatus.LATE).length;
  const halfDayCount = studentList.filter((s) => s.status === AttendanceStatus.HALF_DAY).length;
  const excusedCount = studentList.filter((s) => s.status === AttendanceStatus.EXCUSED).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Record, draft, and submit student attendance registers with automated working-day verification.
          </p>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Class Select */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Academic Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSearchParams({ academicClassId: e.target.value, date: selectedDate });
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a class...</option>
              {academicClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c as any).className || 'Class'} - {(c as any).sectionName || 'Section'}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSearchParams({ academicClassId: selectedClassId, date: e.target.value });
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Attendance Mode
            </label>
            <div className="flex rounded-lg border border-gray-300 p-0.5 bg-gray-50">
              <button
                type="button"
                onClick={() => setAttendanceMode(AttendanceMode.DAILY)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  attendanceMode === AttendanceMode.DAILY
                    ? 'bg-white shadow text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setAttendanceMode(AttendanceMode.PERIOD)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  attendanceMode === AttendanceMode.PERIOD
                    ? 'bg-white shadow text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Period
              </button>
            </div>
          </div>

          {/* Period Selector (if Period Mode) */}
          {attendanceMode === AttendanceMode.PERIOD && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Period / Slot
              </label>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select teaching period...</option>
                {teachingPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.startTime} - {p.endTime})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Non-working day warning */}
        {sheetData?.isNonWorkingDay && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <span className="font-semibold text-amber-900 text-sm">
                  Non-working day / Holiday detected:
                </span>{' '}
                <span className="text-amber-800 text-sm">{sheetData.nonWorkingReason}</span>
              </div>
            </div>
            <label className="inline-flex items-center text-sm font-medium text-amber-900 cursor-pointer">
              <input
                type="checkbox"
                checked={overrideNonWorking}
                onChange={(e) => setOverrideNonWorking(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
              />
              Override Calendar Rule
            </label>
          </div>
        )}

        {/* Status Pill & Lock Alerts */}
        {sheetData?.session && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500 font-medium">Session Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold uppercase ${
                sheetData.session.status === AttendanceLifecycleStatus.LOCKED
                  ? 'bg-red-100 text-red-800'
                  : sheetData.session.status === AttendanceLifecycleStatus.APPROVED
                  ? 'bg-emerald-100 text-emerald-800'
                  : sheetData.session.status === AttendanceLifecycleStatus.SUBMITTED
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {sheetData.session.status}
            </span>
            {isLocked && (
              <span className="text-red-600 font-semibold">
                This register is locked. Corrections require an audit request.
              </span>
            )}
            {isApproved && !isLocked && (
              <span className="text-amber-600 font-medium">
                Approved register. Modifications require administrative privileges.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error & Success Banners */}
      {errorBanner && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Live Breakdown Counter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
          <span className="text-gray-500">
            Total: <strong className="text-gray-900">{totalCount}</strong>
          </span>
          <span className="text-emerald-600">
            Present: <strong>{presentCount}</strong>
          </span>
          <span className="text-rose-600">
            Absent: <strong>{absentCount}</strong>
          </span>
          <span className="text-amber-600">
            Late: <strong>{lateCount}</strong>
          </span>
          <span className="text-orange-600">
            Half-Day: <strong>{halfDayCount}</strong>
          </span>
          <span className="text-blue-600">
            Excused: <strong>{excusedCount}</strong>
          </span>
        </div>

        {/* Batch buttons */}
        {!isLocked && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBatchStatus(AttendanceStatus.PRESENT)}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark All Present
            </button>
            <button
              type="button"
              onClick={() => handleBatchStatus(AttendanceStatus.ABSENT)}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
            >
              Mark All Absent
            </button>
          </div>
        )}
      </div>

      {/* Student Roster Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-3 text-left w-16">Roll #</th>
                <th className="px-6 py-3 text-left">Student</th>
                <th className="px-6 py-3 text-left w-32">Admission #</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-left w-64">Remarks / Arrival</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {loadingSheet ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Loading student roster...
                  </td>
                </tr>
              ) : studentList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No enrolled students found in this academic class.
                  </td>
                </tr>
              ) : (
                studentList.map((student) => (
                  <tr key={student.studentId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-semibold text-gray-600">
                      {student.rollNumber ?? '-'}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {student.admissionNumber || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        {[
                          { key: AttendanceStatus.PRESENT, label: 'P', color: 'emerald' },
                          { key: AttendanceStatus.ABSENT, label: 'A', color: 'rose' },
                          { key: AttendanceStatus.LATE, label: 'L', color: 'amber' },
                          { key: AttendanceStatus.HALF_DAY, label: 'HD', color: 'orange' },
                          { key: AttendanceStatus.EXCUSED, label: 'EX', color: 'blue' },
                        ].map((btn) => {
                          const active = student.status === btn.key;
                          return (
                            <button
                              key={btn.key}
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleStudentStatusChange(student.studentId, btn.key)}
                              className={`w-9 h-8 rounded text-xs font-bold transition-all ${
                                active
                                  ? btn.color === 'emerald'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : btn.color === 'rose'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : btn.color === 'amber'
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : btn.color === 'orange'
                                    ? 'bg-orange-500 text-white shadow-sm'
                                    : 'bg-blue-600 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1.5">
                      {student.status === AttendanceStatus.LATE && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-700">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <input
                            type="time"
                            value={student.arrivalTimestamp || '09:15'}
                            disabled={isLocked}
                            onChange={(e) => handleArrivalChange(student.studentId, e.target.value)}
                            className="border border-gray-300 rounded px-2 py-0.5 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="Optional remarks..."
                        value={student.remarks || ''}
                        disabled={isLocked}
                        onChange={(e) => handleRemarkChange(student.studentId, e.target.value)}
                        className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        {!isLocked && (
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(AttendanceLifecycleStatus.DRAFT)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2 text-gray-500" />
              Save Draft
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(AttendanceLifecycleStatus.SUBMITTED)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Attendance
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
