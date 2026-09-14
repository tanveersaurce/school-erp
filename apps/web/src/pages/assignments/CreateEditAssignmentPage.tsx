import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  useGetAcademicClassesQuery,
  useGetSubjectsQuery,
} from '../../features/academic/academicApi.js';
import {
  useGetAssignmentByIdQuery,
  useCreateAssignmentMutation,
  useUpdateAssignmentMutation,
} from '../../features/assignments/assignmentsApi.js';
import {
  AssignmentType,
  SubmissionType,
  AssignmentTargetType,
} from '@edusphere/common';
import type { IAssignmentAttachment } from '@edusphere/types';

export const CreateEditAssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const { data: classesRes } = useGetAcademicClassesQuery();
  const { data: subjectsRes } = useGetSubjectsQuery();
  const { data: existingAssignmentRes, isLoading: loadingAssignment } = useGetAssignmentByIdQuery(
    id || '',
    { skip: !isEditing }
  );

  const [createAssignment, { isLoading: creating }] = useCreateAssignmentMutation();
  const [updateAssignment, { isLoading: updating }] = useUpdateAssignmentMutation();

  const classes = classesRes?.data || [];
  const subjects = subjectsRes?.data || [];

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [academicClassId, setAcademicClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>(AssignmentType.HOMEWORK);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [maxScore, setMaxScore] = useState<number>(100);
  const [submissionType, setSubmissionType] = useState<SubmissionType>(SubmissionType.BOTH);
  const [allowLateSubmission, setAllowLateSubmission] = useState(true);
  const [deductionPercentage, setDeductionPercentage] = useState<number>(10);
  const [maxLateDays, setMaxLateDays] = useState<number>(3);
  const [targetType, setTargetType] = useState<AssignmentTargetType>(AssignmentTargetType.ALL);
  const [attachments, setAttachments] = useState<IAssignmentAttachment[]>([]);
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Attachment input helper state
  const [newAttName, setNewAttName] = useState('');
  const [newAttUrl, setNewAttUrl] = useState('');

  useEffect(() => {
    if (isEditing && existingAssignmentRes?.data) {
      const a = existingAssignmentRes.data;
      setTitle(a.title);
      setDescription(a.description);
      setInstructions(a.instructions || '');
      setAcademicClassId(a.academicClassId);
      setSubjectId(a.subjectId);
      setAssignmentType(a.assignmentType);
      setDueDate(typeof a.dueDate === 'string' ? a.dueDate.split('T')[0] : '');
      setDueTime(a.dueTime || '23:59');
      setMaxScore(a.maxScore);
      setSubmissionType(a.submissionType);
      setAllowLateSubmission(a.allowLateSubmission);
      if (a.latePolicy) {
        setDeductionPercentage(a.latePolicy.deductionPercentage || 10);
        setMaxLateDays(a.latePolicy.maxLateDays || 3);
      }
      setTargetType(a.targetType);
      setAttachments(a.attachments || []);
    }
  }, [isEditing, existingAssignmentRes]);

  const handleAddAttachment = () => {
    if (!newAttName.trim() || !newAttUrl.trim()) return;
    const att: IAssignmentAttachment = {
      id: `att_${Date.now()}`,
      fileName: newAttName.trim(),
      fileUrl: newAttUrl.trim(),
      fileType: 'application/pdf',
      fileSize: 1024 * 500, // 500KB default
      uploadedAt: new Date().toISOString(),
    };
    setAttachments([...attachments, att]);
    setNewAttName('');
    setNewAttUrl('');
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments(attachments.filter((a) => a.id !== attId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !description.trim() || !dueDate || !academicClassId || !subjectId) {
      setErrorMsg('Please complete all required fields (Title, Description, Class, Subject, Due Date).');
      return;
    }

    try {
      if (isEditing && id) {
        await updateAssignment({
          id,
          data: {
            title,
            description,
            instructions: instructions || undefined,
            assignmentType,
            dueDate,
            dueTime,
            maxScore,
            submissionType,
            allowLateSubmission,
            latePolicy: allowLateSubmission
              ? { deductionPercentage, maxLateDays }
              : undefined,
            targetType,
            attachments,
          },
        }).unwrap();
        navigate(`/assignments/${id}`);
      } else {
        const created = await createAssignment({
          academicClassId,
          subjectId,
          title,
          description,
          instructions: instructions || undefined,
          assignmentType,
          dueDate,
          dueTime,
          maxScore,
          submissionType,
          allowLateSubmission,
          latePolicy: allowLateSubmission
            ? { deductionPercentage, maxLateDays }
            : undefined,
          targetType,
          attachments,
          publishImmediately,
        }).unwrap();
        navigate(`/assignments/${created.data.id}`);
      }
    } catch (err: any) {
      setErrorMsg(err?.data?.error?.message || err?.message || 'Failed to save assignment');
    }
  };

  if (isEditing && loadingAssignment) {
    return <div className="p-8 text-center text-gray-500">Loading assignment details...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button & Title */}
      <div className="flex items-center gap-3">
        <Link
          to="/assignments/list"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Assignment' : 'Create New Assignment'}
          </h1>
          <p className="text-sm text-gray-500">
            Configure learning goals, submission format, deadlines, and scoring rules.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Assignment Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Assignment Details
          </h2>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Chapter 4 Trigonometric Identities Problem Set"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Target Class *
              </label>
              <select
                required
                disabled={isEditing}
                value={academicClassId}
                onChange={(e) => setAcademicClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100"
              >
                <option value="">Select Academic Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className || 'Class'} {c.sectionName ? `(${c.sectionName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Subject *
              </label>
              <select
                required
                disabled={isEditing}
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100"
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Description / Task Overview *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Provide context and summary of the assignment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Detailed Instructions (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Step-by-step submission instructions, formatting requirements, or references..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Schedule & Deadlines */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Schedule & Submission Rules
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Due Time (School Timezone)
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Max Possible Score
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                required
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Assignment Type
              </label>
              <select
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value as AssignmentType)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value={AssignmentType.HOMEWORK}>Homework</option>
                <option value={AssignmentType.ASSIGNMENT}>Assignment</option>
                <option value={AssignmentType.PROJECT}>Project</option>
                <option value={AssignmentType.PRACTICE}>Practice</option>
                <option value={AssignmentType.CLASSWORK}>Classwork</option>
                <option value={AssignmentType.OTHER}>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Submission Delivery Format
              </label>
              <select
                value={submissionType}
                onChange={(e) => setSubmissionType(e.target.value as SubmissionType)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value={SubmissionType.BOTH}>
                  Online Text Response & File Attachment
                </option>
                <option value={SubmissionType.ONLINE_FILE}>Online File Only</option>
                <option value={SubmissionType.ONLINE_TEXT}>Online Text Only</option>
                <option value={SubmissionType.OFFLINE}>Offline Classroom Hand-in</option>
              </select>
            </div>
          </div>

          {/* Late Policy */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-900">Allow Late Submissions</span>
                <p className="text-xs text-gray-500">
                  Permit students to turn in work after the deadline with optional grading penalty.
                </p>
              </div>
              <input
                type="checkbox"
                checked={allowLateSubmission}
                onChange={(e) => setAllowLateSubmission(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </div>

            {allowLateSubmission && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pl-4 border-l-2 border-indigo-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Deduction Percentage (% per day)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={deductionPercentage}
                    onChange={(e) => setDeductionPercentage(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Max Late Window (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={maxLateDays}
                    onChange={(e) => setMaxLateDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attachments Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Reference Attachments (Worksheets, Rubrics, Guides)
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="File display name (e.g. Problem_Set_3.pdf)"
              value={newAttName}
              onChange={(e) => setNewAttName(e.target.value)}
              className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <input
              type="url"
              placeholder="https://storage.edusphere.io/worksheets/sample.pdf"
              value={newAttUrl}
              onChange={(e) => setNewAttUrl(e.target.value)}
              className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddAttachment}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition shrink-0"
            >
              Add Link
            </button>
          </div>

          {attachments.length > 0 && (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {attachments.map((att) => (
                <div key={att.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium text-gray-800">{att.fileName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Publish / Action Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between">
          {!isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="publishImmediately"
                checked={publishImmediately}
                onChange={(e) => setPublishImmediately(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="publishImmediately" className="text-sm font-medium text-gray-700">
                Publish immediately to students upon creation
              </label>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Editing assignment configuration
            </div>
          )}

          <div className="flex items-center gap-3">
            <Link
              to="/assignments/list"
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={creating || updating}
              className="inline-flex items-center px-5 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {creating || updating ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Assignment'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
