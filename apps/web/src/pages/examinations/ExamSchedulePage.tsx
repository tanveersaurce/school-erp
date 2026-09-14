import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Plus,
  AlertTriangle,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import {
  useGetExamByIdQuery,
  useGetExamSchedulesQuery,
  useCreateExamScheduleMutation,
  useDeleteExamScheduleMutation,
  useCheckScheduleConflictsMutation,
} from '../../features/examinations/examinationsApi.js';
import { useGetAcademicClassesQuery, useGetSubjectsQuery } from '../../features/academic/academicApi.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const ExamSchedulePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const examId = id || '';

  const { data: examRes, isLoading: loadingExam } = useGetExamByIdQuery(examId);
  const { data: schedulesRes, isLoading: loadingSchedules, refetch } = useGetExamSchedulesQuery(examId);
  const { data: academicClassesRes } = useGetAcademicClassesQuery();
  const { data: subjectsRes } = useGetSubjectsQuery();

  const [createSchedule, { isLoading: isCreating }] = useCreateExamScheduleMutation();
  const [deleteSchedule] = useDeleteExamScheduleMutation();
  const [checkConflict, { isLoading: isChecking }] = useCheckScheduleConflictsMutation();

  const exam = examRes?.data;
  const schedules = schedulesRes?.data || [];
  const academicClasses = academicClassesRes?.data || [];
  const subjects = subjectsRes?.data || [];

  // Form state
  const [academicClassId, setAcademicClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [room, setRoom] = useState('');
  const [invigilatorId, setInvigilatorId] = useState('');
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [passMarks, setPassMarks] = useState<number>(40);

  // Conflict state
  const [conflictReport, setConflictReport] = useState<{
    checked: boolean;
    hasConflict: boolean;
    conflicts: Array<{ type: string; message: string }>;
  } | null>(null);
  const [formError, setFormError] = useState('');

  const handleCheckConflict = async () => {
    setFormError('');
    if (!academicClassId || !subjectId || !examDate || !startTime || !endTime) {
      setFormError('Please select Class, Subject, Date, Start and End times to verify conflicts.');
      return;
    }

    try {
      const res = await checkConflict({
        examId,
        academicClassId,
        subjectId,
        examDate,
        startTime,
        endTime,
        roomId: room || undefined,
        invigilatorId: invigilatorId || undefined,
      }).unwrap();

      setConflictReport({
        checked: true,
        hasConflict: res.data.hasConflict,
        conflicts: res.data.conflicts || [],
      });
    } catch (err: any) {
      setFormError(err?.data?.message || err?.message || 'Error checking timetable conflicts');
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!academicClassId || !subjectId || !examDate || !startTime || !endTime) {
      setFormError('All required schedule fields must be filled.');
      return;
    }

    try {
      await createSchedule({
        examId,
        academicClassId,
        subjectId,
        examDate,
        startTime,
        endTime,
        room: room || undefined,
        invigilatorId: invigilatorId || undefined,
        maxMarks,
        passMarks,
      }).unwrap();

      // Reset form
      setSubjectId('');
      setRoom('');
      setInvigilatorId('');
      setConflictReport(null);
      refetch();
    } catch (err: any) {
      setFormError(err?.data?.message || err?.message || 'Failed to create schedule');
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!window.confirm('Delete this scheduled exam paper?')) return;
    try {
      await deleteSchedule(scheduleId).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || err?.message || 'Failed to remove schedule');
    }
  };

  if (loadingExam) {
    return (
      <div className="p-12 flex justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link
          to={`/examinations/${examId}`}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paper Scheduling & Clash Detection</h1>
          <p className="text-sm text-gray-500">
            Exam: <span className="font-semibold text-gray-800">{exam?.title}</span> &bull; Window:{' '}
            {exam ? new Date(exam.startDate).toLocaleDateString() : ''} &ndash;{' '}
            {exam ? new Date(exam.endDate).toLocaleDateString() : ''}
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {formError}
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3 flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
          Schedule An Exam Paper
        </h2>

        <form onSubmit={handleAddSchedule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Academic Class <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={academicClassId}
                onChange={(e) => setAcademicClassId(e.target.value)}
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
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
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

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Exam Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Room / Hall Name
              </label>
              <input
                type="text"
                placeholder="e.g. Hall-A, Room 102"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Invigilator ID (Optional)
              </label>
              <input
                type="text"
                placeholder="Teacher/Invigilator ID"
                value={invigilatorId}
                onChange={(e) => setInvigilatorId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Max Marks <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Pass Marks <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                required
                value={passMarks}
                onChange={(e) => setPassMarks(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Conflict Pre-Validation Status Banner */}
          {conflictReport && (
            <div
              className={`p-4 rounded-lg border text-sm transition-all ${
                conflictReport.hasConflict
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              {conflictReport.hasConflict ? (
                <div className="space-y-1">
                  <div className="flex items-center font-semibold text-amber-800">
                    <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600" />
                    Conflict Detected!
                  </div>
                  <ul className="list-disc list-inside text-xs space-y-0.5 mt-1 text-amber-700">
                    {conflictReport.conflicts.map((c, idx) => (
                      <li key={idx}>
                        <strong>[{c.type}]</strong> {c.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center font-medium text-emerald-800">
                  <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-600" />
                  No clashes detected. Room, invigilator, and student class timings are clear.
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleCheckConflict}
              disabled={isChecking}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
              {isChecking ? 'Checking...' : 'Check For Clashes'}
            </button>

            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center px-5 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {isCreating ? 'Adding...' : 'Add Paper Schedule'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Schedules Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Current Exam Timetable ({schedules.length})</h3>
        </div>

        {loadingSchedules ? (
          <div className="p-8 flex justify-center">
            <Spinner />
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No papers have been scheduled yet. Use the form above to add papers.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                <tr>
                  <th className="px-6 py-3">Exam Date</th>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3">Room</th>
                  <th className="px-6 py-3">Max / Pass</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {schedules.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 text-xs">
                      {new Date(item.examDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-700">
                      {item.startTime} &ndash; {item.endTime}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-gray-800">
                      {item.subjectId}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {item.academicClassId || item.classId}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {item.room || item.roomId || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-semibold text-gray-900">{item.maxMarks}</span>
                      <span className="text-gray-400"> / {item.passMarks}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Schedule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
