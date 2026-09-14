import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Edit,
  CheckCircle,
  XCircle,
  Archive,
  Users,
} from 'lucide-react';
import {
  useGetAssignmentByIdQuery,
  useGetSubmissionsQuery,
  usePublishAssignmentMutation,
  useCloseAssignmentMutation,
  useArchiveAssignmentMutation,
} from '../../features/assignments/assignmentsApi.js';
import { AssignmentStatus, AssignmentSubmissionStatus } from '@edusphere/common';
import type { SubmissionResponseDto } from '@edusphere/types';
import { GradeSubmissionModal } from './GradeSubmissionModal.js';

export const AssignmentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: assignmentRes, isLoading: loadingAssignment, refetch: refetchAssignment } =
    useGetAssignmentByIdQuery(id || '');

  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: submissionsRes, isLoading: loadingSubmissions, refetch: refetchSubmissions } =
    useGetSubmissionsQuery(
      {
        assignmentId: id || '',
        filters: statusFilter
          ? { status: statusFilter as AssignmentSubmissionStatus }
          : undefined,
      },
      { skip: !id }
    );

  const [publishAssignment] = usePublishAssignmentMutation();
  const [closeAssignment] = useCloseAssignmentMutation();
  const [archiveAssignment] = useArchiveAssignmentMutation();

  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionResponseDto | null>(null);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);

  const assignment = assignmentRes?.data;
  const submissions = submissionsRes?.data || [];

  if (loadingAssignment) {
    return <div className="p-8 text-center text-gray-500">Loading assignment details...</div>;
  }

  if (!assignment) {
    return (
      <div className="p-8 text-center space-y-3">
        <h2 className="text-xl font-bold text-gray-900">Assignment Not Found</h2>
        <Link to="/assignments/list" className="text-indigo-600 hover:underline">
          Return to assignment directory
        </Link>
      </div>
    );
  }

  const handlePublish = async () => {
    try {
      await publishAssignment(assignment.id).unwrap();
      refetchAssignment();
    } catch (err: any) {
      alert(err?.data?.error?.message || 'Failed to publish');
    }
  };

  const handleClose = async () => {
    try {
      await closeAssignment(assignment.id).unwrap();
      refetchAssignment();
    } catch (err: any) {
      alert(err?.data?.error?.message || 'Failed to close');
    }
  };

  const handleArchive = async () => {
    try {
      await archiveAssignment(assignment.id).unwrap();
      refetchAssignment();
    } catch (err: any) {
      alert(err?.data?.error?.message || 'Failed to archive');
    }
  };

  const openGradeModal = (sub: SubmissionResponseDto) => {
    setSelectedSubmission(sub);
    setIsGradeModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/assignments/list"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  assignment.status === AssignmentStatus.PUBLISHED
                    ? 'bg-emerald-50 text-emerald-700'
                    : assignment.status === AssignmentStatus.CLOSED
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-gray-100 text-gray-700'
                }`}
              >
                {assignment.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {assignment.academicClassName || 'Class'} • {assignment.subjectName || 'Subject'} •
              Teacher: {assignment.teacherName || 'Assigned Faculty'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {assignment.status === AssignmentStatus.DRAFT && (
            <button
              onClick={handlePublish}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Publish to Students
            </button>
          )}

          {assignment.status === AssignmentStatus.PUBLISHED && (
            <button
              onClick={handleClose}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Close Submissions
            </button>
          )}

          {assignment.status !== AssignmentStatus.ARCHIVED && (
            <button
              onClick={handleArchive}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200"
            >
              <Archive className="w-4 h-4 mr-1.5" />
              Archive
            </button>
          )}

          <Link
            to={`/assignments/${assignment.id}/edit`}
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            <Edit className="w-4 h-4 mr-1.5" />
            Edit
          </Link>
        </div>
      </div>

      {/* Assignment Brief & Rules Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
            Assignment Overview & Prompt
          </h2>
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {assignment.description}
          </p>

          {assignment.instructions && (
            <div className="pt-3 border-t border-gray-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Instructions / Guidelines
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.instructions}</p>
            </div>
          )}

          {/* Reference Attachments */}
          {assignment.attachments && assignment.attachments.length > 0 && (
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Attached Reference Material
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {assignment.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-indigo-50/50 hover:border-indigo-200 transition text-xs font-medium text-gray-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate">{att.fileName}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Specifications & Submission Metadata */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
            Specifications
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Max Score:</span>
              <span className="font-bold text-gray-900">{assignment.maxScore} points</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Due Date:</span>
              <span className="font-medium text-gray-900">
                {new Date(assignment.dueDate).toLocaleDateString()} at {assignment.dueTime || '23:59'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Delivery Format:</span>
              <span className="font-medium text-gray-900 text-xs">
                {assignment.submissionType.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Late Policy:</span>
              <span className="font-medium text-gray-900">
                {assignment.allowLateSubmission ? (
                  <span className="text-amber-600 font-semibold">
                    Allowed ({assignment.latePolicy?.deductionPercentage ?? 10}% / day)
                  </span>
                ) : (
                  <span className="text-red-600">Strict (No Late Submissions)</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions Roster */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Student Submissions Roster</h2>
            <p className="text-xs text-gray-500">
              Review turned-in coursework, evaluate proofs, assign grades, and provide feedback.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Submission Statuses</option>
              <option value={AssignmentSubmissionStatus.SUBMITTED}>Submitted</option>
              <option value={AssignmentSubmissionStatus.GRADED}>Graded</option>
              <option value={AssignmentSubmissionStatus.LATE}>Late</option>
              <option value={AssignmentSubmissionStatus.DRAFT}>Draft</option>
              <option value={AssignmentSubmissionStatus.RETURNED}>Returned</option>
            </select>
          </div>
        </div>

        {loadingSubmissions ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900">No submissions found</h3>
            <p className="text-xs text-gray-500 mt-1">
              No students have submitted work matching the filter yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Student</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Submitted At</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Attempt</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Score</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {sub.studentName || 'Student'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Adm: {sub.studentAdmissionNumber || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          sub.status === AssignmentSubmissionStatus.GRADED
                            ? 'bg-emerald-50 text-emerald-700'
                            : sub.status === AssignmentSubmissionStatus.LATE
                              ? 'bg-amber-50 text-amber-700'
                              : sub.status === AssignmentSubmissionStatus.RETURNED
                                ? 'bg-purple-50 text-purple-700'
                                : sub.status === AssignmentSubmissionStatus.DRAFT
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {sub.status}
                        {sub.lateSubmission && sub.status !== AssignmentSubmissionStatus.LATE && (
                          <span className="ml-1 text-[10px] text-amber-600">(Late)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {sub.submittedAt
                        ? new Date(sub.submittedAt).toLocaleString()
                        : 'Draft saved'}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-gray-700">
                      #{sub.attemptNumber || 1}
                    </td>
                    <td className="px-6 py-4">
                      {sub.score !== undefined ? (
                        <span className="font-bold text-emerald-700">
                          {sub.score} / {assignment.maxScore}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not graded</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openGradeModal(sub)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                      >
                        {sub.status === AssignmentSubmissionStatus.GRADED ? 'Update Grade' : 'Grade'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grade / Feedback Modal */}
      <GradeSubmissionModal
        isOpen={isGradeModalOpen}
        onClose={() => setIsGradeModalOpen(false)}
        assignmentId={assignment.id}
        submission={selectedSubmission}
        maxScore={assignment.maxScore}
        onGraded={() => {
          refetchSubmissions();
          refetchAssignment();
        }}
      />
    </div>
  );
};
