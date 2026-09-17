import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Eye,
  Trash2,
  Phone,
  Mail,
  Bed,
  DoorOpen,
} from 'lucide-react';
import {
  useGetHostelsQuery,
  useCreateHostelMutation,
  useDeleteHostelMutation,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { HostelType, HostelStatus } from '@edusphere/common';

export const HostelsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<HostelType>(HostelType.BOYS);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const { data: hostelsRes, isLoading, refetch } = useGetHostelsQuery({
    search: search || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  });

  const [createHostel, { isLoading: isCreating }] = useCreateHostelMutation();
  const [deleteHostel] = useDeleteHostelMutation();

  const hostels = hostelsRes?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createHostel({
        name,
        code,
        type,
        description,
        address,
        contact: {
          phone: contactPhone,
          email: contactEmail,
        },
        capacity: 0,
        totalRooms: 0,
        status: HostelStatus.ACTIVE,
      }).unwrap();
      setIsCreateOpen(false);
      setName('');
      setCode('');
      setDescription('');
      setAddress('');
      setContactPhone('');
      setContactEmail('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create hostel');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      await deleteHostel(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to delete hostel');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Building2 className="w-7 h-7 text-indigo-400" />
            Hostels & Dormitories
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage residential buildings, room allocations, and housing inventory
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          Add Hostel
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search hostel name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Types (Boys / Girls / Coed)</option>
              <option value={HostelType.BOYS}>Boys Hostel</option>
              <option value={HostelType.GIRLS}>Girls Hostel</option>
              <option value={HostelType.MIXED}>Co-ed / Mixed Hostel</option>
              <option value={HostelType.STAFF}>Staff Quarters</option>
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value={HostelStatus.ACTIVE}>Active</option>
              <option value={HostelStatus.INACTIVE}>Inactive</option>
              <option value={HostelStatus.MAINTENANCE}>Under Maintenance</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Hostels Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : hostels.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No hostels found</p>
          <p className="text-slate-600 text-sm mt-1">
            Get started by adding your first residential hostel block.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hostels.map((hostel) => (
            <Card
              key={hostel.id || hostel._id}
              className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{hostel.name}</h3>
                    <p className="text-xs font-mono text-slate-400">{hostel.code}</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                      hostel.status === HostelStatus.ACTIVE
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : hostel.status === HostelStatus.MAINTENANCE
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}
                  >
                    {hostel.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                    {hostel.type}
                  </span>
                  {hostel.wardenName && (
                    <span className="text-xs text-slate-400">
                      Warden: <strong className="text-slate-200">{hostel.wardenName}</strong>
                    </span>
                  )}
                </div>

                {hostel.description && (
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">{hostel.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-800 mb-4 text-xs">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="text-slate-400 block">Rooms</span>
                      <span className="font-semibold text-white">{hostel.totalRooms || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bed className="w-4 h-4 text-indigo-400" />
                    <div>
                      <span className="text-slate-400 block">Capacity</span>
                      <span className="font-semibold text-indigo-300">{hostel.capacity || 0} Beds</span>
                    </div>
                  </div>
                </div>

                {(hostel.contact?.phone || hostel.contact?.email) && (
                  <div className="space-y-1 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                    {hostel.contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{hostel.contact.phone}</span>
                      </div>
                    )}
                    {hostel.contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{hostel.contact.email}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between">
                <Link
                  to={`/hostel/hostels/${hostel.id || hostel._id}`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> View Details & Rooms
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(hostel.id || hostel._id || '', hostel.name)}
                    className="p-1.5 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete Hostel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Hostel Modal */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Residential Hostel"
        description="Register a new hostel block or dormitory facility"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hostel Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tagore Hall of Residence"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hostel Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. H-TAGORE-01"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Hostel Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as HostelType)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value={HostelType.BOYS}>Boys Hostel</option>
              <option value={HostelType.GIRLS}>Girls Hostel</option>
              <option value={HostelType.MIXED}>Co-Ed / Mixed Hostel</option>
              <option value={HostelType.STAFF}>Staff Quarters</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Brief description or facilities..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Address / Location</label>
            <input
              type="text"
              placeholder="Campus North Wing, Sector 4..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
              <input
                type="text"
                placeholder="+91 9876543210"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Email</label>
              <input
                type="email"
                placeholder="warden.tagore@edusphere.edu"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isCreating}>
              {isCreating ? 'Saving...' : 'Create Hostel'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
