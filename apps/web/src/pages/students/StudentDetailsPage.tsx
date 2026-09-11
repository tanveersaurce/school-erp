import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetStudentByIdQuery,
  useTransitionStudentStatusMutation,
  useAddStudentDocumentMutation,
  useVerifyStudentDocumentMutation,
  useDeleteStudentDocumentMutation,
  useLinkStudentGuardianMutation,
  useUnlinkStudentGuardianMutation,
  useGetGuardiansQuery,
} from '../../features/student/studentApi.js';
import { Can } from '../../components/auth/Can.js';
import {
  StudentStatus,
  StudentDocumentType,
  DocumentVerificationStatus,
  GuardianRelationType,
} from '@edusphere/common';

export const StudentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'profile' | 'guardians' | 'documents' | 'enrollment'>(
    'profile'
  );
  const [bannerMessage, setBannerMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Modals state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<StudentStatus>(StudentStatus.ACTIVE);
  const [statusReason, setStatusReason] = useState('');

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docType, setDocType] = useState<StudentDocumentType>(
    StudentDocumentType.BIRTH_CERTIFICATE
  );
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<
    DocumentVerificationStatus.VERIFIED | DocumentVerificationStatus.REJECTED
  >(DocumentVerificationStatus.VERIFIED);
  const [rejectReason, setRejectReason] = useState('');

  const [isLinkGuardianModalOpen, setIsLinkGuardianModalOpen] = useState(false);
  const [selectedGuardianId, setSelectedGuardianId] = useState('');
  const [guardianRelType, setGuardianRelType] = useState<GuardianRelationType>(
    GuardianRelationType.FATHER
  );
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);
  const [isEmergencyContact, setIsEmergencyContact] = useState(false);
  const [canPickup, setCanPickup] = useState(true);

  // Queries & Mutations
  const { data: studentRes, isLoading, refetch } = useGetStudentByIdQuery(id!, { skip: !id });
  const { data: guardiansRes } = useGetGuardiansQuery();
  const [transitionStatus, { isLoading: statusUpdating }] = useTransitionStudentStatusMutation();
  const [addDocument, { isLoading: docUploading }] = useAddStudentDocumentMutation();
  const [verifyDocument, { isLoading: verifying }] = useVerifyStudentDocumentMutation();
  const [deleteDocument] = useDeleteStudentDocumentMutation();
  const [linkGuardian, { isLoading: linkingGuardian }] = useLinkStudentGuardianMutation();
  const [unlinkGuardian] = useUnlinkStudentGuardianMutation();

  const student = studentRes?.data;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Loading student profile...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-red-700 border border-red-200">
          Student profile not found.
        </div>
        <button
          onClick={() => navigate('/students')}
          className="mt-4 rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          ← Back to Students
        </button>
      </div>
    );
  }

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusReason.trim()) {
      alert('Please provide a reason for the lifecycle status transition.');
      return;
    }
    try {
      await transitionStatus({
        id: student.id,
        data: { status: targetStatus, reason: statusReason.trim() },
      }).unwrap();
      setBannerMessage({
        text: `Student status transitioned to ${targetStatus}.`,
        type: 'success',
      });
      setIsStatusModalOpen(false);
      setStatusReason('');
      refetch();
    } catch (err: any) {
      setBannerMessage({
        text: err?.data?.message || err?.message || 'Failed to update student status.',
        type: 'error',
      });
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docUrl.trim()) {
      alert('Document title and file URL are required.');
      return;
    }
    try {
      await addDocument({
        studentId: student.id,
        data: {
          documentType: docType,
          title: docTitle.trim(),
          fileUrl: docUrl.trim(),
        },
      }).unwrap();
      setBannerMessage({ text: 'Document uploaded to student vault.', type: 'success' });
      setIsDocModalOpen(false);
      setDocTitle('');
      setDocUrl('');
      refetch();
    } catch (err: any) {
      setBannerMessage({
        text: err?.data?.message || err?.message || 'Failed to upload document.',
        type: 'error',
      });
    }
  };

  const handleVerifyDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) return;
    if (verifyStatus === DocumentVerificationStatus.REJECTED && !rejectReason.trim()) {
      alert('Rejection reason is required.');
      return;
    }
    try {
      await verifyDocument({
        studentId: student.id,
        docId: selectedDocId,
        data: {
          verificationStatus: verifyStatus,
          rejectionReason:
            verifyStatus === DocumentVerificationStatus.REJECTED ? rejectReason.trim() : undefined,
        },
      }).unwrap();
      setBannerMessage({ text: `Document marked as ${verifyStatus}.`, type: 'success' });
      setIsVerifyModalOpen(false);
      setSelectedDocId(null);
      setRejectReason('');
      refetch();
    } catch (err: any) {
      setBannerMessage({
        text: err?.data?.message || err?.message || 'Failed to verify document.',
        type: 'error',
      });
    }
  };

  const handleLinkGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuardianId) {
      alert('Please select a guardian.');
      return;
    }
    try {
      await linkGuardian({
        studentId: student.id,
        data: {
          guardianId: selectedGuardianId,
          relationshipType: guardianRelType,
          isPrimaryContact,
          isEmergencyContact,
          canPickup,
        },
      }).unwrap();
      setBannerMessage({ text: 'Guardian linked successfully.', type: 'success' });
      setIsLinkGuardianModalOpen(false);
      refetch();
    } catch (err: any) {
      setBannerMessage({
        text: err?.data?.message || err?.message || 'Failed to link guardian.',
        type: 'error',
      });
    }
  };

  const handleUnlinkGuardian = async (relationId: string, name: string) => {
    if (!window.confirm(`Unlink guardian '${name}' from student?`)) return;
    try {
      await unlinkGuardian({ studentId: student.id, id: relationId }).unwrap();
      setBannerMessage({ text: `Guardian '${name}' unlinked.`, type: 'success' });
      refetch();
    } catch (err: any) {
      setBannerMessage({
        text: err?.data?.message || err?.message || 'Failed to unlink guardian.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/students')}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            ← Back to Students
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-xs font-mono text-gray-500">ID: {student.studentId}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Can permission="student:update">
            <button
              onClick={() => {
                setTargetStatus(student.currentStatus);
                setIsStatusModalOpen(true);
              }}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-100"
            >
              Transition Status
            </button>
          </Can>
        </div>
      </div>

      {bannerMessage && (
        <div
          className={`flex items-center justify-between rounded-lg p-4 text-sm border ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{bannerMessage.text}</span>
          <button onClick={() => setBannerMessage(null)} className="font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Hero Profile Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-2xl text-white shadow-md">
              {student.personalDetails.firstName[0]}
              {student.personalDetails.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {student.personalDetails.firstName} {student.personalDetails.lastName}
                </h1>
                <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  {student.admissionNumber}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  {student.currentStatus}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Campus:{' '}
                <span className="font-semibold text-gray-700">
                  {student.campusName || 'Main Campus'}
                </span>{' '}
                • Admission Date:{' '}
                <span className="font-semibold text-gray-700">
                  {new Date(student.academicDetails.admissionDate).toLocaleDateString()}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Personal & Contact Details
          </button>
          <button
            onClick={() => setActiveTab('guardians')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'guardians'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Guardians & Relationships ({student.guardians?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'documents'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Document Vault ({student.documents?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('enrollment')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'enrollment'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Lifecycle & History
          </button>
        </div>
      </div>

      {/* TAB 1: Profile & Contact Details */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Gender</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {student.personalDetails.gender}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Date of Birth</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {new Date(student.personalDetails.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Blood Group</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {student.personalDetails.bloodGroup || 'Not specified'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Nationality</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {student.personalDetails.nationality || 'Indian'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Religion</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {student.personalDetails.religion || 'Not specified'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Category</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {student.personalDetails.category || 'General'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Contact & Residential Address
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-500">Direct Email</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {student.contactDetails.email || 'Not provided'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Primary Phone</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {student.contactDetails.phone || 'Not provided'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Emergency Contact Phone</span>
                <p className="font-semibold text-red-700 mt-0.5">
                  {student.contactDetails.emergencyPhone || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Residential Address</span>
                <p className="font-medium text-gray-900 mt-0.5">
                  {typeof student.contactDetails.currentAddress === 'string'
                    ? student.contactDetails.currentAddress
                    : `${student.contactDetails.currentAddress?.addressLine1}, ${student.contactDetails.currentAddress?.city}, ${student.contactDetails.currentAddress?.state} ${student.contactDetails.currentAddress?.postalCode}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Guardians */}
      {activeTab === 'guardians' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Linked Guardians & Family Members</h3>
            <Can permission="relationship:create">
              <button
                onClick={() => setIsLinkGuardianModalOpen(true)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                + Link Guardian
              </button>
            </Can>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {student.guardians && student.guardians.length > 0 ? (
              student.guardians.map((rel) => (
                <div
                  key={rel.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        {rel.guardian?.name || 'Guardian'}
                      </h4>
                      <p className="text-xs text-indigo-600 font-semibold">
                        {rel.relationshipType}
                      </p>
                    </div>
                    <Can permission="relationship:delete">
                      <button
                        onClick={() =>
                          handleUnlinkGuardian(rel.id, rel.guardian?.name || 'Guardian')
                        }
                        className="text-xs text-red-600 hover:text-red-800 font-semibold"
                      >
                        Unlink
                      </button>
                    </Can>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <div>
                      Phone:{' '}
                      <span className="font-medium text-gray-900">
                        {rel.guardian?.phone || 'N/A'}
                      </span>
                    </div>
                    <div>
                      Email:{' '}
                      <span className="font-medium text-gray-900">
                        {rel.guardian?.email || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100 text-[10px]">
                    {rel.isPrimaryContact && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 font-semibold text-blue-800">
                        Primary Contact
                      </span>
                    )}
                    {rel.isEmergencyContact && (
                      <span className="rounded bg-red-100 px-2 py-0.5 font-semibold text-red-800">
                        Emergency Contact
                      </span>
                    )}
                    {rel.canPickup && (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                        Pickup Authorized
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                No guardians linked yet. Click "+ Link Guardian" to attach parent or guardian
                contacts.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Document Vault */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Student Document Vault</h3>
              <p className="text-xs text-gray-500">
                Secure record of uploaded proofs and administrative verification
              </p>
            </div>
            <Can permission="student_document:create">
              <button
                onClick={() => setIsDocModalOpen(true)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                + Upload Document
              </button>
            </Can>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-3">Document Type</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Uploaded At</th>
                  <th className="px-6 py-3">Verification Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {student.documents && student.documents.length > 0 ? (
                  student.documents.map((doc: any) => (
                    <tr key={doc.id || doc._id}>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-900">
                        {doc.documentType}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-800">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          {doc.title} ↗
                        </a>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            doc.verificationStatus === DocumentVerificationStatus.VERIFIED
                              ? 'bg-emerald-100 text-emerald-800'
                              : doc.verificationStatus === DocumentVerificationStatus.REJECTED
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {doc.verificationStatus}
                        </span>
                        {doc.rejectionReason && (
                          <div className="text-[10px] text-red-600 mt-0.5">
                            Reason: {doc.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-right space-x-2">
                        <Can permission="student_document:verify">
                          <button
                            onClick={() => {
                              setSelectedDocId(doc.id || doc._id);
                              setIsVerifyModalOpen(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 font-semibold"
                          >
                            Verify
                          </button>
                        </Can>
                        <Can permission="student_document:delete">
                          <button
                            onClick={async () => {
                              if (!window.confirm('Delete this document?')) return;
                              await deleteDocument({
                                studentId: student.id,
                                docId: doc.id || doc._id,
                              }).unwrap();
                              refetch();
                            }}
                            className="text-red-600 hover:text-red-900 font-semibold ml-2"
                          >
                            Delete
                          </button>
                        </Can>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-xs text-gray-500">
                      No documents currently uploaded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Enrollment & Lifecycle History */}
      {activeTab === 'enrollment' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Status Transition Audit History
            </h3>
            <div className="space-y-3">
              {student.statusHistory && student.statusHistory.length > 0 ? (
                student.statusHistory.map((h: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 border-l-2 border-indigo-400 pl-4 py-1 text-xs"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        Transitioned from{' '}
                        <span className="font-mono text-gray-600">{h.previousStatus}</span> to{' '}
                        <span className="font-mono text-indigo-700">{h.newStatus}</span>
                      </p>
                      <p className="text-gray-500 mt-0.5">Reason: {h.reason || 'Not specified'}</p>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(h.changedAt).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500">No status changes recorded.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Status Transition */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Transition Student Lifecycle Status
            </h3>
            <form onSubmit={handleStatusTransition} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Target Status</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as StudentStatus)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {Object.values(StudentStatus).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Audit Reason *</label>
                <textarea
                  required
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Provide rationale for changing student status..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusUpdating}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {statusUpdating ? 'Updating...' : 'Confirm Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Document Upload */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-2">Upload Student Document</h3>
            <form onSubmit={handleAddDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as StudentDocumentType)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {Object.values(StudentDocumentType).map((dt) => (
                    <option key={dt} value={dt}>
                      {dt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Document Title *</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Birth Certificate Original Scan"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Secure File URL *</label>
                <input
                  type="url"
                  required
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder="https://storage.edusphere.io/vault/..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={docUploading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {docUploading ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Verify Document */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-2">Verify Student Document</h3>
            <form onSubmit={handleVerifyDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Verification Decision
                </label>
                <select
                  value={verifyStatus}
                  onChange={(e) => setVerifyStatus(e.target.value as any)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value={DocumentVerificationStatus.VERIFIED}>Verified (Approved)</option>
                  <option value={DocumentVerificationStatus.REJECTED}>Rejected</option>
                </select>
              </div>
              {verifyStatus === DocumentVerificationStatus.REJECTED && (
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Rejection Reason *
                  </label>
                  <textarea
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide reason for rejecting the document..."
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {verifying ? 'Saving...' : 'Submit Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Link Guardian */}
      {isLinkGuardianModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Link Guardian / Family Contact
            </h3>
            <form onSubmit={handleLinkGuardian} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Select Guardian *</label>
                <select
                  required
                  value={selectedGuardianId}
                  onChange={(e) => setSelectedGuardianId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select Guardian...</option>
                  {guardiansRes?.data?.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.personalDetails.firstName} {g.personalDetails.lastName} (
                      {g.contactDetails.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Relationship *</label>
                <select
                  value={guardianRelType}
                  onChange={(e) => setGuardianRelType(e.target.value as GuardianRelationType)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {Object.values(GuardianRelationType).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 text-xs text-gray-700 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimaryContact}
                    onChange={(e) => setIsPrimaryContact(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  Designate as Primary Contact
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEmergencyContact}
                    onChange={(e) => setIsEmergencyContact(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  Designate as Emergency Contact
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canPickup}
                    onChange={(e) => setCanPickup(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  Authorized to Pick Up Student
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkGuardianModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkingGuardian}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {linkingGuardian ? 'Linking...' : 'Link Guardian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
