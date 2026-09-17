import React from 'react';
import {
  FileSpreadsheet,
  Building2,
  Download,
  RotateCw,
} from 'lucide-react';
import {
  useGetHostelDashboardStatsQuery,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const HostelReportsPage: React.FC = () => {
  const { data: statsRes, isLoading, refetch } = useGetHostelDashboardStatsQuery();
  const stats = statsRes?.data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileSpreadsheet className="w-7 h-7 text-indigo-400" />
            Hostel Analytics & Reports
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Capacity utilization, outing compliance trends, and residential maintenance costs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" leftIcon={<RotateCw className="w-4 h-4" />} onClick={() => refetch()}>
            Refresh
          </Button>
          <Button variant="primary" leftIcon={<Download className="w-4 h-4" />} onClick={handlePrint}>
            Export / Print Report
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Executive Summary Card */}
          <Card className="bg-slate-900/60 border-slate-800 p-6">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Executive Housing Overview
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
              <div>
                <span className="text-xs text-slate-400 block uppercase">Total Bed Inventory</span>
                <span className="text-2xl font-bold text-white mt-1 block">{stats?.totalCapacity || 0}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block uppercase">Occupied Beds</span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">{stats?.occupiedBeds || 0}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block uppercase">Available Beds</span>
                <span className="text-2xl font-bold text-sky-400 mt-1 block">{stats?.vacantBeds || 0}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block uppercase">System Occupancy</span>
                <span className="text-2xl font-bold text-indigo-400 mt-1 block">{stats?.occupancyRate || 0}%</span>
              </div>
            </div>
          </Card>

          {/* Block by Block Breakdown Table */}
          <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Residential Hostel Utilization Audit</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold uppercase text-slate-400">
                    <th className="p-4">Hostel Block</th>
                    <th className="p-4">Code</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Capacity</th>
                    <th className="p-4">Occupied</th>
                    <th className="p-4">Vacant</th>
                    <th className="p-4">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {stats?.hostels?.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-semibold text-white">{h.name}</td>
                      <td className="p-4 font-mono text-xs text-slate-400">{h.code}</td>
                      <td className="p-4 text-xs font-medium text-indigo-300">{h.type}</td>
                      <td className="p-4 font-bold text-white">{h.capacity} Beds</td>
                      <td className="p-4 font-bold text-emerald-400">{h.occupied}</td>
                      <td className="p-4 font-bold text-sky-400">{h.vacant}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, h.occupancyRate)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-white">{h.occupancyRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
