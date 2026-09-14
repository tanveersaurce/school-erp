import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Award,
  Send,
  Save,
  FileText,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import {
  useGetAssignmentByIdQuery,
  useGetMyAssignmentsQuery,
  useSaveDraftSubmissionMutation,
  useSubmitAssignmentMutation,
} from '../../features/assignments/assignmentsApi.js';
import { AssignmentSubmissionStatus } from '@edusphere/common';
import type { IAssignmentAttachment } from '@edusphere/types';

export const StudentAssignmentSubmitPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: assignmentRes, isLoading: loadingAssignment } = useGetAssignmentByIdQuery(id || '');
  const { data: myAssignmentsRes, refetch: refetchMyAssignments } = useGetMyAssignmentsQuery();

  const [saveDraft, { isLoading: savingDraft }] = useSaveDraftSubmissionMutation();
  const [submitAssignment, { isLoading: submitting }] = useSubmitAssignmentMutation();

  const assignment = assignmentRes?.data;
  const currentSummary = myAssignmentsRes?.data?.find((s) => s.assignment.id === id);
  const existingSubmission = currentSummary?.submission;

  const [textResponse, setTextResponse] = useState('');
  const [attachments, setAttachments] = useState<IAssignmentAttachment[]>([]);
  const [newAttName, setNewAttName] = useState('');
  const [newAttUrl, setNewAttUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (existingSubmission) {
      setTextResponse(existingSubmission.textResponse || '');
      setAttachments(existingSubmission.attachments || []);
    }
  }, [existingSubmission]);

  if (loadingAssignment) {
    return <div className="p-8 text-center text-gray-500">Loading assignment prompt...</div>;
  }

  if (!assignment) {
    return (
      <div className="p-8 text-center space-y-3">
        <h2 className="text-xl font-bold text-gray-900">Assignment Not Found</h2>
        <Link to="/assignments/student" className="text-indigo-600 hover:underline">
          Return to assignments
        </Link>
      </div>
    );
  }

  const isGraded = existingSubmission?.status === AssignmentSubmissionStatus.GRADED;
  const isPastDue = new Date() > new Date(assignment.dueAt);
  const canSubmit = !isGraded && (!isPastDue || assignment.allowLateSubmission);

  const handleAddAttachment = () => {
    if (!newAttName.trim() || !newAttUrl.trim()) return;
    const att: IAssignmentAttachment = {
      id: `stu_att_${Date.now()}`,
      fileName: newAttName.trim(),
      fileUrl: newAttUrl.trim(),
      fileType: 'application/pdf',
      fileSize: 1024 * 500,
      uploadedAt: new Date().toISOString(),
    };
    setAttachments([...attachments, att]);
    setNewAttName('');
    setNewAttUrl('');
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments(attachments.filter((a) => a.id !== attId));
  };

  const handleSaveDraft = async () => {
    setStatusMessage(null);
    try {
      await saveDraft({
        assignmentId: assignment.id,
        data: { textResponse, attachments },
      }).unwrap();
      refetchMyAssignments();
      setStatusMessage({ type: 'success', text: 'Draft saved successfully.' });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.data?.error?.message || err?.message || 'Failed to save draft',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!textResponse.trim() && attachments.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Please write a response or attach a solution file before submitting.',
      });
      return;
    }

    try {
      await submitAssignment({
        assignmentId: assignment.id,
        data: {
          textResponse,
          attachments,
          idempotencyKey: `sub_${assignment.id}_${Date.now()}`,
        },
      }).unwrap();
      refetchMyAssignments();
      setStatusMessage({
        type: 'success',
        text: 'Assignment turned in successfully! Your teacher has received your submission.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.data?.error?.message || err?.message || 'Failed to submit assignment',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/assignments/student"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
          <p className="text-sm text-gray-500">
            {assignment.subjectName || 'Subject'} • Due {new Date(assignment.dueAt).toLocaleString()}
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Graded Banner if complete */}
      {isGraded && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-emerald-600" />
              <h2 className="text-base font-bold text-emerald-900">Graded Work</h2>
            </div>
            <span className="text-xl font-bold text-emerald-800">
              {existingSubmission?.score} / {assignment.maxScore}
            </span>
          </div>
          {existingSubmission?.feedback && (
            <div className="p-3 bg-white/80 rounded-lg border border-emerald-100 text-sm text-gray-800">
              <span className="font-semibold text-emerald-900">Teacher Remarks: </span>
              {existingSubmission.feedback}
            </div>
          )}
        </div>
      )}

      {/* Late Policy Warning */}
      {isPastDue && !isGraded && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${
            assignment.allowLateSubmission
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <Clock className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">
              {assignment.allowLateSubmission
                ? 'Late Submission Active'
                : 'Submissions Closed'}
            </p>
            <p className="text-xs mt-0.5">
              {assignment.allowLateSubmission
                ? `The deadline passed on ${new Date(assignment.dueAt).toLocaleString()}. Late submissions will incur a ${
                    assignment.latePolicy?.deductionPercentage ?? 10
                  }% per day deduction.`
                : 'The deadline has passed and late submissions are not allowed for this assignment.'}
            </p>
          </div>
        </div>
      )}

      {/* Assignment Brief */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
          Assignment Prompt & Reference Files
        </h2>
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {assignment.description}
        </p>

        {assignment.instructions && (
          <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-700">
            <span className="font-semibold text-gray-900 block mb-1">Instructions:</span>
            {assignment.instructions}
          </div>
        )}

        {assignment.attachments && assignment.attachments.length > 0 && (
          <div className="pt-2">
            <span className="text-xs font-semibold text-gray-700 block mb-2">
              Teacher Resources:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {assignment.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50 text-xs font-medium text-indigo-600"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate text-gray-800">{att.fileName}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Student Work Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
            Your Response
          </h2>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Written Solution / Answers
            </label>
            <textarea
              rows={6}
              disabled={!canSubmit}
              placeholder="Type or paste your complete solution, essay text, or calculation steps here..."
              value={textResponse}
              onChange={(e) => setTextResponse(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100"
            />
          </div>

          {/* Solution Attachments */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Upload / Link Solution Files (PDF, Images, ZIP)
            </label>

            {canSubmit && (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="File label (e.g. My_Calculations.pdf)"
                  value={newAttName}
                  onChange={(e) => setNewAttName(e.target.value)}
                  className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <input
                  type="url"
                  placeholder="https://storage.edusphere.io/student_files/my_solution.pdf"
                  value={newAttUrl}
                  onChange={(e) => setNewAttUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                >
                  Add File
                </button>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {attachments.map((att) => (
                  <div key={att.id} className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span className="font-medium text-gray-800">{att.fileName}</span>
                    </div>
                    {canSubmit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        {canSubmit && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
            <button
              type="button"
              disabled={savingDraft || submitting}
              onClick={handleSaveDraft}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-xs font-semibold rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {savingDraft ? 'Saving Draft...' : 'Save Draft'}
            </button>

            <button
              type="submit"
              disabled={submitting || savingDraft}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? 'Submitting...' : 'Turn In / Submit Assignment'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
