import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  Search,
  X,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetCirculationsQuery,
  useCheckoutBookMutation,
  useReturnBookMutation,
  useRenewBookMutation,
  useMarkBookLostMutation,
  useGetLibrariesQuery,
} from '../../features/library/libraryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const CirculationDeskPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ACTIVE_LOANS' | 'CHECKOUT' | 'RETURN'>('ACTIVE_LOANS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ISSUED' | 'OVERDUE' | ''>('');

  // Checkout State
  const [checkoutMemberId, setCheckoutMemberId] = useState('');
  const [checkoutCopyIdentifier, setCheckoutCopyIdentifier] = useState('');
  const [checkoutLibraryId, setCheckoutLibraryId] = useState('');
  const [checkoutDueDate, setCheckoutDueDate] = useState('');

  // Return State
  const [returnIdentifier, setReturnIdentifier] = useState('');
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnNotes, setReturnNotes] = useState('');

  // Declare Lost Modal State
  const [lostModalCirculation, setLostModalCirculation] = useState<any>(null);
  const [lostReplacementFee, setLostReplacementFee] = useState(2500); // $25.00
  const [lostProcessingFee, setLostProcessingFee] = useState(500);   // $5.00
  const [lostNotes, setLostNotes] = useState('');

  // Feedback Messages
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: circRes, isLoading: loadingCircs } = useGetCirculationsQuery({
    status: selectedStatus || undefined,
  });
  const { data: libRes } = useGetLibrariesQuery();

  const [checkoutBook, { isLoading: checkingOut }] = useCheckoutBookMutation();
  const [returnBook, { isLoading: returningBook }] = useReturnBookMutation();
  const [renewBook] = useRenewBookMutation();
  const [markBookLost, { isLoading: declaringLost }] = useMarkBookLostMutation();

  const circulations = circRes?.data?.items || [];
  const libraries = libRes?.data || [];

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccess(null);
    setActionError(null);
    try {
      await checkoutBook({
        memberId: checkoutMemberId.trim(),
        copyIdentifier: checkoutCopyIdentifier.trim(),
        libraryId: checkoutLibraryId || (libraries[0] as any)?._id || libraries[0]?.id,
        dueDateOverride: checkoutDueDate || undefined,
      }).unwrap();

      setActionSuccess(`Book copy '${checkoutCopyIdentifier}' checked out successfully.`);
      setCheckoutCopyIdentifier('');
      setCheckoutDueDate('');
    } catch (err: any) {
      setActionError(err?.data?.message || 'Checkout failed.');
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await returnBook({
        copyIdentifier: returnIdentifier.trim(),
        condition: returnCondition,
        notes: returnNotes.trim() || undefined,
      }).unwrap();

      const fineMsg = res?.data?.fine ? ` (Assessed fine: ${Money.formatMoney(res.data.fine.amount, 'USD')})` : '';
      setActionSuccess(`Book copy '${returnIdentifier}' returned successfully.${fineMsg}`);
      setReturnIdentifier('');
      setReturnNotes('');
    } catch (err: any) {
      setActionError(err?.data?.message || 'Return failed.');
    }
  };

  const handleRenew = async (circulationId: string) => {
    setActionSuccess(null);
    setActionError(null);
    try {
      await renewBook({ circulationId, additionalDays: 14 }).unwrap();
      setActionSuccess('Loan successfully renewed for an additional 14 days.');
    } catch (err: any) {
      setActionError(err?.data?.message || 'Renewal failed.');
    }
  };

  const handleDeclareLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostModalCirculation) return;
    setActionSuccess(null);
    setActionError(null);
    try {
      await markBookLost({
        circulationId: lostModalCirculation._id,
        replacementFeeMinorUnits: Number(lostReplacementFee),
        processingFeeMinorUnits: Number(lostProcessingFee),
        notes: lostNotes.trim() || undefined,
      }).unwrap();

      setActionSuccess(`Book marked as lost. Replacement fine assessed.`);
      setLostModalCirculation(null);
      setLostNotes('');
    } catch (err: any) {
      setActionError(err?.data?.message || 'Failed to mark lost.');
    }
  };

  const filteredCirculations = circulations.filter((c: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const title = c.bookId?.title?.toLowerCase() || '';
    const memberNum = c.memberId?.memberNumber?.toLowerCase() || '';
    const barcode = c.bookCopyId?.barcode?.toLowerCase() || '';
    return title.includes(term) || memberNum.includes(term) || barcode.includes(term);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <RotateCcw className="w-8 h-8 text-emerald-400" />
            Circulation Desk
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time loan checkout, accession barcode scanning, renewal extensions & loss assessments
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('ACTIVE_LOANS')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'ACTIVE_LOANS' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Loans
          </button>
          <button
            onClick={() => setActiveTab('CHECKOUT')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'CHECKOUT' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Issue / Checkout
          </button>
          <button
            onClick={() => setActiveTab('RETURN')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'RETURN' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Checkin / Return
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {actionError}
        </div>
      )}

      {/* TAB 1: Fast Checkout */}
      {activeTab === 'CHECKOUT' && (
        <Card className="p-6 bg-slate-800/80 border-slate-700/60 max-w-xl mx-auto shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Barcode className="w-5 h-5 text-sky-400" />
            Issue Physical Copy to Member
          </h2>

          <form onSubmit={handleCheckout} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Member ID or Number *
              </label>
              <input
                type="text"
                required
                value={checkoutMemberId}
                onChange={(e) => setCheckoutMemberId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="Scan or enter member ID / Number (e.g. MEM-2026-00001)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Book Copy Barcode or Accession # *
              </label>
              <input
                type="text"
                required
                value={checkoutCopyIdentifier}
                onChange={(e) => setCheckoutCopyIdentifier(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="Scan book barcode (e.g. BAR-1984-001 or ACC-00001)"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Library Branch</label>
                <select
                  value={checkoutLibraryId}
                  onChange={(e) => setCheckoutLibraryId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Default Branch</option>
                  {libraries.map((l: any) => (
                    <option key={l._id} value={l._id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date Override</label>
                <input
                  type="date"
                  value={checkoutDueDate}
                  onChange={(e) => setCheckoutDueDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" disabled={checkingOut}>
              {checkingOut ? <Spinner size="sm" /> : 'Complete Checkout'}
            </Button>
          </form>
        </Card>
      )}

      {/* TAB 2: Fast Return */}
      {activeTab === 'RETURN' && (
        <Card className="p-6 bg-slate-800/80 border-slate-700/60 max-w-xl mx-auto shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Checkin / Return Physical Copy
          </h2>

          <form onSubmit={handleReturn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Scan Book Barcode or Accession # *
              </label>
              <input
                type="text"
                required
                value={returnIdentifier}
                onChange={(e) => setReturnIdentifier(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="Scan book barcode to return"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Return Condition</label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="NEW">NEW</option>
                <option value="GOOD">GOOD (Standard)</option>
                <option value="FAIR">FAIR (Wear and tear)</option>
                <option value="POOR">POOR</option>
                <option value="DAMAGED">DAMAGED (Requires fine assessment)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Inspection Notes</label>
              <textarea
                rows={2}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="Optional notes on return condition..."
              />
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" disabled={returningBook}>
              {returningBook ? <Spinner size="sm" /> : 'Accept Return'}
            </Button>
          </form>
        </Card>
      )}

      {/* TAB 3: Active Loans Table */}
      {activeTab === 'ACTIVE_LOANS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, member number, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={selectedStatus}
                onChange={(e: any) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Statuses</option>
                <option value="ISSUED">ISSUED</option>
                <option value="OVERDUE">OVERDUE</option>
              </select>
            </div>
          </div>

          <Card className="bg-slate-800/80 border-slate-700/60 overflow-hidden shadow-lg">
            {loadingCircs ? (
              <div className="flex justify-center items-center py-20">
                <Spinner size="lg" />
              </div>
            ) : filteredCirculations.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No active loans found matching criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-700/60">
                    <tr>
                      <th className="px-4 py-3">Book Title</th>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Barcode</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Renewals</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Desk Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {filteredCirculations.map((loan: any) => (
                      <tr key={loan._id} className="hover:bg-slate-700/20">
                        <td className="px-4 py-3 font-semibold text-white">
                          {loan.bookId?.title || 'Book Title'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">
                          {loan.memberId?.memberNumber || loan.borrowerType}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">
                          {loan.bookCopyId?.barcode || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={new Date(loan.dueAt) < new Date() ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {new Date(loan.dueAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {loan.renewalCount ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              loan.status === 'ISSUED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : loan.status === 'OVERDUE'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {loan.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRenew(loan._id)}
                              className="text-xs px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                              title="Renew +14 days"
                            >
                              Renew
                            </button>
                            <button
                              onClick={() => setLostModalCirculation(loan)}
                              className="text-xs px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                              title="Mark Lost & Assess Fine"
                            >
                              Lost
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Declare Lost Modal */}
      {lostModalCirculation && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-900 border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Declare Lost: {lostModalCirculation.bookId?.title}
              </h2>
              <button onClick={() => setLostModalCirculation(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeclareLost} className="space-y-3">
              <p className="text-xs text-slate-400">
                This will mark the copy as LOST and assess an immutable replacement fine against the member.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Replacement Fee (Cents)</label>
                  <input
                    type="number"
                    min={0}
                    value={lostReplacementFee}
                    onChange={(e) => setLostReplacementFee(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] text-slate-400">
                    = {Money.formatMoney(lostReplacementFee, 'USD')}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Processing Fee (Cents)</label>
                  <input
                    type="number"
                    min={0}
                    value={lostProcessingFee}
                    onChange={(e) => setLostProcessingFee(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] text-slate-400">
                    = {Money.formatMoney(lostProcessingFee, 'USD')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Audit Incident Notes</label>
                <textarea
                  rows={2}
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  placeholder="Circumstances of loss..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="secondary" onClick={() => setLostModalCirculation(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={declaringLost}>
                  {declaringLost ? <Spinner size="sm" /> : 'Confirm Lost Assessment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
