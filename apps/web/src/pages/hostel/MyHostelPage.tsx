import React, { useState } from 'react';
import {
  Home,
  Building2,
  Compass,
  Clock,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import {
  useGetMyAccommodationQuery,
  useGetOutingsQuery,
  useRequestOutingMutation,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';

export const MyHostelPage: React.FC = () => {
  const { data: accomRes, isLoading } = useGetMyAccommodationQuery();
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  // Form State
  const [startDateTime, setStartDateTime] = useState('');
  const [expectedReturnDateTime, setExpectedReturnDateTime] = useState('');
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');

  const [requestOuting, { isLoading: isRequesting }] = useRequestOutingMutation();

  const accom = accomRes?.data;
  const allocation = accom?.allocation;
  const hostel = accom?.hostel;
  const room = accom?.room;
  const bed = accom?.bed;

  const { data: outingsRes, refetch: refetchOutings } = useGetOutingsQuery(
    allocation?.studentId ? { studentId: String(allocation.studentId?._id || allocation.studentId) } : undefined
  );
  const myOutings = outingsRes?.data?.items || [];

  const handleOutingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocation || !hostel) return;
    try {
      await requestOuting({
        studentId: String(allocation.studentId?._id || allocation.studentId),
        hostelId: String(hostel._id || hostel.id),
        startDateTime,
        expectedReturnDateTime,
        destination,
        reason,
      }).unwrap();
      setIsRequestOpen(false);
      setDestination('');
      setReason('');
      refetchOutings();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to submit outing permit request');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Home className="w-7 h-7 text-indigo-400" />
            My Hostel & Accommodation
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Student & parent self-service residential portal and outing permits
          </p>
        </div>
        {allocation && (
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsRequestOpen(true)}
          >
            Apply for Outing Pass
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : !allocation ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Active Hostel Allocation</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You are currently registered as a Day Scholar or your residential boarding application is pending allocation by the school hostel warden.
          </p>
        </Card>
      ) : (
        <>
          {/* Accommodation Overview Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-slate-900/60 border-slate-800 p-6 lg:col-span-2">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase text-indigo-400">Residential Block</span>
                  <h2 className="text-xl font-bold text-white mt-0.5">{hostel?.name || 'Assigned Hostel'}</h2>
                  <span className="text-xs font-mono text-slate-400">{hostel?.code}</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {allocation.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-800 my-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Room Number</span>
                  <span className="text-base font-bold text-white mt-1 block">
                    {room?.roomNumber ? `Room ${room.roomNumber}` : 'Assigned'}
                  </span>
                  <span className="text-[10px] text-slate-500">Floor {room?.floor ?? 1}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Assigned Bed</span>
                  <span className="text-base font-bold text-indigo-300 mt-1 block">
                    {bed?.bedNumber ? `Bed ${bed.bedNumber}` : 'Assigned'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{bed?.code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Inducted Date</span>
                  <span className="text-sm font-semibold text-slate-200 mt-1 block">
                    {new Date(allocation.actualCheckInDate || allocation.allocationDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
                <span>Clearance: <strong className="text-emerald-400">{allocation.clearanceStatus || 'ACTIVE'}</strong></span>
                <span>Type: <strong className="text-indigo-400">{hostel?.type}</strong></span>
              </div>
            </Card>

            {/* Curfew & Warden Desk */}
            <Card className="bg-slate-900/60 border-slate-800 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  Warden Desk & Security
                </h3>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 mb-4 flex items-center gap-2.5">
                  <Clock className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <strong className="block font-semibold">Night Curfew: 21:30 (9:30 PM)</strong>
                    <span className="text-[11px] text-amber-200/80">
                      All boarders must be inside their designated block by curfew.
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Head Warden</span>
                    <span className="font-semibold text-white">{hostel?.wardenName || 'Campus Warden'}</span>
                  </div>
                  {hostel?.contact?.phone && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duty Phone</span>
                      <span className="font-semibold text-indigo-400">{hostel.contact.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <Button
                  variant="secondary"
                  className="w-full text-xs"
                  leftIcon={<Compass className="w-3.5 h-3.5" />}
                  onClick={() => setIsRequestOpen(true)}
                >
                  New Outing Request
                </Button>
              </div>
            </Card>
          </div>

          {/* Outing History Table */}
          <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-400" />
                My Outing Permits & Gate Passes
              </h3>
              <span className="text-xs text-slate-400">Total: {myOutings.length} requests</span>
            </div>

            {myOutings.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No past outing requests found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold uppercase text-slate-400">
                      <th className="p-4">Destination</th>
                      <th className="p-4">Timings</th>
                      <th className="p-4">Reason</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {myOutings.map((o) => (
                      <tr key={o.id || o._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-semibold text-white">{o.destination}</td>
                        <td className="p-4 text-xs text-slate-400">
                          <div>Exit: {new Date(o.startDateTime).toLocaleString()}</div>
                          <div>Return: {new Date(o.expectedReturnDateTime).toLocaleString()}</div>
                        </td>
                        <td className="p-4 text-xs text-slate-300">{o.reason}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase ${
                              o.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : o.status === 'OUT'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : o.status === 'OVERDUE'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Outing Request Dialog */}
      <Dialog
        isOpen={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
        title="Apply for Residential Outing Pass"
        description="Submit destination, exit time, and return curfew for warden approval"
      >
        <form onSubmit={handleOutingSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Departure Time *</label>
              <input
                type="datetime-local"
                required
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Return *</label>
              <input
                type="datetime-local"
                required
                value={expectedReturnDateTime}
                onChange={(e) => setExpectedReturnDateTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Destination *</label>
            <input
              type="text"
              required
              placeholder="e.g. City Library / Home / Hospital"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Purpose / Reason *</label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Medical appointment with guardian"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsRequestOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isRequesting}>
              {isRequesting ? 'Submitting...' : 'Submit Permit'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
