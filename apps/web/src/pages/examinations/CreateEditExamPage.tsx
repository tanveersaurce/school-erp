import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import {
  useGetExamByIdQuery,
  useCreateExamMutation,
  useUpdateExamMutation,
  useGetGradingSchemesQuery,
} from '../../features/examinations/examinationsApi.js';
import { useGetAcademicYearsQuery, useGetCampusesQuery } from '../../features/tenant/tenantApi.js';
import { useGetAcademicClassesQuery } from '../../features/academic/academicApi.js';
import { ExamType } from '@edusphere/common';
import { Spinner } from '../../components/ui/Spinner.js';

export const CreateEditExamPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const { data: existingExamRes, isLoading: loadingExisting } = useGetExamByIdQuery(id || '', {
    skip: !isEditMode,
  });

  const { data: yearsRes } = useGetAcademicYearsQuery();
  const { data: campusesRes } = useGetCampusesQuery();
  const { data: gradingSchemesRes } = useGetGradingSchemesQuery();
  const { data: academicClassesRes } = useGetAcademicClassesQuery();

  const [createExam, { isLoading: isCreating }] = useCreateExamMutation();
  const [updateExam, { isLoading: isUpdating }] = useUpdateExamMutation();

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [examType, setExamType] = useState<ExamType>(ExamType.MID_TERM);
  const [academicYearId, setAcademicYearId] = useState('');
  const [campusId, setCampusId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gradingSchemeId, setGradingSchemeId] = useState('');
  const [passingPercentage, setPassingPercentage] = useState<number>(40);
  const [weightagePercentage, setWeightagePercentage] = useState<number>(100);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const academicYears = yearsRes?.data || [];
  const campuses = campusesRes?.data || [];
  const gradingSchemes = gradingSchemesRes?.data || [];
  const academicClasses = academicClassesRes?.data || [];

  useEffect(() => {
    if (academicYears.length > 0 && !academicYearId) {
      const activeYear = academicYears.find((y) => y.status === 'ACTIVE') || academicYears[0];
      setAcademicYearId(activeYear.id);
    }
  }, [academicYears, academicYearId]);

  useEffect(() => {
    if (gradingSchemes.length > 0 && !gradingSchemeId) {
      const defaultScheme = gradingSchemes.find((s) => s.isDefault) || gradingSchemes[0];
      setGradingSchemeId(defaultScheme.id);
    }
  }, [gradingSchemes, gradingSchemeId]);

  useEffect(() => {
    if (existingExamRes?.data) {
      const exam = existingExamRes.data;
      setTitle(exam.title);
      setCode(exam.code || '');
      setDescription(exam.description || '');
      setExamType(exam.examType as ExamType);
      setAcademicYearId(exam.academicYearId);
      setCampusId(exam.campusId || '');
      setStartDate(exam.startDate ? new Date(exam.startDate).toISOString().slice(0, 10) : '');
      setEndDate(exam.endDate ? new Date(exam.endDate).toISOString().slice(0, 10) : '');
      setGradingSchemeId(exam.gradingSchemeId || '');
      setPassingPercentage(exam.passingPercentage ?? 40);
      setWeightagePercentage(exam.weightagePercentage ?? 100);
      setSelectedClassIds(exam.academicClassIds || []);
    }
  }, [existingExamRes]);

  const handleToggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleSelectAllClasses = () => {
    if (selectedClassIds.length === academicClasses.length) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(academicClasses.map((c) => c.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Exam title is required.');
      return;
    }
    if (!academicYearId) {
      setErrorMsg('Academic year must be selected.');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMsg('Both start date and end date are required.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setErrorMsg('Start date cannot be after end date.');
      return;
    }

    try {
      if (isEditMode && id) {
        await updateExam({
          id,
          data: {
            title,
            code: code || undefined,
            description: description || undefined,
            examType,
            academicYearId,
            campusId: campusId || undefined,
            startDate,
            endDate,
            gradingSchemeId: gradingSchemeId || undefined,
            passingPercentage,
            weightagePercentage,
            academicClassIds: selectedClassIds,
          },
        }).unwrap();
        navigate(`/examinations/${id}`);
      } else {
        const created = await createExam({
          title,
          code: code || undefined,
          description: description || undefined,
          examType,
          academicYearId,
          campusId: campusId || undefined,
          startDate,
          endDate,
          gradingSchemeId: gradingSchemeId || undefined,
          passingPercentage,
          weightagePercentage,
          academicClassIds: selectedClassIds,
        }).unwrap();
        navigate(`/examinations/${created.data.id}`);
      }
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err?.message || 'Failed to save examination.');
    }
  };

  if (isEditMode && loadingExisting) {
    return (
      <div className="p-12 flex justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            to="/examinations/list"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Examination' : 'Create New Examination'}
            </h1>
            <p className="text-sm text-gray-500">
              Configure exam parameters, date boundaries, grading scheme, and participating classes.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            General Exam Metadata
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Exam Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mid-Term Examination 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Exam Code
              </label>
              <input
                type="text"
                placeholder="e.g. MID-2026"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Exam Type <span className="text-red-500">*</span>
              </label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamType)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {Object.values(ExamType).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Select Academic Year</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.status === 'ACTIVE' ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Campus (Optional)
              </label>
              <select
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Campuses / Central</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Description / Instructions
              </label>
              <textarea
                rows={3}
                placeholder="Optional notes or instructions for students, teachers, and invigilators..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Schedule Boundaries & Grading */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Dates & Evaluation Rules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Grading Scheme
              </label>
              <select
                value={gradingSchemeId}
                onChange={(e) => setGradingSchemeId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Default Standard Scheme</option>
                {gradingSchemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) {s.isDefault ? '[Default]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Passing Percentage (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={passingPercentage}
                onChange={(e) => setPassingPercentage(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Participating Academic Classes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Participating Academic Classes
              </h2>
              <p className="text-xs text-gray-500">
                Select which classes/sections will sit for this examination cycle.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSelectAllClasses}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              {selectedClassIds.length === academicClasses.length
                ? 'Deselect All'
                : 'Select All Classes'}
            </button>
          </div>

          {academicClasses.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No academic classes found in system.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
              {academicClasses.map((cls) => {
                const isChecked = selectedClassIds.includes(cls.id);
                return (
                  <label
                    key={cls.id}
                    className={`flex items-center p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                      isChecked
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-medium'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleClass(cls.id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 mr-2.5"
                    />
                    <span>
                      {cls.className
                        ? `${cls.className}${cls.sectionName ? ` - ${cls.sectionName}` : ''}`
                        : `Class ${cls.classId || cls.id}`}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/examinations/list"
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isCreating || isUpdating}
            className="inline-flex items-center px-5 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {isCreating || isUpdating ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Exam'}
          </button>
        </div>
      </form>
    </div>
  );
};
