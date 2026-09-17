import React, { useState } from 'react';
import {
  CheckCircle2,
  LogOut,
  Search,
  UserCheck,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import {
  useGetAllocationsQuery,
  useCheckInMutation,
  useCheckOutMutation,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { HostelAllocationStatus } from '@edusphere/common';

export const CheckInCheckOutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pendingCheckIn' | 'checkedIn'>('pendingCheckIn');
  const [search, setSearch] = useState('');

  // Checkout modal/drawer state
  const [checkoutAllocation, setCheckoutAllocation] = useState<any>(null);
  const [checkoutReason, setCheckoutReason] = useState('');
  const [clearanceStatus, setClearanceStatus] = useState('CLEARED');

  const { data: allocationsRes, isLoading, refetch } = useGetAllocationsQuery();
  const [checkIn, { isLoading: isCheckingIn }] = useCheckInMutation();
  const [checkOut, { isLoading: isCheckingOut }] = useCheckOutMutation();

  const allAllocations = allocationsRes?.data?.items || [];

  const pendingCheckIns = allAllocations.filter(
    (a) => a.status === HostelAllocationStatus.ALLOCATED
  );
  const activeCheckedIn = allAllocations.filter(
    (a) => a.status === HostelAllocationStatus.CHECKED_IN
  );

  const filteredItems = (activeTab === 'pendingCheckIn' ? pendingCheckIns : activeCheckedIn).filter(
    (a) =>
      String(a.studentId?._id || a.studentId).toLowerCase().includes(search.toLowerCase()) ||
      String(a.roomId?._id || a.roomId).toLowerCase().includes(search.toLowerCase())
  );

  const handleCheckIn = async (id: string) => {
    try {
      await checkIn(id).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutAllocation) return;
    try {
      await checkOut({
        id: checkoutAllocation.id || checkoutAllocation._id,
        checkoutReason,
        clearanceStatus,
      }).unwrap();
      setCheckoutAllocation(null);
      setCheckoutReason('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Checkout failed');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <UserCheck className="w-7 h-7 text-indigo-400" />
            Residential Check-In & Check-Out Clearance
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Supervisor desk for logging resident arrival, room key issuance, and checkout clearance
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className={`p-5 cursor-pointer border transition-all ${
            activeTab === 'pendingCheckIn'
              ? 'bg-indigo-950/40 border-indigo-500'
              : 'bg-slate-900/60 border-slate-800'
          }`}
          onClick={() => setActiveTab('pendingCheckIn')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Awaiting Check-In
              </p>
              <p className="text-3xl font-bold text-white mt-1">{pendingCheckIns.length}</p>
              <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1">
                Allocated students ready for room induction &rarr;
              </p>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card
          className={`p-5 cursor-pointer border transition-all ${
            activeTab === 'checkedIn'
              ? 'bg-emerald-950/40 border-emerald-500'
              : 'bg-slate-900/60 border-slate-800'
          }`}
          onClick={() => setActiveTab('checkedIn')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Active Residents (Checked In)
              </p>
              <p className="text-3xl font-bold text-white mt-1">{activeCheckedIn.length}</p>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                Currently residing on campus &rarr;
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filter by student ID or room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          No records found in this view.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((a) => (
            <Card key={a.id || a._id} className="bg-slate-900/60 border-slate-800 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs text-slate-500 font-mono">STUDENT ID</span>
                    <h3 className="text-base font-bold text-white font-mono">{String(a.studentId?._id || a.studentId)}</h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                      a.status === HostelAllocationStatus.CHECKED_IN
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    }`}
                  >
                    {a.status}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-300 space-y-1.5 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Room</span>
                    <span className="font-semibold text-white">{String(a.roomId?._id || a.roomId)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bed</span>
                    <span className="font-semibold text-indigo-300">{String(a.bedId?._id || a.bedId)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Allocated Date</span>
                    <span>{new Date(a.allocationDate).toLocaleDateString()}</span>
                  </div>
                  {a.actualCheckInDate && (
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>Checked In At</span>
                      <span>{new Date(a.actualCheckInDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                {a.status === HostelAllocationStatus.ALLOCATED && (
                  <Button
                    variant="primary"
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => handleCheckIn(a.id || a._id || '')}
                    disabled={isCheckingIn}
                  >
                    Process Check-In
                  </Button>
                )}
                {a.status === HostelAllocationStatus.CHECKED_IN && (
                  <Button
                    variant="destructive"
                    leftIcon={<LogOut className="w-4 h-4" />}
                    onClick={() => setCheckoutAllocation(a)}
                  >
                    Clearance & Check-Out
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Checkout Clearance Modal */}
      {checkoutAllocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Confirm Student Check-Out</h2>
            <p className="text-xs text-slate-400 mb-4">
              Student ID: <strong className="text-white font-mono">{String(checkoutAllocation.studentId)}</strong>
            </p>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Clearance Status *</label>
                <select
                  value={clearanceStatus}
                  onChange={(e) => setClearanceStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="CLEARED">Cleared (Keys returned, no damages, no pending dues)</option>
                  <option value="PENDING">Pending (Inspection in progress)</option>
                  <option value="WITHHELD">Withheld (Damages assessed or fees pending)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Checkout Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Reason for vacating..."
                  value={checkoutReason}
                  onChange={(e) => setCheckoutReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setCheckoutAllocation(null)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" type="submit" disabled={isCheckingOut}>
                  {isCheckingOut ? 'Processing...' : 'Complete Checkout'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
