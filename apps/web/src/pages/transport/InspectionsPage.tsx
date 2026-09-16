import React, { useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  useGetInspectionsQuery,
  useRecordInspectionMutation,
  useGetVehiclesQuery,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const InspectionsPage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [vehicleId, setVehicleId] = useState('');
  const [inspectionType, setInspectionType] = useState('PRE_TRIP');
  const [result, setResult] = useState('PASSED');
  const [odometer, setOdometer] = useState(12500);

  // Checklist items
  const [brakesPassed, setBrakesPassed] = useState(true);
  const [tiresPassed, setTiresPassed] = useState(true);
  const [lightsPassed, setLightsPassed] = useState(true);
  const [emergencyExitPassed, setEmergencyExitPassed] = useState(true);
  const [firstAidPassed, setFirstAidPassed] = useState(true);

  const { data: inspRes, isLoading, refetch } = useGetInspectionsQuery();
  const { data: vehiclesRes } = useGetVehiclesQuery({ limit: 100 });
  const [recordInspection, { isLoading: isRecording }] = useRecordInspectionMutation();

  const inspections = inspRes?.data?.items || [];
  const vehicles = vehiclesRes?.data?.items || [];

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await recordInspection({
        vehicleId: vehicleId as any,
        inspectionType,
        inspectionDate: new Date(),
        odometerReadingKm: Number(odometer),
        result: result as any,
        checklist: [
          { item: 'Brakes & Steering', passed: brakesPassed },
          { item: 'Tyres & Pressure', passed: tiresPassed },
          { item: 'Headlights & Indicators', passed: lightsPassed },
          { item: 'Emergency Exit Operable', passed: emergencyExitPassed },
          { item: 'First Aid Kit & Extinguisher', passed: firstAidPassed },
        ],
      }).unwrap();
      setIsCreateOpen(false);
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to record inspection');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ClipboardCheck className="w-7 h-7 text-emerald-400" />
            Daily Vehicle Safety Inspections
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Pre-trip and post-trip safety audits ensuring brakes, lights, emergency exits, and medical kits pass verification
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
          Record Inspection
        </Button>
      </div>

      {/* Inspections Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : inspections.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          <ClipboardCheck className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-medium text-slate-300">No inspections logged</p>
          <p className="text-xs text-slate-500 mt-1">Record pre-trip safety checklist before buses depart on routes.</p>
        </Card>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Odometer</th>
                <th className="px-4 py-3">Checklist Status</th>
                <th className="px-4 py-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {inspections.map((i: any) => (
                <tr key={i.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-bold text-white">
                    {i.vehicleId?.registrationNumber || 'BUS'}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">{i.inspectionType || 'PRE_TRIP'}</td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(i.inspectionDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">
                    {(i.odometerReadingKm || 0).toLocaleString()} km
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="text-slate-400">
                      {Array.isArray(i.checklist) ? `${i.checklist.filter((c: any) => c.passed).length}/${i.checklist.length} Passed` : 'Passed'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        i.result === 'PASSED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {i.result === 'PASSED' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {i.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-400" />
              Pre-Trip Vehicle Safety Audit
            </h2>
            <form onSubmit={handleRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Vehicle *</label>
                <select
                  required
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.registrationNumber} ({v.make})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Type</label>
                  <select
                    value={inspectionType}
                    onChange={(e) => setInspectionType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PRE_TRIP">Pre-Trip</option>
                    <option value="POST_TRIP">Post-Trip</option>
                    <option value="WEEKLY">Weekly Audit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Odometer (km)</label>
                  <input
                    type="number"
                    value={odometer}
                    onChange={(e) => setOdometer(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Inspection Result</label>
                  <select
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PASSED">Passed</option>
                    <option value="FAILED">Failed (Take Off Duty)</option>
                    <option value="REQUIRES_ATTENTION">Requires Attention</option>
                  </select>
                </div>
              </div>

              {/* Checklist Switches */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Mandatory Safety Checks
                </span>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={brakesPassed}
                    onChange={(e) => setBrakesPassed(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Brakes & Steering System Functioning</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={tiresPassed}
                    onChange={(e) => setTiresPassed(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Tires Thread Depth & Pressure Good</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={lightsPassed}
                    onChange={(e) => setLightsPassed(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Headlights, Brake Lights, Indicators Operable</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={emergencyExitPassed}
                    onChange={(e) => setEmergencyExitPassed(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Emergency Door / Window Latches Unlocked</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={firstAidPassed}
                    onChange={(e) => setFirstAidPassed(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>First Aid Kit & Fire Extinguisher Present</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isRecording}>
                  {isRecording ? 'Submitting...' : 'Save Inspection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
