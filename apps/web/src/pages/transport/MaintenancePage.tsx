import React, { useState } from 'react';
import {
  Wrench,
  Plus,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetMaintenancesQuery,
  useScheduleMaintenanceMutation,
  useUpdateMaintenanceMutation,
  useGetVehiclesQuery,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const MaintenancePage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [vehicleId, setVehicleId] = useState('');
  const [serviceType, setServiceType] = useState('ROUTINE');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedCost, setEstimatedCost] = useState(5000); // 50.00
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');

  const { data: maintRes, isLoading, refetch } = useGetMaintenancesQuery();
  const { data: vehiclesRes } = useGetVehiclesQuery({ limit: 100 });
  const [scheduleMaint, { isLoading: isScheduling }] = useScheduleMaintenanceMutation();
  const [updateMaint] = useUpdateMaintenanceMutation();

  const maintenances = maintRes?.data?.items || [];
  const vehicles = vehiclesRes?.data?.items || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await scheduleMaint({
        vehicleId: vehicleId as any,
        serviceType: serviceType as any,
        scheduledDate: new Date(scheduledDate),
        description,
        estimatedCostMinorUnits: Number(estimatedCost),
        vendor: vendor || undefined,
        status: 'SCHEDULED' as any,
      }).unwrap();
      setIsCreateOpen(false);
      setDescription('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to schedule maintenance');
    }
  };

  const handleComplete = async (id: string) => {
    const cost = prompt('Enter actual repair cost minor units (e.g. 5200 = ₹52.00):', '5000');
    if (cost === null) return;
    try {
      await updateMaint({
        id,
        data: {
          status: 'COMPLETED' as any,
          actualCostMinorUnits: Number(cost),
          completionDate: new Date(),
        },
      }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update maintenance');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Wrench className="w-7 h-7 text-yellow-400" />
            Fleet Workshop & Maintenance
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Preventive servicing, emergency mechanical repairs, and parts replacement logs
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
          Schedule Maintenance
        </Button>
      </div>

      {/* Maintenances Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : maintenances.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          <Wrench className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-medium text-slate-300">No maintenance jobs logged</p>
          <p className="text-xs text-slate-500 mt-1">Schedule regular bus maintenance to keep fleet compliant.</p>
        </Card>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Service Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Vendor / Workshop</th>
                <th className="px-4 py-3">Scheduled Date</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {maintenances.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-bold text-white">
                    {m.vehicleId?.registrationNumber || 'BUS'}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-yellow-400">{m.serviceType}</td>
                  <td className="px-4 py-3 text-xs max-w-xs truncate text-slate-300">{m.description}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{m.vendor || 'In-House'}</td>
                  <td className="px-4 py-3 text-xs">
                    {m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-emerald-400 font-semibold">
                    {Money.format(m.actualCostMinorUnits || m.estimatedCostMinorUnits || 0, 'INR')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        m.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.status !== 'COMPLETED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleComplete(m.id)}
                      >
                        Mark Completed
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-yellow-400" />
              Schedule Fleet Maintenance
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Vehicle *</label>
                <select
                  required
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                >
                  <option value="">-- Select Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.registrationNumber} ({v.make})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Service Type *</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                  >
                    <option value="ROUTINE">Routine Servicing</option>
                    <option value="PREVENTIVE">Preventive Maintenance</option>
                    <option value="EMERGENCY_REPAIR">Emergency Repair</option>
                    <option value="INSPECTION">Mechanical Inspection</option>
                    <option value="TYRE_REPLACEMENT">Tyre Replacement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Estimated Cost (Minor Units)</label>
                  <input
                    type="number"
                    min={0}
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">5000 = ₹50.00</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Vendor / Garage</label>
                  <input
                    type="text"
                    placeholder="e.g. Authorized Service Center"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Engine oil change, brake pads inspection, AC service..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isScheduling}>
                  {isScheduling ? 'Scheduling...' : 'Schedule Service'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
