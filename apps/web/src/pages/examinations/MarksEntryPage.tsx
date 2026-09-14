import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Lock,
  CheckCircle,
  Save,
  AlertCircle,
  Edit,
  ShieldAlert,
  FileCheck,
} from 'lucide-react';
import {
  useGetExamByIdQuery,
  useGetMarksRosterQuery,
  useEnterBulkMarksMutation,
  useVerifyMarksMutation,
  useLockMarksMutation,
  useRequestMarkCorrectionMutation,
} from '../../features/examinations/examinationsApi.js';
import { useGetAcademicClassesQuery, useGetSubjectsQuery } from '../../features/academic/academicApi.js';
import { MarkStatus } from '@edusphere/common';
import { Spinner } from '../../components/ui/Spinner.js';

interface EditableEntry {
  studentId: string;
  name: string;
  rollNumber?: number;
  admissionNumber?: string;
  markId?: string;
  marksObtained: string;
  status: MarkStatus;
  grade?: string;
  remarks: string;
  isLocked?: boolean;
}

export const MarksEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const examId = id || searchParams.get('examId') || '';

  const [selectedClassId, setSelectedClassId] = useState(searchParams.get('classId') || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(searchParams.get('subjectId') || '');

  const { data: examRes } = useGetExamByIdQuery(examId, { skip: !examId });
  const { data: academicClassesRes } = useGetAcademicClassesQuery();
  const { data: subjectsRes } = useGetSubjectsQuery();

  const {
    data: rosterRes,
    isLoading: loadingRoster,
    refetch: refetchRoster,
  } = useGetMarksRosterQuery(
    { examId, academicClassId: selectedClassId, subjectId: selectedSubjectId },
    { skip: !examId || !selectedClassId || !selectedSubjectId }
  );

  const [enterBulkMarks, { isLoading: isSaving }] = useEnterBulkMarksMutation();
  const [verifyMarks, { isLoading: isVerifying }] = useVerifyMarksMutation();
  const [lockMarks, { isLoading: isLocking }] = useLockMarksMutation();
  const [requestCorrection, { isLoading: isSubmittingCorrection }] = useRequestMarkCorrectionMutation();

  const exam = examRes?.data;
  const academicClasses = academicClassesRes?.data || [];
  const subjects = subjectsRes?.data || [];
  const rosterData = rosterRes?.data;

  const [entries, setEntries] = useState<EditableEntry[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Correction Modal State
  const [correctionTarget, setCorrectionTarget] = useState<EditableEntry | null>(null);
  const [correctionNewMarks, setCorrectionNewMarks] = useState('');
  const [correctionStatus, setCorrectionStatus] = useState<MarkStatus>(MarkStatus.PRESENT);
  const [correctionReason, setCorrectionReason] = useState('');

  useEffect(() => {
    if (rosterData?.students) {
      setEntries(
        rosterData.students.map((s) => ({
          studentId: s.studentId,
          name: s.name,
          rollNumber: s.rollNumber,
          admissionNumber: s.admissionNumber,
          markId: s.markId,
          marksObtained: s.marksObtained !== null && s.marksObtained !== undefined ? String(s.marksObtained) : '',
          status: s.status || MarkStatus.NOT_ENTERED,
          grade: s.grade,
          remarks: s.remarks || '',
          isLocked: s.isLocked,
        }))
      );
    }
  }, [rosterData]);

  const handleMarkChange = (studentId: string, val: string) => {
    setEntries((prev) =>
      prev.map((item) => {
        if (item.studentId !== studentId) return item;
        const numVal = Number(val);
        const max = rosterData?.maxMarks ?? 100;
        let newStatus = item.status;
        if (val !== '' && !isNaN(numVal) && numVal >= 0 && numVal <= max) {
          newStatus = MarkStatus.ENTERED;
        }
        return {
          ...item,
          marksObtained: val,
          status: newStatus,
        };
      })
    );
  };

  const handleStatusChange = (studentId: string, newStatus: MarkStatus) => {
    setEntries((prev) =>
      prev.map((item) => {
        if (item.studentId !== studentId) return item;
        return {
          ...item,
          status: newStatus,
          marksObtained: newStatus === MarkStatus.ABSENT ? '0' : item.marksObtained,
        };
      })
    );
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setEntries((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, remarks } : item))
    );
  };

  const handleSaveDraft = async () => {
    setSuccessMsg('');
    setErrorMsg('');
    if (!examId || !selectedClassId || !selectedSubjectId) return;

    try {
      const payloadEntries = entries.map((e) => ({
        studentId: e.studentId,
        marksObtained: e.marksObtained !== '' ? Number(e.marksObtained) : null,
        status: e.status,
        remarks: e.remarks || undefined,
      }));

      await enterBulkMarks({
        examId,
        academicClassId: selectedClassId,
        subjectId: selectedSubjectId,
        maxMarks: rosterData?.maxMarks ?? 100,
        passMarks: rosterData?.passMarks ?? 40,
        entries: payloadEntries,
      }).unwrap();

      setSuccessMsg('Student marks saved successfully.');
      refetchRoster();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err?.message || 'Failed to save marks');
    }
  };

  const handleVerify = async () => {
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await verifyMarks({
        examId,
        academicClassId: selectedClassId,
        subjectId: selectedSubjectId,
      }).unwrap();
      setSuccessMsg('Marks verified successfully.');
      refetchRoster();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err?.message || 'Failed to verify marks');
    }
  };

  const handleLock = async () => {
    if (
      !window.confirm(
        'Are you sure you want to LOCK these marks? Once locked, edits will require formal audit correction requests.'
      )
    ) {
      return;
    }
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await lockMarks({
        examId,
        academicClassId: selectedClassId,
        subjectId: selectedSubjectId,
      }).unwrap();
      setSuccessMsg('Marks locked successfully.');
      refetchRoster();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err?.message || 'Failed to lock marks');
    }
  };

  const handleOpenCorrection = (entry: EditableEntry) => {
    setCorrectionTarget(entry);
    setCorrectionNewMarks(entry.marksObtained);
    setCorrectionStatus(entry.status);
    setCorrectionReason('');
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget?.markId) {
      alert('Cannot request correction: No existing mark record found.');
      return;
    }
    if (!correctionReason.trim()) {
      alert('A valid reason is required for mark correction auditing.');
      return;
    }

    try {
      await requestCorrection({
        markId: correctionTarget.markId,
        data: {
          newMarks: correctionNewMarks !== '' ? Number(correctionNewMarks) : null,
          newStatus: correctionStatus,
          reason: correctionReason,
        },
      }).unwrap();

      alert('Mark correction requested. It will be reviewed by the authorized verifier.');
      setCorrectionTarget(null);
      refetchRoster();
    } catch (err: any) {
      alert(err?.data?.message || err?.message || 'Failed to request mark correction');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to={examId ? `/examinations/${examId}` : '/examinations/list'}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marks Roster & Grade Entry</h1>
            <p className="text-sm text-gray-500">
              Exam: <span className="font-semibold text-gray-800">{exam?.title || 'Selected Exam'}</span>
            </p>
          </div>
        </div>

        {rosterData && (
          <div className="flex items-center gap-2">
            {rosterData.isSubjectLocked ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                <Lock className="w-3.5 h-3.5 mr-1" />
                Locked & Sealed
              </span>
            ) : rosterData.isSubjectVerified ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                <FileCheck className="w-3.5 h-3.5 mr-1" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Edit className="w-3.5 h-3.5 mr-1" />
                Draft / In-Progress
              </span>
            )}
          </div>
        )}
      </div>

      {/* Selectors Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Academic Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Select Academic Class</option>
            {academicClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.className
                  ? `${cls.className}${cls.sectionName ? ` - ${cls.sectionName}` : ''}`
                  : `Class ${cls.classId || cls.id}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Subject
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Select Subject</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} ({sub.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-center">
          <CheckCircle className="w-4 h-4 mr-2" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          {errorMsg}
        </div>
      )}

      {/* Roster Sheet */}
      {loadingRoster ? (
        <div className="p-12 flex justify-center bg-white rounded-xl border border-gray-200">
          <Spinner />
        </div>
      ) : !selectedClassId || !selectedSubjectId ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm">Please choose an Academic Class and Subject to load the student roster.</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <p className="text-sm">No enrolled students found in this class.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs text-gray-600">
              <div>
                Max Marks: <strong className="text-gray-900">{rosterData?.maxMarks}</strong>
              </div>
              <div>
                Pass Marks: <strong className="text-gray-900">{rosterData?.passMarks}</strong>
              </div>
              <div>
                Enrolled Students: <strong className="text-gray-900">{entries.length}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!rosterData?.isSubjectLocked && (
                <>
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </button>

                  <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="inline-flex items-center px-4 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    {isVerifying ? 'Verifying...' : 'Verify Marks'}
                  </button>

                  <button
                    onClick={handleLock}
                    disabled={isLocking}
                    className="inline-flex items-center px-4 py-1.5 border border-red-300 text-xs font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 shadow-sm disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1" />
                    {isLocking ? 'Locking...' : 'Lock Marks'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-100/75 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                <tr>
                  <th className="px-4 py-3 w-16">Roll</th>
                  <th className="px-6 py-3">Student Name</th>
                  <th className="px-4 py-3 w-32">Status</th>
                  <th className="px-4 py-3 w-32">Marks Obtained</th>
                  <th className="px-4 py-3 w-24">Grade</th>
                  <th className="px-6 py-3">Remarks</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry) => {
                  const isRowLocked = rosterData?.isSubjectLocked || entry.isLocked;
                  return (
                    <tr key={entry.studentId} className="hover:bg-gray-50/75 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">
                        {entry.rollNumber ?? '—'}
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-900 text-sm">
                        {entry.name}
                        {entry.admissionNumber && (
                          <span className="block text-xs font-mono text-gray-400 font-normal">
                            Adm: {entry.admissionNumber}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled={isRowLocked}
                          value={entry.status}
                          onChange={(e) =>
                            handleStatusChange(entry.studentId, e.target.value as MarkStatus)
                          }
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
                        >
                          <option value={MarkStatus.ENTERED}>PRESENT</option>
                          <option value={MarkStatus.ABSENT}>ABSENT</option>
                          <option value={MarkStatus.EXEMPT}>EXEMPT</option>
                          <option value={MarkStatus.NOT_ENTERED}>NOT ENTERED</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          max={rosterData?.maxMarks ?? 100}
                          disabled={isRowLocked || entry.status === MarkStatus.ABSENT}
                          value={entry.marksObtained}
                          onChange={(e) => handleMarkChange(entry.studentId, e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1 text-sm font-semibold border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-indigo-600">
                        {entry.grade || '—'}
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          disabled={isRowLocked}
                          value={entry.remarks}
                          onChange={(e) => handleRemarksChange(entry.studentId, e.target.value)}
                          placeholder="Optional notes"
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isRowLocked && entry.markId && (
                          <button
                            onClick={() => handleOpenCorrection(entry)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Request Mark Correction"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                            Correct
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mark Correction Modal */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2 text-indigo-600" />
                Request Post-Lock Correction
              </h3>
              <button
                onClick={() => setCorrectionTarget(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="space-y-4">
              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                Student: <strong className="text-gray-900">{correctionTarget.name}</strong>
                <br />
                Current Score: <strong>{correctionTarget.marksObtained || '0'}</strong> /{' '}
                {rosterData?.maxMarks}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Corrected Marks
                </label>
                <input
                  type="number"
                  min={0}
                  max={rosterData?.maxMarks ?? 100}
                  required
                  value={correctionNewMarks}
                  onChange={(e) => setCorrectionNewMarks(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Reason for Correction (Audited) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="State clear reason for discrepancy (e.g. re-evaluation of paper, tabulation error)..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectionTarget(null)}
                  className="px-4 py-2 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorrection}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmittingCorrection ? 'Submitting...' : 'Submit Correction Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
