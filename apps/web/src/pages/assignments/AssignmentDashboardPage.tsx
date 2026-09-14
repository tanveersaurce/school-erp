import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Clock,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  Users,
  ChevronRight,
  Send,
  FileText,
  Award,
} from 'lucide-react';
import { useAppSelector } from '../../store/index.js';
import {
  useGetTeacherDashboardQuery,
  useGetStudentDashboardQuery,
} from '../../features/assignments/assignmentsApi.js';
import { UserType, AssignmentSubmissionStatus } from '@edusphere/common';

export const AssignmentDashboardPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isStudent = user?.userType === UserType.STUDENT;
  const isParent = user?.userType === UserType.PARENT;

  const { data: teacherDataRes, isLoading: loadingTeacher } = useGetTeacherDashboardQuery(
    undefined,
    { skip: isStudent || isParent }
  );

  const { data: studentDataRes, isLoading: loadingStudent } = useGetStudentDashboardQuery(
    undefined,
    { skip: !isStudent }
  );

  const teacherData = teacherDataRes?.data;
  const studentData = studentDataRes?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homework & Assignments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Publish tasks, enforce deadlines & late policies, collect student submissions, and grade work.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isStudent ? (
            <Link
              to="/assignments/student"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <FileCheck className="w-4 h-4 mr-2" />
              My Assignments
            </Link>
          ) : isParent ? (
            <Link
              to="/assignments/parent"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <Users className="w-4 h-4 mr-2" />
              Child Homework
            </Link>
          ) : (
            <>
              <Link
                to="/assignments/list"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
              >
                <BookOpen className="w-4 h-4 mr-2 text-gray-500" />
                All Assignments
              </Link>
              <Link
                to="/assignments/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Assignment
              </Link>
            </>
          )}
        </div>
      </div>

      {/* STUDENT DASHBOARD VIEW */}
      {isStudent && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    To-Do / Upcoming
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loadingStudent ? '...' : studentData?.upcomingCount ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Overdue
                  </p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {loadingStudent ? '...' : studentData?.overdueCount ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl text-red-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Submitted
                  </p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">
                    {loadingStudent ? '...' : studentData?.submittedCount ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <Send className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Average Score
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {loadingStudent
                      ? '...'
                      : studentData?.averageScorePercentage !== undefined
                        ? `${studentData.averageScorePercentage}%`
                        : 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                  <Award className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Tasks & Recent Feedback */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Assignments */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Upcoming Assignments</h3>
                <Link
                  to="/assignments/student"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View All
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {studentData?.upcomingAssignments && studentData.upcomingAssignments.length > 0 ? (
                  studentData.upcomingAssignments.map((item) => (
                    <div
                      key={item.assignment.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                            {item.assignment.subjectName || 'Subject'}
                          </span>
                          <span className="font-medium text-gray-900 text-sm">
                            {item.assignment.title}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Due: {new Date(item.assignment.dueAt).toLocaleString()}
                        </p>
                      </div>
                      <Link
                        to={`/assignments/${item.assignment.id}/submit`}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                      >
                        Submit
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No pending assignments. You are all caught up!
                  </div>
                )}
              </div>
            </div>

            {/* Recent Graded Feedback */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Recent Graded Work & Feedback</h3>
                <Link
                  to="/assignments/student"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View All
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {studentData?.recentFeedback && studentData.recentFeedback.length > 0 ? (
                  studentData.recentFeedback.map((item) => (
                    <div key={item.assignment.id} className="p-4 space-y-2 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 text-sm">
                          {item.assignment.title}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          {item.submission?.score ?? 0} / {item.assignment.maxScore}
                        </span>
                      </div>
                      {item.submission?.feedback && (
                        <p className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded">
                          &quot;{item.submission.feedback}&quot;
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No recent graded assignments.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* TEACHER / STAFF DASHBOARD VIEW */}
      {!isStudent && !isParent && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Active Published
                  </p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">
                    {loadingTeacher ? '...' : teacherData?.totalPublished ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Pending Grading
                  </p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">
                    {loadingTeacher ? '...' : teacherData?.pendingGradingCount ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Drafts
                  </p>
                  <p className="text-2xl font-bold text-gray-700 mt-1">
                    {loadingTeacher ? '...' : teacherData?.totalDrafts ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl text-gray-600">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Closed / Past Due
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {loadingTeacher ? '...' : teacherData?.totalClosed ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Deadlines & Recent Submissions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Deadlines Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Upcoming Deadlines</h3>
                <Link
                  to="/assignments/list"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Manage All
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {teacherData?.upcomingDeadlines && teacherData.upcomingDeadlines.length > 0 ? (
                  teacherData.upcomingDeadlines.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                            {item.academicClassName}
                          </span>
                          <span className="font-medium text-gray-900 text-sm">{item.title}</span>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                          <span>{item.subjectName}</span>
                          <span>•</span>
                          <span>Due: {new Date(item.dueAt).toLocaleString()}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-gray-700">
                          {item.totalSubmissions} / {item.enrolledCount} Submissions
                        </span>
                        <div>
                          <Link
                            to={`/assignments/${item.id}`}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center mt-1"
                          >
                            Review <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No active assignments due soon.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Submissions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Recent Student Submissions</h3>
                <Link
                  to="/assignments/list"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View All
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {teacherData?.recentSubmissions && teacherData.recentSubmissions.length > 0 ? (
                  teacherData.recentSubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">
                            {sub.studentName || 'Student'}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              sub.status === AssignmentSubmissionStatus.GRADED
                                ? 'bg-emerald-50 text-emerald-700'
                                : sub.lateSubmission
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {sub.status} {sub.lateSubmission && '(Late)'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {sub.assignmentTitle} •{' '}
                          {sub.submittedAt
                            ? new Date(sub.submittedAt).toLocaleString()
                            : 'Not submitted'}
                        </p>
                      </div>
                      <Link
                        to={`/assignments/${sub.assignmentId}`}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
                      >
                        Grade
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No recent submissions to display.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
