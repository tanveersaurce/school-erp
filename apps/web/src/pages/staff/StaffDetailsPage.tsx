import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetEmployeeByIdQuery,
  useTransitionEmployeeStatusMutation,
  useGetTeacherProfileQuery,
  useCreateTeacherProfileMutation,
  useUpdateTeacherProfileMutation,
} from '../../features/employee/employeeApi.js';
import { Can } from '../../components/auth/Can.js';
import { EmploymentStatus } from '@edusphere/common';

export const StaffDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: empRes, isLoading, refetch } = useGetEmployeeByIdQuery(id || '');
  const employee = empRes?.data;

  // Teacher Profile query
  const { data: teacherRes, refetch: refetchTeacher } = useGetTeacherProfileQuery(id || '', {
    skip: !employee?.hasTeacherProfile,
  });
  const teacher = teacherRes?.data;

  // Mutations
  const [transitionStatus, { isLoading: isTransitioning }] = useTransitionEmployeeStatusMutation();
  const [createTeacherProfile, { isLoading: isCreatingTeacher }] =
    useCreateTeacherProfileMutation();
  const [updateTeacherProfile, { isLoading: isUpdatingTeacher }] =
    useUpdateTeacherProfileMutation();

  // Local state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<EmploymentStatus>(EmploymentStatus.ACTIVE);
  const [statusReason, setStatusReason] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);

  // Teacher Profile Modal
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [primarySubject, setPrimarySubject] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [secondarySubjectsStr, setSecondarySubjectsStr] = useState('');
  const [maxWeeklyPeriods, setMaxWeeklyPeriods] = useState(30);
  const [isAvailableForTimetable, setIsAvailableForTimetable] = useState(true);
  const [bio, setBio] = useState('');
  const [teacherError, setTeacherError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'profile' | 'employment' | 'academic' | 'qualifications'
  >('profile');

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center text-gray-500">
        <h2 className="text-lg font-bold text-gray-900">Employee Not Found</h2>
        <p className="text-sm mt-1">The requested employee record does not exist.</p>
        <button
          onClick={() => navigate('/staff')}
          className="mt-4 rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError(null);

    if (!statusReason.trim()) {
      setStatusError('Reason for status transition is required.');
      return;
    }

    try {
      await transitionStatus({
        id: employee.id,
        data: {
          status: targetStatus,
          reason: statusReason.trim(),
        },
      }).unwrap();

      setIsStatusModalOpen(false);
      setStatusReason('');
      refetch();
    } catch (err: any) {
      setStatusError(
        err?.data?.error?.message || err?.data?.message || 'Status transition failed.'
      );
    }
  };

  const handleSaveTeacherProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError(null);

    if (!primarySubject.trim()) {
      setTeacherError('Primary subject is required.');
      return;
    }

    const secondarySubjects = secondarySubjectsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (employee.hasTeacherProfile) {
        await updateTeacherProfile({
          employeeId: employee.id,
          data: {
            primarySubject: primarySubject.trim(),
            specialization: specialization.trim() || undefined,
            secondarySubjects,
            maxWeeklyPeriods: Number(maxWeeklyPeriods),
            isAvailableForTimetable,
            bio: bio.trim() || undefined,
          },
        }).unwrap();
      } else {
        await createTeacherProfile({
          employeeId: employee.id,
          primarySubject: primarySubject.trim(),
          specialization: specialization.trim() || undefined,
          secondarySubjects,
          maxWeeklyPeriods: Number(maxWeeklyPeriods),
          isAvailableForTimetable,
          bio: bio.trim() || undefined,
        }).unwrap();
      }

      setIsTeacherModalOpen(false);
      refetch();
      refetchTeacher();
    } catch (err: any) {
      setTeacherError(
        err?.data?.error?.message || err?.data?.message || 'Failed to save teacher profile.'
      );
    }
  };

  const isDestructiveStatus = [
    EmploymentStatus.TERMINATED,
    EmploymentStatus.SUSPENDED,
    EmploymentStatus.RESIGNED,
    EmploymentStatus.INACTIVE,
  ].includes(targetStatus);

  return (
    <div className="space-y-6 p-6">
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate('/staff')}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          &larr; Back to Staff Directory
        </button>
      </div>

      {/* Header Profile Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-2xl shadow-inner">
              {employee.displayName.substring(0, 2).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{employee.displayName}</h1>
                <span className="rounded-full border border-gray-300 bg-gray-100 px-2.5 py-0.5 text-xs font-mono text-gray-700">
                  {employee.employeeId}
                </span>
              </div>

              <p className="text-sm text-gray-600 mt-1">
                {employee.designationName || 'No Designation'} &bull;{' '}
                {employee.departmentName || 'General Staff'} &bull;{' '}
                {employee.campusName || 'All Campuses'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Can permission="employee:update">
              <button
                onClick={() => {
                  setTargetStatus(employee.employmentStatus);
                  setIsStatusModalOpen(true);
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
              >
                Change Status
              </button>
            </Can>

            {!employee.hasTeacherProfile && (
              <Can permission="teacher:create">
                <button
                  onClick={() => {
                    setPrimarySubject('');
                    setSpecialization('');
                    setSecondarySubjectsStr('');
                    setMaxWeeklyPeriods(30);
                    setIsAvailableForTimetable(true);
                    setBio('');
                    setIsTeacherModalOpen(true);
                  }}
                  className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 focus:outline-none"
                >
                  + Add Teacher Profile
                </button>
              </Can>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(
            [
              { id: 'profile', label: 'Profile & Contact' },
              { id: 'employment', label: 'Employment Record' },
              { id: 'academic', label: 'Academic (Teacher)' },
              { id: 'qualifications', label: 'Qualifications' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 1: Profile & Contact */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b pb-2">
              Personal Information
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 text-xs block">Full Name</span>
                <span className="font-medium text-gray-800">{employee.displayName}</span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Gender</span>
                <span className="font-medium text-gray-800">{employee.gender}</span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Date of Birth</span>
                <span className="font-medium text-gray-800">
                  {employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Nationality</span>
                <span className="font-medium text-gray-800">
                  {employee.nationality || 'Indian'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Contact Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 text-xs block">Work Email</span>
                <span className="font-medium text-gray-800">{employee.workEmail || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Work Phone</span>
                <span className="font-medium text-gray-800">{employee.workPhone || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Personal Phone</span>
                <span className="font-medium text-gray-800">{employee.personalPhone || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Emergency Contact</span>
                <span className="font-medium text-gray-800">
                  {employee.emergencyContact?.name} ({employee.emergencyContact?.relationship})
                  &bull; {employee.emergencyContact?.phone}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Employment */}
      {activeTab === 'employment' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-gray-900 border-b pb-2">
            Employment Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <span className="text-gray-500 text-xs block">Employment Status</span>
              <span className="font-bold text-gray-900">{employee.employmentStatus}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Employment Type</span>
              <span className="font-medium text-gray-800">{employee.employmentType}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Department</span>
              <span className="font-medium text-gray-800">{employee.departmentName || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Designation</span>
              <span className="font-medium text-gray-800">{employee.designationName || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Joining Date</span>
              <span className="font-medium text-gray-800">
                {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 text-xs block">Reporting Manager</span>
              <span className="font-medium text-gray-800">
                {employee.reportingManagerName || 'None'}
              </span>
            </div>
          </div>

          {employee.terminationDate && (
            <div className="rounded-lg bg-red-50 p-4 border border-red-200">
              <h4 className="text-sm font-bold text-red-900">Termination Record</h4>
              <p className="text-xs text-red-700 mt-1">
                Effective: {new Date(employee.terminationDate).toLocaleDateString()} &bull; Reason:{' '}
                {employee.terminationReason}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Academic / Teacher Profile */}
      {activeTab === 'academic' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-base font-semibold text-gray-900">Teacher Academic Profile</h2>
            {employee.hasTeacherProfile && (
              <Can permission="teacher:update">
                <button
                  onClick={() => {
                    setPrimarySubject(teacher?.primarySubject || '');
                    setSpecialization(teacher?.specialization || '');
                    setSecondarySubjectsStr((teacher?.secondarySubjects || []).join(', '));
                    setMaxWeeklyPeriods(teacher?.maxWeeklyPeriods || 30);
                    setIsAvailableForTimetable(teacher?.isAvailableForTimetable ?? true);
                    setBio(teacher?.bio || '');
                    setIsTeacherModalOpen(true);
                  }}
                  className="rounded bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  Edit Academic Details
                </button>
              </Can>
            )}
          </div>

          {employee.hasTeacherProfile && teacher ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <span className="text-gray-500 text-xs block">Primary Subject</span>
                <span className="font-bold text-indigo-600 text-base">
                  {teacher.primarySubject}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Specialization</span>
                <span className="font-medium text-gray-800">
                  {teacher.specialization || 'General'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Secondary Subjects</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {teacher.secondarySubjects && teacher.secondarySubjects.length > 0 ? (
                    teacher.secondarySubjects.map((s) => (
                      <span
                        key={s}
                        className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400">None</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">Weekly Periods & Timetable</span>
                <span className="font-medium text-gray-800">
                  Max: {teacher.maxWeeklyPeriods} periods/week &bull;{' '}
                  <span
                    className={
                      teacher.isAvailableForTimetable
                        ? 'text-green-600 font-bold'
                        : 'text-red-600 font-bold'
                    }
                  >
                    {teacher.isAvailableForTimetable ? 'Available for Timetable' : 'Unavailable'}
                  </span>
                </span>
              </div>
              {teacher.bio && (
                <div className="md:col-span-2">
                  <span className="text-gray-500 text-xs block">Biography</span>
                  <p className="text-sm text-gray-700 mt-1 italic">{teacher.bio}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">
                This staff member is not currently registered as teaching faculty.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Qualifications */}
      {activeTab === 'qualifications' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b pb-2">
            Academic Qualifications
          </h2>
          {employee.qualifications && employee.qualifications.length > 0 ? (
            <div className="space-y-3">
              {employee.qualifications.map((q, idx) => (
                <div
                  key={idx}
                  className="flex justify-between border-b border-gray-100 pb-2 text-sm"
                >
                  <div>
                    <span className="font-semibold text-gray-900">{q.degree}</span>
                    <span className="text-gray-500 text-xs block">{q.institution}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-700 font-medium">{q.yearOfPassing}</span>
                    {q.percentageOrCgpa && (
                      <span className="text-xs text-gray-500 block">
                        Score: {q.percentageOrCgpa}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No qualification records added yet.</p>
          )}
        </div>
      )}

      {/* Status Transition Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Change Employment Status</h3>
            <p className="text-xs text-gray-500">
              Update employment lifecycle status for{' '}
              <span className="font-semibold">{employee.displayName}</span>.
            </p>

            {statusError && (
              <div className="rounded bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {statusError}
              </div>
            )}

            <form onSubmit={handleStatusTransition} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Status *
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as EmploymentStatus)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  {Object.values(EmploymentStatus).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {isDestructiveStatus && (
                <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-xs text-amber-800">
                  <span className="font-bold block mb-1">Cascading Security Action:</span>
                  Transitioning to <span className="font-bold">{targetStatus}</span> will
                  automatically revoke all active sessions on all devices, deactivating linked ERP
                  account access.
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason for Status Change *
                </label>
                <textarea
                  required
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Mandatory justification for audit history..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransitioning}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isTransitioning ? 'Updating...' : 'Confirm Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Profile Edit/Create Modal */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              {employee.hasTeacherProfile
                ? 'Edit Teacher Academic Profile'
                : 'Create Teacher Academic Profile'}
            </h3>

            {teacherError && (
              <div className="rounded bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {teacherError}
              </div>
            )}

            <form onSubmit={handleSaveTeacherProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Primary Subject *
                </label>
                <input
                  type="text"
                  required
                  value={primarySubject}
                  onChange={(e) => setPrimarySubject(e.target.value)}
                  placeholder="e.g. Mathematics, Physics, English"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Specialization
                </label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Calculus, Organic Chemistry"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Secondary Subjects (Comma-separated)
                </label>
                <input
                  type="text"
                  value={secondarySubjectsStr}
                  onChange={(e) => setSecondarySubjectsStr(e.target.value)}
                  placeholder="e.g. Statistics, Algebra"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Max Weekly Periods
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={maxWeeklyPeriods}
                    onChange={(e) => setMaxWeeklyPeriods(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    checked={isAvailableForTimetable}
                    onChange={(e) => setIsAvailableForTimetable(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isAvailable" className="text-xs font-medium text-gray-700">
                    Available for Timetable
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Bio / Profile Summary
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Brief summary of academic background..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTeacherModalOpen(false)}
                  className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTeacher || isUpdatingTeacher}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreatingTeacher || isUpdatingTeacher ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
