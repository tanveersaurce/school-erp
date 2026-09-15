import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  DollarSign,
  X,
} from 'lucide-react';
import { Money, PaymentMethod } from '@edusphere/common';
import {
  useGetIncomeQuery,
  useCreateIncomeMutation,
  useGetExpenseQuery,
  useCreateExpenseMutation,
} from '../../features/finance/financeApi.js';
import { useToast } from '../../components/common/Toast.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const IncomeExpensePage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  // Queries
  const { data: incomeRes, isLoading: loadingIncome } = useGetIncomeQuery();
  const { data: expenseRes, isLoading: loadingExpense } = useGetExpenseQuery();

  const [createIncome, { isLoading: creatingIncome }] = useCreateIncomeMutation();
  const [createExpense, { isLoading: creatingExpense }] = useCreateExpenseMutation();

  // Modals state
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Income Form
  const [incTitle, setIncTitle] = useState('');
  const [incCategory, setIncCategory] = useState('DONATION');
  const [incAmount, setIncAmount] = useState(500);
  const [incRef, setIncRef] = useState('');
  const [incDate, setIncDate] = useState(new Date().toISOString().split('T')[0]);
  const [incDescription, setIncDescription] = useState('');

  // Expense Form
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState('UTILITIES');
  const [expAmount, setExpAmount] = useState(250);
  const [expPayee, setExpPayee] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expDescription, setExpDescription] = useState('');

  const incomeRecords = incomeRes?.data?.incomeRecords || [];
  const expenseRecords = expenseRes?.data?.expenses || [];

  const totalIncome = incomeRecords.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = expenseRecords.reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIncome - totalExpense;
  const currency = 'USD';

  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incTitle.trim() || incAmount <= 0) {
      showToast('Title and valid amount are required', 'error');
      return;
    }
    try {
      await createIncome({
        title: incTitle.trim(),
        category: incCategory,
        amount: Money.toMinorUnits(incAmount),
        referenceNumber: incRef.trim() || undefined,
        date: new Date(incDate).toISOString(),
        description: incDescription.trim() || undefined,
      }).unwrap();

      showToast('Operating income recorded successfully', 'success');
      setShowIncomeModal(false);
      setIncTitle('');
      setIncRef('');
      setIncDescription('');
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to record income', 'error');
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || expAmount <= 0) {
      showToast('Title and valid amount are required', 'error');
      return;
    }
    try {
      await createExpense({
        title: expTitle.trim(),
        category: expCategory,
        amount: Money.toMinorUnits(expAmount),
        payee: expPayee.trim() || 'General Vendor',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        date: new Date(expDate).toISOString(),
        description: expDescription.trim() || undefined,
      }).unwrap();

      showToast('Operating expense recorded successfully', 'success');
      setShowExpenseModal(false);
      setExpTitle('');
      setExpPayee('');
      setExpDescription('');
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to record expense', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operating Income & Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track operational institution cashflow, department expenditures, and non-fee revenue.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Expense
          </button>
          <button
            onClick={() => setShowIncomeModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Income
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Operating Income
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {Money.formatMoney(totalIncome, currency)}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Operating Expenses
              </p>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {Money.formatMoney(totalExpense, currency)}
              </p>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Net Operating Balance
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  netBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'
                }`}
              >
                {Money.formatMoney(netBalance, currency)}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('expense')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'expense'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Expenses Ledger ({expenseRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'income'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Income Ledger ({incomeRecords.length})
          </button>
        </nav>
      </div>

      {/* EXPENSE LEDGER */}
      {activeTab === 'expense' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loadingExpense ? (
            <div className="p-8 flex justify-center">
              <Spinner />
            </div>
          ) : expenseRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No operating expenses recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Payee</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expenseRecords.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-xs">
                        {new Date(exp.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{exp.title}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className="px-2 py-0.5 rounded bg-gray-100 font-mono text-gray-700">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">{exp.payee || '—'}</td>
                      <td className="px-6 py-4 text-right font-bold text-rose-600 text-xs font-mono">
                        -{Money.formatMoney(exp.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INCOME LEDGER */}
      {activeTab === 'income' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loadingIncome ? (
            <div className="p-8 flex justify-center">
              <Spinner />
            </div>
          ) : incomeRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No non-fee income records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Reference #</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {incomeRecords.map((inc) => (
                    <tr key={inc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-xs">
                        {new Date(inc.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{inc.title}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className="px-2 py-0.5 rounded bg-gray-100 font-mono text-gray-700">
                          {inc.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                        {inc.referenceNumber || '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600 text-xs font-mono">
                        +{Money.formatMoney(inc.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RECORD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">Record Operating Expense</h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. Science Lab Supplies"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500"
                  >
                    <option value="UTILITIES">Utilities</option>
                    <option value="SUPPLIES">Supplies</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="MISCELLANEOUS">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payee</label>
                <input
                  type="text"
                  value={expPayee}
                  onChange={(e) => setExpPayee(e.target.value)}
                  placeholder="e.g. Acme Scientific Tools Inc."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingExpense}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
                >
                  {creatingExpense ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD INCOME MODAL */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">Record Operating Income</h3>
              <button
                onClick={() => setShowIncomeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateIncome} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Income Title *
                </label>
                <input
                  type="text"
                  value={incTitle}
                  onChange={(e) => setIncTitle(e.target.value)}
                  placeholder="e.g. Alumni Association Donation"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={incCategory}
                    onChange={(e) => setIncCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="DONATION">Donation</option>
                    <option value="GRANT">Grant</option>
                    <option value="FACILITIES_RENT">Facilities Rent</option>
                    <option value="CAFETERIA_CONCESSION">Cafeteria Concession</option>
                    <option value="MISCELLANEOUS">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={incAmount}
                    onChange={(e) => setIncAmount(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reference # / Cheque #
                </label>
                <input
                  type="text"
                  value={incRef}
                  onChange={(e) => setIncRef(e.target.value)}
                  placeholder="e.g. REF-DON-001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={incDate}
                  onChange={(e) => setIncDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingIncome}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {creatingIncome ? 'Saving...' : 'Record Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
