import React, { useState } from 'react';
import {
  useCreateStudentMutation,
  useGetNextAdmissionNumberQuery,
  useGetNextStudentIdQuery,
} from '../../features/student/studentApi.js';
import { useGetCampusesQuery, useGetAcademicYearsQuery } from '../../features/tenant/tenantApi.js';
import { Gender, AdmissionType, GuardianRelationType } from '@edusphere/common';

interface CreateStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (studentName: string, admissionNumber: string) => void;
}

export const CreateStudentModal: React.FC<CreateStudentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [createStudent, { isLoading }] = useCreateStudentMutation();
  const { data: campusRes } = useGetCampusesQuery();
  const { data: academicYearsRes } = useGetAcademicYearsQuery();

  const [activeTab, setActiveTab] = useState<'personal' | 'academic' | 'guardian' | 'account'>(
    'personal'
  );
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    gender: Gender.MALE,
    dateOfBirth: '2010-01-01',
    bloodGroup: '',
    nationality: 'Indian',
    religion: '',
    category: '',
    profilePhoto: '',
    email: '',
    phone: '',
    emergencyPhone: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    campusId: '',
    currentAcademicYearId: '',
    admissionDate: new Date().toISOString().split('T')[0],
    admissionType: AdmissionType.REGULAR,
    autoAdmissionNumber: true,
    customAdmissionNumber: '',
    autoStudentId: true,
    customStudentId: '',
    includeGuardian: true,
    guardianFirstName: '',
    guardianLastName: '',
    guardianEmail: '',
    guardianPhone: '',
    guardianRelation: GuardianRelationType.FATHER,
    isPrimaryContact: true,
    isEmergencyContact: true,
    canPickup: true,
    provisionUser: false,
    sendUserInvitation: true,
    userPassword: '',
  });

  const { data: nextAdmData } = useGetNextAdmissionNumberQuery(
    formData.campusId ? { campusId: formData.campusId } : undefined,
    { skip: !formData.autoAdmissionNumber }
  );
  const { data: nextStudentIdData } = useGetNextStudentIdQuery(
    formData.campusId ? { campusId: formData.campusId } : undefined,
    { skip: !formData.autoStudentId }
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Student first and last name are required.');
      setActiveTab('personal');
      return;
    }

    if (
      !formData.addressLine1.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.postalCode.trim()
    ) {
      setError('Complete residential address is required.');
      setActiveTab('personal');
      return;
    }

    if (
      formData.includeGuardian &&
      (!formData.guardianFirstName.trim() ||
        !formData.guardianLastName.trim() ||
        !formData.guardianPhone.trim() ||
        !formData.guardianEmail.trim())
    ) {
      setError('Guardian details (first name, last name, phone, email) are required.');
      setActiveTab('guardian');
      return;
    }

    if (
      formData.provisionUser &&
      !formData.sendUserInvitation &&
      (!formData.userPassword || formData.userPassword.length < 8)
    ) {
      setError('Direct user password must be at least 8 characters long.');
      setActiveTab('account');
      return;
    }

    try {
      const payload: any = {
        admissionNumber: formData.autoAdmissionNumber
          ? undefined
          : formData.customAdmissionNumber.trim(),
        studentId: formData.autoStudentId ? undefined : formData.customStudentId.trim(),
        campusId: formData.campusId || undefined,
        currentAcademicYearId: formData.currentAcademicYearId || undefined,
        admissionDate: formData.admissionDate,
        admissionType: formData.admissionType,
        personalDetails: {
          firstName: formData.firstName.trim(),
          middleName: formData.middleName.trim() || undefined,
          lastName: formData.lastName.trim(),
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth,
          bloodGroup: formData.bloodGroup || undefined,
          nationality: formData.nationality || 'Indian',
          religion: formData.religion || undefined,
          category: formData.category || undefined,
          profilePhoto: formData.profilePhoto.trim() || undefined,
        },
        contactDetails: {
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          emergencyPhone: formData.emergencyPhone.trim() || undefined,
          currentAddress: {
            addressLine1: formData.addressLine1.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            postalCode: formData.postalCode.trim(),
            country: formData.country.trim() || 'India',
          },
        },
        provisionUser: formData.provisionUser,
        sendUserInvitation: formData.provisionUser ? formData.sendUserInvitation : undefined,
        userPassword:
          formData.provisionUser && !formData.sendUserInvitation
            ? formData.userPassword
            : undefined,
      };

      if (formData.includeGuardian) {
        payload.primaryGuardian = {
          firstName: formData.guardianFirstName.trim(),
          lastName: formData.guardianLastName.trim(),
          email: formData.guardianEmail.trim(),
          phone: formData.guardianPhone.trim(),
          relationshipType: formData.guardianRelation,
          isPrimaryContact: formData.isPrimaryContact,
          isEmergencyContact: formData.isEmergencyContact,
          canPickup: formData.canPickup,
        };
      }

      if (formData.currentAcademicYearId) {
        payload.initialEnrollment = {
          academicYearId: formData.currentAcademicYearId,
          campusId: formData.campusId || undefined,
          startDate: formData.admissionDate,
        };
      }

      const res = await createStudent(payload).unwrap();
      const created = res.data;
      onSuccess(
        `${created.personalDetails.firstName} ${created.personalDetails.lastName}`,
        created.admissionNumber
      );
      onClose();
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Failed to register student.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Student Admission & Enrollment</h2>
            <p className="text-xs text-gray-500">
              Register new student profile with collision-safe admission numbering
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-gray-200 bg-white px-6">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'personal'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            1. Personal & Contact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'academic'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            2. Academic & ID
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guardian')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'guardian'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            3. Guardian Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'account'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            4. Portal Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {/* TAB 1: Personal & Contact Details */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Aarav"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Middle Name</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Sharma"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value={Gender.MALE}>Male</option>
                    <option value={Gender.FEMALE}>Female</option>
                    <option value={Gender.OTHER}>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Student Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="student@school.edu"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Student Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Emergency Phone</label>
                  <input
                    type="tel"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="+91 9876543211"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-800 mb-2">
                  Residential Address *
                </label>
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    placeholder="Address Line 1 (Street, Building, Flat) *"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City *"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State *"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      required
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="Postal Code *"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Country"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Academic & ID Details */}
          {activeTab === 'academic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Campus</label>
                  <select
                    value={formData.campusId}
                    onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select Campus</option>
                    {campusRes?.data?.map((c: any) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Academic Year</label>
                  <select
                    value={formData.currentAcademicYearId}
                    onChange={(e) =>
                      setFormData({ ...formData, currentAcademicYearId: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select Academic Year</option>
                    {academicYearsRes?.data?.map((ay: any) => (
                      <option key={ay._id || ay.id} value={ay._id || ay.id}>
                        {ay.name} {ay.isCurrent ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Admission Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.admissionDate}
                    onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Admission Type *
                  </label>
                  <select
                    value={formData.admissionType}
                    onChange={(e) =>
                      setFormData({ ...formData, admissionType: e.target.value as AdmissionType })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value={AdmissionType.REGULAR}>Regular Admission</option>
                    <option value={AdmissionType.TRANSFER}>Transfer</option>
                    <option value={AdmissionType.SCHOLARSHIP}>Scholarship</option>
                    <option value={AdmissionType.MANAGEMENT}>Management</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100 space-y-4">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  Collision-Safe Identifiers
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-700">Admission Number</label>
                      <label className="flex items-center gap-1.5 text-xs text-indigo-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.autoAdmissionNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, autoAdmissionNumber: e.target.checked })
                          }
                          className="rounded text-indigo-600"
                        />
                        Auto-generate
                      </label>
                    </div>
                    {formData.autoAdmissionNumber ? (
                      <div className="mt-1 p-2 rounded bg-white border border-indigo-200 text-xs font-mono text-indigo-700">
                        Preview: {nextAdmData?.data?.admissionNumber || 'ADM-YYYY-####'}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formData.customAdmissionNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, customAdmissionNumber: e.target.value })
                        }
                        placeholder="e.g. ADM-2026-0001"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none font-mono"
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-700">Student ID</label>
                      <label className="flex items-center gap-1.5 text-xs text-indigo-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.autoStudentId}
                          onChange={(e) =>
                            setFormData({ ...formData, autoStudentId: e.target.checked })
                          }
                          className="rounded text-indigo-600"
                        />
                        Auto-generate
                      </label>
                    </div>
                    {formData.autoStudentId ? (
                      <div className="mt-1 p-2 rounded bg-white border border-indigo-200 text-xs font-mono text-indigo-700">
                        Preview: {nextStudentIdData?.data?.studentId || 'STD-YYYY-####'}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formData.customStudentId}
                        onChange={(e) =>
                          setFormData({ ...formData, customStudentId: e.target.value })
                        }
                        placeholder="e.g. STD-2026-0001"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none font-mono"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Guardian Details */}
          {activeTab === 'guardian' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                <span className="text-sm font-medium text-gray-800">
                  Add Primary Guardian with Student
                </span>
                <input
                  type="checkbox"
                  checked={formData.includeGuardian}
                  onChange={(e) => setFormData({ ...formData, includeGuardian: e.target.checked })}
                  className="h-4 w-4 rounded text-indigo-600"
                />
              </div>

              {formData.includeGuardian && (
                <div className="space-y-4 border-l-2 border-indigo-300 pl-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Guardian First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.guardianFirstName}
                        onChange={(e) =>
                          setFormData({ ...formData, guardianFirstName: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Guardian Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.guardianLastName}
                        onChange={(e) =>
                          setFormData({ ...formData, guardianLastName: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Relationship *
                      </label>
                      <select
                        value={formData.guardianRelation}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            guardianRelation: e.target.value as GuardianRelationType,
                          })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                      >
                        <option value={GuardianRelationType.FATHER}>Father</option>
                        <option value={GuardianRelationType.MOTHER}>Mother</option>
                        <option value={GuardianRelationType.GUARDIAN}>Guardian</option>
                        <option value={GuardianRelationType.OTHER}>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Guardian Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.guardianPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, guardianPhone: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Guardian Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.guardianEmail}
                        onChange={(e) =>
                          setFormData({ ...formData, guardianEmail: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-gray-700 pt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isPrimaryContact}
                        onChange={(e) =>
                          setFormData({ ...formData, isPrimaryContact: e.target.checked })
                        }
                        className="rounded text-indigo-600"
                      />
                      Primary Contact
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isEmergencyContact}
                        onChange={(e) =>
                          setFormData({ ...formData, isEmergencyContact: e.target.checked })
                        }
                        className="rounded text-indigo-600"
                      />
                      Emergency Contact
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canPickup}
                        onChange={(e) => setFormData({ ...formData, canPickup: e.target.checked })}
                        className="rounded text-indigo-600"
                      />
                      Authorized Pickup
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Portal Account */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div>
                  <span className="text-sm font-medium text-gray-800">
                    Provision Student Portal Account
                  </span>
                  <p className="text-xs text-gray-500">
                    Allows student to sign into EduSphere portal with student email
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.provisionUser}
                  onChange={(e) => setFormData({ ...formData, provisionUser: e.target.checked })}
                  className="h-4 w-4 rounded text-indigo-600"
                />
              </div>

              {formData.provisionUser && (
                <div className="space-y-4 border-l-2 border-indigo-300 pl-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                      <input
                        type="radio"
                        name="accountActivation"
                        checked={formData.sendUserInvitation}
                        onChange={() => setFormData({ ...formData, sendUserInvitation: true })}
                        className="text-indigo-600"
                      />
                      Send 48-hour secure cryptographic invitation email (Recommended)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                      <input
                        type="radio"
                        name="accountActivation"
                        checked={!formData.sendUserInvitation}
                        onChange={() => setFormData({ ...formData, sendUserInvitation: false })}
                        className="text-indigo-600"
                      />
                      Set direct active password immediately
                    </label>
                  </div>

                  {!formData.sendUserInvitation && (
                    <div className="max-w-md">
                      <label className="block text-xs font-medium text-gray-700">
                        Initial Password (min 8 chars) *
                      </label>
                      <input
                        type="password"
                        value={formData.userPassword}
                        onChange={(e) => setFormData({ ...formData, userPassword: e.target.value })}
                        placeholder="••••••••"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="flex gap-2">
              {activeTab !== 'personal' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'academic') setActiveTab('personal');
                    if (activeTab === 'guardian') setActiveTab('academic');
                    if (activeTab === 'account') setActiveTab('guardian');
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Previous
                </button>
              )}
              {activeTab !== 'account' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'personal') setActiveTab('academic');
                    if (activeTab === 'academic') setActiveTab('guardian');
                    if (activeTab === 'guardian') setActiveTab('account');
                  }}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  Next Step
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 disabled:opacity-50"
              >
                {isLoading ? 'Registering...' : 'Register Student'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
