import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAcademicDashboardSummaryQuery } from '../../features/academic/academicApi.js';
import { Can } from '../../components/auth/Can.js';

export const AcademicDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: summaryRes, isLoading } = useGetAcademicDashboardSummaryQuery();

  const summary = summaryRes?.data || {
    totalClasses: 0,
    totalSections: 0,
    totalAcademicClasses: 0,
    totalSubjects: 0,
    totalTeacherAssignments: 0,
    totalCapacity: 0,
    totalEnrolled: 0,
    capacityUtilization: 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Academic Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure institutional grades, sections, academic offerings, curriculum subjects, and
            faculty assignments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Can permission="academic_class:create">
            <button
              onClick={() => navigate('/academic/academic-classes')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
            >
              Academic Offerings
            </button>
          </Can>
          <Can permission="class:create">
            <button
              onClick={() => navigate('/academic/classes')}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium shadow-sm transition"
            >
              Manage Classes
            </button>
          </Can>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          onClick={() => navigate('/academic/classes')}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Classes / Grades
            </span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold">
              🏫
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-gray-900">
              {isLoading ? '...' : summary.totalClasses}
            </span>
            <p className="text-xs text-gray-500 mt-1">Configured grade levels</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/academic/sections')}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Sections
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold">
              📂
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-gray-900">
              {isLoading ? '...' : summary.totalSections}
            </span>
            <p className="text-xs text-gray-500 mt-1">Classroom divisions</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/academic/academic-classes')}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Academic Offerings
            </span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-bold">
              🎯
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-gray-900">
              {isLoading ? '...' : summary.totalAcademicClasses}
            </span>
            <p className="text-xs text-gray-500 mt-1">Active class offerings this year</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/academic/subjects')}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Curriculum Subjects
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg text-sm font-bold">📚</span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-gray-900">
              {isLoading ? '...' : summary.totalSubjects}
            </span>
            <p className="text-xs text-gray-500 mt-1">Core & elective subjects</p>
          </div>
        </div>
      </div>

      {/* Capacity & Enrollment Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Institutional Capacity Utilization
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-medium mb-1">
                <span className="text-gray-700">Enrolled vs Total Capacity</span>
                <span className="text-gray-900 font-bold">
                  {summary.totalEnrolled} / {summary.totalCapacity} ({summary.capacityUtilization}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    summary.capacityUtilization > 90
                      ? 'bg-rose-500'
                      : summary.capacityUtilization > 75
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, summary.capacityUtilization)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500 font-medium">Available Desks</span>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {Math.max(0, summary.totalCapacity - summary.totalEnrolled)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500 font-medium">
                  Faculty Subject Assignments
                </span>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {summary.totalTeacherAssignments}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Navigation Panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Academic Subsystems</h2>
            <p className="text-xs text-gray-500 mb-4">
              Navigate directly to institutional configuration areas.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/academic/classes')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-indigo-300 transition text-left"
              >
                <span className="text-sm font-medium text-gray-800">Grade & Class Levels</span>
                <span className="text-gray-400">→</span>
              </button>
              <button
                onClick={() => navigate('/academic/sections')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-indigo-300 transition text-left"
              >
                <span className="text-sm font-medium text-gray-800">Class Sections</span>
                <span className="text-gray-400">→</span>
              </button>
              <button
                onClick={() => navigate('/academic/academic-classes')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-indigo-300 transition text-left"
              >
                <span className="text-sm font-medium text-gray-800">
                  Academic Offerings & Rosters
                </span>
                <span className="text-gray-400">→</span>
              </button>
              <button
                onClick={() => navigate('/academic/subjects')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-indigo-300 transition text-left"
              >
                <span className="text-sm font-medium text-gray-800">Curriculum Subjects</span>
                <span className="text-gray-400">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
