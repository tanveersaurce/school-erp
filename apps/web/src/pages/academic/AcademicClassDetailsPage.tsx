import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetAcademicClassDetailsQuery,
  useAssignClassTeacherMutation,
  useAutoAssignRollNumbersMutation,
  useEnrollStudentAcademicMutation,
  useAssignRollNumberMutation,
  useGetSubjectsQuery,
  useCreateClassSubjectMutation,
  useDeleteClassSubjectMutation,
  useCreateTeacherAssignmentMutation,
  useDeleteTeacherAssignmentMutation,
} from '../../features/academic/academicApi.js';
import { useGetTeachersQuery } from '../../features/employee/employeeApi.js';
import { useGetStudentsQuery } from '../../features/student/studentApi.js';
import { Can } from '../../components/auth/Can.js';

export const AcademicClassDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'subjects' | 'teachers'>(
    'overview'
  );

  // Modals state
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollRollNumber, setEnrollRollNumber] = useState<number | ''>('');

  const [isRollModalOpen, setIsRollModalOpen] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>('');
  const [manualRollNumber, setManualRollNumber] = useState<number>(1);

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [mapSubjectId, setMapSubjectId] = useState('');
  const [isOptionalSubject, setIsOptionalSubject] = useState(false);
  const [subjectCreditHours, setSubjectCreditHours] = useState<number>(3);
  const [subjectSequence, setSubjectSequence] = useState<number>(1);

  const [isAssignTeacherModalOpen, setIsAssignTeacherModalOpen] = useState(false);
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [assignFacultyId, setAssignFacultyId] = useState('');

  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Queries
  const {
    data: detailsRes,
    isLoading,
    refetch,
  } = useGetAcademicClassDetailsQuery(id!, { skip: !id });

  const { data: teachersRes } = useGetTeachersQuery();
  const teachers = teachersRes?.data || [];

  const { data: subjectsRes } = useGetSubjectsQuery();
  const allSubjects = subjectsRes?.data || [];

  const { data: studentsRes } = useGetStudentsQuery({
    search: studentSearch || undefined,
    limit: 20,
  });
  const eligibleStudents = studentsRes?.data || [];

  // Mutations
  const [assignClassTeacher, { isLoading: isAssigningTeacher }] = useAssignClassTeacherMutation();
  const [autoAssignRollNumbers, { isLoading: isAutoRollLoading }] =
    useAutoAssignRollNumbersMutation();
  const [enrollStudentAcademic, { isLoading: isEnrolling }] = useEnrollStudentAcademicMutation();
  const [assignRollNumber] = useAssignRollNumberMutation();
  const [createClassSubject, { isLoading: isMappingSubject }] = useCreateClassSubjectMutation();
  const [deleteClassSubject] = useDeleteClassSubjectMutation();
  const [createTeacherAssignment, { isLoading: isAssigningSubjectTeacher }] =
    useCreateTeacherAssignmentMutation();
  const [deleteTeacherAssignment] = useDeleteTeacherAssignmentMutation();

  const details = detailsRes?.data;
  const academicClass = details?.academicClass;
  const enrolledStudents = details?.students || [];
  const mappedSubjects = details?.subjects || [];
  const teacherAssignments = details?.teachers || [];

  if (isLoading) {
    return (
      <div className="p-12 text-center text-gray-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
        <div>Loading academic class details...</div>
      </div>
    );
  }

  if (!academicClass) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <h2 className="text-xl font-bold text-gray-800">Academic Offering Not Found</h2>
        <p className="text-gray-500 mt-2">
          The requested academic offering does not exist or has been deleted.
        </p>
        <button
          onClick={() => navigate('/academic/academic-classes')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg"
        >
          Back to Offerings
        </button>
      </div>
    );
  }

  const utilization =
    academicClass.capacity > 0
      ? Math.round((academicClass.currentEnrollment / academicClass.capacity) * 100)
      : 0;

  // Handlers
  const handleSaveClassTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    try {
      await assignClassTeacher({
        id: academicClass.id,
        classTeacherId: selectedTeacherId || null,
      }).unwrap();
      setIsTeacherModalOpen(false);
      setSuccessBanner('Class teacher assignment updated successfully.');
      refetch();
    } catch (err: any) {
      setErrorBanner(
        err?.data?.error?.message || err?.data?.message || 'Failed to assign class teacher.'
      );
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollStudentId) {
      setErrorBanner('Please select a student to enroll.');
      return;
    }
    setErrorBanner(null);
    try {
      await enrollStudentAcademic({
        studentId: enrollStudentId,
        academicClassId: academicClass.id,
        rollNumber: enrollRollNumber ? Number(enrollRollNumber) : undefined,
      }).unwrap();
      setIsEnrollModalOpen(false);
      setEnrollStudentId('');
      setEnrollRollNumber('');
      setSuccessBanner('Student enrolled successfully into this academic class offering.');
      refetch();
    } catch (err: any) {
      setErrorBanner(
        err?.data?.error?.message || err?.data?.message || 'Failed to enroll student.'
      );
    }
  };

  const handleAutoAssignRollNumbers = async () => {
    if (
      !window.confirm(
        'Auto-assign sequential roll numbers (1, 2, 3...) sorted alphabetically by student name to all enrolled students?'
      )
    ) {
      return;
    }
    setErrorBanner(null);
    try {
      const res = await autoAssignRollNumbers(academicClass.id).unwrap();
      setSuccessBanner(
        `Successfully auto-assigned roll numbers to ${res.data?.updatedCount ?? enrolledStudents.length} students.`
      );
      refetch();
    } catch (err: any) {
      setErrorBanner(
        err?.data?.error?.message || err?.data?.message || 'Failed to auto-assign roll numbers.'
      );
    }
  };

  const handleSaveIndividualRoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    try {
      await assignRollNumber({
        enrollmentId: selectedEnrollmentId,
        rollNumber: Number(manualRollNumber),
      }).unwrap();
      setIsRollModalOpen(false);
      setSuccessBanner('Roll number updated successfully.');
      refetch();
    } catch (err: any) {
      setErrorBanner(
        err?.data?.error?.message || err?.data?.message || 'Failed to update roll number.'
      );
    }
  };

  const handleMapSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapSubjectId) {
      setErrorBanner('Please select a subject to map.');
      return;
    }
    setErrorBanner(null);
    try {
      await createClassSubject({
        academicYearId: academicClass.academicYearId,
        classId: academicClass.classId,
        subjectId: mapSubjectId,
        campusId: academicClass.campusId,
        isOptional: isOptionalSubject,
        creditHours: Number(subjectCreditHours),
        sequence: Number(subjectSequence),
      }).unwrap();
      setIsSubjectModalOpen(false);
      setMapSubjectId('');
      setSuccessBanner('Subject mapped to class curriculum successfully.');
      refetch();
    } catch (err: any) {
      setErrorBanner(err?.data?.error?.message || err?.data?.message || 'Failed to map subject.');
    }
  };

  const handleRemoveSubject = async (classSubjectId: string, subjectName?: string) => {
    if (
      !window.confirm(
        `Are you sure you want to remove "${subjectName || 'this subject'}" from this curriculum?`
      )
    ) {
      return;
    }
    try {
      await deleteClassSubject(classSubjectId).unwrap();
      setSuccessBanner('Curriculum subject removed.');
      refetch();
    } catch (err: any) {
      alert(
        err?.data?.error?.message || err?.data?.message || 'Failed to remove curriculum subject.'
      );
    }
  };

  const handleAssignTeacherSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignSubjectId || !assignFacultyId) {
      setErrorBanner('Please select both a subject and a faculty teacher.');
      return;
    }
    setErrorBanner(null);
    try {
      await createTeacherAssignment({
        academicYearId: academicClass.academicYearId,
        campusId: academicClass.campusId,
        classId: academicClass.classId,
        sectionId: academicClass.sectionId,
        academicClassId: academicClass.id,
        subjectId: assignSubjectId,
        teacherId: assignFacultyId,
      }).unwrap();
      setIsAssignTeacherModalOpen(false);
      setAssignSubjectId('');
      setAssignFacultyId('');
      setSuccessBanner('Teacher assigned to subject successfully.');
      refetch();
    } catch (err: any) {
      setErrorBanner(
        err?.data?.error?.message || err?.data?.message || 'Failed to assign teacher.'
      );
    }
  };

  const handleRemoveTeacherAssignment = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to remove this teacher assignment?')) return;
    try {
      await deleteTeacherAssignment(assignmentId).unwrap();
      setSuccessBanner('Teacher assignment removed.');
      refetch();
    } catch (err: any) {
      alert(
        err?.data?.error?.message || err?.data?.message || 'Failed to remove teacher assignment.'
      );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/academic/academic-classes')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-2"
          >
            ← Back to Academic Offerings
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {academicClass.className || 'Class'} — {academicClass.sectionName || 'Section'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              {academicClass.academicYearName}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
              {academicClass.campusName}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Offering ID: <span className="font-mono text-xs">{academicClass.id}</span> • Room:{' '}
            {academicClass.room || 'Not assigned'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-gray-500 font-medium">Capacity Utilization</div>
            <div className="text-lg font-black text-gray-900">
              {academicClass.currentEnrollment} / {academicClass.capacity}{' '}
              <span className="text-xs font-semibold text-gray-500">({utilization}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banners */}
      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center justify-between">
          <span>{successBanner}</span>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold"
          >
            ×
          </button>
        </div>
      )}
      {errorBanner && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm flex items-center justify-between">
          <span>{errorBanner}</span>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-red-600 hover:text-red-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview & Faculty' },
            { id: 'students', label: `Enrolled Students (${enrolledStudents.length})` },
            { id: 'subjects', label: `Curriculum Subjects (${mappedSubjects.length})` },
            { id: 'teachers', label: `Teacher Assignments (${teacherAssignments.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ===================================================================
          TAB 1: OVERVIEW & FACULTY
         =================================================================== */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Class Teacher Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Designated Class Teacher</h2>
              <Can permission="academic_class:update">
                <button
                  onClick={() => {
                    setSelectedTeacherId(academicClass.classTeacherId || '');
                    setIsTeacherModalOpen(true);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition"
                >
                  {academicClass.classTeacherId ? 'Change Teacher' : '+ Assign Teacher'}
                </button>
              </Can>
            </div>

            {academicClass.classTeacherName ? (
              <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-black text-lg flex items-center justify-center">
                  {academicClass.classTeacherName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    {academicClass.classTeacherName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {academicClass.classTeacherEmail || 'No email provided'}
                  </p>
                  <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                    Primary Class In-Charge
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <div className="text-gray-400 text-sm font-medium">
                  No class teacher currently designated.
                </div>
                <Can permission="academic_class:update">
                  <button
                    onClick={() => {
                      setSelectedTeacherId('');
                      setIsTeacherModalOpen(true);
                    }}
                    className="mt-3 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition shadow-sm"
                  >
                    Assign Faculty Member
                  </button>
                </Can>
              </div>
            )}
          </div>

          {/* Offering Metrics & Specifications */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900">Offering Specifications</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-500 block">Grade Level</span>
                <span className="font-semibold text-gray-900">{academicClass.className}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-500 block">Section Division</span>
                <span className="font-semibold text-gray-900">{academicClass.sectionName}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-500 block">Campus</span>
                <span className="font-semibold text-gray-900">{academicClass.campusName}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-500 block">Academic Year</span>
                <span className="font-semibold text-gray-900">
                  {academicClass.academicYearName}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-500 block">Assigned Room</span>
                <span className="font-semibold text-gray-900">
                  {academicClass.room || 'Not assigned'}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-500 block">Available Seats</span>
                <span className="font-semibold text-emerald-700">
                  {academicClass.availableCapacity} seats left
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 2: ENROLLED STUDENTS & ROSTER
         =================================================================== */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-gray-900">Enrolled Student Roster</h2>
              <p className="text-xs text-gray-500">
                {enrolledStudents.length} students enrolled out of {academicClass.capacity} capacity
                limit.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Can permission="academic_class:update">
                <button
                  onClick={handleAutoAssignRollNumbers}
                  disabled={isAutoRollLoading || enrolledStudents.length === 0}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  {isAutoRollLoading ? 'Assigning...' : '⚡ Auto-Assign Roll #s'}
                </button>
              </Can>
              <Can permission="student:enroll">
                <button
                  onClick={() => {
                    setErrorBanner(null);
                    setIsEnrollModalOpen(true);
                  }}
                  disabled={academicClass.availableCapacity <= 0}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  + Enroll Student
                </button>
              </Can>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {enrolledStudents.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-base font-semibold text-gray-800">No students enrolled yet.</p>
                <p className="text-xs text-gray-500 mt-1">
                  Enroll students into this class offering or admit candidates.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium text-xs">
                      <th className="py-3 px-4 w-20 text-center">Roll #</th>
                      <th className="py-3 px-4">Admission #</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Gender</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Enrolled Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {enrolledStudents.map((st) => (
                      <tr key={st.enrollmentId} className="hover:bg-gray-50/75 transition">
                        <td className="py-3 px-4 text-center">
                          {st.rollNumber ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs">
                              {st.rollNumber}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs italic">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-800">
                          {st.admissionNumber || 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900">
                          {st.firstName} {st.lastName}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-600">{st.gender || '—'}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                            {st.enrollmentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {st.startDate ? new Date(st.startDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Can permission="academic_class:update">
                            <button
                              onClick={() => {
                                setSelectedEnrollmentId(st.enrollmentId);
                                setManualRollNumber(st.rollNumber || 1);
                                setIsRollModalOpen(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-900 text-xs font-semibold hover:underline"
                            >
                              Edit Roll #
                            </button>
                          </Can>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 3: CURRICULUM SUBJECTS
         =================================================================== */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-gray-900">Curriculum Subject Mappings</h2>
              <p className="text-xs text-gray-500">
                Subjects mapped to {academicClass.className} for academic year{' '}
                {academicClass.academicYearName}.
              </p>
            </div>
            <Can permission="class_subject:create">
              <button
                onClick={() => {
                  setErrorBanner(null);
                  setIsSubjectModalOpen(true);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
              >
                + Map Curriculum Subject
              </button>
            </Can>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {mappedSubjects.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-base font-semibold text-gray-800">
                  No subjects mapped to this curriculum.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Add core and elective subjects from the master subject catalog.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium text-xs">
                      <th className="py-3 px-4">Subject Name</th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Requirement</th>
                      <th className="py-3 px-4 text-center">Credit Hours</th>
                      <th className="py-3 px-4 text-center">Sequence</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mappedSubjects.map((sb) => (
                      <tr key={sb.id} className="hover:bg-gray-50/75 transition">
                        <td className="py-3 px-4 font-bold text-gray-900">{sb.subjectName}</td>
                        <td className="py-3 px-4 font-mono text-xs text-gray-700">
                          {sb.subjectCode}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                            {sb.subjectType || 'CORE'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {sb.isOptional ? (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              Elective / Optional
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                              Mandatory Core
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-700 font-medium">
                          {sb.creditHours ?? 3} hrs
                        </td>
                        <td className="py-3 px-4 text-center text-gray-500 text-xs">
                          {sb.sequence}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Can permission="class_subject:delete">
                            <button
                              onClick={() => handleRemoveSubject(sb.id, sb.subjectName)}
                              className="text-red-600 hover:text-red-900 text-xs font-semibold hover:underline"
                            >
                              Remove
                            </button>
                          </Can>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 4: TEACHER ASSIGNMENTS
         =================================================================== */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-gray-900">Faculty Subject Allocations</h2>
              <p className="text-xs text-gray-500">
                Assigned teachers conducting classes for each curriculum subject.
              </p>
            </div>
            <Can permission="teacher_assignment:create">
              <button
                onClick={() => {
                  setErrorBanner(null);
                  setIsAssignTeacherModalOpen(true);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
              >
                + Assign Teacher to Subject
              </button>
            </Can>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {teacherAssignments.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-base font-semibold text-gray-800">
                  No teachers assigned to subjects yet.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Assign faculty educators to the subjects mapped to this class offering.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium text-xs">
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Assigned Teacher</th>
                      <th className="py-3 px-4">Teacher Code</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {teacherAssignments.map((ta) => (
                      <tr key={ta.id} className="hover:bg-gray-50/75 transition">
                        <td className="py-3 px-4 font-bold text-gray-900">
                          {ta.subjectName || ta.subjectId}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-800">
                          {ta.teacherName || ta.teacherId}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-gray-600">
                          {ta.teacherCode || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {ta.teacherEmail || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                            {ta.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Can permission="teacher_assignment:delete">
                            <button
                              onClick={() => handleRemoveTeacherAssignment(ta.id)}
                              className="text-red-600 hover:text-red-900 text-xs font-semibold hover:underline"
                            >
                              Unassign
                            </button>
                          </Can>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: Assign Class Teacher
         =================================================================== */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Designate Class Teacher</h3>
              <button
                onClick={() => setIsTeacherModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveClassTeacher} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Faculty Teacher
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Remove Class Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.employeeDetails?.name || t.teacherCode || t.id} (Code:{' '}
                      {t.teacherCode || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsTeacherModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigningTeacher}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium disabled:opacity-50"
                >
                  {isAssigningTeacher ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: Enroll Student
         =================================================================== */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Enroll Student into Offering</h3>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEnrollStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Search & Select Student <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Filter student name or admission #..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <select
                  value={enrollStudentId}
                  onChange={(e) => setEnrollStudentId(e.target.value)}
                  required
                  size={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {eligibleStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.personalDetails?.firstName || ''} {st.personalDetails?.lastName || ''}{' '}
                      (Adm #{st.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Roll Number (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Auto-assigned if left blank"
                  value={enrollRollNumber}
                  onChange={(e) =>
                    setEnrollRollNumber(e.target.value ? Number(e.target.value) : '')
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEnrolling}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium disabled:opacity-50"
                >
                  {isEnrolling ? 'Enrolling...' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: Edit Roll Number
         =================================================================== */}
      {isRollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Set Roll Number</h3>
              <button
                onClick={() => setIsRollModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveIndividualRoll} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Roll Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={manualRollNumber}
                  onChange={(e) => setManualRollNumber(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRollModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium"
                >
                  Save Roll Number
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: Map Curriculum Subject
         =================================================================== */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Map Subject to Curriculum</h3>
              <button
                onClick={() => setIsSubjectModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleMapSubject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={mapSubjectId}
                  onChange={(e) => setMapSubjectId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Select Subject</option>
                  {allSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) — {s.type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Credit Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={subjectCreditHours}
                    onChange={(e) => setSubjectCreditHours(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sequence</label>
                  <input
                    type="number"
                    min="1"
                    value={subjectSequence}
                    onChange={(e) => setSubjectSequence(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isOptional"
                  checked={isOptionalSubject}
                  onChange={(e) => setIsOptionalSubject(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="isOptional" className="text-sm text-gray-700">
                  Elective / Optional Subject
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMappingSubject}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium disabled:opacity-50"
                >
                  {isMappingSubject ? 'Mapping...' : 'Add to Curriculum'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: Assign Teacher to Subject
         =================================================================== */}
      {isAssignTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Assign Teacher to Subject</h3>
              <button
                onClick={() => setIsAssignTeacherModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAssignTeacherSubject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignSubjectId}
                  onChange={(e) => setAssignSubjectId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Select Curriculum Subject</option>
                  {mappedSubjects.map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>
                      {s.subjectName} ({s.subjectCode})
                    </option>
                  ))}
                  {/* Fallback to all subjects if none mapped */}
                  {mappedSubjects.length === 0 &&
                    allSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Teacher / Faculty <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignFacultyId}
                  onChange={(e) => setAssignFacultyId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.employeeDetails?.name || t.teacherCode || t.id} (Code:{' '}
                      {t.teacherCode || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAssignTeacherModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigningSubjectTeacher}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium disabled:opacity-50"
                >
                  {isAssigningSubjectTeacher ? 'Assigning...' : 'Assign Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
