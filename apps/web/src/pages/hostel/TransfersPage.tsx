import React, { useState } from 'react';
import {
  RotateCw,
  ArrowRight,
  CheckCircle2,
  History,
} from 'lucide-react';
import {
  useGetAllocationsQuery,
  useTransferBedMutation,
  useGetHostelsQuery,
  useGetBuildingsQuery,
  useGetRoomsQuery,
  useGetBedsQuery,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { HostelAllocationStatus, BedStatus, HostelTransferReason } from '@edusphere/common';

export const TransfersPage: React.FC = () => {
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<any>(null);

  // Target Destination Form
  const [targetHostelId, setTargetHostelId] = useState('');
  const [targetBuildingId, setTargetBuildingId] = useState('');
  const [targetRoomId, setTargetRoomId] = useState('');
  const [targetBedId, setTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState<HostelTransferReason>(HostelTransferReason.REQUESTED);
  const [transferRemarks, setTransferRemarks] = useState('');

  const { data: hostelsRes } = useGetHostelsQuery();
  const hostels = hostelsRes?.data || [];

  const { data: buildingsRes } = useGetBuildingsQuery({ hostelId: targetHostelId || undefined });
  const buildings = buildingsRes?.data || [];

  const { data: roomsRes } = useGetRoomsQuery({
    hostelId: targetHostelId || undefined,
    buildingId: targetBuildingId || undefined,
  });
  const rooms = roomsRes?.data || [];

  const { data: bedsRes } = useGetBedsQuery({
    roomId: targetRoomId || undefined,
    status: BedStatus.AVAILABLE,
  });
  const availableBeds = bedsRes?.data || [];

  const { data: activeAllocRes, isLoading: loadingActive, refetch: refetchAllocations } = useGetAllocationsQuery({
    status: HostelAllocationStatus.CHECKED_IN,
  });
  const { data: allAllocRes } = useGetAllocationsQuery({
    status: HostelAllocationStatus.TRANSFERRED,
  });

  const [transferBed, { isLoading: isTransferring }] = useTransferBedMutation();

  const activeAllocations = activeAllocRes?.data?.items || [];
  const transferHistory = allAllocRes?.data?.items || [];

  const handleOpenTransfer = (a: any) => {
    setSelectedAllocation(a);
    setTargetHostelId(a.hostelId?._id || a.hostelId || '');
    setTargetBuildingId('');
    setTargetRoomId('');
    setTargetBedId('');
    setIsTransferOpen(true);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocation) return;
    try {
      await transferBed({
        id: selectedAllocation.id || selectedAllocation._id,
        newHostelId: targetHostelId,
        newBuildingId: targetBuildingId,
        newRoomId: targetRoomId,
        newBedId: targetBedId,
        transferReason,
        transferRemarks,
      }).unwrap();
      setIsTransferOpen(false);
      setSelectedAllocation(null);
      setTransferRemarks('');
      refetchAllocations();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to complete transfer');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <RotateCw className="w-7 h-7 text-indigo-400" />
            Room & Bed Transfers
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Reassign residents across rooms or blocks while preserving historical allocation records
          </p>
        </div>
      </div>

      {/* Active Residents Eligible for Transfer */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Active Residents Available for Relocation ({activeAllocations.length})
        </h2>

        {loadingActive ? (
          <Spinner />
        ) : activeAllocations.length === 0 ? (
          <Card className="bg-slate-900/40 border-slate-800 p-8 text-center text-slate-400">
            No active residents available for transfer.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAllocations.map((a) => (
              <Card key={a.id || a._id} className="bg-slate-900/60 border-slate-800 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-indigo-400">{String(a.studentId?._id || a.studentId)}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Checked In
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 space-y-1 mb-3">
                    <div>Current Room: <strong className="text-white">{String(a.roomId?._id || a.roomId)}</strong></div>
                    <div>Current Bed: <strong className="text-indigo-300">{String(a.bedId?._id || a.bedId)}</strong></div>
                    <div className="text-[11px] text-slate-500">
                      Inducted on: {new Date(a.actualCheckInDate || a.allocationDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <Button
                    variant="secondary"
                    className="w-full text-xs"
                    leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenTransfer(a)}
                  >
                    Initiate Transfer
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Historical Transfer Audit Log */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          Transfer Audit Records ({transferHistory.length})
        </h2>

        {transferHistory.length === 0 ? (
          <Card className="bg-slate-900/40 border-slate-800 p-8 text-center text-slate-400 text-sm">
            No historical transfers recorded yet.
          </Card>
        ) : (
          <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold uppercase text-slate-400">
                    <th className="p-4">Student ID</th>
                    <th className="p-4">Prior Room / Bed</th>
                    <th className="p-4">Transfer Reason</th>
                    <th className="p-4">Date Closed</th>
                    <th className="p-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {transferHistory.map((th) => (
                    <tr key={th.id || th._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-mono text-xs text-indigo-300">
                        {String(th.studentId?._id || th.studentId)}
                      </td>
                      <td className="p-4 text-xs text-slate-300">
                        Room: {String(th.roomId?._id || th.roomId)} • Bed: {String(th.bedId?._id || th.bedId)}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {th.transferReason || 'ADMINISTRATIVE'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {new Date(th.updatedAt || th.allocationDate).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {th.transferRemarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Transfer Dialog */}
      <Dialog
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Execute Room & Bed Transfer"
        description="Safely vacates old bed and atomically creates a new allocation record"
      >
        <form onSubmit={handleExecuteTransfer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Hostel *</label>
            <select
              required
              value={targetHostelId}
              onChange={(e) => {
                setTargetHostelId(e.target.value);
                setTargetBuildingId('');
                setTargetRoomId('');
                setTargetBedId('');
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select Target Hostel</option>
              {hostels.map((h) => (
                <option key={h.id || h._id} value={h.id || h._id}>
                  {h.name} ({h.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Building *</label>
              <select
                required
                value={targetBuildingId}
                onChange={(e) => {
                  setTargetBuildingId(e.target.value);
                  setTargetRoomId('');
                  setTargetBedId('');
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Room *</label>
              <select
                required
                value={targetRoomId}
                onChange={(e) => {
                  setTargetRoomId(e.target.value);
                  setTargetBedId('');
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Available Bed *</label>
            <select
              required
              value={targetBedId}
              onChange={(e) => setTargetBedId(e.target.value)}
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

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Transfer Reason *</label>
            <select
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value as HostelTransferReason)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value={HostelTransferReason.REQUESTED}>Student / Guardian Request</option>
              <option value={HostelTransferReason.ROOM_CHANGE}>Room Change</option>
              <option value={HostelTransferReason.DISCIPLINARY}>Disciplinary Relocation</option>
              <option value={HostelTransferReason.MAINTENANCE}>Room Maintenance / Repair</option>
              <option value={HostelTransferReason.MEDICAL}>Medical Accommodation</option>
              <option value={HostelTransferReason.CAPACITY}>Capacity Rebalancing</option>
              <option value={HostelTransferReason.OTHER}>Other Administrative Reason</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Remarks</label>
            <input
              type="text"
              placeholder="e.g. Swapped to ground floor for mobility"
              value={transferRemarks}
              onChange={(e) => setTransferRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsTransferOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isTransferring}>
              {isTransferring ? 'Processing...' : 'Confirm Transfer'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
