import React from 'react';
import { Link } from 'react-router-dom';
import {
  useGetTimetablesQuery,
  useGetPeriodsQuery,
  useGetClassroomsQuery,
} from '../../features/timetable/timetableApi.js';
import { TimetableStatus } from '@edusphere/common';
import { Can } from '../../components/auth/Can.js';

export const TimetableDashboardPage: React.FC = () => {
  const { data: timetablesRes, isLoading: loadingTT } = useGetTimetablesQuery();
  const { data: periodsRes, isLoading: loadingPeriods } = useGetPeriodsQuery();
  const { data: roomsRes, isLoading: loadingRooms } = useGetClassroomsQuery();

  const timetables = timetablesRes?.data || [];
  const periods = periodsRes?.data || [];
  const classrooms = roomsRes?.data || [];

  const publishedTimetable = timetables.find(
    (t) => t.status === TimetableStatus.PUBLISHED && t.isCurrent
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable & Scheduling</h1>
          <p className="text-sm text-gray-500 mt-1">
            Period definitions, classrooms, weekly class & faculty schedules, and conflict verification.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/timetable/my-schedule"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            My Schedule
          </Link>
          <Can permission="timetable:read">
            <Link
              to="/timetable/class-view"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              Class Grid View
            </Link>
          </Can>
        </div>
      </div>

      {/* Active Timetable Banner */}
      {publishedTimetable ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-emerald-900 text-base">
                  {publishedTimetable.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                  v{publishedTimetable.version} PUBLISHED & ACTIVE
                </span>
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                Effective from {new Date(publishedTimetable.effectiveFrom).toLocaleDateString()}
                {publishedTimetable.effectiveTo
                  ? ` to ${new Date(publishedTimetable.effectiveTo).toLocaleDateString()}`
                  : ' onwards'}
                {' • '}
                {publishedTimetable.totalEntries || 0} scheduled slots across{' '}
                {publishedTimetable.totalClassesScheduled || 0} classes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/timetable/class-view?timetableId=${publishedTimetable.id}`}
              className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold hover:bg-emerald-100/50 shadow-sm"
            >
              Open Class Grid
            </Link>
            <Link
              to={`/timetable/teacher-view?timetableId=${publishedTimetable.id}`}
              className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 shadow-sm"
            >
              Teacher Workload
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-amber-900 text-sm">No Active Timetable Published</h3>
            <p className="text-xs text-amber-700 mt-0.5">
              Drafts must undergo complete server-side conflict verification before publication.
            </p>
          </div>
          <Can permission="timetable:create">
            <Link
              to="/timetable/timetables"
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 shadow-sm"
            >
              Create Master Timetable
            </Link>
          </Can>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Timetables</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {loadingTT ? '...' : timetables.length}
          </p>
          <div className="mt-2 text-xs text-gray-500 flex gap-2">
            <span>
              {timetables.filter((t) => t.status === TimetableStatus.DRAFT).length} Drafts
            </span>
            <span>•</span>
            <span>
              {timetables.filter((t) => t.status === TimetableStatus.PUBLISHED).length} Published
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Periods (Bell Schedule)
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {loadingPeriods ? '...' : periods.length}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {periods.filter((p) => p.type === 'TEACHING').length} Teaching slots configured
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Classrooms & Facilities
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {loadingRooms ? '...' : classrooms.length}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Total Capacity: {classrooms.reduce((acc, r) => acc + (r.capacity || 0), 0)} seats
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Conflict Engine
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">Active</p>
          <p className="mt-2 text-xs text-gray-500">
            Zero-conflict server validation & DB concurrency guards
          </p>
        </div>
      </div>

      {/* Module Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/timetable/periods"
          className="bg-white p-6 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            ⏱
          </div>
          <h3 className="text-base font-semibold text-gray-900 mt-4 group-hover:text-indigo-600">
            Bell Schedule & Periods
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Configure periods, sequence numbers, start and end times, recess/lunch intervals, and duration.
          </p>
        </Link>

        <Link
          to="/timetable/classrooms"
          className="bg-white p-6 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
            🏢
          </div>
          <h3 className="text-base font-semibold text-gray-900 mt-4 group-hover:text-indigo-600">
            Classrooms & Rooms
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Manage physical rooms, science & computer laboratories, auditoriums, and seat capacities.
          </p>
        </Link>

        <Link
          to="/timetable/timetables"
          className="bg-white p-6 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-lg group-hover:bg-violet-600 group-hover:text-white transition-colors">
            📋
          </div>
          <h3 className="text-base font-semibold text-gray-900 mt-4 group-hover:text-indigo-600">
            Master Timetables
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Create timetable drafts, clone versions, publish with automated conflict validation, and archive.
          </p>
        </Link>

        <Link
          to="/timetable/class-view"
          className="bg-white p-6 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg group-hover:bg-teal-600 group-hover:text-white transition-colors">
            🗓
          </div>
          <h3 className="text-base font-semibold text-gray-900 mt-4 group-hover:text-indigo-600">
            Class Weekly Timetable
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Interactive 2D matrix view of class schedules. Assign subjects, faculty, and rooms into period slots.
          </p>
        </Link>

        <Link
          to="/timetable/teacher-view"
          className="bg-white p-6 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
            👨‍🏫
          </div>
          <h3 className="text-base font-semibold text-gray-900 mt-4 group-hover:text-indigo-600">
            Teacher Schedule & Workload
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            View individual teacher schedules, weekly period allocations, subject distribution, and workload balances.
          </p>
        </Link>

        <Link
          to="/timetable/room-view"
          className="bg-white p-6 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
            🚪
          </div>
          <h3 className="text-base font-semibold text-gray-900 mt-4 group-hover:text-indigo-600">
            Room Occupancy Grid
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Check classroom and lab availability, detect booking conflicts, and track space utilization.
          </p>
        </Link>
      </div>
    </div>
  );
};
