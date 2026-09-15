import React, { useState } from 'react';
import {
  CalendarCheck,
  Plus,
} from 'lucide-react';
import {
  useGetLeaveTypesQuery,
  useCreateLeaveTypeMutation,
  useGetLeavePoliciesQuery,
  useCreateLeavePolicyMutation,
  useGetLeaveApplicationsQuery,
  useReviewLeaveApplicationMutation,
  useApplyForLeaveMutation,
  useGetMyLeaveBalancesQuery,
} from '../../features/hr/hrApi.js';
import { useAppSelector } from '../../store/index.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const LeaveManagementPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<'applications' | 'types' | 'policies' | 'balances'>('applications');

  // New Leave Type modal state
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [typeMaxDays, setTypeMaxDays] = useState(12);
  const [typeIsPaid, setTypeIsPaid] = useState(true);

  // New Leave Policy modal state
  const [showCreatePolicyModal, setShowCreatePolicyModal] = useState(false);
  const [policyName, setPolicyName] = useState('');
  const [policyCode, setPolicyCode] = useState('');
  const [policyTypeId, setPolicyTypeId] = useState('');
  const [policyAllocation, setPolicyAllocation] = useState(12);
  const [policyAccrual, setPolicyAccrual] = useState('ANNUAL');

  // Apply Leave modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyTypeId, setApplyTypeId] = useState('');
  const [applyStartDate, setApplyStartDate] = useState('');
  const [applyEndDate, setApplyEndDate] = useState('');
  const [applyDuration, setApplyDuration] = useState('FULL_DAY');
  const [applyReason, setApplyReason] = useState('');

  // Review modal state
  const [reviewingAppId, setReviewingAppId] = useState<string | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');

  // API Queries
  const { data: typesRes } = useGetLeaveTypesQuery();
  const { data: policiesRes } = useGetLeavePoliciesQuery();
  const { data: appsRes, isLoading: loadingApps, refetch: refetchApps } = useGetLeaveApplicationsQuery();
  const { data: myBalancesRes, isLoading: loadingBalances } = useGetMyLeaveBalancesQuery();

  const [createType, { isLoading: creatingType }] = useCreateLeaveTypeMutation();
  const [createPolicy, { isLoading: creatingPolicy }] = useCreateLeavePolicyMutation();
  const [applyLeave, { isLoading: applyingLeave }] = useApplyForLeaveMutation();
  const [reviewLeave, { isLoading: reviewingLeave }] = useReviewLeaveApplicationMutation();

  const leaveTypes = Array.isArray(typesRes?.data) ? typesRes.data : [];
  const leavePolicies = Array.isArray(policiesRes?.data) ? policiesRes.data : [];
  const applications = Array.isArray(appsRes?.data) ? appsRes.data : [];
  const myBalances = Array.isArray(myBalancesRes?.data) ? myBalancesRes.data : [];

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createType({
        name: typeName,
        code: typeCode.toUpperCase(),
        maximumDays: Number(typeMaxDays),
        isPaid: typeIsPaid,
        requiresApproval: true,
      }).unwrap();
      setShowCreateTypeModal(false);
      setTypeName('');
      setTypeCode('');
      alert('Leave type created successfully.');
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create leave type.');
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPolicy({
        name: policyName,
        code: policyCode.toUpperCase(),
        leaveTypeId: policyTypeId,
        annualAllocation: Number(policyAllocation),
        accrualMode: policyAccrual,
        allowHalfDay: true,
      }).unwrap();
      setShowCreatePolicyModal(false);
      setPolicyName('');
      setPolicyCode('');
      alert('Leave policy created successfully.');
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create leave policy.');
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const empId = (user as any)?.employeeId || user?.id;
    if (!empId) {
      alert('Employee context not detected.');
      return;
    }

    try {
      await applyLeave({
        employeeId: empId,
        data: {
          leaveTypeId: applyTypeId,
          startDate: new Date(applyStartDate).toISOString(),
          endDate: new Date(applyEndDate).toISOString(),
          durationType: applyDuration,
          reason: applyReason,
        },
      }).unwrap();
      setShowApplyModal(false);
      setApplyReason('');
      refetchApps();
      alert('Leave application submitted successfully.');
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to submit leave application.');
    }
  };

  const handleReviewAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (!reviewingAppId) return;
    try {
      await reviewLeave({
        id: reviewingAppId,
        data: { status, remarks: reviewRemarks },
      }).unwrap();
      setReviewingAppId(null);
      setReviewRemarks('');
      refetchApps();
      alert(`Leave application marked as ${status}.`);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to review leave application.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CalendarCheck className="w-7 h-7 text-amber-400" />
            Leave Management & Accruals
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure leave policies, monitor balances, and review employee leave requests
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowApplyModal(true)}
          >
            Apply for Leave
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-700/80 pb-2">
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'applications'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Applications & Approvals ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab('balances')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'balances'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          My Leave Balances
        </button>
        <button
          onClick={() => setActiveTab('types')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'types'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Leave Types ({leaveTypes.length})
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'policies'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Policies ({leavePolicies.length})
        </button>
      </div>

      {/* TAB 1: Applications */}
      {activeTab === 'applications' && (
        <Card className="p-6 bg-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Leave Applications Registry</h2>
          </div>

          {loadingApps ? (
            <div className="py-12 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No leave applications found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {applications.map((app) => {
                    const appId = (app as any)._id || app.id;
                    return (
                      <tr key={appId} className="hover:bg-slate-700/20 transition">
                        <td className="py-3 px-4 font-semibold">
                          {(app as any).employeeId?.displayName ||
                            (app as any).employeeId?.firstName ||
                            'Employee'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                            {(app as any).leaveTypeId?.code || 'LEAVE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {new Date(app.startDate).toLocaleDateString()} &rarr;{' '}
                          {new Date(app.endDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-400">{app.totalDays}</td>
                        <td className="py-3 px-4 text-xs text-slate-300 max-w-xs truncate">
                          {app.reason}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                              app.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : app.status === 'REJECTED'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {app.status === 'PENDING' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReviewingAppId(appId)}
                            >
                              Review
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-500">Decided</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: My Balances */}
      {activeTab === 'balances' && (
        <Card className="p-6 bg-slate-800 border-slate-700">
          <h2 className="text-base font-bold text-white mb-4">My Leave Allocations & Balances</h2>
          {loadingBalances ? (
            <div className="py-12 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : myBalances.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">
              No leave balances initialized for your profile.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myBalances.map((bal) => (
                <div
                  key={(bal as any)._id || bal.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      {(bal as any).leaveTypeId?.name || 'Leave Type'}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      {(bal as any).leaveTypeId?.code || 'LV'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                    <div>
                      <p className="text-[10px] uppercase text-slate-400">Allocated</p>
                      <p className="font-bold text-slate-200 text-base">{bal.allocatedDays}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400">Used</p>
                      <p className="font-bold text-amber-400 text-base">{bal.usedDays}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400">Available</p>
                      <p className="font-bold text-emerald-400 text-base">{bal.availableDays}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: Leave Types */}
      {activeTab === 'types' && (
        <Card className="p-6 bg-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Configured Leave Types</h2>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateTypeModal(true)}
            >
              Add Leave Type
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaveTypes.map((type) => (
              <div
                key={(type as any)._id || type.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">{type.name}</h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    {type.code}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{type.description || 'Standard leave entitlement'}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">Max Days: {type.maximumDays}</span>
                  <span
                    className={`font-semibold ${
                      type.isPaid ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {type.isPaid ? 'Paid Leave' : 'Unpaid (LWP)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 4: Leave Policies */}
      {activeTab === 'policies' && (
        <Card className="p-6 bg-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Leave Policies</h2>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreatePolicyModal(true)}
            >
              Add Policy
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leavePolicies.map((pol) => (
              <div
                key={(pol as any)._id || pol.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">{pol.name}</h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    {pol.code}
                  </span>
                </div>
                <div className="text-xs text-slate-300 space-y-1 pt-1">
                  <p>Annual Allocation: <span className="font-bold text-white">{pol.annualAllocation} Days</span></p>
                  <p>Accrual Mode: <span className="text-indigo-400">{pol.accrualMode}</span></p>
                  <p>Half-Day Allowed: <span className="text-emerald-400">{pol.allowHalfDay ? 'Yes' : 'No'}</span></p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* MODAL: Apply Leave */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Apply for Leave</h3>
            <form onSubmit={handleApplyLeave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Leave Type</label>
                <select
                  value={applyTypeId}
                  onChange={(e) => setApplyTypeId(e.target.value)}
                  required
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Leave Type...</option>
                  {leaveTypes.map((t) => {
                    const tid = (t as any)._id || t.id;
                    return (
                      <option key={tid} value={tid}>
                        {t.name} ({t.code})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Start Date</label>
                  <Input
                    type="date"
                    required
                    value={applyStartDate}
                    onChange={(e) => setApplyStartDate(e.target.value)}
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">End Date</label>
                  <Input
                    type="date"
                    required
                    value={applyEndDate}
                    onChange={(e) => setApplyEndDate(e.target.value)}
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Duration</label>
                <select
                  value={applyDuration}
                  onChange={(e) => setApplyDuration(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="FULL_DAY">Full Day</option>
                  <option value="HALF_DAY">Half Day</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Reason</label>
                <textarea
                  required
                  rows={3}
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  placeholder="Reason for taking leave..."
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={() => setShowApplyModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={applyingLeave}>
                  Submit Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Review Application */}
      {reviewingAppId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Review Leave Application</h3>
            <p className="text-xs text-slate-400">
              Approved leaves will automatically synchronize with staff attendance records as EXCUSED.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Review Remarks</label>
              <textarea
                rows={3}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Approval or rejection remarks..."
                className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setReviewingAppId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReviewAction('REJECTED')}
                isLoading={reviewingLeave}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                onClick={() => handleReviewAction('APPROVED')}
                isLoading={reviewingLeave}
              >
                Approve Leave
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create Leave Type */}
      {showCreateTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create Leave Type</h3>
            <form onSubmit={handleCreateType} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Type Name</label>
                <Input
                  required
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  placeholder="e.g. Sick Leave"
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Code</label>
                <Input
                  required
                  value={typeCode}
                  onChange={(e) => setTypeCode(e.target.value)}
                  placeholder="e.g. SL"
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Max Days Per Year</label>
                <Input
                  type="number"
                  required
                  value={typeMaxDays}
                  onChange={(e) => setTypeMaxDays(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPaidCheck"
                  checked={typeIsPaid}
                  onChange={(e) => setTypeIsPaid(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isPaidCheck" className="text-xs text-slate-300">
                  Paid Leave (does not deduct LWP daily rate in payroll)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={() => setShowCreateTypeModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={creatingType}>
                  Save Type
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Leave Policy */}
      {showCreatePolicyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create Leave Policy</h3>
            <form onSubmit={handleCreatePolicy} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Policy Name</label>
                <Input
                  required
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="e.g. Annual Faculty Policy"
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Code</label>
                <Input
                  required
                  value={policyCode}
                  onChange={(e) => setPolicyCode(e.target.value)}
                  placeholder="e.g. POL_FAC_01"
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Leave Type</label>
                <select
                  value={policyTypeId}
                  onChange={(e) => setPolicyTypeId(e.target.value)}
                  required
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Leave Type...</option>
                  {leaveTypes.map((t) => {
                    const tid = (t as any)._id || t.id;
                    return (
                      <option key={tid} value={tid}>
                        {t.name} ({t.code})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Annual Allocation</label>
                  <Input
                    type="number"
                    required
                    value={policyAllocation}
                    onChange={(e) => setPolicyAllocation(Number(e.target.value))}
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Accrual Mode</label>
                  <select
                    value={policyAccrual}
                    onChange={(e) => setPolicyAccrual(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ANNUAL">ANNUAL</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="QUARTERLY">QUARTERLY</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={() => setShowCreatePolicyModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={creatingPolicy}>
                  Save Policy
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
