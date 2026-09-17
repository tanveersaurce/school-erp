import React, { useState } from 'react';
import {
  AlertTriangle,
  Plus,
} from 'lucide-react';
import {
  useGetIncidentsQuery,
  useReportIncidentMutation,
  useUpdateIncidentMutation,
  useGetHostelsQuery,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';
import {
  HostelIncidentType,
  HostelIncidentSeverity,
  HostelIncidentStatus,
} from '@edusphere/common';

export const HostelIncidentsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);

  // Report Form
  const [hostelId, setHostelId] = useState('');
  const [type, setType] = useState<HostelIncidentType>(HostelIncidentType.DISCIPLINARY);
  const [severity, setSeverity] = useState<HostelIncidentSeverity>(HostelIncidentSeverity.MEDIUM);
  const [studentId, setStudentId] = useState('');
  const [description, setDescription] = useState('');
  const [immediateActionTaken, setImmediateActionTaken] = useState('');

  // Update Form
  const [updateStatus, setUpdateStatus] = useState<HostelIncidentStatus>(HostelIncidentStatus.RESOLVED);
  const [resolution, setResolution] = useState('');

  const { data: hostelsRes } = useGetHostelsQuery();
  const hostels = hostelsRes?.data || [];

  const { data: incidentsRes, isLoading, refetch } = useGetIncidentsQuery({
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
  });

  const [reportIncident, { isLoading: isReporting }] = useReportIncidentMutation();
  const [updateIncident, { isLoading: isUpdating }] = useUpdateIncidentMutation();

  const incidents = incidentsRes?.data?.items || [];

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reportIncident({
        hostelId: hostelId || (hostels[0]?.id as any),
        type,
        severity,
        studentId: studentId || undefined,
        description,
        immediateActionTaken,
        occurredAt: new Date().toISOString(),
      }).unwrap();
      setIsReportOpen(false);
      setDescription('');
      setImmediateActionTaken('');
      setStudentId('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to report incident');
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    try {
      await updateIncident({
        id: selectedIncident.id || selectedIncident._id,
        data: {
          status: updateStatus,
          resolution,
        },
      }).unwrap();
      setSelectedIncident(null);
      setResolution('');
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
            Hostel Incidents & Discipline
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Log disciplinary cases, medical emergencies, noise violations, and safety resolutions
          </p>
        </div>
        <Button
          variant="destructive"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsReportOpen(true)}
        >
          Report Incident
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
              <option value={HostelIncidentStatus.OPEN}>Open</option>
              <option value={HostelIncidentStatus.INVESTIGATING}>Investigating</option>
              <option value={HostelIncidentStatus.RESOLVED}>Resolved</option>
              <option value={HostelIncidentStatus.CLOSED}>Closed</option>
            </select>
          </div>
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Severities</option>
              <option value={HostelIncidentSeverity.LOW}>Low</option>
              <option value={HostelIncidentSeverity.MEDIUM}>Medium</option>
              <option value={HostelIncidentSeverity.HIGH}>High</option>
              <option value={HostelIncidentSeverity.CRITICAL}>Critical</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Incidents Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : incidents.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          No incidents logged. All residential wings operating safely.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incidents.map((inc) => {
            const isEmergency = inc.severity === HostelIncidentSeverity.CRITICAL;
            const isOpen = inc.status === HostelIncidentStatus.OPEN || inc.status === HostelIncidentStatus.INVESTIGATING;
            return (
              <Card
                key={inc.id || inc._id}
                className="bg-slate-900/60 border-slate-800 hover:border-slate-700 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isEmergency
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {inc.severity} SEVERITY
                      </span>
                      <h3 className="text-base font-bold text-white mt-1">{inc.type}</h3>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${
                        isOpen
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mb-3 bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                    {inc.description}
                  </p>

                  {inc.immediateActionTaken && (
                    <div className="text-xs text-slate-400 mb-2">
                      <strong className="text-slate-300">Action:</strong> {inc.immediateActionTaken}
                    </div>
                  )}

                  {inc.resolution && (
                    <div className="text-xs text-emerald-400 mb-2 bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
                      <strong>Resolution:</strong> {inc.resolution}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                    <span>Reported: {new Date(inc.reportedAt || inc.createdAt || Date.now()).toLocaleString()}</span>
                    {inc.studentId && (
                      <span className="font-mono">Student: {String(inc.studentId)}</span>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="pt-3 mt-3 border-t border-slate-800 flex justify-end">
                    <Button
                      variant="secondary"
                      className="text-xs"
                      onClick={() => setSelectedIncident(inc)}
                    >
                      Update / Resolve
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Report Modal */}
      <Dialog
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title="Report Residential Incident"
        description="Log an urgent or disciplinary incident occurring in the hostel"
      >
        <form onSubmit={handleReportSubmit} className="space-y-4">
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Incident Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as HostelIncidentType)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={HostelIncidentType.DISCIPLINARY}>Disciplinary Issue</option>
                <option value={HostelIncidentType.MEDICAL}>Medical Emergency</option>
                <option value={HostelIncidentType.SAFETY}>Safety Concern</option>
                <option value={HostelIncidentType.PROPERTY_DAMAGE}>Property Damage</option>
                <option value={HostelIncidentType.MISSING_ITEM}>Missing / Theft Item</option>
                <option value={HostelIncidentType.CONFLICT}>Student Conflict</option>
                <option value={HostelIncidentType.ABSENCE}>Unauthorized Absence</option>
                <option value={HostelIncidentType.OTHER}>Other Incident</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Severity *</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as HostelIncidentSeverity)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={HostelIncidentSeverity.LOW}>Low</option>
                <option value={HostelIncidentSeverity.MEDIUM}>Medium</option>
                <option value={HostelIncidentSeverity.HIGH}>High</option>
                <option value={HostelIncidentSeverity.CRITICAL}>Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Involved Student ID (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Student ObjectId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
            <textarea
              rows={3}
              required
              placeholder="Detailed description of what occurred..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Immediate Action Taken</label>
            <input
              type="text"
              placeholder="e.g. First aid administered, security alerted"
              value={immediateActionTaken}
              onChange={(e) => setImmediateActionTaken(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsReportOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" type="submit" disabled={isReporting}>
              {isReporting ? 'Submitting...' : 'Log Incident'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Update/Resolve Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Update Incident Status</h2>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as HostelIncidentStatus)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={HostelIncidentStatus.INVESTIGATING}>Under Investigation</option>
                  <option value={HostelIncidentStatus.RESOLVED}>Resolved</option>
                  <option value={HostelIncidentStatus.CLOSED}>Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Resolution Summary</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain how the incident was handled and resolved..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save Resolution'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
