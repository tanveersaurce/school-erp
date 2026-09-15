import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Ban,
  X,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Money, InvoiceStatus } from '@edusphere/common';
import type { IFeeInvoice } from '@edusphere/types';
import {
  useGetInvoicesQuery,
  useGenerateBulkInvoicesMutation,
  useVoidInvoiceMutation,
  useRecalculateLateFeesMutation,
  useGetFeeStructuresQuery,
} from '../../features/finance/financeApi.js';
import { useToast } from '../../components/common/Toast.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const FeeInvoicesPage: React.FC = () => {
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const page = 1;

  // Queries & Mutations
  const { data: invoicesRes, isLoading: loadingInvoices } = useGetInvoicesQuery({
    status: statusFilter || undefined,
    invoiceNumber: searchQuery.trim() || undefined,
    page,
    limit: 10,
  });

  const { data: structuresRes } = useGetFeeStructuresQuery();
  const [generateBulkInvoices, { isLoading: generatingBulk }] = useGenerateBulkInvoicesMutation();
  const [voidInvoice, { isLoading: voiding }] = useVoidInvoiceMutation();
  const [recalculateLateFees, { isLoading: recalculating }] = useRecalculateLateFeesMutation();

  // Modals state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<IFeeInvoice | null>(null);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // Bulk Generation Form
  const [bulkAcademicYearId, setBulkAcademicYearId] = useState('ay_current');
  const [bulkAcademicClassId, setBulkAcademicClassId] = useState('class_10a');
  const [bulkFeeStructureId, setBulkFeeStructureId] = useState('');
  const [bulkDueDate, setBulkDueDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );

  const invoices = invoicesRes?.data?.invoices || [];
  const structures = structuresRes?.data || [];
  const currency = 'USD';

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkAcademicYearId || !bulkAcademicClassId || !bulkFeeStructureId || !bulkDueDate) {
      showToast('All fields are required for invoice generation', 'error');
      return;
    }
    try {
      const res = await generateBulkInvoices({
        academicYearId: bulkAcademicYearId,
        academicClassId: bulkAcademicClassId,
        feeStructureId: bulkFeeStructureId,
        dueDate: new Date(bulkDueDate).toISOString(),
      }).unwrap();

      showToast(
        `Generated ${res.data?.createdCount ?? 0} invoices successfully (${res.data?.skippedCount ?? 0} skipped).`,
        'success'
      );
      setShowBulkModal(false);
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to generate bulk invoices', 'error');
    }
  };

  const handleVoidInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !voidReason.trim()) {
      showToast('A cancellation reason is required', 'error');
      return;
    }
    try {
      await voidInvoice({
        id: selectedInvoice.id,
        reason: voidReason.trim(),
      }).unwrap();
      showToast(`Invoice ${selectedInvoice.invoiceNumber} voided`, 'success');
      setShowVoidModal(false);
      setSelectedInvoice(null);
      setVoidReason('');
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to void invoice', 'error');
    }
  };

  const handleRecalculateLateFees = async () => {
    try {
      const res = await recalculateLateFees({}).unwrap();
      showToast(`Late fees recalculated for ${res.data?.updatedCount ?? 0} invoices`, 'success');
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to recalculate late fees', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case InvoiceStatus.PARTIALLY_PAID:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case InvoiceStatus.OVERDUE:
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case InvoiceStatus.ISSUED:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case InvoiceStatus.VOID:
        return 'bg-gray-100 text-gray-500 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Invoices & Billing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and track itemized billing with sequential numbering (INV-YYYY-XXXXX) and balance calculations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRecalculateLateFees}
            disabled={recalculating}
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
            Run Late Fees
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Invoices
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value={InvoiceStatus.ISSUED}>Issued</option>
            <option value={InvoiceStatus.PARTIALLY_PAID}>Partially Paid</option>
            <option value={InvoiceStatus.PAID}>Paid</option>
            <option value={InvoiceStatus.OVERDUE}>Overdue</option>
            <option value={InvoiceStatus.VOID}>Void</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loadingInvoices ? (
          <div className="p-12 flex justify-center">
            <Spinner />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-base font-medium text-gray-900">No invoices found</p>
            <p className="text-sm text-gray-500 mt-1">
              Generate student invoices for the term or adjust your search filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                <tr>
                  <th className="px-6 py-3">Invoice #</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3">Total Amount</th>
                  <th className="px-6 py-3">Paid</th>
                  <th className="px-6 py-3">Balance Due</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-indigo-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                          inv.status
                        )}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-gray-900">
                      {Money.formatMoney(inv.totalAmount, currency)}
                    </td>
                    <td className="px-6 py-4 text-xs text-emerald-600">
                      {Money.formatMoney(inv.paidAmount, currency)}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-rose-600">
                      {Money.formatMoney(inv.balanceAmount, currency)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </button>
                      {inv.status !== InvoiceStatus.PAID && inv.status !== InvoiceStatus.VOID && (
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setShowVoidModal(true);
                          }}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          Void
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

      {/* BULK GENERATION MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">Generate Class Invoices</h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBulkGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Academic Year ID *
                </label>
                <input
                  type="text"
                  value={bulkAcademicYearId}
                  onChange={(e) => setBulkAcademicYearId(e.target.value)}
                  placeholder="e.g. ay_2026_2027"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Academic Class ID *
                </label>
                <input
                  type="text"
                  value={bulkAcademicClassId}
                  onChange={(e) => setBulkAcademicClassId(e.target.value)}
                  placeholder="e.g. class_10a"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Fee Structure *
                </label>
                <select
                  value={bulkFeeStructureId}
                  onChange={(e) => setBulkFeeStructureId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">Select a Fee Structure...</option>
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.code || ''} - {Money.formatMoney(s.totalAmount, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Due Date *</label>
                <input
                  type="date"
                  value={bulkDueDate}
                  onChange={(e) => setBulkDueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingBulk}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {generatingBulk ? 'Generating...' : 'Generate Invoices'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE DETAILS MODAL */}
      {selectedInvoice && !showVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  Invoice {selectedInvoice.invoiceNumber}
                </h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${getStatusBadge(
                    selectedInvoice.status
                  )}`}
                >
                  {selectedInvoice.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <span className="text-gray-400 block">Issue Date</span>
                <span className="font-medium text-gray-800">
                  {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Due Date</span>
                <span className="font-medium text-gray-800">
                  {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Line Items */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedInvoice.lineItems.map((li, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">{li.description}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {Money.formatMoney(li.amount, currency)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50/50 font-semibold text-gray-800">
                    <td className="px-3 py-2">Subtotal</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {Money.formatMoney(selectedInvoice.subTotal, currency)}
                    </td>
                  </tr>
                  {selectedInvoice.totalDiscount > 0 && (
                    <tr className="text-emerald-600">
                      <td className="px-3 py-2">Discount Applied</td>
                      <td className="px-3 py-2 text-right font-mono">
                        -{Money.formatMoney(selectedInvoice.totalDiscount, currency)}
                      </td>
                    </tr>
                  )}
                  {selectedInvoice.lateFeeAmount > 0 && (
                    <tr className="text-rose-600">
                      <td className="px-3 py-2">Late Fee Incurred</td>
                      <td className="px-3 py-2 text-right font-mono">
                        +{Money.formatMoney(selectedInvoice.lateFeeAmount, currency)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-gray-100 font-bold text-gray-900 text-sm">
                    <td className="px-3 py-2">Total Amount</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {Money.formatMoney(selectedInvoice.totalAmount, currency)}
                    </td>
                  </tr>
                  <tr className="text-rose-700 font-bold">
                    <td className="px-3 py-2">Balance Remaining Due</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {Money.formatMoney(selectedInvoice.balanceAmount, currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOID INVOICE MODAL */}
      {showVoidModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-gray-900 text-lg">Void Fee Invoice</h3>
            </div>
            <p className="text-xs text-gray-600">
              Are you sure you want to void invoice{' '}
              <span className="font-mono font-bold text-gray-900">
                {selectedInvoice.invoiceNumber}
              </span>
              ? This action is immutable and removes the outstanding balance liability from the student ledger.
            </p>
            <form onSubmit={handleVoidInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason for Cancellation *
                </label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Generated with wrong fee structure or student withdrawn"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVoidModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={voiding}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
                >
                  {voiding ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
