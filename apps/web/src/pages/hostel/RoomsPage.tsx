import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  DoorOpen,
  Plus,
  Search,
  Bed,
} from 'lucide-react';
import {
  useGetRoomsQuery,
  useCreateRoomMutation,
  useGetHostelsQuery,
  useGetBuildingsQuery,
  useGetRoomTypesQuery,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { RoomStatus } from '@edusphere/common';

export const RoomsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialBuilding = searchParams.get('buildingId') || '';

  const [search, setSearch] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState(initialBuilding);
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [formHostelId, setFormHostelId] = useState('');
  const [formBuildingId, setFormBuildingId] = useState('');
  const [formRoomNumber, setFormRoomNumber] = useState('');
  const [formFloor, setFormFloor] = useState(1);
  const [formRoomTypeId, setFormRoomTypeId] = useState('');

  const { data: hostelsRes } = useGetHostelsQuery();
  const hostels = hostelsRes?.data || [];

  const { data: buildingsRes } = useGetBuildingsQuery({
    hostelId: formHostelId || hostelFilter || undefined,
  });
  const buildings = buildingsRes?.data || [];

  const { data: roomTypesRes } = useGetRoomTypesQuery();
  const roomTypes = roomTypesRes?.data || [];

  const { data: roomsRes, isLoading, refetch } = useGetRoomsQuery({
    search: search || undefined,
    hostelId: hostelFilter || undefined,
    buildingId: buildingFilter || undefined,
    status: statusFilter || undefined,
  });

  const [createRoom, { isLoading: isCreating }] = useCreateRoomMutation();
  const rooms = roomsRes?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRoom({
        hostelId: formHostelId || (hostels[0]?.id as any),
        buildingId: formBuildingId || (buildings[0]?.id as any),
        roomNumber: formRoomNumber,
        floor: Number(formFloor),
        roomTypeId: formRoomTypeId || (roomTypes[0]?.id as any),
      }).unwrap();
      setIsCreateOpen(false);
      setFormRoomNumber('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create room');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <DoorOpen className="w-7 h-7 text-indigo-400" />
            Residential Rooms
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Browse rooms, bed capacities, occupancy statuses, and room layouts
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          Add Room
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search room number..."
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
                setBuildingFilter('');
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
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Buildings</option>
              {buildings.map((b) => (
                <option key={b.id || b._id} value={b.id || b._id}>
                  {b.name} ({b.code})
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
              <option value={RoomStatus.AVAILABLE}>Available</option>
              <option value={RoomStatus.PARTIALLY_OCCUPIED}>Partially Occupied</option>
              <option value={RoomStatus.FULL}>Full</option>
              <option value={RoomStatus.MAINTENANCE}>Maintenance</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : rooms.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          No rooms found matching your filter criteria.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const occupied = room.occupiedBedsCount || 0;
            const capacity = room.capacity || 0;
            const isFull = capacity > 0 && occupied >= capacity;
            return (
              <Card
                key={room.id || room._id}
                className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-all p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                        <DoorOpen className="w-4 h-4 text-indigo-400" />
                        Room {room.roomNumber}
                      </h3>
                      <span className="text-xs text-slate-400">Floor {room.floor}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        isFull
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : occupied > 0
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>

                  <div className="mt-3 p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-400">
                      <span>Bed Capacity</span>
                      <span className="font-semibold text-white">{capacity} Beds</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Occupied</span>
                      <span className="font-semibold text-indigo-300">{occupied} Beds</span>
                    </div>
                    <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFull ? 'bg-rose-500' : occupied > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${capacity > 0 ? (occupied / capacity) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <Link
                    to={`/hostel/rooms/${room.id || room._id}`}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                  >
                    <Bed className="w-3.5 h-3.5" /> Manage Beds &rarr;
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Room Modal */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Residential Room"
        description="Register a new room inside a building"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Hostel *</label>
            <select
              required
              value={formHostelId}
              onChange={(e) => setFormHostelId(e.target.value)}
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

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Building *</label>
            <select
              required
              value={formBuildingId}
              onChange={(e) => setFormBuildingId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select Building</option>
              {buildings.map((b) => (
                <option key={b.id || b._id} value={b.id || b._id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Room Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 204"
                value={formRoomNumber}
                onChange={(e) => setFormRoomNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Floor Index *</label>
              <input
                type="number"
                min={0}
                required
                value={formFloor}
                onChange={(e) => setFormFloor(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Room Type</label>
            <select
              value={formRoomTypeId}
              onChange={(e) => setFormRoomTypeId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select Room Type (Optional)</option>
              {roomTypes.map((rt) => (
                <option key={rt.id || rt._id} value={rt.id || rt._id}>
                  {rt.name} ({rt.type})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isCreating}>
              {isCreating ? 'Saving...' : 'Save Room'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
