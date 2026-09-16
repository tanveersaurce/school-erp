import React, { useState } from 'react';
import {
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Search,
  Receipt,
  FileCheck,
  User,
  X,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetFinesQuery,
  useSettleFineMutation,
  useWaiveFineMutation,
} from '../../features/library/libraryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import type { ILibraryFine } from '@edusphere/types';

export const FinesManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'WAIVED' | ''>('');
  
  // Settle Fine Modal State
  const [settleModalFine, setSettleModalFine] = useState<ILibraryFine | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [paymentRef, setPaymentRef] = useState('');

  // Waive Fine Modal State
  const [waiveModalFine, setWaiveModalFine] = useState<ILibraryFine | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [waiveAmount, setWaiveAmount] = useState<number>(0);
  const [isPartialWaiver, setIsPartialWaiver] = useState(false);

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: finesRes, isLoading: loadingFines, refetch } = useGetFinesQuery({
    status: statusFilter || undefined,
  });

  const [settleFine, { isLoading: settling }] = useSettleFineMutation();
  const [waiveFine, { isLoading: waiving }] = useWaiveFineMutation();

  const fines = finesRes?.data?.items || [];

  const filteredFines = fines.filter((f) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const memberName = (typeof f.memberId === 'object' && f.memberId !== null)
      ? (f.memberId as any).memberNumber?.toLowerCase()
      : '';
    const fineType = ((f as any).fineType || f.type)?.toLowerCase() || '';
    const fineStatus = f.status?.toLowerCase() || '';
    return memberName?.includes(term) || fineType?.includes(term) || fineStatus?.includes(term);
  });

  // Handlers
  const handleOpenSettle = (fine: ILibraryFine) => {
    const remaining = fine.amount - (fine.paidAmount || 0) - (fine.waivedAmount || 0);
    setSettleModalFine(fine);
    setSettleAmount(remaining);
    setPaymentRef('');
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleOpenWaive = (fine: ILibraryFine) => {
    const remaining = fine.amount - (fine.paidAmount || 0) - (fine.waivedAmount || 0);
    setWaiveModalFine(fine);
    setWaiveReason('');
    setWaiveAmount(remaining);
    setIsPartialWaiver(false);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleConfirmSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalFine) return;
    if (settleAmount <= 0) {
      setErrorMsg('Settlement amount must be greater than zero.');
      return;
    }

    try {
      await settleFine({
        id: (settleModalFine as any)._id,
        data: {
          amount: Number(settleAmount),
          paymentReference: paymentRef.trim() || undefined,
        },
      }).unwrap();

      setSuccessMsg(`Fine payment of ${Money.format(settleAmount)} successfully processed.`);
      setSettleModalFine(null);
      refetch();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to settle fine.');
    }
  };

  const handleConfirmWaive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waiveModalFine) return;
    if (!waiveReason.trim() || waiveReason.trim().length < 5) {
      setErrorMsg('Audit reason is required for waivers (minimum 5 characters).');
      return;
    }

    try {
      await waiveFine({
        id: (waiveModalFine as any)._id,
        data: {
          reason: waiveReason.trim(),
          waivedAmount: isPartialWaiver ? Number(waiveAmount) : undefined,
        },
      }).unwrap();

      setSuccessMsg('Fine successfully waived with audit justification recorded.');
      setWaiveModalFine(null);
      refetch();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to waive fine.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">Paid</span>;
      case 'WAIVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">Waived</span>;
      case 'PARTIALLY_PAID':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">Partially Paid</span>;
      case 'PENDING':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fines & Penalty Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor and record fine collections, process payments, or submit authorized waivers with audit justification.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters & Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {(['', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'WAIVED'] as const).map((status) => (
            <button
              key={status || 'ALL'}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status ? status.replace('_', ' ') : 'ALL FINES'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search member, type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Fines Table */}
      <Card>
        {loadingFines ? (
          <div className="p-12 flex justify-center">
            <Spinner />
          </div>
        ) : filteredFines.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <DollarSign className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="font-medium text-gray-900">No fines found</p>
            <p className="text-xs text-gray-500 mt-1">
              {searchTerm || statusFilter ? 'Try clearing your filters' : 'All accounts are currently in good standing.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Member</th>
                  <th className="px-6 py-3">Reason / Type</th>
                  <th className="px-6 py-3">Original Fine</th>
                  <th className="px-6 py-3">Paid / Waived</th>
                  <th className="px-6 py-3">Remaining Balance</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Issued Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFines.map((fine: any) => {
                  const remaining = fine.amount - (fine.paidAmount || 0) - (fine.waivedAmount || 0);
                  const isSettled = fine.status === 'PAID' || fine.status === 'WAIVED' || remaining <= 0;

                  return (
                    <tr key={fine._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {typeof fine.memberId === 'object' && fine.memberId?.memberNumber
                                ? fine.memberId.memberNumber
                                : fine.memberId}
                            </p>
                            <p className="text-xs text-gray-400">
                              {typeof fine.memberId === 'object' && fine.memberId?.memberType}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-medium text-gray-800">{fine.fineType}</span>
                          {fine.reason && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{fine.reason}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-gray-900">
                        {Money.format(fine.amount)}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-mono text-emerald-600">
                          Paid: {Money.format(fine.paidAmount || 0)}
                        </div>
                        {fine.waivedAmount > 0 && (
                          <div className="font-mono text-blue-600 mt-0.5">
                            Waived: {Money.format(fine.waivedAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-mono font-semibold ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {Money.format(remaining)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(fine.status)}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(fine.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isSettled ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSettle(fine)}
                              className="text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                            >
                              <Receipt className="w-3.5 h-3.5 mr-1" />
                              Pay
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenWaive(fine)}
                              className="text-blue-600 hover:bg-blue-50 border-blue-200"
                            >
                              <FileCheck className="w-3.5 h-3.5 mr-1" />
                              Waive
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Settle Fine Modal */}
      {settleModalFine && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900">Record Fine Payment</h3>
              </div>
              <button
                onClick={() => setSettleModalFine(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSettle} className="space-y-4 mt-4">
              <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Fine Type:</span>
                  <span className="font-medium text-gray-900">{(settleModalFine as any).fineType || settleModalFine.type}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Outstanding Balance:</span>
                  <span className="font-mono font-semibold text-rose-600">
                    {Money.format(
                      settleModalFine.amount - (settleModalFine.paidAmount || 0) - (settleModalFine.waivedAmount || 0)
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Payment Amount (in Minor Units / Cents)
                </label>
                <input
                  type="number"
                  min="1"
                  max={settleModalFine.amount - (settleModalFine.paidAmount || 0) - (settleModalFine.waivedAmount || 0)}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Math.floor(Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Value: {Money.format(settleAmount || 0)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Payment Reference / Memo (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cash Receipt #10429, POS Ref"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSettleModalFine(null)}
                  disabled={settling}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={settling}
                >
                  {settling ? <Spinner className="w-4 h-4 mr-2" /> : null}
                  Confirm Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Waive Fine Modal */}
      {waiveModalFine && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2 text-blue-600">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-semibold text-gray-900">Authorize Fine Waiver</h3>
              </div>
              <button
                onClick={() => setWaiveModalFine(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmWaive} className="space-y-4 mt-4">
              <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-800 border border-amber-200">
                Waivers require elevated administrative privileges (LIBRARIAN / SCHOOL_ADMIN).
                All waiver actions are permanently logged with your user identity and justification reason.
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="partialWaiver"
                  checked={isPartialWaiver}
                  onChange={(e) => setIsPartialWaiver(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="partialWaiver" className="text-xs font-medium text-gray-700">
                  Partial Waiver (waive specific amount instead of remaining balance)
                </label>
              </div>

              {isPartialWaiver && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Amount to Waive (in Minor Units / Cents)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={waiveModalFine.amount - (waiveModalFine.paidAmount || 0) - (waiveModalFine.waivedAmount || 0)}
                    value={waiveAmount}
                    onChange={(e) => setWaiveAmount(Math.floor(Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Value: {Money.format(waiveAmount || 0)}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Audit Reason / Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Medical emergency absence with certificate provided; authorized by Principal."
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Minimum 5 characters required.</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWaiveModalFine(null)}
                  disabled={waiving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={waiving}
                >
                  {waiving ? <Spinner className="w-4 h-4 mr-2" /> : null}
                  Authorize Waiver
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
