import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Printer,
  FileCheck,
  RotateCcw,
  X,
} from 'lucide-react';
import { Money, PaymentMethod, PaymentStatus } from '@edusphere/common';
import type { IPayment } from '@edusphere/types';
import {
  useGetPaymentsQuery,
  useCollectPaymentMutation,
  useRequestRefundMutation,
} from '../../features/finance/financeApi.js';
import { useToast } from '../../components/common/Toast.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const FeePaymentsPage: React.FC = () => {
  const { showToast } = useToast();

  const [methodFilter, setMethodFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const page = 1;

  // Queries & Mutations
  const { data: paymentsRes, isLoading: loadingPayments } = useGetPaymentsQuery({
    paymentMethod: methodFilter || undefined,
    page,
    limit: 10,
  });

  const [collectPayment, { isLoading: collecting }] = useCollectPaymentMutation();
  const [requestRefund, { isLoading: requestingRefund }] = useRequestRefundMutation();

  // Modals state
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<IPayment | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState<number>(0);

  // Collect Payment Form
  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payStudentId, setPayStudentId] = useState('');
  const [payAmount, setPayAmount] = useState<number>(100);
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [payReferenceNumber, setPayReferenceNumber] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const payments = paymentsRes?.data?.payments || [];
  const currency = 'USD';

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoiceId.trim() || !payStudentId.trim() || payAmount <= 0) {
      showToast('Invoice ID, Student ID, and a valid amount are required', 'error');
      return;
    }

    try {
      const res = await collectPayment({
        invoiceId: payInvoiceId.trim(),
        studentId: payStudentId.trim(),
        amount: Money.toMinorUnits(payAmount),
        paymentMethod: payMethod,
        referenceNumber: payReferenceNumber.trim() || undefined,
        notes: payNotes.trim() || undefined,
      }).unwrap();

      showToast(`Payment collected successfully! Receipt ${res.data?.receiptNumber}`, 'success');
      setShowCollectModal(false);
      setPayInvoiceId('');
      setPayStudentId('');
      setPayReferenceNumber('');
      setPayNotes('');
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to collect payment', 'error');
    }
  };

  const handleRequestRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment || !refundReason.trim() || refundAmount <= 0) {
      showToast('A valid refund amount and reason are required', 'error');
      return;
    }

    try {
      await requestRefund({
        paymentId: selectedPayment.id,
        studentId: selectedPayment.studentId,
        amount: Money.toMinorUnits(refundAmount),
        reason: refundReason.trim(),
      }).unwrap();

      showToast('Refund requested for review', 'success');
      setShowRefundModal(false);
      setSelectedPayment(null);
      setRefundReason('');
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to request refund', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case PaymentStatus.SUCCESS:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case PaymentStatus.PARTIALLY_REFUNDED:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case PaymentStatus.REFUNDED:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case PaymentStatus.FAILED:
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
          <h1 className="text-2xl font-bold text-gray-900">Fee Payments & Receipts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cashier collection terminal, instant sequential receipts (REC-YYYY-XXXXX), and ledger verification.
          </p>
        </div>
        <button
          onClick={() => setShowCollectModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Collect Fee Payment
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search receipts or students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Payment Methods</option>
            {Object.values(PaymentMethod).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loadingPayments ? (
          <div className="p-12 flex justify-center">
            <Spinner />
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-base font-medium text-gray-900">No payment receipts found</p>
            <p className="text-sm text-gray-500 mt-1">
              Record payments using the collection terminal above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                <tr>
                  <th className="px-6 py-3">Receipt #</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Reference / UTR</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600">
                      {p.receiptNumber}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-gray-100 text-gray-800">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-900">
                      {Money.formatMoney(p.amount, currency)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {p.gatewayTransactionId || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                          p.status
                        )}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1" />
                        Receipt
                      </button>
                      {p.status === PaymentStatus.SUCCESS && (
                        <button
                          onClick={() => {
                            setSelectedPayment(p);
                            setRefundAmount(Money.fromMinorUnits(p.amount));
                            setShowRefundModal(true);
                          }}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Refund
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

      {/* COLLECT PAYMENT MODAL */}
      {showCollectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">Collect Fee Payment</h3>
              <button
                onClick={() => setShowCollectModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCollectPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Invoice ID or Number *
                </label>
                <input
                  type="text"
                  value={payInvoiceId}
                  onChange={(e) => setPayInvoiceId(e.target.value)}
                  placeholder="e.g. inv_123 or INV-2026-00001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Student ID *</label>
                <input
                  type="text"
                  value={payStudentId}
                  onChange={(e) => setPayStudentId(e.target.value)}
                  placeholder="e.g. stu_alice"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Amount Paid ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {Object.values(PaymentMethod).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reference # / Cheque # / UPI UTR
                </label>
                <input
                  type="text"
                  value={payReferenceNumber}
                  onChange={(e) => setPayReferenceNumber(e.target.value)}
                  placeholder="e.g. CHQ-98124 or UPI-908123"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cashier Notes
                </label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Optional notes or receipt annotations..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={collecting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {collecting ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT VOUCHER MODAL */}
      {selectedPayment && !showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2 text-emerald-600">
                <FileCheck className="w-5 h-5" />
                <h3 className="font-bold text-gray-900 text-lg">Official Payment Receipt</h3>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="border border-gray-200 rounded-lg p-5 space-y-4 bg-gray-50/50">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-gray-900 text-base">EduSphere Academy</h4>
                  <p className="text-xs text-gray-500">Official Fee Receipt Voucher</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-indigo-600 text-sm block">
                    {selectedPayment.receiptNumber}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(selectedPayment.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-gray-200 py-3">
                <div>
                  <span className="text-gray-400 block">Student ID:</span>
                  <span className="font-medium text-gray-800">{selectedPayment.studentId}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Payment Method:</span>
                  <span className="font-mono font-medium text-gray-800">
                    {selectedPayment.paymentMethod}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Transaction Reference:</span>
                  <span className="font-mono text-gray-800">
                    {selectedPayment.gatewayTransactionId || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Status:</span>
                  <span className="font-semibold text-emerald-600">{selectedPayment.status}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-semibold text-gray-700">Total Amount Received:</span>
                <span className="text-xl font-extrabold text-emerald-600 font-mono">
                  {Money.formatMoney(selectedPayment.amount, currency)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST REFUND MODAL */}
      {showRefundModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <RotateCcw className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 text-lg">Request Payment Refund</h3>
            </div>
            <p className="text-xs text-gray-600">
              Initiate a refund request for receipt{' '}
              <span className="font-mono font-bold text-gray-900">
                {selectedPayment.receiptNumber}
              </span>
              . Requires administrative approval.
            </p>
            <form onSubmit={handleRequestRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Refund Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Money.fromMinorUnits(selectedPayment.amount)}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Refund Reason *
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Overpayment adjustment or course drop"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestingRefund}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                >
                  {requestingRefund ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
