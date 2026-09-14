import React from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Plus,
  ArrowRight,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Users,
  Eye,
} from 'lucide-react';
import { useAppSelector } from '../../store/index.js';
import { UserType, ExamStatus } from '@edusphere/common';
import {
  useGetExamDashboardKPIsQuery,
  useGetExamsQuery,
} from '../../features/examinations/examinationsApi.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const ExamDashboardPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isStudent = user?.userType === UserType.STUDENT;
  const isParent = user?.userType === UserType.PARENT;

  const { data: kpiRes, isLoading: loadingKpis } = useGetExamDashboardKPIsQuery(undefined, {
    skip: isStudent || isParent,
  });

  const { data: examsRes, isLoading: loadingExams } = useGetExamsQuery(
    { limit: 5 },
    { skip: isStudent || isParent }
  );

  const kpis = kpiRes?.data;
  const recentExams = examsRes?.data || [];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Examination & Results Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Conduct multi-class exams, manage room & invigilator timetables, enter marks, and publish approved results.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isStudent ? (
            <Link
              to="/examinations/my-results"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              My Results
            </Link>
          ) : isParent ? (
            <Link
              to="/examinations/my-results"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <Users className="w-4 h-4 mr-2" />
              Child Report Cards
            </Link>
          ) : (
            <>
              <Link
                to="/examinations/list"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
              >
                <BookOpen className="w-4 h-4 mr-2 text-gray-500" />
                All Exams
              </Link>
              <Link
                to="/examinations/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Exam
              </Link>
            </>
          )}
        </div>
      </div>

      {/* STUDENT / PARENT VIEW */}
      {(isStudent || isParent) && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-2xl mx-auto shadow-sm my-12">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {isStudent ? 'Academic Performance & Results' : 'Student Academic Reports'}
          </h2>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            View officially published examination results, subject-wise marks, percentages, and grade cards.
          </p>
          <div className="mt-6">
            <Link
              to="/examinations/my-results"
              className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Published Results
            </Link>
          </div>
        </div>
      )}

      {/* STAFF / TEACHER / ADMIN VIEW */}
      {!isStudent && !isParent && (
        <>
          {/* KPI Cards */}
          {loadingKpis ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Total Exams
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {kpis?.totalExams ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Scheduled
                    </p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {kpis?.scheduledExams ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Ongoing
                    </p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                      {kpis?.ongoingExams ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Results Pending
                    </p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">
                      {kpis?.resultsPending ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Published
                    </p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      {kpis?.publishedExams ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Link
              to="/examinations/list"
              className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 flex items-center">
                Schedule & Timetable
                <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Configure exam papers, assign classrooms & invigilators with automated clash detection.
              </p>
            </Link>

            <Link
              to="/examinations/list"
              className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 flex items-center">
                Marks Entry & Roster
                <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Enter student scores, mark attendance status, verify entries, and enforce cryptographic-like locks.
              </p>
            </Link>

            <Link
              to="/examinations/list"
              className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-semibold text-gray-900 flex items-center">
                Results Approval & Publishing
                <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Aggregate subject totals, calculate grades, verify institutional pass metrics, and publish securely.
              </p>
            </Link>
          </div>

          {/* Recent Exams Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Recent Examinations</h2>
              <Link
                to="/examinations/list"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View all exams &rarr;
              </Link>
            </div>

            {loadingExams ? (
              <div className="p-8 flex justify-center">
                <Spinner />
              </div>
            ) : recentExams.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No examinations found. Create your first exam cycle to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                    <tr>
                      <th className="px-6 py-3">Exam Title</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Start Date</th>
                      <th className="px-6 py-3">End Date</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentExams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-gray-50/75 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {exam.title}
                          {exam.code && (
                            <span className="ml-2 text-xs font-normal text-gray-400">
                              ({exam.code})
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-600">
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
                          {new Date(exam.startDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {new Date(exam.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/examinations/${exam.id}`}
                            className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
