import React, { useState } from 'react';
import {
  Grid,
  BarChart2,
  TrendingDown,
  User,
} from 'lucide-react';
import {
  useGetMonthlyMatrixQuery,
  useGetLowAttendanceReportQuery,
  useGetStudentSummaryQuery,
  useGetDailyCampusReportQuery,
} from '../../features/attendance/attendanceApi.js';
import { useGetAcademicClassesQuery } from '../../features/academic/academicApi.js';

type TabMode = 'matrix' | 'low-attendance' | 'student' | 'campus';

export const AttendanceReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabMode>('matrix');

  // Matrix tab state
  const currentDate = new Date();
  const [matrixClassId, setMatrixClassId] = useState<string>('');
  const [matrixYear, setMatrixYear] = useState<number>(currentDate.getFullYear());
  const [matrixMonth, setMatrixMonth] = useState<number>(currentDate.getMonth() + 1);

  // Low attendance tab state
  const [threshold, setThreshold] = useState<number>(75);

  // Student summary tab state
  const [searchedStudentId, setSearchedStudentId] = useState<string>('');
  const [activeStudentId, setActiveStudentId] = useState<string>('');

  // Campus daily tab state
  const [campusDate, setCampusDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Academic Classes list
  const { data: classesRes } = useGetAcademicClassesQuery();
  const academicClasses = classesRes?.data || [];

  // Default select first class for matrix
  React.useEffect(() => {
    if (!matrixClassId && academicClasses.length > 0) {
      setMatrixClassId(academicClasses[0].id);
    }
  }, [academicClasses, matrixClassId]);

  // Queries
  const { data: matrixRes, isLoading: loadingMatrix } = useGetMonthlyMatrixQuery(
    { academicClassId: matrixClassId, year: matrixYear, month: matrixMonth },
    { skip: activeTab !== 'matrix' || !matrixClassId }
  );

  const { data: lowAttRes, isLoading: loadingLow } = useGetLowAttendanceReportQuery(
    { threshold },
    { skip: activeTab !== 'low-attendance' }
  );

  const { data: studentSummaryRes, isLoading: loadingStudent } = useGetStudentSummaryQuery(
    { studentId: activeStudentId },
    { skip: activeTab !== 'student' || !activeStudentId }
  );

  const { data: campusReportRes, isLoading: loadingCampus } = useGetDailyCampusReportQuery(
    { date: campusDate },
    { skip: activeTab !== 'campus' || !campusDate }
  );

  const matrix = matrixRes?.data;
  const lowAttendance = lowAttRes?.data;
  const studentSummary = studentSummaryRes?.data;
  const campusReport = campusReportRes?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Analytics & Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          2D monthly register matrices, low attendance risk detection, and student attendance profiles.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex items-center gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'matrix'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Grid className="w-4 h-4" /> Monthly Matrix
        </button>
        <button
          onClick={() => setActiveTab('low-attendance')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'low-attendance'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingDown className="w-4 h-4" /> Low Attendance Alerts
        </button>
        <button
          onClick={() => setActiveTab('student')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'student'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <User className="w-4 h-4" /> Student Profile
        </button>
        <button
          onClick={() => setActiveTab('campus')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'campus'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart2 className="w-4 h-4" /> Campus Daily Summary
        </button>
      </div>

      {/* =================================================================== */}
      {/* 1. Monthly Matrix Tab                                              */}
      {/* =================================================================== */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Class</label>
              <select
                value={matrixClassId}
                onChange={(e) => setMatrixClassId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
              >
                {academicClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c as any).className || 'Class'} - {(c as any).sectionName || 'Section'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
              <input
                type="number"
                value={matrixYear}
                onChange={(e) => setMatrixYear(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs w-24 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Month</label>
              <select
                value={matrixMonth}
                onChange={(e) => setMatrixMonth(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loadingMatrix ? (
                <div className="p-12 text-center text-gray-500 text-sm">
                  Loading monthly matrix...
                </div>
              ) : !matrix || matrix.students.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-sm">
                  No student records available for this class and period.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold">
                    <tr>
                      <th className="px-3 py-2 text-left sticky left-0 bg-gray-50 z-10 w-36">
                        Student
                      </th>
                      {Array.from({ length: matrix.daysInMonth }, (_, i) => i + 1).map((day) => (
                        <th key={day} className="px-1 py-2 text-center w-7 border-l border-gray-100">
                          {day}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center w-12 border-l border-gray-200 bg-gray-100">
                        Total
                      </th>
                      <th className="px-2 py-2 text-center w-14 bg-gray-100">
                        Rate %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {matrix.students.map((row) => (
                      <tr key={row.studentId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900 sticky left-0 bg-white truncate max-w-[150px]">
                          {row.studentName}
                        </td>
                        {Array.from({ length: matrix.daysInMonth }, (_, i) => i + 1).map((day) => {
                          const status = row.days[day];
                          let badgeBg = 'bg-gray-50 text-gray-300';
                          let label = '-';

                          if (status === 'PRESENT') {
                            badgeBg = 'bg-emerald-100 text-emerald-800 font-bold';
                            label = 'P';
                          } else if (status === 'ABSENT') {
                            badgeBg = 'bg-rose-100 text-rose-800 font-bold';
                            label = 'A';
                          } else if (status === 'LATE') {
                            badgeBg = 'bg-amber-100 text-amber-800 font-bold';
                            label = 'L';
                          } else if (status === 'HALF_DAY') {
                            badgeBg = 'bg-orange-100 text-orange-800 font-bold';
                            label = 'HD';
                          } else if (status === 'EXCUSED') {
                            badgeBg = 'bg-blue-100 text-blue-800 font-bold';
                            label = 'EX';
                          } else if (status === 'HOLIDAY') {
                            badgeBg = 'bg-purple-100 text-purple-800 font-semibold';
                            label = 'H';
                          } else if (status === 'WEEKEND') {
                            badgeBg = 'bg-gray-100 text-gray-400';
                            label = 'W';
                          }

                          return (
                            <td key={day} className="px-0.5 py-1 text-center border-l border-gray-100">
                              <span
                                className={`inline-block w-6 h-6 rounded flex items-center justify-center text-[10px] ${badgeBg}`}
                              >
                                {label}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center font-bold text-gray-700 border-l border-gray-200 bg-gray-50">
                          {row.summary.presentEquivalentDays} / {row.summary.totalWorkingDays}
                        </td>
                        <td className="px-2 py-2 text-center font-extrabold bg-gray-50">
                          <span
                            className={
                              row.summary.attendancePercentage >= 75
                                ? 'text-emerald-700'
                                : 'text-rose-600'
                            }
                          >
                            {row.summary.attendancePercentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. Low Attendance Tab                                               */}
      {/* =================================================================== */}
      {activeTab === 'low-attendance' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">
                Attendance Threshold:
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-20 focus:ring-2 focus:ring-rose-500"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
            <div className="text-xs text-rose-700 font-semibold bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
              {lowAttendance?.lowAttendanceCount ?? 0} students under {threshold}%
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loadingLow ? (
                <div className="p-12 text-center text-gray-500 text-sm">
                  Calculating low attendance alerts...
                </div>
              ) : (lowAttendance?.students || []).length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-sm">
                  No students currently below {threshold}% attendance threshold.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-3 text-left">Student</th>
                      <th className="px-6 py-3 text-left">Class & Section</th>
                      <th className="px-6 py-3 text-center">Working Days</th>
                      <th className="px-6 py-3 text-center">Present Days</th>
                      <th className="px-6 py-3 text-center">Absent Days</th>
                      <th className="px-6 py-3 text-center">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-700">
                    {lowAttendance?.students.map((s) => (
                      <tr key={s.studentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {s.studentName || s.studentId}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-600">
                          {s.className} - {s.sectionName}
                        </td>
                        <td className="px-6 py-4 text-center font-mono">
                          {s.totalWorkingDays}
                        </td>
                        <td className="px-6 py-4 text-center text-emerald-600 font-semibold">
                          {s.presentDays}
                        </td>
                        <td className="px-6 py-4 text-center text-rose-600 font-semibold">
                          {s.absentDays}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            {s.attendancePercentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. Student Profile Tab                                              */}
      {/* =================================================================== */}
      {activeTab === 'student' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <input
              type="text"
              placeholder="Enter Student ID / ObjectId..."
              value={searchedStudentId}
              onChange={(e) => setSearchedStudentId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 max-w-md focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setActiveStudentId(searchedStudentId.trim())}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
            >
              Lookup
            </button>
          </div>

          {loadingStudent ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              Loading student attendance summary...
            </div>
          ) : studentSummary ? (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {studentSummary.studentName || 'Student Profile'}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    ID: {studentSummary.studentId}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-extrabold text-indigo-600">
                    {studentSummary.attendancePercentage}%
                  </span>
                  <p className="text-xs text-gray-500">Overall Attendance</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase">Working Days</span>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {studentSummary.totalWorkingDays}
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <span className="text-xs text-emerald-700 uppercase">Present</span>
                  <p className="text-xl font-bold text-emerald-800 mt-1">
                    {studentSummary.presentDays}
                  </p>
                </div>
                <div className="bg-rose-50 p-4 rounded-lg">
                  <span className="text-xs text-rose-700 uppercase">Absent</span>
                  <p className="text-xl font-bold text-rose-800 mt-1">
                    {studentSummary.absentDays}
                  </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <span className="text-xs text-amber-700 uppercase">Late</span>
                  <p className="text-xl font-bold text-amber-800 mt-1">
                    {studentSummary.lateDays}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 text-sm">
              Enter a valid Student ID above to view the detailed attendance breakdown.
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. Campus Daily Tab                                                 */}
      {/* =================================================================== */}
      {activeTab === 'campus' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-600">Date:</label>
            <input
              type="date"
              value={campusDate}
              onChange={(e) => setCampusDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {loadingCampus ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              Loading campus breakdown...
            </div>
          ) : campusReport ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-200">
                <h3 className="text-base font-bold text-gray-900">
                  Campus Overview for {campusReport.date}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Overall: {campusReport.overallPercentage}% present ({campusReport.totalPresent} / {campusReport.totalEnrolledStudents})
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-3 text-left">Class & Section</th>
                      <th className="px-6 py-3 text-center">Enrolled</th>
                      <th className="px-6 py-3 text-center">Present</th>
                      <th className="px-6 py-3 text-center">Absent</th>
                      <th className="px-6 py-3 text-center">Late</th>
                      <th className="px-6 py-3 text-center">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-700">
                    {campusReport.classes.map((c) => (
                      <tr key={c.academicClassId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {c.className} - {c.sectionName}
                        </td>
                        <td className="px-6 py-4 text-center font-mono">
                          {c.totalEnrolled}
                        </td>
                        <td className="px-6 py-4 text-center text-emerald-600 font-semibold">
                          {c.presentCount}
                        </td>
                        <td className="px-6 py-4 text-center text-rose-600 font-semibold">
                          {c.absentCount}
                        </td>
                        <td className="px-6 py-4 text-center text-amber-600">
                          {c.lateCount}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                              c.attendancePercentage >= 75
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {c.attendancePercentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 text-sm">
              No campus records available for this date.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
