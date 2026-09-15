import React, { useState } from 'react';
import {
  RotateCcw,
  Filter,
  X,
} from 'lucide-react';
import { Money, RefundStatus } from '@edusphere/common';
import type { IRefund } from '@edusphere/types';
import {
  useGetRefundsQuery,
  useReviewRefundMutation,
  useProcessRefundMutation,
} from '../../features/finance/financeApi.js';
import { useToast } from '../../components/common/Toast.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const RefundsManagementPage: React.FC = () => {
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('');

  // Queries & Mutations
  const { data: refundsRes, isLoading: loadingRefunds } = useGetRefundsQuery({
    status: statusFilter || undefined,
    limit: 20,
  });

  const [reviewRefund, { isLoading: reviewing }] = useReviewRefundMutation();
  const [processRefund, { isLoading: processing }] = useProcessRefundMutation();

  // Modals state
  const [selectedRefund, setSelectedRefund] = useState<IRefund | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [gatewayRefundId, setGatewayRefundId] = useState('');
  const [processRemarks, setProcessRemarks] = useState('');

  const refunds = refundsRes?.data?.refunds || [];
  const currency = 'USD';

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedRefund) return;
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      showToast('Please provide a rejection reason', 'error');
      return;
    }

    try {
      await reviewRefund({
        id: selectedRefund.id,
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason.trim() : undefined,
      }).unwrap();

      showToast(`Refund ${status.toLowerCase()} successfully`, 'success');
      setShowReviewModal(false);
      setSelectedRefund(null);
      setRejectionReason('');
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to review refund', 'error');
    }
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefund) return;

    try {
      await processRefund({
        id: selectedRefund.id,
        gatewayRefundId: gatewayRefundId.trim() || undefined,
        remarks: processRemarks.trim() || undefined,
      }).unwrap();

      showToast('Refund processed successfully! Payment and ledger balances updated.', 'success');
      setShowProcessModal(false);
      setSelectedRefund(null);
      setGatewayRefundId('');
      setProcessRemarks('');
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to process refund', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case RefundStatus.PROCESSED:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case RefundStatus.APPROVED:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case RefundStatus.PENDING:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case RefundStatus.REJECTED:
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refunds Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review refund requests, process verified disbursements, and reconcile reversal adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            {Object.values(RefundStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loadingRefunds ? (
          <div className="p-12 flex justify-center">
            <Spinner />
          </div>
        ) : refunds.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <RotateCcw className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-base font-medium text-gray-900">No refund records found</p>
            <p className="text-sm text-gray-500 mt-1">
              Refund requests initiated from payment receipts will appear in this review queue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                <tr>
                  <th className="px-6 py-3">Refund #</th>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {refunds.map((ref) => (
                  <tr key={ref.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-indigo-600">
                      {ref.refundNumber}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">{ref.studentId}</td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-900">
                      {Money.formatMoney(ref.amount, currency)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">
                      {ref.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                          ref.status
                        )}`}
                      >
                        {ref.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {ref.status === RefundStatus.PENDING && (
                        <button
                          onClick={() => {
                            setSelectedRefund(ref);
                            setShowReviewModal(true);
                          }}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
                        >
                          Review
                        </button>
                      )}
                      {ref.status === RefundStatus.APPROVED && (
                        <button
                          onClick={() => {
                            setSelectedRefund(ref);
                            setShowProcessModal(true);
                          }}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          Process
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REVIEW MODAL */}
      {showReviewModal && selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-gray-900 text-lg">Review Refund Request</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs space-y-2 text-gray-600">
              <p>
                Refund #: <span className="font-mono font-bold">{selectedRefund.refundNumber}</span>
              </p>
              <p>
                Requested Amount:{' '}
                <span className="font-bold text-gray-900">
                  {Money.formatMoney(selectedRefund.amount, currency)}
                </span>
              </p>
              <p>Reason: {selectedRefund.reason}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Rejection Reason (if rejecting)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Required only if rejecting the refund request..."
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleReview('REJECTED')}
                disabled={reviewing}
                className="px-4 py-2 border border-rose-300 text-rose-700 rounded-lg text-sm font-medium hover:bg-rose-50"
              >
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => handleReview('APPROVED')}
                disabled={reviewing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Approve Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESS MODAL */}
      {showProcessModal && selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-gray-900 text-lg">Process Refund Payout</h3>
              <button
                onClick={() => setShowProcessModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Confirm payout of{' '}
              <span className="font-bold text-gray-900">
                {Money.formatMoney(selectedRefund.amount, currency)}
              </span>
              . Processing this will immediately reverse the student balance ledger and mark the source payment accordingly.
            </p>
            <form onSubmit={handleProcess} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Gateway Refund ID / Cheque # / Ref
                </label>
                <input
                  type="text"
                  value={gatewayRefundId}
                  onChange={(e) => setGatewayRefundId(e.target.value)}
                  placeholder="e.g. rfnd_98234723"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Processing Remarks
                </label>
                <textarea
                  value={processRemarks}
                  onChange={(e) => setProcessRemarks(e.target.value)}
                  placeholder="Optional disbursement remarks..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProcessModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm Disbursement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
