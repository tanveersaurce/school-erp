import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Award,
  CheckCircle,
  FileText,
  Plus,
  Play,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import {
  useGetExamByIdQuery,
  useGetExamSchedulesQuery,
  useTransitionExamStatusMutation,
  useDeleteExamScheduleMutation,
} from '../../features/examinations/examinationsApi.js';
import { ExamStatus } from '@edusphere/common';
import { Spinner } from '../../components/ui/Spinner.js';

export const ExamDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const examId = id || '';

  const { data: examRes, isLoading: loadingExam, refetch: refetchExam } = useGetExamByIdQuery(examId);
  const { data: schedulesRes, isLoading: loadingSchedules, refetch: refetchSchedules } =
    useGetExamSchedulesQuery(examId);

  const [transitionStatus, { isLoading: isTransitioning }] = useTransitionExamStatusMutation();
  const [deleteSchedule] = useDeleteExamScheduleMutation();

  const exam = examRes?.data;
  const schedules = schedulesRes?.data || [];

  const handleStatusTransition = async (nextStatus: ExamStatus) => {
    if (!window.confirm(`Transition examination status to ${nextStatus}?`)) return;
    try {
      await transitionStatus({ id: examId, status: nextStatus }).unwrap();
      refetchExam();
    } catch (err: any) {
      alert(err?.data?.message || err?.message || 'Failed to update exam status');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!window.confirm('Are you sure you want to remove this paper schedule?')) return;
    try {
      await deleteSchedule(scheduleId).unwrap();
      refetchSchedules();
    } catch (err: any) {
      alert(err?.data?.message || err?.message || 'Failed to delete schedule');
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
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loadingExam) {
    return (
      <div className="p-12 flex justify-center">
        <Spinner />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Examination not found or you do not have permission to view it.</p>
        <Link to="/examinations/list" className="text-indigo-600 font-medium mt-2 inline-block">
          &larr; Back to Examinations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/examinations/list"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                  exam.status
                )}`}
              >
                {exam.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Type: <strong className="text-gray-700">{exam.examType}</strong>
              {exam.code && <> &bull; Code: <span className="font-mono">{exam.code}</span></>}
            </p>
          </div>
        </div>

        {/* Lifecycle Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {exam.status === ExamStatus.DRAFT && (
            <button
              onClick={() => handleStatusTransition(ExamStatus.SCHEDULED)}
              disabled={isTransitioning}
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Finalize Schedule
            </button>
          )}

          {exam.status === ExamStatus.SCHEDULED && (
            <button
              onClick={() => handleStatusTransition(ExamStatus.ONGOING)}
              disabled={isTransitioning}
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Commence Exam
            </button>
          )}

          {exam.status === ExamStatus.ONGOING && (
            <button
              onClick={() => handleStatusTransition(ExamStatus.MARKS_ENTRY)}
              disabled={isTransitioning}
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <Award className="w-3.5 h-3.5 mr-1.5" />
              Open Marks Entry
            </button>
          )}

          {exam.status === ExamStatus.MARKS_ENTRY && (
            <button
              onClick={() => handleStatusTransition(ExamStatus.VERIFICATION)}
              disabled={isTransitioning}
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Start Verification
            </button>
          )}

          {exam.status === ExamStatus.VERIFICATION && (
            <button
              onClick={() => handleStatusTransition(ExamStatus.COMPLETED)}
              disabled={isTransitioning}
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Complete Exam
            </button>
          )}

          <Link
            to={`/examinations/${exam.id}/schedule`}
            className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
            Paper Schedules
          </Link>

          <Link
            to={`/examinations/${exam.id}/marks`}
            className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 shadow-sm"
          >
            <Award className="w-3.5 h-3.5 mr-1.5" />
            Marks Roster
          </Link>

          <Link
            to={`/examinations/${exam.id}/results`}
            className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Results & Publishing
          </Link>
        </div>
      </div>

      {/* Info Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Exam Window</p>
          <div className="mt-1 flex items-center text-sm font-medium text-gray-900">
            <Calendar className="w-4 h-4 mr-1.5 text-indigo-500" />
            {new Date(exam.startDate).toLocaleDateString()} &ndash;{' '}
            {new Date(exam.endDate).toLocaleDateString()}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Passing Standard</p>
          <div className="mt-1 flex items-center text-sm font-medium text-gray-900">
            <Award className="w-4 h-4 mr-1.5 text-emerald-500" />
            {exam.passingPercentage ?? 40}% Minimum
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scheduled Papers</p>
          <div className="mt-1 flex items-center text-sm font-medium text-gray-900">
            <FileText className="w-4 h-4 mr-1.5 text-blue-500" />
            {schedules.length} Papers Configured
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Classes Participating</p>
          <div className="mt-1 flex items-center text-sm font-medium text-gray-900">
            {exam.academicClassIds?.length ?? 0} Academic Classes
          </div>
        </div>
      </div>

      {/* Paper Schedules List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Exam Timetable & Papers</h2>
            <p className="text-xs text-gray-500">
              Assigned subject papers, exam timings, room allocations, and invigilators.
            </p>
          </div>
          <Link
            to={`/examinations/${exam.id}/schedule`}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Paper Schedule
          </Link>
        </div>

        {loadingSchedules ? (
          <div className="p-8 flex justify-center">
            <Spinner />
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No papers have been scheduled for this exam yet.
            <div className="mt-3">
              <Link
                to={`/examinations/${exam.id}/schedule`}
                className="text-indigo-600 font-medium text-xs hover:text-indigo-800"
              >
                Schedule the first paper &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Time Window</th>
                  <th className="px-6 py-3">Subject & Class</th>
                  <th className="px-6 py-3">Room / Venue</th>
                  <th className="px-6 py-3">Max / Pass Marks</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {schedules.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 text-xs">
                      {new Date(item.examDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-700">
                      {item.startTime} &ndash; {item.endTime}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-semibold text-gray-900">Subject ID: {item.subjectId}</div>
                      <div className="text-gray-400">Class: {item.academicClassId || item.classId}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-700">
                      {item.room || item.roomId || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-semibold text-gray-900">{item.maxMarks}</span>
                      <span className="text-gray-400"> / {item.passMarks} pass</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteSchedule(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Schedule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
