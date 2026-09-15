import React, { useState } from 'react';
import {
  Users,
  Search,
  Calendar,
  FileText,
  Upload,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { useGetEmployeesQuery } from '../../features/employee/employeeApi.js';
import {
  useGetEmployeeHrProfileQuery,
  useUpdateEmployeeHrProfileMutation,
  useTransitionEmployeeStatusMutation,
  useUploadHrDocumentMutation,
  useDeleteHrDocumentMutation,
} from '../../features/hr/hrApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const EmployeeHrPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Status transition state
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [statusReason, setStatusReason] = useState('');

  // HR Profile edit state
  const [workLocation, setWorkLocation] = useState('');
  const [probationEndDate, setProbationEndDate] = useState('');
  const [confirmationDate, setConfirmationDate] = useState('');

  // Document upload state
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('CONTRACT');
  const [docUrl, setDocUrl] = useState('');

  const { data: employeesRes, isLoading: loadingEmployees } = useGetEmployeesQuery();
  const employees = employeesRes?.data || [];

  const {
    data: profileRes,
    isLoading: loadingProfile,
    refetch: refetchProfile,
  } = useGetEmployeeHrProfileQuery(selectedEmployeeId || '', {
    skip: !selectedEmployeeId,
  });

  const [updateProfile, { isLoading: updatingProfile }] = useUpdateEmployeeHrProfileMutation();
  const [transitionStatus, { isLoading: transitioningStatus }] = useTransitionEmployeeStatusMutation();
  const [uploadDoc, { isLoading: uploadingDoc }] = useUploadHrDocumentMutation();
  const [deleteDoc] = useDeleteHrDocumentMutation();

  const profile = profileRes?.data;

  // Auto-populate edit fields when profile loads
  React.useEffect(() => {
    if (profile) {
      setWorkLocation(profile.workLocation || '');
      setProbationEndDate(
        profile.probationEndDate ? new Date(profile.probationEndDate).toISOString().substring(0, 10) : ''
      );
      setConfirmationDate(
        profile.confirmationDate ? new Date(profile.confirmationDate).toISOString().substring(0, 10) : ''
      );
      setNewStatus(profile.employmentStatus || 'ACTIVE');
    }
  }, [profile]);

  const filteredEmployees = employees.filter((emp: any) => {
    const name = `${emp.firstName || ''} ${emp.lastName || ''} ${emp.displayName || ''}`.toLowerCase();
    const code = (emp.employeeId || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    try {
      await updateProfile({
        employeeId: selectedEmployeeId,
        data: {
          workLocation,
          probationEndDate: probationEndDate ? new Date(probationEndDate).toISOString() : undefined,
          confirmationDate: confirmationDate ? new Date(confirmationDate).toISOString() : undefined,
        },
      }).unwrap();
      refetchProfile();
      alert('HR profile updated successfully.');
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update HR profile.');
    }
  };

  const handleStatusTransition = async () => {
    if (!selectedEmployeeId) return;
    try {
      await transitionStatus({
        employeeId: selectedEmployeeId,
        data: { status: newStatus, reason: statusReason },
      }).unwrap();
      refetchProfile();
      setStatusReason('');
      alert(`Employee status transitioned to ${newStatus}.`);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to transition status.');
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !docName || !docUrl) return;
    try {
      await uploadDoc({
        employeeId: selectedEmployeeId,
        data: {
          documentType: docType,
          name: docName,
          fileUrl: docUrl,
        },
      }).unwrap();
      setDocName('');
      setDocUrl('');
      refetchProfile();
      alert('Document attached.');
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to attach document.');
    }
  };

  const handleDeleteDoc = async (documentId: string) => {
    if (!selectedEmployeeId || !confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteDoc({ employeeId: selectedEmployeeId, documentId }).unwrap();
      refetchProfile();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to remove document.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-indigo-400" />
            Employee HR Profiles & Lifecycle
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage probation, confirmation, employment status transitions and official personnel documents
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Employee Directory */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 bg-slate-800/80 border-slate-700">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-900/60 border-slate-700"
              />
            </div>

            {loadingEmployees ? (
              <div className="py-12 flex justify-center">
                <Spinner size="md" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No employees found.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredEmployees.map((emp: any) => (
                  <button
                    key={emp._id}
                    onClick={() => setSelectedEmployeeId(emp._id)}
                    className={`w-full text-left p-3 rounded-xl transition border flex items-center justify-between ${
                      selectedEmployeeId === emp._id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-sm">
                        {emp.displayName || `${emp.firstName} ${emp.lastName}`}
                      </p>
                      <p className="text-xs text-slate-400">
                        {emp.employeeId} &bull; {emp.departmentId?.name || 'Academic'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        emp.employmentStatus === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : emp.employmentStatus === 'PROBATION'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {emp.employmentStatus}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: HR Profile & Actions */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedEmployeeId ? (
            <Card className="p-12 text-center bg-slate-800/40 border-slate-700">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-300">Select an Employee</h3>
              <p className="text-slate-500 text-sm mt-1">
                Choose an employee from the directory on the left to manage their HR profile and documents.
              </p>
            </Card>
          ) : loadingProfile ? (
            <div className="py-24 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : profile ? (
            <>
              {/* Employee Summary Card */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-white">
                        {(profile as any).fullName || profile.employeeCode}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {profile.employeeCode}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      {(profile as any).designationName || 'Staff'} &bull; {(profile as any).departmentName || 'Academic'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Current Status:</span>
                    <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      {profile.employmentStatus}
                    </span>
                  </div>
                </div>

                {/* Status Transition Control */}
                <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                    Lifecycle Status Transition
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PROBATION">PROBATION</option>
                      <option value="ON_LEAVE">ON_LEAVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="RESIGNED">RESIGNED</option>
                      <option value="TERMINATED">TERMINATED</option>
                      <option value="RETIRED">RETIRED</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>

                    <Input
                      placeholder="Reason for change..."
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      className="bg-slate-800 border-slate-700"
                    />

                    <Button
                      onClick={handleStatusTransition}
                      isLoading={transitioningStatus}
                      variant="primary"
                    >
                      Apply Status
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Lifecycle & Work Details Form */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Probation & Work Location Details
                </h3>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Work Location</label>
                      <Input
                        value={workLocation}
                        onChange={(e) => setWorkLocation(e.target.value)}
                        placeholder="e.g. Main Campus / Remote"
                        className="bg-slate-900 border-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Probation End Date</label>
                      <Input
                        type="date"
                        value={probationEndDate}
                        onChange={(e) => setProbationEndDate(e.target.value)}
                        className="bg-slate-900 border-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Confirmation Date</label>
                      <Input
                        type="date"
                        value={confirmationDate}
                        onChange={(e) => setConfirmationDate(e.target.value)}
                        className="bg-slate-900 border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" isLoading={updatingProfile} variant="secondary">
                      Save HR Details
                    </Button>
                  </div>
                </form>
              </Card>

              {/* HR Documents Attachment Section */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Official Personnel Documents ({profile.documents?.length || 0})
                </h3>

                {/* Upload Form */}
                <form onSubmit={handleUploadDoc} className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 mb-5">
                  <p className="text-xs font-semibold text-slate-300 mb-2">Attach New Document Record</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      placeholder="Document Name (e.g. Offer Letter)"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      required
                      className="bg-slate-800 border-slate-700"
                    />

                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="CONTRACT">CONTRACT</option>
                      <option value="OFFER_LETTER">OFFER_LETTER</option>
                      <option value="RESUME">RESUME</option>
                      <option value="IDENTIFICATION">IDENTIFICATION</option>
                      <option value="DEGREE_CERTIFICATE">DEGREE_CERTIFICATE</option>
                      <option value="RELIEVING_LETTER">RELIEVING_LETTER</option>
                      <option value="PAYSLIP_PREVIOUS">PAYSLIP_PREVIOUS</option>
                      <option value="OTHER">OTHER</option>
                    </select>

                    <Input
                      placeholder="File URL / Storage Link"
                      value={docUrl}
                      onChange={(e) => setDocUrl(e.target.value)}
                      required
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button type="submit" size="sm" variant="primary" isLoading={uploadingDoc} leftIcon={<Upload className="w-3.5 h-3.5" />}>
                      Attach Document
                    </Button>
                  </div>
                </form>

                {/* Documents List */}
                {profile.documents && profile.documents.length > 0 ? (
                  <div className="space-y-2">
                    {profile.documents.map((doc) => {
                      const docId = (doc as any)._id || doc.id;
                      return (
                        <div
                          key={docId}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-indigo-400" />
                            <div>
                              <p className="text-sm font-semibold text-white">{doc.name}</p>
                              <p className="text-xs text-slate-400">
                                {doc.documentType} &bull; Attached {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1"
                            >
                              View
                            </a>
                            <button
                              onClick={() => handleDeleteDoc(docId)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                              title="Delete Document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">No documents attached yet.</p>
                )}
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
