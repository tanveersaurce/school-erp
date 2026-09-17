import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  Home,
  DoorOpen,
  Users,
  Plus,
  ArrowLeft,
  Layers,
} from 'lucide-react';
import {
  useGetHostelByIdQuery,
  useGetBuildingsQuery,
  useGetRoomsQuery,
  useGetStaffAssignmentsQuery,
  useCreateBuildingMutation,
  useCreateRoomMutation,
  useAssignStaffMutation,
  useGetRoomTypesQuery,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { HostelStaffRole } from '@edusphere/common';

export const HostelDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'buildings' | 'rooms' | 'staff'>('buildings');

  // Modals
  const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isAssignStaffOpen, setIsAssignStaffOpen] = useState(false);

  // Forms
  const [bName, setBName] = useState('');
  const [bCode, setBCode] = useState('');
  const [bFloors, setBFloors] = useState(3);

  const [roomNumber, setRoomNumber] = useState('');
  const [roomBuildingId, setRoomBuildingId] = useState('');
  const [roomFloor, setRoomFloor] = useState(1);
  const [roomTypeId, setRoomTypeId] = useState('');

  const [staffEmployeeId, setStaffEmployeeId] = useState('');
  const [staffRole, setStaffRole] = useState<HostelStaffRole>(HostelStaffRole.WARDEN);

  const { data: hostelRes, isLoading: loadingHostel, refetch: refetchHostel } = useGetHostelByIdQuery(id || '');
  const { data: buildingsRes, isLoading: loadingBuildings, refetch: refetchBuildings } = useGetBuildingsQuery(
    id ? { hostelId: id } : undefined
  );
  const { data: roomsRes, isLoading: loadingRooms, refetch: refetchRooms } = useGetRoomsQuery(
    id ? { hostelId: id } : undefined
  );
  const { data: staffRes, isLoading: loadingStaff, refetch: refetchStaff } = useGetStaffAssignmentsQuery(
    id ? { hostelId: id } : undefined
  );
  const { data: roomTypesRes } = useGetRoomTypesQuery();

  const [createBuilding] = useCreateBuildingMutation();
  const [createRoom] = useCreateRoomMutation();
  const [assignStaff] = useAssignStaffMutation();

  const hostel = hostelRes?.data;
  const buildings = buildingsRes?.data || [];
  const rooms = roomsRes?.data || [];
  const staff = staffRes?.data || [];
  const roomTypes = roomTypesRes?.data || [];

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await createBuilding({
        hostelId: id,
        name: bName,
        code: bCode,
        numberOfFloors: Number(bFloors),
        active: true,
      }).unwrap();
      setIsAddBuildingOpen(false);
      setBName('');
      setBCode('');
      refetchBuildings();
      refetchHostel();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create building');
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await createRoom({
        hostelId: id,
        buildingId: roomBuildingId || (buildings[0]?.id as any),
        roomNumber,
        floor: Number(roomFloor),
        roomTypeId: roomTypeId || (roomTypes[0]?.id as any),
      }).unwrap();
      setIsAddRoomOpen(false);
      setRoomNumber('');
      refetchRooms();
      refetchHostel();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create room');
    }
  };

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await assignStaff({
        hostelId: id,
        employeeId: staffEmployeeId,
        role: staffRole,
        startDate: new Date().toISOString(),
        status: 'ACTIVE',
      }).unwrap();
      setIsAssignStaffOpen(false);
      setStaffEmployeeId('');
      refetchStaff();
      refetchHostel();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to assign staff');
    }
  };

  if (loadingHostel) {
    return (
      <div className="flex justify-center p-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!hostel) {
    return (
      <div className="p-8 text-center text-slate-400">
        Hostel not found.{' '}
        <Link to="/hostel/hostels" className="text-indigo-400 underline">
          Return to hostels
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Back Link */}
      <div>
        <Link
          to="/hostel/hostels"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Hostels Roster
        </Link>
      </div>

      {/* Main Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                <Building2 className="w-8 h-8" />
              </span>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white">{hostel.name}</h1>
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {hostel.type}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5">Code: {hostel.code}</p>
              </div>
            </div>
            {hostel.description && (
              <p className="text-xs text-slate-400 mt-3 max-w-2xl">{hostel.description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddBuildingOpen(true)}
            >
              Add Building
            </Button>
            <Button
              variant="secondary"
              leftIcon={<DoorOpen className="w-4 h-4" />}
              onClick={() => setIsAddRoomOpen(true)}
            >
              Add Room
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Users className="w-4 h-4" />}
              onClick={() => setIsAssignStaffOpen(true)}
            >
              Assign Staff
            </Button>
          </div>
        </div>

        {/* Info Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block">Total Capacity</span>
            <span className="text-lg font-bold text-indigo-300">{hostel.capacity || 0} Beds</span>
          </div>
          <div>
            <span className="text-slate-400 block">Total Rooms</span>
            <span className="text-lg font-bold text-white">{hostel.totalRooms || 0}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Lead Warden</span>
            <span className="text-sm font-semibold text-slate-200">
              {hostel.wardenName || 'Unassigned'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Status</span>
            <span className="text-sm font-semibold text-emerald-400">{hostel.status}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 flex gap-6">
        <button
          onClick={() => setActiveTab('buildings')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'buildings'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-4 h-4" /> Buildings ({buildings.length})
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'rooms'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DoorOpen className="w-4 h-4" /> Rooms ({rooms.length})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'staff'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> Wardens & Staff ({staff.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'buildings' && (
        <div>
          {loadingBuildings ? (
            <Spinner />
          ) : buildings.length === 0 ? (
            <Card className="bg-slate-900/40 border-slate-800 p-8 text-center text-slate-400">
              No buildings registered in this hostel yet. Click "Add Building" above.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buildings.map((b) => (
                <Card key={b.id || b._id} className="bg-slate-900/60 border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-white">{b.name}</h4>
                    <span className="text-xs font-mono text-slate-400">{b.code}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{b.numberOfFloors} Floors</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-emerald-400 font-medium">Active</span>
                    <Link
                      to={`/hostel/rooms?buildingId=${b.id || b._id}`}
                      className="text-indigo-400 hover:underline"
                    >
                      View Rooms &rarr;
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'rooms' && (
        <div>
          {loadingRooms ? (
            <Spinner />
          ) : rooms.length === 0 ? (
            <Card className="bg-slate-900/40 border-slate-800 p-8 text-center text-slate-400">
              No rooms registered in this hostel yet.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {rooms.map((room) => (
                <Card key={room.id || room._id} className="bg-slate-900/60 border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-white">Room {room.roomNumber}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Floor {room.floor}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                    <span>Capacity: {room.capacity || 0} Beds</span>
                    <span className="text-slate-300 font-medium">{room.status}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                    <Link
                      to={`/hostel/rooms/${room.id || room._id}`}
                      className="text-indigo-400 hover:underline font-semibold"
                    >
                      Manage Beds &rarr;
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'staff' && (
        <div>
          {loadingStaff ? (
            <Spinner />
          ) : staff.length === 0 ? (
            <Card className="bg-slate-900/40 border-slate-800 p-8 text-center text-slate-400">
              No wardens or caretakers assigned to this hostel yet.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staff.map((s) => (
                <Card key={s.id || s._id} className="bg-slate-900/60 border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {s.role}
                    </span>
                    <span className="text-xs text-emerald-400">{s.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Employee ID: <strong className="text-white font-mono">{s.employeeId}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Shift: {s.shift || 'Standard'} • Start: {new Date(s.startDate).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Building Dialog */}
      <Dialog
        isOpen={isAddBuildingOpen}
        onClose={() => setIsAddBuildingOpen(false)}
        title="Add Building to Hostel"
        description={`Add a building block inside ${hostel.name}`}
      >
        <form onSubmit={handleCreateBuilding} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Building Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Block A / North Wing"
              value={bName}
              onChange={(e) => setBName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Building Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. BLK-A"
                value={bCode}
                onChange={(e) => setBCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Total Floors *</label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={bFloors}
                onChange={(e) => setBFloors(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsAddBuildingOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Building
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Add Room Dialog */}
      <Dialog
        isOpen={isAddRoomOpen}
        onClose={() => setIsAddRoomOpen(false)}
        title="Add Room to Hostel"
        description="Configure a new residential room"
      >
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Building *</label>
            <select
              required
              value={roomBuildingId}
              onChange={(e) => setRoomBuildingId(e.target.value)}
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
                placeholder="e.g. 101"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Floor Index *</label>
              <input
                type="number"
                min={0}
                required
                value={roomFloor}
                onChange={(e) => setRoomFloor(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Room Type</label>
            <select
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Standard Room Type</option>
              {roomTypes.map((rt) => (
                <option key={rt.id || rt._id} value={rt.id || rt._id}>
                  {rt.name} ({rt.type})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsAddRoomOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Room
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Assign Staff Dialog */}
      <Dialog
        isOpen={isAssignStaffOpen}
        onClose={() => setIsAssignStaffOpen(false)}
        title="Assign Staff / Warden"
        description="Link an employee as residential warden or caretaker"
      >
        <form onSubmit={handleAssignStaff} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Employee ID (from HR/Payroll) *</label>
            <input
              type="text"
              required
              placeholder="e.g. Employee ObjectId"
              value={staffEmployeeId}
              onChange={(e) => setStaffEmployeeId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Residential Role *</label>
            <select
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value as HostelStaffRole)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value={HostelStaffRole.WARDEN}>Hostel Warden</option>
              <option value={HostelStaffRole.ASSISTANT_WARDEN}>Assistant Warden</option>
              <option value={HostelStaffRole.CARETAKER}>Caretaker</option>
              <option value={HostelStaffRole.SECURITY}>Security Guard</option>
              <option value={HostelStaffRole.STAFF}>Residential Staff</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsAssignStaffOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Assign Staff
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
