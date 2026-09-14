import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  ChevronRight,
} from 'lucide-react';
import { useGetMyAssignmentsQuery } from '../../features/assignments/assignmentsApi.js';
import { StudentAssignmentStatus } from '@edusphere/common';

export const StudentAssignmentListPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StudentAssignmentStatus | 'ALL'>('ALL');

  const { data: myAssignmentsRes, isLoading } = useGetMyAssignmentsQuery(
    activeTab === 'ALL' ? undefined : { status: activeTab }
  );

  const assignments = myAssignmentsRes?.data || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Assignments & Homework</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track deadlines, submit coursework, and view teacher grading and feedback.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2 shadow-sm overflow-x-auto">
        {(
          [
            { key: 'ALL', label: 'All Tasks' },
            { key: StudentAssignmentStatus.NOT_STARTED, label: 'To-Do / Not Started' },
            { key: StudentAssignmentStatus.IN_PROGRESS, label: 'Draft Saved' },
            { key: StudentAssignmentStatus.SUBMITTED, label: 'Submitted' },
            { key: StudentAssignmentStatus.GRADED, label: 'Graded' },
            { key: StudentAssignmentStatus.OVERDUE, label: 'Overdue' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Assignment List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
            Loading your assignments...
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900">No assignments found</h3>
            <p className="text-xs text-gray-500 mt-1">
              You do not have any assignments in this category right now.
            </p>
          </div>
        ) : (
          assignments.map((item) => {
            const a = item.assignment;
            const sub = item.submission;
            const isGraded = item.studentStatus === StudentAssignmentStatus.GRADED;
            const isOverdue = item.isOverdue;

            return (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-indigo-200 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                      {a.subjectName || 'Subject'}
                    </span>
                    <h3 className="font-bold text-gray-900 text-base">{a.title}</h3>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isGraded ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                        <Award className="w-3.5 h-3.5 mr-1" />
                        Graded: {sub?.score ?? 0} / {a.maxScore}
                      </span>
                    ) : item.studentStatus === StudentAssignmentStatus.SUBMITTED ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Submitted
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                        Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        To-Do
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-600 line-clamp-2">{a.description}</p>

                {/* Feedback preview if graded */}
                {isGraded && sub?.feedback && (
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-700">
                    <span className="font-semibold text-gray-900">Teacher Remarks: </span>
                    <span>&quot;{sub.feedback}&quot;</span>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      Due: {new Date(a.dueAt).toLocaleString()}
                    </span>
                    <span>Max Score: {a.maxScore}</span>
                  </div>

                  <Link
                    to={`/assignments/${a.id}/submit`}
                    className="inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm w-fit"
                  >
                    {isGraded
                      ? 'View Submission & Grade'
                      : sub
                        ? 'Edit / Resubmit'
                        : 'Submit Work'}
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
