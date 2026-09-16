import React, { useState } from 'react';
import {
  AlertTriangle,
  Plus,
} from 'lucide-react';
import {
  useGetIncidentsQuery,
  useReportIncidentMutation,
  useUpdateIncidentMutation,
  useGetVehiclesQuery,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const IncidentsPage: React.FC = () => {
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Form state
  const [vehicleId, setVehicleId] = useState('');
  const [incidentType, setIncidentType] = useState('DELAY');
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  const { data: incidentsRes, isLoading, refetch } = useGetIncidentsQuery({
    severity: severityFilter || undefined,
    status: statusFilter || undefined,
  });

  const { data: vehiclesRes } = useGetVehiclesQuery({ limit: 100 });
  const [reportIncident, { isLoading: isReporting }] = useReportIncidentMutation();
  const [updateIncident] = useUpdateIncidentMutation();

  const incidents = incidentsRes?.data?.items || [];
  const vehicles = vehiclesRes?.data?.items || [];

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reportIncident({
        vehicleId: vehicleId as any,
        incidentType: incidentType as any,
        severity: severity as any,
        occurredAt: new Date(),
        description,
        immediateActionTaken: actionTaken || undefined,
        status: 'REPORTED' as any,
      }).unwrap();
      setIsReportOpen(false);
      setDescription('');
      setActionTaken('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to report incident');
    }
  };

  const handleResolve = async (id: string) => {
    const action = prompt('Enter resolution action taken:');
    if (action === null) return;
    try {
      await updateIncident({
        id,
        data: {
          status: 'RESOLVED' as any,
          resolutionNotes: action,
        },
      }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update incident');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-rose-400" />
            Safety & Incident Logging
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track breakdowns, delays, route accidents, and driver misconduct with auditable resolutions
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsReportOpen(true)}>
          Report Incident
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-rose-500"
          >
            <option value="">All Severities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-rose-500"
          >
            <option value="">All Statuses</option>
            <option value="REPORTED">Reported</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </Card>

      {/* Incidents Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : incidents.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          <AlertTriangle className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-medium text-slate-300">No active incidents</p>
          <p className="text-xs text-slate-500 mt-1">Great job! All fleet operations are operating smoothly without open safety incidents.</p>
        </Card>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {incidents.map((inc: any) => (
                <tr key={inc.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-bold text-white">{inc.incidentType}</td>
                  <td className="px-4 py-3 text-xs font-mono">{inc.vehicleId?.registrationNumber || 'Fleet Vehicle'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        inc.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : inc.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs max-w-xs truncate text-slate-300">{inc.description}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(inc.incidentDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        inc.status === 'RESOLVED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inc.status !== 'RESOLVED' && inc.status !== 'CLOSED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleResolve(inc.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Report Transport Incident
            </h2>
            <form onSubmit={handleReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Vehicle *</label>
                <select
                  required
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="">-- Select Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.registrationNumber} ({v.make})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Incident Type *</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="DELAY">Traffic Delay</option>
                    <option value="BREAKDOWN">Vehicle Breakdown</option>
                    <option value="ACCIDENT">Traffic Collision / Accident</option>
                    <option value="MEDICAL">Medical Emergency</option>
                    <option value="MISCONDUCT">Student / Driver Misconduct</option>
                    <option value="ROUTE_DEVIATION">Route Deviation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Severity *</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail what occurred, location, students affected..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Immediate Action Taken</label>
                <input
                  type="text"
                  placeholder="e.g. Dispatched backup bus, contacted parents"
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setIsReportOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isReporting}>
                  {isReporting ? 'Submitting...' : 'Submit Incident Report'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
