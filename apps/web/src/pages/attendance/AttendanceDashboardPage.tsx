import React from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Clock,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Users,
  TrendingUp,
  FileText,
  ChevronRight,
} from 'lucide-react';
import {
  useGetDailyCampusReportQuery,
  useGetPendingCorrectionsQuery,
  useGetLowAttendanceReportQuery,
} from '../../features/attendance/attendanceApi.js';
import { Can } from '../../components/auth/Can.js';

export const AttendanceDashboardPage: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];

  const { data: campusReportRes, isLoading: loadingReport } = useGetDailyCampusReportQuery({
    date: todayStr,
  });
  const { data: pendingCorrectionsRes } = useGetPendingCorrectionsQuery();
  const { data: lowAttendanceRes } = useGetLowAttendanceReportQuery({
    threshold: 75,
  });

  const campusReport = campusReportRes?.data;
  const pendingCorrections = pendingCorrectionsRes?.data?.data || [];
  const lowAttendanceCount = lowAttendanceRes?.data?.lowAttendanceCount || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time daily & period registers, lifecycle approval workflows, correction auditing, and analytics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Can permission="attendance:read">
            <Link
              to="/attendance/history"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
            >
              <CalendarCheck className="w-4 h-4 mr-2 text-gray-500" />
              Register History
            </Link>
          </Can>
          <Can permission="attendance:mark">
            <Link
              to="/attendance/mark"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark Attendance
            </Link>
          </Can>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Today's Campus Rate */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Today's Campus Rate
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {loadingReport ? '...' : `${campusReport?.overallPercentage ?? 0}%`}
            </span>
            <span className="text-xs text-gray-500">present</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {campusReport?.totalPresent ?? 0} Present • {campusReport?.totalAbsent ?? 0} Absent
          </p>
        </div>

        {/* Classes Marked */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Classes Recorded
            </span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {loadingReport ? '...' : `${campusReport?.markedClasses ?? 0} / ${campusReport?.totalClasses ?? 0}`}
            </span>
            <span className="text-xs text-gray-500">classes</span>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            {campusReport?.pendingClasses ?? 0} pending registers today
          </p>
        </div>

        {/* Pending Corrections */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Correction Requests
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {pendingCorrections.length}
            </span>
            <span className="text-xs text-gray-500">pending</span>
          </div>
          <Link
            to="/attendance/corrections"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 mt-2 inline-flex items-center"
          >
            Review audit queue <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>

        {/* Low Attendance Alerts */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              At-Risk Students (&lt;75%)
            </span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-600">
              {lowAttendanceCount}
            </span>
            <span className="text-xs text-gray-500">students</span>
          </div>
          <Link
            to="/attendance/reports"
            className="text-xs font-medium text-rose-600 hover:text-rose-800 mt-2 inline-flex items-center"
          >
            Inspect low attendance <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
      </div>

      {/* Feature Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Daily & Period Registers</h3>
            <p className="text-sm text-gray-500 mt-2">
              Mark attendance for assigned academic classes or instructional periods with batch shortcuts and late time stamps.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <Link
              to="/attendance/mark"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center"
            >
              Open Register <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 mb-4">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Correction & Audit Trail</h3>
            <p className="text-sm text-gray-500 mt-2">
              Submit correction requests for locked or finalized registers with mandatory audit reasons and admin review workflow.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <Link
              to="/attendance/corrections"
              className="text-sm font-medium text-amber-600 hover:text-amber-800 inline-flex items-center"
            >
              View Corrections <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Reports & Matrix Views</h3>
            <p className="text-sm text-gray-500 mt-2">
              Monthly 2D attendance matrices, student percentage profiles, low attendance thresholds, and campus summaries.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <Link
              to="/attendance/reports"
              className="text-sm font-medium text-emerald-600 hover:text-emerald-800 inline-flex items-center"
            >
              Generate Reports <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Today's Classes Summary Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Today's Class Registers ({todayStr})</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Live submission and approval status across all active campus academic classes.
            </p>
          </div>
          <Link
            to="/attendance/mark"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Mark Now &rarr;
          </Link>
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
                <th className="px-6 py-3 text-center">Rate</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {loadingReport ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Loading campus classes...
                  </td>
                </tr>
              ) : (campusReport?.classes || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No active classes found for today's session.
                  </td>
                </tr>
              ) : (
                campusReport?.classes.map((cls) => (
                  <tr key={cls.academicClassId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {cls.className} - {cls.sectionName}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-gray-600">
                      {cls.totalEnrolled}
                    </td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-semibold">
                      {cls.presentCount}
                    </td>
                    <td className="px-6 py-4 text-center text-rose-600 font-semibold">
                      {cls.absentCount}
                    </td>
                    <td className="px-6 py-4 text-center text-amber-600">
                      {cls.lateCount}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          cls.attendancePercentage >= 85
                            ? 'bg-emerald-100 text-emerald-800'
                            : cls.attendancePercentage >= 75
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {cls.attendancePercentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/attendance/mark?academicClassId=${cls.academicClassId}&date=${todayStr}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-900"
                      >
                        Open Register
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
