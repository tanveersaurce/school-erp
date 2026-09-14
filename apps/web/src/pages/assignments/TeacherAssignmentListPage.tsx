import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Archive,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import {
  useGetAssignmentsQuery,
  usePublishAssignmentMutation,
  useCloseAssignmentMutation,
  useArchiveAssignmentMutation,
  useDeleteAssignmentMutation,
} from '../../features/assignments/assignmentsApi.js';
import { AssignmentStatus, AssignmentType } from '@edusphere/common';

export const TeacherAssignmentListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<AssignmentType | ''>('');
  const [page, setPage] = useState(1);

  const { data: assignmentsRes, isLoading, refetch } = useGetAssignmentsQuery({
    search: search || undefined,
    status: (statusFilter as AssignmentStatus) || undefined,
    assignmentType: (typeFilter as AssignmentType) || undefined,
    page,
    limit: 15,
  });

  const [publishAssignment] = usePublishAssignmentMutation();
  const [closeAssignment] = useCloseAssignmentMutation();
  const [archiveAssignment] = useArchiveAssignmentMutation();
  const [deleteAssignment] = useDeleteAssignmentMutation();

  const assignments = assignmentsRes?.data || [];
  const meta = assignmentsRes?.meta as
    | { page?: number; totalPages?: number; total?: number }
    | undefined;

  const handlePublish = async (id: string) => {
    try {
      await publishAssignment(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.error?.message || 'Failed to publish assignment');
    }
  };

  const handleClose = async (id: string) => {
    try {
      await closeAssignment(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.error?.message || 'Failed to close assignment');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveAssignment(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.error?.message || 'Failed to archive assignment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await deleteAssignment(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.error?.message || 'Failed to delete assignment');
    }
  };

  const getStatusBadge = (status: AssignmentStatus) => {
    switch (status) {
      case AssignmentStatus.DRAFT:
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case AssignmentStatus.PUBLISHED:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case AssignmentStatus.CLOSED:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case AssignmentStatus.ARCHIVED:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignment Directory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your classroom homework, coursework, deadlines, and submissions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/assignments/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Assignment
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by title, subject, or description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as AssignmentStatus);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value={AssignmentStatus.DRAFT}>Draft</option>
            <option value={AssignmentStatus.PUBLISHED}>Published</option>
            <option value={AssignmentStatus.CLOSED}>Closed</option>
            <option value={AssignmentStatus.ARCHIVED}>Archived</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as AssignmentType);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value={AssignmentType.HOMEWORK}>Homework</option>
            <option value={AssignmentType.ASSIGNMENT}>Assignment</option>
            <option value={AssignmentType.PROJECT}>Project</option>
            <option value={AssignmentType.PRACTICE}>Practice</option>
            <option value={AssignmentType.CLASSWORK}>Classwork</option>
            <option value={AssignmentType.OTHER}>Other</option>
          </select>
        </div>
      </div>

      {/* Assignment Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No assignments found</h3>
            <p className="text-sm text-gray-500 mt-1">
              Create your first assignment or adjust your filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Assignment</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Class & Subject</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Due Date</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Submissions</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {assignments.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 capitalize">
                        {item.assignmentType.toLowerCase().replace('_', ' ')} • Max Score: {item.maxScore}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-medium">
                        {item.academicClassName || 'Class'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.subjectName || 'Subject'} ({item.subjectCode || '—'})
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-900">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                        <span className="text-xs text-gray-500">at {item.dueTime || '23:59'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {item.totalSubmissions ?? 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.gradedSubmissions ?? 0} graded
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/assignments/${item.id}`}
                          title="View Details & Submissions"
                          className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {item.status === AssignmentStatus.DRAFT && (
                          <button
                            onClick={() => handlePublish(item.id)}
                            title="Publish Assignment"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {item.status === AssignmentStatus.PUBLISHED && (
                          <button
                            onClick={() => handleClose(item.id)}
                            title="Close Submissions"
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {item.status !== AssignmentStatus.ARCHIVED && (
                          <button
                            onClick={() => handleArchive(item.id)}
                            title="Archive"
                            className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}

                        <Link
                          to={`/assignments/${item.id}/edit`}
                          title="Edit Assignment"
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Delete Assignment"
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && typeof meta.totalPages === 'number' && meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Page {meta.page ?? 1} of {meta.totalPages} ({meta.total ?? 0} total items)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
