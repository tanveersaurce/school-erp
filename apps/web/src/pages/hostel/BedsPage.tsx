import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bed,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  useGetBedsQuery,
  useGetHostelsQuery,
  useGetRoomsQuery,
  useBatchCreateBedsMutation,
  useDeleteBedMutation,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { BedStatus } from '@edusphere/common';

export const BedsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isBatchOpen, setIsBatchOpen] = useState(false);

  // Batch Form
  const [targetRoomId, setTargetRoomId] = useState('');
  const [batchCount, setBatchCount] = useState(4);
  const [batchPrefix, setBatchPrefix] = useState('B');

  const { data: hostelsRes } = useGetHostelsQuery();
  const hostels = hostelsRes?.data || [];

  const { data: roomsRes } = useGetRoomsQuery({
    hostelId: hostelFilter || undefined,
  });
  const rooms = roomsRes?.data || [];

  const { data: bedsRes, isLoading, refetch } = useGetBedsQuery({
    search: search || undefined,
    hostelId: hostelFilter || undefined,
    roomId: roomFilter || undefined,
    status: statusFilter || undefined,
  });

  const [batchCreateBeds, { isLoading: isBatchCreating }] = useBatchCreateBedsMutation();
  const [deleteBed] = useDeleteBedMutation();

  const beds = bedsRes?.data || [];

  const handleBatchCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await batchCreateBeds({
        roomId: targetRoomId,
        bedCount: Number(batchCount),
        codePrefix: batchPrefix,
      }).unwrap();
      setIsBatchOpen(false);
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to generate beds');
    }
  };

  const handleDelete = async (bedId: string, bNum: string) => {
    if (!window.confirm(`Delete bed ${bNum}?`)) return;
    try {
      await deleteBed(bedId).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to delete bed');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bed className="w-7 h-7 text-indigo-400" />
            Physical Beds Inventory
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Source of truth for hostel capacity, occupancy tracking, and student bed allocations
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Sparkles className="w-4 h-4" />}
          onClick={() => setIsBatchOpen(true)}
        >
          Batch Create Beds
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search bed number or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <select
              value={hostelFilter}
              onChange={(e) => {
                setHostelFilter(e.target.value);
                setRoomFilter('');
              }}
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
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Rooms</option>
              {rooms.map((r) => (
                <option key={r.id || r._id} value={r.id || r._id}>
                  Room {r.roomNumber}
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
              <option value="">All Statuses</option>
              <option value={BedStatus.AVAILABLE}>Available</option>
              <option value={BedStatus.OCCUPIED}>Occupied</option>
              <option value={BedStatus.RESERVED}>Reserved</option>
              <option value={BedStatus.MAINTENANCE}>Maintenance</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Beds Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : beds.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          No beds found. Use "Batch Create Beds" to quickly equip rooms.
        </Card>
      ) : (
        <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold uppercase text-slate-400">
                  <th className="p-4">Bed Number</th>
                  <th className="p-4">Code</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Allocated Student</th>
                  <th className="p-4">Room</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {beds.map((bed) => {
                  const isOccupied = bed.status === BedStatus.OCCUPIED;
                  return (
                    <tr key={bed.id || bed._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-semibold text-white flex items-center gap-2">
                        <Bed className="w-4 h-4 text-indigo-400" />
                        Bed {bed.bedNumber}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-400">{bed.code}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                            isOccupied
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : bed.status === BedStatus.RESERVED
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : bed.status === BedStatus.MAINTENANCE
                              ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {bed.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-300">
                        {bed.currentStudentId ? String(bed.currentStudentId) : '—'}
                      </td>
                      <td className="p-4 text-xs text-slate-300">
                        <Link
                          to={`/hostel/rooms/${bed.roomId?._id || bed.roomId}`}
                          className="text-indigo-400 hover:underline"
                        >
                          View Room
                        </Link>
                      </td>
                      <td className="p-4 text-right">
                        {!isOccupied && (
                          <button
                            onClick={() => handleDelete(bed.id || bed._id || '', bed.bedNumber)}
                            className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Delete Bed"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Batch Create Dialog */}
      <Dialog
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        title="Batch Create Beds"
        description="Select a room and number of beds to generate"
      >
        <form onSubmit={handleBatchCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Room *</label>
            <select
              required
              value={targetRoomId}
              onChange={(e) => setTargetRoomId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select Room</option>
              {rooms.map((r) => (
                <option key={r.id || r._id} value={r.id || r._id}>
                  Room {r.roomNumber} (Floor {r.floor})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Number of Beds *</label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={batchCount}
                onChange={(e) => setBatchCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Prefix / Label</label>
              <input
                type="text"
                placeholder="B"
                value={batchPrefix}
                onChange={(e) => setBatchPrefix(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsBatchOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isBatchCreating}>
              {isBatchCreating ? 'Generating...' : 'Generate Beds'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
