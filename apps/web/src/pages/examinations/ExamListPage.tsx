import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Search,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  Filter,
} from 'lucide-react';
import {
  useGetExamsQuery,
  useDeleteExamMutation,
} from '../../features/examinations/examinationsApi.js';
import { useGetAcademicYearsQuery, useGetCampusesQuery } from '../../features/tenant/tenantApi.js';
import { ExamStatus, ExamType } from '@edusphere/common';
import { Spinner } from '../../components/ui/Spinner.js';

export const ExamListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [campusId, setCampusId] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExamStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<ExamType | ''>('');

  const { data: yearsRes } = useGetAcademicYearsQuery();
  const { data: campusesRes } = useGetCampusesQuery();

  const { data: examsRes, isLoading, refetch } = useGetExamsQuery({
    academicYearId: academicYearId || undefined,
    campusId: campusId || undefined,
    status: (statusFilter as ExamStatus) || undefined,
    examType: (typeFilter as ExamType) || undefined,
    search: search || undefined,
  });

  const [deleteExam, { isLoading: isDeleting }] = useDeleteExamMutation();

  const academicYears = yearsRes?.data || [];
  const campuses = campusesRes?.data || [];
  const exams = examsRes?.data || [];

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteExam(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || err?.message || 'Failed to delete exam');
    }
  };

  const getStatusBadge = (status: ExamStatus | string) => {
    switch (status) {
      case ExamStatus.DRAFT:
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case ExamStatus.SCHEDULED:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case ExamStatus.ONGOING:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case ExamStatus.MARKS_ENTRY:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case ExamStatus.VERIFICATION:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case ExamStatus.RESULTS_PENDING:
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case ExamStatus.RESULTS_APPROVED:
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case ExamStatus.PUBLISHED:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case ExamStatus.LOCKED:
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Examinations Directory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse and manage all scheduled and ongoing school examination cycles.
          </p>
        </div>
        <Link
          to="/examinations/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Exam
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <Filter className="w-3.5 h-3.5" />
          Filter Examinations
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={campusId}
              onChange={(e) => setCampusId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ExamType)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Exam Types</option>
              {Object.values(ExamType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ExamStatus)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Statuses</option>
              {Object.values(ExamStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table / Results */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Spinner />
          </div>
        ) : exams.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No examinations found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              No exams match your active search filters, or no exams have been created yet.
            </p>
            <div className="mt-5">
              <Link
                to="/examinations/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Exam
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                <tr>
                  <th className="px-6 py-3">Title & Code</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Duration Window</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{exam.title}</div>
                      {exam.code && (
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{exam.code}</div>
                      )}
                      {exam.description && (
                        <div className="text-xs text-gray-500 line-clamp-1 mt-0.5 max-w-xs">
                          {exam.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-700">
                      {exam.examType}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                          exam.status
                        )}`}
                      >
                        {exam.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="flex items-center text-gray-700">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        {new Date(exam.startDate).toLocaleDateString()} &ndash;{' '}
                        {new Date(exam.endDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/examinations/${exam.id}`}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Manage Exam"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Link>
                        {exam.status === ExamStatus.DRAFT && (
                          <Link
                            to={`/examinations/${exam.id}/edit`}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded text-gray-600 hover:bg-gray-100 transition-colors"
                            title="Edit Exam"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </Link>
                        )}
                        {exam.status === ExamStatus.DRAFT && (
                          <button
                            onClick={() => handleDelete(exam.id, exam.title)}
                            disabled={isDeleting}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Exam"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
