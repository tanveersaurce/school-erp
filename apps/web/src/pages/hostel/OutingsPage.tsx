import React, { useState } from 'react';
import {
  Compass,
  Plus,
  XCircle,
  MapPin,
} from 'lucide-react';
import {
  useGetOutingsQuery,
  useRequestOutingMutation,
  useApproveOutingMutation,
  useRecordOutingDepartureMutation,
  useRecordOutingReturnMutation,
  useCancelOutingMutation,
  useGetHostelsQuery,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { HostelOutingStatus } from '@edusphere/common';

export const OutingsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  // Form
  const [studentId, setStudentId] = useState('');
  const [hostelId, setHostelId] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [expectedReturnDateTime, setExpectedReturnDateTime] = useState('');
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');

  const { data: hostelsRes } = useGetHostelsQuery();
  const hostels = hostelsRes?.data || [];

  const { data: outingsRes, isLoading, refetch } = useGetOutingsQuery({
    status: statusFilter || undefined,
  });

  const [requestOuting, { isLoading: isRequesting }] = useRequestOutingMutation();
  const [approveOuting] = useApproveOutingMutation();
  const [recordDeparture] = useRecordOutingDepartureMutation();
  const [recordReturn] = useRecordOutingReturnMutation();
  const [cancelOuting] = useCancelOutingMutation();

  const outings = outingsRes?.data?.items || [];

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestOuting({
        studentId,
        hostelId: hostelId || (hostels[0]?.id as any),
        startDateTime,
        expectedReturnDateTime,
        destination,
        reason,
      }).unwrap();
      setIsRequestOpen(false);
      setStudentId('');
      setDestination('');
      setReason('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to submit outing request');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveOuting(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to approve outing');
    }
  };

  const handleDepart = async (id: string) => {
    try {
      await recordDeparture(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to log departure');
    }
  };

  const handleReturn = async (id: string) => {
    try {
      await recordReturn(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to log return');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this outing pass?')) return;
    try {
      await cancelOuting(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to cancel outing');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Compass className="w-7 h-7 text-indigo-400" />
            Student Outings & Gate Passes
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Outing permit requests, warden approvals, departure tracking, and curfew verification
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsRequestOpen(true)}
        >
          Request Outing Pass
        </Button>
      </div>

      {/* Filter */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Outing Statuses</option>
              <option value={HostelOutingStatus.REQUESTED}>Requested (Pending Warden)</option>
              <option value={HostelOutingStatus.APPROVED}>Approved (Ready for Departure)</option>
              <option value={HostelOutingStatus.OUT}>Currently Out</option>
              <option value={HostelOutingStatus.OVERDUE}>Overdue Curfew</option>
              <option value={HostelOutingStatus.RETURNED}>Returned & Closed</option>
              <option value={HostelOutingStatus.REJECTED}>Rejected</option>
              <option value={HostelOutingStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Outings Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : outings.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          No outing permits found.
        </Card>
      ) : (
        <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold uppercase text-slate-400">
                  <th className="p-4">Student</th>
                  <th className="p-4">Destination & Reason</th>
                  <th className="p-4">Timings</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Gate Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {outings.map((o) => {
                  const isRequested = o.status === HostelOutingStatus.REQUESTED;
                  const isApproved = o.status === HostelOutingStatus.APPROVED;
                  const isOut = o.status === HostelOutingStatus.OUT;
                  const isOverdue = o.status === HostelOutingStatus.OVERDUE;

                  return (
                    <tr key={o.id || o._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-mono font-semibold text-white">
                        {String(o.studentId?._id || o.studentId)}
                      </td>
                      <td className="p-4 text-xs text-slate-300">
                        <div className="font-semibold text-white flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                          {o.destination}
                        </div>
                        <div className="text-slate-400 mt-0.5">{o.reason}</div>
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        <div>
                          Start: <strong className="text-slate-200">{new Date(o.startDateTime).toLocaleString()}</strong>
                        </div>
                        <div>
                          Return by: <strong className="text-indigo-300">{new Date(o.expectedReturnDateTime).toLocaleString()}</strong>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                            isOverdue
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold'
                              : isOut
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : isApproved
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isRequested
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {isRequested && (
                          <button
                            onClick={() => handleApprove(o.id || o._id || '')}
                            className="px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold border border-indigo-500/20"
                          >
                            Approve
                          </button>
                        )}
                        {isApproved && (
                          <button
                            onClick={() => handleDepart(o.id || o._id || '')}
                            className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/20"
                          >
                            Log Exit
                          </button>
                        )}
                        {(isOut || isOverdue) && (
                          <button
                            onClick={() => handleReturn(o.id || o._id || '')}
                            className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/20"
                          >
                            Log Return
                          </button>
                        )}
                        {(isRequested || isApproved) && (
                          <button
                            onClick={() => handleCancel(o.id || o._id || '')}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded"
                            title="Cancel Outing"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Request Outing Dialog */}
      <Dialog
        isOpen={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
        title="Request Student Outing Pass"
        description="Submit an official residential gate pass permit"
      >
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Student ID *</label>
            <input
              type="text"
              required
              placeholder="e.g. Student ObjectId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Hostel *</label>
            <select
              required
              value={hostelId}
              onChange={(e) => setHostelId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select Hostel</option>
              {hostels.map((h) => (
                <option key={h.id || h._id} value={h.id || h._id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Departure Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Return *</label>
              <input
                type="datetime-local"
                required
                value={expectedReturnDateTime}
                onChange={(e) => setExpectedReturnDateTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Destination *</label>
            <input
              type="text"
              required
              placeholder="e.g. City Mall / Home / Hospital"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reason *</label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Weekend visit to family"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsRequestOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isRequesting}>
              {isRequesting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
