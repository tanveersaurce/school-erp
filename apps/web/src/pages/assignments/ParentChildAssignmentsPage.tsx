import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
} from 'lucide-react';
import { useGetMyChildrenQuery } from '../../features/student/studentApi.js';
import { useGetChildAssignmentsQuery } from '../../features/assignments/assignmentsApi.js';
import { StudentAssignmentStatus } from '@edusphere/common';
import type { StudentDto } from '@edusphere/types';

export const ParentChildAssignmentsPage: React.FC = () => {
  const { data: childrenRes, isLoading: loadingChildren } = useGetMyChildrenQuery();
  const children: StudentDto[] = Array.isArray(childrenRes?.data) ? childrenRes.data : [];

  const [selectedChildId, setSelectedChildId] = useState<string>('');

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const { data: childAssignmentsRes, isLoading: loadingAssignments } = useGetChildAssignmentsQuery(
    { studentId: selectedChildId },
    { skip: !selectedChildId }
  );

  const assignments = childAssignmentsRes?.data || [];
  const selectedChild = children.length > 0 ? children.find((c) => c.id === selectedChildId) : undefined;

  if (loadingChildren) {
    return <div className="p-8 text-center text-gray-500">Loading parent portal...</div>;
  }

  if (children.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-900">No Linked Children</h3>
        <p className="text-xs text-gray-500 mt-1">
          Your parent account does not currently have any active student profiles attached.
        </p>
      </div>
    );
  }

  const pendingCount = assignments.filter(
    (a) =>
      a.studentStatus === StudentAssignmentStatus.NOT_STARTED ||
      a.studentStatus === StudentAssignmentStatus.IN_PROGRESS
  ).length;
  const submittedCount = assignments.filter(
    (a) => a.studentStatus === StudentAssignmentStatus.SUBMITTED
  ).length;
  const gradedCount = assignments.filter(
    (a) => a.studentStatus === StudentAssignmentStatus.GRADED
  ).length;
  const overdueCount = assignments.filter((a) => a.isOverdue).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Child Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parent Portal — Child Homework</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor assignments, submission deadlines, teacher evaluations, and academic feedback.
          </p>
        </div>

        {/* Child Selector */}
        {children.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">Select Child:</label>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.personalDetails?.firstName} {c.personalDetails?.lastName} (
                  {c.admissionNumber})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Selected Child Overview Card */}
      {selectedChild && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-base">
              {selectedChild.personalDetails?.firstName?.charAt(0) || 'S'}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {selectedChild.personalDetails?.firstName} {selectedChild.personalDetails?.lastName}
              </h2>
              <p className="text-xs text-gray-500">
                Admission: {selectedChild.admissionNumber} • Student ID: {selectedChild.studentId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg font-semibold">
              {pendingCount} Pending
            </span>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-semibold">
              {submittedCount} Submitted
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-semibold">
              {gradedCount} Graded
            </span>
            {overdueCount > 0 && (
              <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg font-semibold">
                {overdueCount} Overdue
              </span>
            )}
          </div>
        </div>
      )}

      {/* Homework List */}
      <div className="space-y-4">
        {loadingAssignments ? (
          <div className="p-12 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
            Loading child assignments...
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900">No assignments assigned</h3>
            <p className="text-xs text-gray-500 mt-1">
              There are no active homework or project assignments currently assigned to your child.
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
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                      {a.subjectName || 'Subject'}
                    </span>
                    <h3 className="font-bold text-gray-900 text-base">{a.title}</h3>
                  </div>

                  <div>
                    {isGraded ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                        <Award className="w-3.5 h-3.5 mr-1" />
                        Score: {sub?.score} / {a.maxScore}
                      </span>
                    ) : item.studentStatus === StudentAssignmentStatus.SUBMITTED ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Submitted ({new Date(sub?.submittedAt || '').toLocaleDateString()})
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                        Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        Due Soon
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-600 line-clamp-2">{a.description}</p>

                {/* Teacher Feedback */}
                {isGraded && sub?.feedback && (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg text-xs text-gray-800">
                    <span className="font-semibold text-emerald-900">Teacher Evaluation: </span>
                    <span>&quot;{sub.feedback}&quot;</span>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      Due Date: {new Date(a.dueAt).toLocaleString()}
                    </span>
                    <span>Max Score: {a.maxScore}</span>
                  </div>

                  <span className="text-gray-400">
                    Faculty: {a.teacherName || 'Subject Teacher'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
