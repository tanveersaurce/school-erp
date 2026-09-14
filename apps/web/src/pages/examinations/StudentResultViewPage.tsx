import React from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  GraduationCap,
  Award,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  useGetMyResultsQuery,
  useGetStudentResultsQuery,
} from '../../features/examinations/examinationsApi.js';
import { useAppSelector } from '../../store/index.js';
import { UserType, ResultStatus } from '@edusphere/common';
import { Spinner } from '../../components/ui/Spinner.js';

export const StudentResultViewPage: React.FC = () => {
  const { studentId } = useParams<{ studentId?: string }>();
  const [searchParams] = useSearchParams();
  const examId = searchParams.get('examId') || undefined;

  const { user } = useAppSelector((state) => state.auth);
  const isStudentSelf = !studentId || user?.userType === UserType.STUDENT;

  // Use getMyResults if it's the student self-view, otherwise getStudentResults
  const { data: myResultsRes, isLoading: loadingMyResults } = useGetMyResultsQuery(
    { examId },
    { skip: !isStudentSelf }
  );

  const { data: studentResultsRes, isLoading: loadingStudentResults } = useGetStudentResultsQuery(
    { studentId: studentId || '', examId },
    { skip: isStudentSelf || !studentId }
  );

  const results = isStudentSelf ? myResultsRes?.data || [] : studentResultsRes?.data || [];
  const isLoading = isStudentSelf ? loadingMyResults : loadingStudentResults;

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Spinner />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center bg-white rounded-xl border border-gray-200 mt-8">
        <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">No Published Results Available</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          Examination results have either not yet been calculated, approved, or officially published
          by the administration.
        </p>
        <div className="mt-6">
          <Link
            to="/examinations"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link
          to="/examinations"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Official Student Performance Report</h1>
          <p className="text-sm text-gray-500">
            Certified academic ledger and evaluation scorecard.
          </p>
        </div>
      </div>

      {results.map((result) => {
        const isPassed = result.resultStatus === ResultStatus.PASS;
        return (
          <div
            key={result.id}
            className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden"
          >
            {/* Card Top Banner */}
            <div className="bg-slate-900 text-white p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                    <Award className="w-4 h-4" />
                    <span>Official Examination Statement</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold mt-1 text-white">
                    Examination Report Card
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Exam Reference: <span className="font-mono">{result.examId}</span>
                  </p>
                </div>

                <div className="text-right self-start sm:self-center">
                  <span
                    className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${
                      isPassed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-1.5" />
                    )}
                    {result.resultStatus}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    Published: {result.publishedAt ? new Date(result.publishedAt).toLocaleDateString() : 'Official'}
                  </p>
                </div>
              </div>

              {/* Student Bio Quick Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">Student ID</span>
                  <p className="font-mono font-semibold text-white mt-0.5">{result.studentId}</p>
                </div>
                <div>
                  <span className="text-slate-400">Roll Number</span>
                  <p className="font-semibold text-white mt-0.5">{result.rollNumber ?? 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Academic Class</span>
                  <p className="font-semibold text-white mt-0.5">{result.academicClassId}</p>
                </div>
                <div>
                  <span className="text-slate-400">Ledger Version</span>
                  <p className="font-mono font-semibold text-indigo-300 mt-0.5">v{result.version}</p>
                </div>
              </div>
            </div>

            {/* Subject Breakdown Table */}
            <div className="p-6 sm:p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700 mb-3">
                Subject-Wise Score Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 border-y border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                    <tr>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3 text-center">Max Marks</th>
                      <th className="px-4 py-3 text-center">Pass Marks</th>
                      <th className="px-4 py-3 text-center">Marks Obtained</th>
                      <th className="px-4 py-3 text-center">Percentage</th>
                      <th className="px-4 py-3 text-center">Grade</th>
                      <th className="px-4 py-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {result.subjectResults.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {sub.subjectName}
                          {sub.subjectCode && (
                            <span className="ml-1 text-xs text-gray-400 font-mono font-normal">
                              ({sub.subjectCode})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{sub.maxMarks}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{sub.passMarks}</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900">
                          {sub.marksObtained !== null && sub.marksObtained !== undefined
                            ? sub.marksObtained
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-gray-700">
                          {sub.percentage.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-indigo-600">
                          {sub.grade}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${
                              sub.isPassed
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {sub.isPassed ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Summary Footer */}
              <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-6">
                <div>
                  <span className="text-xs uppercase font-semibold text-gray-500">
                    Aggregate Score
                  </span>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">
                    {result.totalMarksObtained}{' '}
                    <span className="text-sm font-normal text-gray-500">
                      / {result.totalMaxMarks}
                    </span>
                  </p>
                </div>

                <div>
                  <span className="text-xs uppercase font-semibold text-gray-500">
                    Overall Percentage
                  </span>
                  <p className="text-2xl font-extrabold text-indigo-600 mt-1">
                    {result.percentage.toFixed(1)}%
                  </p>
                </div>

                <div>
                  <span className="text-xs uppercase font-semibold text-gray-500">
                    Cumulative Grade
                  </span>
                  <p className="text-2xl font-extrabold text-purple-600 mt-1">
                    {result.overallGrade}
                    {result.overallGradePoint !== undefined && (
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        (GPA: {result.overallGradePoint})
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-xs uppercase font-semibold text-gray-500">
                    Academic Standing
                  </span>
                  <p
                    className={`text-2xl font-extrabold mt-1 ${
                      isPassed ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {isPassed ? 'QUALIFIED' : 'NEEDS IMPROVEMENT'}
                  </p>
                </div>
              </div>

              {result.failedSubjectCount > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <strong>Notice:</strong> Student has {result.failedSubjectCount} failed/backlog
                  subject(s) in this examination.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
