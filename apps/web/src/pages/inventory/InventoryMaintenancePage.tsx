import React from 'react';
import {
  Wrench,
  RotateCw,
  CheckCircle,
} from 'lucide-react';
import {
  useGetInventoryMaintenanceQuery,
  useUpdateInventoryMaintenanceMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { AssetMaintenanceStatus } from '@edusphere/common';

export const InventoryMaintenancePage: React.FC = () => {
  const { data: res, isLoading, refetch } = useGetInventoryMaintenanceQuery();
  const [updateMaintenance] = useUpdateInventoryMaintenanceMutation();

  const maintenanceList = res?.data || [];

  const handleComplete = async (maintId: string) => {
    try {
      await updateMaintenance({
        id: maintId,
        data: {
          status: AssetMaintenanceStatus.COMPLETED,
          completedDate: new Date().toISOString(),
          resolution: 'Service completed to standard specifications.',
        },
      }).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Wrench className="w-7 h-7 text-amber-400" />
            Asset Maintenance & Servicing
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Preventive schedules, breakdown servicing, calibration history, and repair expenses
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : maintenanceList.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No maintenance tickets</h3>
          <p className="text-sm text-slate-500 mt-1">Schedule servicing from an asset details page to track repairs.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Asset Tag</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Scheduled Date</th>
                <th className="py-3.5 px-4 text-right">Cost</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {maintenanceList.map((m) => (
                <tr key={m.id || m._id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-mono font-medium text-sky-400">
                    {(m.assetId as any)?.assetTag || 'Asset'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-200">{m.maintenanceType}</td>
                  <td className="py-3.5 px-4 font-medium text-white truncate max-w-xs">{m.description}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-400">
                    {m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString() : 'Immediate'}
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-400 font-semibold">
                    ${((m.costMinorUnits || 0) / 100).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.status === AssetMaintenanceStatus.COMPLETED
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {m.status !== AssetMaintenanceStatus.COMPLETED && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                        onClick={() => handleComplete(m.id || m._id || '')}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
