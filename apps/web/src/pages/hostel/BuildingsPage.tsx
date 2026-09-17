import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  Plus,
  Search,
  Building2,
  Layers,
  DoorOpen,
} from 'lucide-react';
import {
  useGetBuildingsQuery,
  useCreateBuildingMutation,
  useGetHostelsQuery,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';

export const BuildingsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form
  const [hostelId, setHostelId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [numberOfFloors, setNumberOfFloors] = useState(3);
  const [description, setDescription] = useState('');

  const { data: hostelsRes } = useGetHostelsQuery();
  const hostels = hostelsRes?.data || [];

  const { data: buildingsRes, isLoading, refetch } = useGetBuildingsQuery({
    search: search || undefined,
    hostelId: hostelFilter || undefined,
  });

  const [createBuilding, { isLoading: isCreating }] = useCreateBuildingMutation();
  const buildings = buildingsRes?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBuilding({
        hostelId: hostelId || (hostels[0]?.id as any),
        name,
        code,
        numberOfFloors: Number(numberOfFloors),
        description,
        active: true,
      }).unwrap();
      setIsCreateOpen(false);
      setName('');
      setCode('');
      setDescription('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create building');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Home className="w-7 h-7 text-indigo-400" />
            Hostel Buildings & Blocks
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage multi-story residential blocks across school hostels
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          Add Building
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search building name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <select
              value={hostelFilter}
              onChange={(e) => setHostelFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Hostels</option>
              {hostels.map((h) => (
                <option key={h.id || h._id} value={h.id || h._id}>
                  {h.name} ({h.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : buildings.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          No buildings found. Click "Add Building" to create one.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buildings.map((building) => {
            const parentHostel = hostels.find(
              (h) => (h.id || h._id) === (building.hostelId?._id || building.hostelId)
            );
            return (
              <Card
                key={building.id || building._id}
                className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-white">{building.name}</h3>
                      <p className="text-xs font-mono text-slate-400">{building.code}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>Hostel: <strong className="text-slate-200">{parentHostel?.name || 'Assigned'}</strong></span>
                  </div>

                  {building.description && (
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">{building.description}</p>
                  )}

                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-300">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>{building.numberOfFloors} Residential Floors</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <Link
                    to={`/hostel/rooms?buildingId=${building.id || building._id}`}
                    className="text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <DoorOpen className="w-3.5 h-3.5" /> View Rooms
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Residential Building"
        description="Register a block inside an existing hostel"
      >
        <form onSubmit={handleCreate} className="space-y-4">
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
                  {h.name} ({h.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Building Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Block C"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Building Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. BLK-C"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Number of Floors *</label>
            <input
              type="number"
              min={1}
              max={50}
              required
              value={numberOfFloors}
              onChange={(e) => setNumberOfFloors(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Description of the wing or amenities..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isCreating}>
              {isCreating ? 'Saving...' : 'Save Building'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
