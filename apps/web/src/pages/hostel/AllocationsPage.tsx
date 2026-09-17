import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Plus,
  RotateCw,
  XCircle,
} from 'lucide-react';
import {
  useGetAllocationsQuery,
  useAllocateBedMutation,
  useCheckInMutation,
  useCheckOutMutation,
  useCancelAllocationMutation,
  useGetHostelsQuery,
  useGetBuildingsQuery,
  useGetRoomsQuery,
  useGetBedsQuery,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { HostelAllocationStatus, BedStatus } from '@edusphere/common';

export const AllocationsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');

  // Modals
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutReason, setCheckoutReason] = useState('');
  const [clearanceStatus, setClearanceStatus] = useState('CLEARED');

  // Allocate Form
  const [studentId, setStudentId] = useState('');
  const [formHostelId, setFormHostelId] = useState('');
  const [formBuildingId, setFormBuildingId] = useState('');
  const [formRoomId, setFormRoomId] = useState('');
  const [formBedId, setFormBedId] = useState('');
  const [expectedCheckInDate, setExpectedCheckInDate] = useState('');
  const [reason, setReason] = useState('');

  const { data: hostelsRes } = useGetHostelsQuery();
  const hostels = hostelsRes?.data || [];

  const { data: buildingsRes } = useGetBuildingsQuery({ hostelId: formHostelId || undefined });
  const buildings = buildingsRes?.data || [];

  const { data: roomsRes } = useGetRoomsQuery({
    hostelId: formHostelId || undefined,
    buildingId: formBuildingId || undefined,
  });
  const rooms = roomsRes?.data || [];

  const { data: bedsRes } = useGetBedsQuery({
    roomId: formRoomId || undefined,
    status: BedStatus.AVAILABLE,
  });
  const availableBeds = bedsRes?.data || [];

  const { data: allocationsRes, isLoading, refetch } = useGetAllocationsQuery({
    status: statusFilter || undefined,
    hostelId: hostelFilter || undefined,
  });

  const [allocateBed, { isLoading: isAllocating }] = useAllocateBedMutation();
  const [checkIn] = useCheckInMutation();
  const [checkOut] = useCheckOutMutation();
  const [cancelAllocation] = useCancelAllocationMutation();

  const allocations = allocationsRes?.data?.items || [];

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await allocateBed({
        studentId,
        academicYearId: '650000000000000000000001',
        hostelId: formHostelId,
        buildingId: formBuildingId,
        roomId: formRoomId,
        bedId: formBedId,
        expectedCheckInDate: expectedCheckInDate || new Date().toISOString(),
        reason,
      }).unwrap();
      setIsAllocateOpen(false);
      setStudentId('');
      setFormBedId('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to allocate bed');
    }
  };

  const handleCheckIn = async (id: string) => {
    try {
      await checkIn(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to check in student');
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocation) return;
    try {
      await checkOut({
        id: selectedAllocation.id || selectedAllocation._id,
        checkoutReason,
        clearanceStatus,
      }).unwrap();
      setIsCheckoutOpen(false);
      setSelectedAllocation(null);
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to checkout student');
    }
  };

  const handleCancel = async (id: string) => {
    const r = window.prompt('Reason for canceling allocation:');
    if (!r) return;
    try {
      await cancelAllocation({ id, reason: r }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to cancel allocation');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-indigo-400" />
            Hostel Allocations
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Student bed assignments, check-ins, clearances, and transfers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/hostel/transfers">
            <Button variant="secondary" leftIcon={<RotateCw className="w-4 h-4" />}>
              Room Transfers
            </Button>
          </Link>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAllocateOpen(true)}
          >
            New Allocation
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <select
              value={hostelFilter}
              onChange={(e) => setHostelFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Hostels</option>
              {hostels.map((h) => (
                <option key={h.id || h._id} value={h.id || h._id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Allocation Statuses</option>
              <option value={HostelAllocationStatus.ALLOCATED}>Allocated (Awaiting Check-in)</option>
              <option value={HostelAllocationStatus.CHECKED_IN}>Checked In (Active Resident)</option>
              <option value={HostelAllocationStatus.CHECKED_OUT}>Checked Out (Vacated)</option>
              <option value={HostelAllocationStatus.TRANSFERRED}>Transferred</option>
              <option value={HostelAllocationStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Allocations Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : allocations.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          No student allocations found. Click "New Allocation" to assign a room and bed.
        </Card>
      ) : (
        <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold uppercase text-slate-400">
                  <th className="p-4">Student</th>
                  <th className="p-4">Hostel & Room</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Allocation Date</th>
                  <th className="p-4">Check-in / Check-out</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {allocations.map((a) => {
                  const isCheckedIn = a.status === HostelAllocationStatus.CHECKED_IN;
                  const isAllocated = a.status === HostelAllocationStatus.ALLOCATED;
                  return (
                    <tr key={a.id || a._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-semibold text-white">
                        <span className="font-mono text-xs text-indigo-300 block">
                          {String(a.studentId?._id || a.studentId)}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-300">
                        <div className="font-medium text-white">
                          Room: {String(a.roomId?._id || a.roomId)}
                        </div>
                        <div className="text-slate-500">
                          Bed: {String(a.bedId?._id || a.bedId)}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                            isCheckedIn
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isAllocated
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : a.status === HostelAllocationStatus.CHECKED_OUT
                              ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                              : a.status === HostelAllocationStatus.TRANSFERRED
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {new Date(a.allocationDate).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {a.actualCheckInDate ? (
                          <span className="text-emerald-400 block">
                            In: {new Date(a.actualCheckInDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-500 block">Pending In</span>
                        )}
                        {a.actualCheckOutDate && (
                          <span className="text-slate-400 block">
                            Out: {new Date(a.actualCheckOutDate).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {isAllocated && (
                          <button
                            onClick={() => handleCheckIn(a.id || a._id || '')}
                            className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/20"
                          >
                            Check In
                          </button>
                        )}
                        {isCheckedIn && (
                          <button
                            onClick={() => {
                              setSelectedAllocation(a);
                              setIsCheckoutOpen(true);
                            }}
                            className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/20"
                          >
                            Check Out
                          </button>
                        )}
                        {(isAllocated || isCheckedIn) && (
                          <button
                            onClick={() => handleCancel(a.id || a._id || '')}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded"
                            title="Cancel Allocation"
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

      {/* Allocate Bed Modal */}
      <Dialog
        isOpen={isAllocateOpen}
        onClose={() => setIsAllocateOpen(false)}
        title="Allocate Bed to Student"
        description="Assign a physical bed to a registered student"
      >
        <form onSubmit={handleAllocate} className="space-y-4">
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
              value={formHostelId}
              onChange={(e) => {
                setFormHostelId(e.target.value);
                setFormBuildingId('');
                setFormRoomId('');
                setFormBedId('');
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select Hostel</option>
              {hostels.map((h) => (
                <option key={h.id || h._id} value={h.id || h._id}>
                  {h.name} ({h.type})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Building *</label>
              <select
                required
                value={formBuildingId}
                onChange={(e) => {
                  setFormBuildingId(e.target.value);
                  setFormRoomId('');
                  setFormBedId('');
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select Building</option>
                {buildings.map((b) => (
                  <option key={b.id || b._id} value={b.id || b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Room *</label>
              <select
                required
                value={formRoomId}
                onChange={(e) => {
                  setFormRoomId(e.target.value);
                  setFormBedId('');
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select Room</option>
                {rooms.map((r) => (
                  <option key={r.id || r._id} value={r.id || r._id}>
                    Room {r.roomNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Available Bed *</label>
            <select
              required
              value={formBedId}
              onChange={(e) => setFormBedId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select Available Bed</option>
              {availableBeds.map((bed) => (
                <option key={bed.id || bed._id} value={bed.id || bed._id}>
                  Bed {bed.bedNumber} ({bed.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Check-in Date</label>
              <input
                type="date"
                value={expectedCheckInDate}
                onChange={(e) => setExpectedCheckInDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Notes</label>
              <input
                type="text"
                placeholder="e.g. Regular Boarder"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsAllocateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isAllocating}>
              {isAllocating ? 'Allocating...' : 'Confirm Allocation'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setSelectedAllocation(null);
        }}
        title="Check Out / Vacate Student"
        description="Record student checkout, room inventory inspection, and clearance"
      >
        <form onSubmit={handleCheckoutSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Clearance Status *</label>
            <select
              value={clearanceStatus}
              onChange={(e) => setClearanceStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="CLEARED">Cleared (All dues & keys returned)</option>
              <option value="PENDING">Pending Final Inspection</option>
              <option value="WITHHELD">Withheld (Damages / outstanding fees)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Checkout Reason</label>
            <textarea
              rows={2}
              placeholder="e.g. End of academic session, relocation, day-scholar transition"
              value={checkoutReason}
              onChange={(e) => setCheckoutReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setIsCheckoutOpen(false);
                setSelectedAllocation(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Confirm Checkout
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
