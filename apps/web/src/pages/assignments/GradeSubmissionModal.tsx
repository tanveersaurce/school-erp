import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  RotateCcw,
  FileText,
  AlertCircle,
  ExternalLink,
  History,
} from 'lucide-react';
import {
  useGradeSubmissionMutation,
  useReturnSubmissionMutation,
} from '../../features/assignments/assignmentsApi.js';
import type { SubmissionResponseDto } from '@edusphere/types';

interface GradeSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  submission: SubmissionResponseDto | null;
  maxScore: number;
  onGraded: () => void;
}

export const GradeSubmissionModal: React.FC<GradeSubmissionModalProps> = ({
  isOpen,
  onClose,
  assignmentId,
  submission,
  maxScore,
  onGraded,
}) => {
  const [score, setScore] = useState<number | ''>('');
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState<'grade' | 'attempts'>('grade');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [gradeSubmission, { isLoading: grading }] = useGradeSubmissionMutation();
  const [returnSubmission, { isLoading: returning }] = useReturnSubmissionMutation();

  useEffect(() => {
    if (submission) {
      setScore(submission.score !== undefined ? submission.score : '');
      setFeedback(submission.feedback || '');
      setErrorMsg(null);
    }
  }, [submission]);

  if (!isOpen || !submission) return null;

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (score === '' || Number(score) < 0 || Number(score) > maxScore) {
      setErrorMsg(`Score must be between 0 and ${maxScore}.`);
      return;
    }

    try {
      await gradeSubmission({
        assignmentId,
        submissionId: submission.id,
        data: {
          score: Number(score),
          feedback: feedback.trim() || undefined,
        },
      }).unwrap();
      onGraded();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.error?.message || err?.message || 'Failed to grade submission');
    }
  };

  const handleReturnForRevision = async () => {
    setErrorMsg(null);
    if (!feedback.trim()) {
      setErrorMsg('Please provide constructive feedback before returning for revision.');
      return;
    }

    try {
      await returnSubmission({
        assignmentId,
        submissionId: submission.id,
        data: {
          feedback: feedback.trim(),
        },
      }).unwrap();
      onGraded();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.data?.error?.message || err?.message || 'Failed to return submission');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Grade Submission: {submission.studentName || 'Student'}
            </h2>
            <p className="text-xs text-gray-500">
              Admission: {submission.studentAdmissionNumber || '—'} • Attempt #{submission.attemptNumber || 1}
              {submission.lateSubmission && (
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-xs">
                  Late Submission
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 bg-gray-50/50 px-6">
          <button
            onClick={() => setActiveTab('grade')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'grade'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Review & Score
          </button>
          <button
            onClick={() => setActiveTab('attempts')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'attempts'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Attempt History ({submission.attempts?.length || 1})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'grade' ? (
            <>
              {/* Student Response */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                  Student Text Response
                </label>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {submission.textResponse || (
                    <span className="text-gray-400 italic">No written response entered.</span>
                  )}
                </div>
              </div>

              {/* Submitted Attachments */}
              {submission.attachments && submission.attachments.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                    Uploaded File Submissions
                  </label>
                  <div className="space-y-2">
                    {submission.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-medium text-gray-900">{att.fileName}</span>
                          <span className="text-xs text-gray-400">
                            ({Math.round((att.fileSize || 0) / 1024)} KB)
                          </span>
                        </div>
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Download / View <ExternalLink className="w-3.5 h-3.5 ml-1" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grading Input */}
              <form onSubmit={handleGradeSubmit} id="grade-form" className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Score (Out of {maxScore}) *
                  </label>
                  <div className="relative w-40">
                    <input
                      type="number"
                      required
                      min={0}
                      max={maxScore}
                      step="0.5"
                      value={score}
                      onChange={(e) => setScore(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-base font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-sm text-gray-400 font-medium">
                      / {maxScore}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Teacher Feedback / Corrections
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Commend strengths, point out miscalculations, or guide improvements..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </form>
            </>
          ) : (
            /* Attempts History Tab */
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Submission Attempt Timeline</h3>
              <div className="space-y-3">
                {submission.attempts && submission.attempts.length > 0 ? (
                  submission.attempts.map((att) => (
                    <div
                      key={att.attemptNumber}
                      className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-gray-900">
                          Attempt #{att.attemptNumber}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(att.submittedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap">{att.textResponse}</p>
                      {att.attachments && att.attachments.length > 0 && (
                        <p className="text-xs text-indigo-600 font-medium">
                          📎 {att.attachments.length} file(s) attached
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No previous attempts recorded.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            disabled={returning || grading}
            onClick={handleReturnForRevision}
            className="inline-flex items-center px-4 py-2 border border-amber-300 text-sm font-medium rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 transition disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            {returning ? 'Returning...' : 'Return for Revision'}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="grade-form"
              disabled={grading || returning}
              className="inline-flex items-center px-5 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-50"
            >
              <Award className="w-4 h-4 mr-1.5" />
              {grading ? 'Saving Grade...' : 'Save Grade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
