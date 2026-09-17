import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  DoorOpen,
} from 'lucide-react';
import {
  useGetInspectionsQuery,
  useCreateInspectionMutation,
  useGetHostelsQuery,
  useGetRoomsQuery,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { HostelInspectionStatus } from '@edusphere/common';

export const HostelInspectionsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [isConductOpen, setIsConductOpen] = useState(false);

  // Form State
  const [hostelId, setHostelId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [cleanliness, setCleanliness] = useState(5);
  const [safety, setSafety] = useState(5);
  const [electrical, setElectrical] = useState(5);
  const [furniture, setFurniture] = useState(5);
  const [plumbing, setPlumbing] = useState(5);
  const [remarks, setRemarks] = useState('');

  const { data: hostelsRes } = useGetHostelsQuery();
  const hostels = hostelsRes?.data || [];

  const { data: roomsRes } = useGetRoomsQuery({ hostelId: hostelId || undefined });
  const rooms = roomsRes?.data || [];

  const { data: inspectionsRes, isLoading, refetch } = useGetInspectionsQuery({
    status: statusFilter || undefined,
  });

  const [createInspection, { isLoading: isCreating }] = useCreateInspectionMutation();
  const inspections = inspectionsRes?.data?.items || [];

  const handleConductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const avg = (cleanliness + safety + electrical + furniture + plumbing) / 5;
      const status = avg >= 4 ? HostelInspectionStatus.PASSED : avg >= 2.5 ? HostelInspectionStatus.NEEDS_ATTENTION : HostelInspectionStatus.FAILED;

      await createInspection({
        hostelId: hostelId || (hostels[0]?.id as any),
        roomId: roomId || (rooms[0]?.id as any),
        inspectionDate: new Date().toISOString(),
        cleanliness,
        safety,
        electrical,
        furniture,
        plumbing,
        remarks,
        status,
      }).unwrap();
      setIsConductOpen(false);
      setRemarks('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to submit inspection');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            Room Cleanliness & Safety Inspections
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            5-point hygiene, electrical, fire hazard, and furniture condition audit scores
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsConductOpen(true)}
        >
          Conduct Inspection
        </Button>
      </div>

      {/* Filter */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="max-w-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Inspection Statuses</option>
            <option value={HostelInspectionStatus.PASSED}>Passed (Clean & Safe)</option>
            <option value={HostelInspectionStatus.NEEDS_ATTENTION}>Needs Attention</option>
            <option value={HostelInspectionStatus.FAILED}>Failed</option>
          </select>
        </div>
      </Card>

      {/* Inspections Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : inspections.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          No room inspection audits recorded yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inspections.map((insp) => {
            const isPassed = insp.status === HostelInspectionStatus.PASSED;
            const avg = ((insp.cleanliness + insp.safety + insp.electrical + insp.furniture + insp.plumbing) / 5).toFixed(1);
            return (
              <Card
                key={insp.id || insp._id}
                className="bg-slate-900/60 border-slate-800 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                        <DoorOpen className="w-4 h-4 text-indigo-400" />
                        Room {String(insp.roomId?._id || insp.roomId)}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {new Date(insp.inspectionDate).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${
                        isPassed
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : insp.status === HostelInspectionStatus.NEEDS_ATTENTION
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {insp.status}
                    </span>
                  </div>

                  {/* Rating Breakdown */}
                  <div className="grid grid-cols-5 gap-1.5 p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-center text-[11px] mb-3">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Hygiene</span>
                      <strong className="text-white">{insp.cleanliness}/5</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Safety</span>
                      <strong className="text-white">{insp.safety}/5</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Electric</span>
                      <strong className="text-white">{insp.electrical}/5</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Furn.</span>
                      <strong className="text-white">{insp.furniture}/5</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Plumb.</span>
                      <strong className="text-white">{insp.plumbing}/5</strong>
                    </div>
                  </div>

                  {insp.remarks && (
                    <p className="text-xs text-slate-300 italic mb-2">"{insp.remarks}"</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                  <span>Average Score: <strong className="text-indigo-400">{avg} / 5.0</strong></span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Conduct Inspection Modal */}
      <Dialog
        isOpen={isConductOpen}
        onClose={() => setIsConductOpen(false)}
        title="Conduct Room Audit"
        description="Score the 5-point physical hygiene and safety checklist"
      >
        <form onSubmit={handleConductSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Hostel *</label>
            <select
              required
              value={hostelId}
              onChange={(e) => {
                setHostelId(e.target.value);
                setRoomId('');
              }}
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

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Room *</label>
            <select
              required
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select Room</option>
              {rooms.map((r) => (
                <option key={r.id || r._id} value={r.id || r._id}>
                  Room {r.roomNumber} (Floor {r.floor})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { label: 'Cleanliness & Hygiene (1-5)', val: cleanliness, set: setCleanliness },
              { label: 'Safety & Emergency Exits (1-5)', val: safety, set: setSafety },
              { label: 'Electrical Fittings & Sockets (1-5)', val: electrical, set: setElectrical },
              { label: 'Furniture & Study Desks (1-5)', val: furniture, set: setFurniture },
              { label: 'Plumbing & Washrooms (1-5)', val: plumbing, set: setPlumbing },
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{f.label}</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={f.val}
                  onChange={(e) => f.set(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white text-center focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Remarks / Issues Found</label>
            <textarea
              rows={2}
              placeholder="e.g. Broken curtain rod, clean study area"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsConductOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isCreating}>
              {isCreating ? 'Saving...' : 'Submit Audit'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
