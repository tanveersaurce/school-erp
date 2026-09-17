import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  DoorOpen,
  Bed,
  Plus,
  ArrowLeft,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  useGetRoomByIdQuery,
  useGetBedsQuery,
  useCreateBedMutation,
  useBatchCreateBedsMutation,
  useDeleteBedMutation,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { BedStatus } from '@edusphere/common';

export const RoomDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Modals
  const [isAddBedOpen, setIsAddBedOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);

  // Single Bed form
  const [bedNumber, setBedNumber] = useState('');
  const [bedCode, setBedCode] = useState('');

  // Batch Form
  const [batchCount, setBatchCount] = useState(4);
  const [batchPrefix, setBatchPrefix] = useState('B');

  const { data: roomRes, isLoading: loadingRoom, refetch: refetchRoom } = useGetRoomByIdQuery(id || '');
  const { data: bedsRes, isLoading: loadingBeds, refetch: refetchBeds } = useGetBedsQuery(
    id ? { roomId: id } : undefined
  );

  const [createBed, { isLoading: isCreatingBed }] = useCreateBedMutation();
  const [batchCreateBeds, { isLoading: isBatchCreating }] = useBatchCreateBedsMutation();
  const [deleteBed] = useDeleteBedMutation();

  const room = roomRes?.data;
  const beds = bedsRes?.data || [];

  const handleCreateSingleBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !room) return;
    try {
      await createBed({
        hostelId: room.hostelId?._id || room.hostelId,
        buildingId: room.buildingId?._id || room.buildingId,
        floorId: room.floorId?._id || room.floorId,
        roomId: id,
        bedNumber,
        code: bedCode || `BED-${room.roomNumber}-${bedNumber}`,
        status: BedStatus.AVAILABLE,
        active: true,
      }).unwrap();
      setIsAddBedOpen(false);
      setBedNumber('');
      setBedCode('');
      refetchBeds();
      refetchRoom();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to add bed');
    }
  };

  const handleBatchCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await batchCreateBeds({
        roomId: id,
        bedCount: Number(batchCount),
        codePrefix: batchPrefix,
      }).unwrap();
      setIsBatchOpen(false);
      refetchBeds();
      refetchRoom();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to batch generate beds');
    }
  };

  const handleDeleteBed = async (bedId: string, bNum: string) => {
    if (!window.confirm(`Are you sure you want to remove Bed ${bNum}?`)) return;
    try {
      await deleteBed(bedId).unwrap();
      refetchBeds();
      refetchRoom();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to delete bed');
    }
  };

  if (loadingRoom) {
    return (
      <div className="flex justify-center p-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-8 text-center text-slate-400">
        Room not found.{' '}
        <Link to="/hostel/rooms" className="text-indigo-400 underline">
          Return to rooms
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Back Link */}
      <div>
        <Link
          to="/hostel/rooms"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Rooms Roster
        </Link>
      </div>

      {/* Room Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <DoorOpen className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">Room {room.roomNumber}</h1>
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Floor {room.floor}
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {room.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Residential bed count: <strong className="text-white">{beds.length} Physical Beds</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddBedOpen(true)}
            >
              Add Bed
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Sparkles className="w-4 h-4" />}
              onClick={() => setIsBatchOpen(true)}
            >
              Batch Generate Beds
            </Button>
          </div>
        </div>
      </div>

      {/* Beds Inventory Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Bed className="w-5 h-5 text-indigo-400" />
            Physical Beds Roster ({beds.length})
          </h2>
          <span className="text-xs text-slate-400">
            Physical bed occupancy is the absolute source of truth for capacity
          </span>
        </div>

        {loadingBeds ? (
          <Spinner />
        ) : beds.length === 0 ? (
          <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
            <Bed className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-white">No beds installed in this room</p>
            <p className="text-xs text-slate-500 mt-1">
              Click "Add Bed" or "Batch Generate Beds" above to set up capacity.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {beds.map((bed) => {
              const isOccupied = bed.status === BedStatus.OCCUPIED;
              return (
                <Card
                  key={bed.id || bed._id}
                  className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-all p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                          <Bed className="w-4 h-4 text-indigo-400" />
                          Bed {bed.bedNumber}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-400">{bed.code}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
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
                    </div>

                    <div className="mt-3 p-2 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-400">
                      {isOccupied ? (
                        <div className="text-rose-300 font-medium">
                          Allocated to Student: <span className="font-mono text-white text-[11px] block">{bed.currentStudentId || 'Active Allocation'}</span>
                        </div>
                      ) : (
                        <div className="text-emerald-400 font-medium">
                          Available for allocation
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-500 text-[11px]">Physical Bed</span>
                    {!isOccupied && (
                      <button
                        onClick={() => handleDeleteBed(bed.id || bed._id || '', bed.bedNumber)}
                        className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete Bed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Single Bed Dialog */}
      <Dialog
        isOpen={isAddBedOpen}
        onClose={() => setIsAddBedOpen(false)}
        title="Add Single Bed"
        description={`Install a physical bed in Room ${room.roomNumber}`}
      >
        <form onSubmit={handleCreateSingleBed} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Bed Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 1 or A"
                value={bedNumber}
                onChange={(e) => setBedNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Bed Code</label>
              <input
                type="text"
                placeholder={`BED-${room.roomNumber}-${bedNumber || 'X'}`}
                value={bedCode}
                onChange={(e) => setBedCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsAddBedOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isCreatingBed}>
              {isCreatingBed ? 'Saving...' : 'Install Bed'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Batch Create Dialog */}
      <Dialog
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        title="Batch Generate Beds"
        description="Instantly generate multiple numbered beds for this room"
      >
        <form onSubmit={handleBatchCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Bed Count *</label>
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
                placeholder="e.g. B or Bed"
                value={batchPrefix}
                onChange={(e) => setBatchPrefix(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            This will create {batchCount} beds numbered {batchPrefix}1 to {batchPrefix}{batchCount} in Room {room.roomNumber}.
          </p>
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
