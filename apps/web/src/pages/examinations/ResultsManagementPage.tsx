import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Send,
  Eye,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import {
  useGetExamByIdQuery,
  useGetResultsQuery,
  useCalculateResultsMutation,
  useApproveResultsMutation,
  usePublishResultsMutation,
} from '../../features/examinations/examinationsApi.js';
import { useGetAcademicClassesQuery } from '../../features/academic/academicApi.js';
import { ResultStatus } from '@edusphere/common';
import { Spinner } from '../../components/ui/Spinner.js';

export const ResultsManagementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const examId = id || '';

  const [academicClassId, setAcademicClassId] = useState('');

  const { data: examRes } = useGetExamByIdQuery(examId);
  const { data: classesRes } = useGetAcademicClassesQuery();
  const {
    data: resultsRes,
    isLoading: loadingResults,
    refetch,
  } = useGetResultsQuery({ examId, academicClassId: academicClassId || undefined });

  const [calculateResults, { isLoading: isCalculating }] = useCalculateResultsMutation();
  const [approveResults, { isLoading: isApproving }] = useApproveResultsMutation();
  const [publishResults, { isLoading: isPublishing }] = usePublishResultsMutation();

  const exam = examRes?.data;
  const classes = classesRes?.data || [];
  const results = resultsRes?.data || [];

  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Aggregated Stats
  const totalStudents = results.length;
  const passedStudents = results.filter((r) => r.resultStatus === ResultStatus.PASS).length;
  const failedStudents = results.filter((r) => r.resultStatus === ResultStatus.FAIL).length;
  const passRate = totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(1) : '0.0';
  const averagePercentage =
    totalStudents > 0
      ? (results.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalStudents).toFixed(1)
      : '0.0';

  const handleCalculate = async () => {
    setActionMessage(null);
    try {
      const res = await calculateResults({
        examId,
        academicClassId: academicClassId || undefined,
      }).unwrap();
      setActionMessage({
        type: 'success',
        text: `Results calculated for ${res.data.calculatedCount} students.`,
      });
      refetch();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.data?.message || err?.message || 'Failed to calculate results',
      });
    }
  };

  const handleApprove = async () => {
    setActionMessage(null);
    if (!window.confirm('Approve all calculated results for this examination?')) return;
    try {
      const res = await approveResults({
        examId,
        academicClassId: academicClassId || undefined,
      }).unwrap();
      setActionMessage({
        type: 'success',
        text: `Results approved for ${res.data.approvedCount} students.`,
      });
      refetch();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.data?.message || err?.message || 'Failed to approve results',
      });
    }
  };

  const handlePublish = async () => {
    setActionMessage(null);
    if (
      !window.confirm(
        'PUBLISH RESULTS: This will make the results visible to students and parents. Proceed?'
      )
    ) {
      return;
    }
    try {
      const res = await publishResults({
        examId,
        academicClassId: academicClassId || undefined,
      }).unwrap();
      setActionMessage({
        type: 'success',
        text: `Published results for ${res.data.publishedCount} students. Results are now live!`,
      });
      refetch();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.data?.message || err?.message || 'Failed to publish results',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to={`/examinations/${examId}`}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Results Ledger & Publishing</h1>
            <p className="text-sm text-gray-500">
              Exam: <span className="font-semibold text-gray-800">{exam?.title}</span> &bull; Status:{' '}
              <span className="font-semibold text-indigo-600">{exam?.status}</span>
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-50"
          >
            <Calculator className="w-3.5 h-3.5 mr-1.5" />
            {isCalculating ? 'Computing...' : 'Calculate Results'}
          </button>

          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 shadow-sm disabled:opacity-50"
          >
            <FileCheck className="w-3.5 h-3.5 mr-1.5" />
            {isApproving ? 'Approving...' : 'Approve Results'}
          </button>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {isPublishing ? 'Publishing...' : 'Publish to Students'}
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-lg border text-sm flex items-center ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 mr-2" />
          ) : (
            <AlertCircle className="w-4 h-4 mr-2" />
          )}
          {actionMessage.text}
        </div>
      )}

      {/* Class Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-sm font-medium text-gray-700">Filter By Academic Class</div>
        <select
          value={academicClassId}
          onChange={(e) => setAcademicClassId(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">All Academic Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.className
                ? `${cls.className}${cls.sectionName ? ` - ${cls.sectionName}` : ''}`
                : `Class ${cls.classId || cls.id}`}
            </option>
          ))}
        </select>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Evaluated Students</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalStudents}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Passed</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{passedStudents}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Failed / Backlog</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{failedStudents}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Pass Rate</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{passRate}%</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">Average Percentage</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{averagePercentage}%</p>
        </div>
      </div>

      {/* Computed Results Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Student Examination Results ({results.length})</h2>
          {results.length > 0 && (
            <span className="text-xs text-gray-400">Version controlled with historical ledger</span>
          )}
        </div>

        {loadingResults ? (
          <div className="p-12 flex justify-center">
            <Spinner />
          </div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No calculated results available yet. Click "Calculate Results" once marks have been entered and locked.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                <tr>
                  <th className="px-4 py-3 w-16">Roll</th>
                  <th className="px-6 py-3">Student ID</th>
                  <th className="px-6 py-3">Score & Percentage</th>
                  <th className="px-4 py-3">Overall Grade</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Lifecycle State</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {r.rollNumber ?? '—'}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900 text-xs font-mono">
                      {r.studentId}
                    </td>
                    <td className="px-6 py-3 text-xs">
                      <span className="font-bold text-gray-900">{r.totalMarksObtained}</span>
                      <span className="text-gray-400"> / {r.totalMaxMarks}</span>
                      <span className="ml-2 font-semibold text-indigo-600">
                        ({r.percentage.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-purple-700">
                      {r.overallGrade}
                      {r.overallGradePoint !== undefined && (
                        <span className="text-gray-400 font-normal ml-1">
                          (GP: {r.overallGradePoint})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          r.resultStatus === ResultStatus.PASS
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {r.resultStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {r.status} (v{r.version})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/examinations/results/student/${r.studentId}?examId=${examId}`}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded text-indigo-600 hover:bg-indigo-50"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View Report
                      </Link>
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
