import React, { useState } from 'react';
import {
  Wrench,
  Plus,
} from 'lucide-react';
import {
  useGetMaintenanceRequestsQuery,
  useCreateMaintenanceMutation,
  useUpdateMaintenanceMutation,
  useGetHostelsQuery,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';
import {
  HostelMaintenanceCategory,
  HostelMaintenancePriority,
  HostelMaintenanceStatus,
} from '@edusphere/common';

export const HostelMaintenancePage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // Create Form
  const [hostelId, setHostelId] = useState('');
  const [category, setCategory] = useState<HostelMaintenanceCategory>(HostelMaintenanceCategory.PLUMBING);
  const [priority, setPriority] = useState<HostelMaintenancePriority>(HostelMaintenancePriority.MEDIUM);
  const [description, setDescription] = useState('');

  // Update Form
  const [updateStatus, setUpdateStatus] = useState<HostelMaintenanceStatus>(HostelMaintenanceStatus.RESOLVED);
  const [resolution, setResolution] = useState('');
  const [costRupees, setCostRupees] = useState('');

  const { data: hostelsRes } = useGetHostelsQuery();
  const hostels = hostelsRes?.data || [];

  const { data: maintenanceRes, isLoading, refetch } = useGetMaintenanceRequestsQuery({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  });

  const [createMaintenance, { isLoading: isCreating }] = useCreateMaintenanceMutation();
  const [updateMaintenance, { isLoading: isUpdating }] = useUpdateMaintenanceMutation();

  const tickets = maintenanceRes?.data?.items || [];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMaintenance({
        hostelId: hostelId || (hostels[0]?.id as any),
        category,
        priority,
        description,
        status: HostelMaintenanceStatus.OPEN,
        reportedAt: new Date().toISOString(),
      }).unwrap();
      setIsCreateOpen(false);
      setDescription('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to submit maintenance request');
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      const costMinor = costRupees ? Math.round(parseFloat(costRupees) * 100) : undefined;
      await updateMaintenance({
        id: selectedTicket.id || selectedTicket._id,
        data: {
          status: updateStatus,
          resolution,
          costMinorUnits: costMinor,
          resolvedAt: updateStatus === HostelMaintenanceStatus.RESOLVED ? new Date().toISOString() : undefined,
        },
      }).unwrap();
      setSelectedTicket(null);
      setResolution('');
      setCostRupees('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update work order');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Wrench className="w-7 h-7 text-orange-400" />
            Hostel Repairs & Maintenance
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Plumbing, electrical, furniture repairs, minor unit expense tracking, and work orders
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          New Work Order
        </Button>
      </div>

      {/* Filter */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value={HostelMaintenanceStatus.OPEN}>Open</option>
              <option value={HostelMaintenanceStatus.ASSIGNED}>Assigned</option>
              <option value={HostelMaintenanceStatus.IN_PROGRESS}>In Progress</option>
              <option value={HostelMaintenanceStatus.RESOLVED}>Resolved</option>
              <option value={HostelMaintenanceStatus.CLOSED}>Closed</option>
            </select>
          </div>
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Priorities</option>
              <option value={HostelMaintenancePriority.LOW}>Low</option>
              <option value={HostelMaintenancePriority.MEDIUM}>Medium</option>
              <option value={HostelMaintenancePriority.HIGH}>High</option>
              <option value={HostelMaintenancePriority.URGENT}>Urgent</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Work Orders List */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : tickets.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          No maintenance tickets found. All facilities in prime operational condition.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tickets.map((t) => {
            const isCompleted = t.status === HostelMaintenanceStatus.RESOLVED || t.status === HostelMaintenanceStatus.CLOSED;
            const costFormatted = t.costMinorUnits
              ? `₹${(t.costMinorUnits / 100).toFixed(2)}`
              : null;
            return (
              <Card
                key={t.id || t._id}
                className="bg-slate-900/60 border-slate-800 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        {t.category}
                      </span>
                      <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300">
                        {t.priority}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 my-3 bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                    {t.description}
                  </p>

                  {t.resolution && (
                    <div className="text-xs text-emerald-400 mb-2 bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
                      <strong>Resolution:</strong> {t.resolution}
                    </div>
                  )}

                  {costFormatted && (
                    <div className="text-xs text-indigo-300 mb-2 font-semibold">
                      Repair Cost: {costFormatted}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                    Reported: {new Date(t.reportedAt || t.createdAt || Date.now()).toLocaleDateString()}
                  </div>
                </div>

                {!isCompleted && (
                  <div className="pt-3 mt-3 border-t border-slate-800 flex justify-end">
                    <Button
                      variant="secondary"
                      className="text-xs"
                      onClick={() => setSelectedTicket(t)}
                    >
                      Update Work Order
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Submit Hostel Repair Request"
        description="Raise a maintenance ticket for room or common area repairs"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as HostelMaintenanceCategory)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={HostelMaintenanceCategory.PLUMBING}>Plumbing</option>
                <option value={HostelMaintenanceCategory.ELECTRICAL}>Electrical</option>
                <option value={HostelMaintenanceCategory.CARPENTRY}>Carpentry / Furniture</option>
                <option value={HostelMaintenanceCategory.PAINTING}>Painting</option>
                <option value={HostelMaintenanceCategory.APPLIANCE}>Appliance / Geyser / AC</option>
                <option value={HostelMaintenanceCategory.CLEANING}>Sanitation & Cleaning</option>
                <option value={HostelMaintenanceCategory.FURNITURE}>Bed / Desk Furniture</option>
                <option value={HostelMaintenanceCategory.OTHER}>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priority *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as HostelMaintenancePriority)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={HostelMaintenancePriority.LOW}>Low</option>
                <option value={HostelMaintenancePriority.MEDIUM}>Medium</option>
                <option value={HostelMaintenancePriority.HIGH}>High</option>
                <option value={HostelMaintenancePriority.URGENT}>Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description of Issue *</label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Bathroom faucet leaking in Room 204"
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
              {isCreating ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Update Dialog */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Update Work Order Status</h2>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as HostelMaintenanceStatus)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={HostelMaintenanceStatus.IN_PROGRESS}>In Progress</option>
                  <option value={HostelMaintenanceStatus.RESOLVED}>Resolved</option>
                  <option value={HostelMaintenanceStatus.CLOSED}>Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Resolution Summary</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Replaced washer valve and tested water flow"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Total Repair Cost (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={costRupees}
                  onChange={(e) => setCostRupees(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save Update'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
