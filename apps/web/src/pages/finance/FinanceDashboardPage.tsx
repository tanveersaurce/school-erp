import React from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowRight,
  FileText,
  CreditCard,
  Layers,
  PieChart,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { useAppSelector } from '../../store/index.js';
import { UserType, InvoiceStatus, Money } from '@edusphere/common';
import {
  useGetFinanceKPIsQuery,
  useGetInvoicesQuery,
  useGetPaymentsQuery,
  useGetMyInvoicesQuery,
  useGetMyLedgerQuery,
  useGetFeeDefaultersReportQuery,
} from '../../features/finance/financeApi.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const FinanceDashboardPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isStudent = user?.userType === UserType.STUDENT;
  const isParent = user?.userType === UserType.PARENT;

  // Operational finance queries
  const { data: kpiRes, isLoading: loadingKpis } = useGetFinanceKPIsQuery(undefined, {
    skip: isStudent || isParent,
  });

  const { data: defaultersRes } = useGetFeeDefaultersReportQuery(undefined, {
    skip: isStudent || isParent,
  });

  const { data: invoicesRes, isLoading: loadingInvoices } = useGetInvoicesQuery(
    { limit: 5 },
    { skip: isStudent || isParent }
  );

  const { data: paymentsRes, isLoading: loadingPayments } = useGetPaymentsQuery(
    { limit: 5 },
    { skip: isStudent || isParent }
  );

  // Student self-service queries
  const { data: myInvoicesRes, isLoading: loadingMyInvoices } = useGetMyInvoicesQuery(undefined, {
    skip: !isStudent,
  });

  const { data: myLedgerRes } = useGetMyLedgerQuery(undefined, {
    skip: !isStudent,
  });

  const kpis = kpiRes?.data;
  const defaulters = defaultersRes?.data || [];
  const recentInvoices = invoicesRes?.data?.invoices || [];
  const recentPayments = paymentsRes?.data?.payments || [];
  const myInvoices = myInvoicesRes?.data || [];
  const myLedger = myLedgerRes?.data;

  const currency = 'USD';

  const getInvoiceStatusBadge = (status: string) => {
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
          <h1 className="text-2xl font-bold text-gray-900">Fees & Finance Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time fee structures, sequential invoicing, receipts ledger, defaulters tracking, and student financial accounts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isStudent ? (
            <Link
              to="/finance/my-fees"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              My Financial Statement
            </Link>
          ) : isParent ? (
            <Link
              to="/finance/ledger"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <Users className="w-4 h-4 mr-2" />
              Child Fee Portals
            </Link>
          ) : (
            <>
              <Link
                to="/finance/payments"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
              >
                <CreditCard className="w-4 h-4 mr-2 text-gray-500" />
                Collect Payment
              </Link>
              <Link
                to="/finance/invoices"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Manage Invoices
              </Link>
            </>
          )}
        </div>
      </div>

      {/* STUDENT SELF-SERVICE VIEW */}
      {isStudent && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Invoiced
              </span>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {myLedger ? Money.formatMoney(myLedger.totalInvoiced, currency) : '$0.00'}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Paid
              </span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {myLedger ? Money.formatMoney(myLedger.totalPaid, currency) : '$0.00'}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Outstanding Balance
              </span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {myLedger ? Money.formatMoney(myLedger.outstandingBalance, currency) : '$0.00'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">My Fee Invoices</h2>
              <Link to="/finance/my-fees" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                View statement &rarr;
              </Link>
            </div>
            {loadingMyInvoices ? (
              <div className="p-8 flex justify-center">
                <Spinner />
              </div>
            ) : myInvoices.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No fee invoices generated for your account.
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
                      <th className="px-6 py-3 text-right">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {myInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-indigo-600">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getInvoiceStatusBadge(
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
                        <td className="px-6 py-4 text-right text-xs font-bold text-rose-600">
                          {Money.formatMoney(inv.balanceAmount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PARENT VIEW NOTICE */}
      {isParent && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-2xl mx-auto shadow-sm my-12">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Parent Fee Portal</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            Review fee structures, download itemized invoices, track payments, and verify real-time statements for your children.
          </p>
          <div className="mt-6">
            <Link
              to="/my-children"
              className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Select Student to View Fees
            </Link>
          </div>
        </div>
      )}

      {/* STAFF / ADMIN / ACCOUNTANT VIEW */}
      {!isStudent && !isParent && (
        <>
          {/* Executive KPI Cards */}
          {loadingKpis ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Total Invoiced
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {Money.formatMoney(kpis?.totalInvoiced ?? 0, currency)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Total Collected
                    </p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      {Money.formatMoney(kpis?.totalCollected ?? 0, currency)}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Outstanding
                    </p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                      {Money.formatMoney(kpis?.totalOutstanding ?? 0, currency)}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Overdue
                    </p>
                    <p className="text-2xl font-bold text-rose-600 mt-1">
                      {Money.formatMoney(kpis?.totalOverdue ?? 0, currency)}
                    </p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Collection Rate
                    </p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">
                      {((kpis?.collectionRatePercentage ?? 0)).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Defaulters
                    </p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">
                      {defaulters.length}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Navigation Modules */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <Link
              to="/finance/structures"
              className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 flex items-center">
                Fee Structures
                <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Configure fee heads, categories, late fee rules, and frequency-based fees.
              </p>
            </Link>

            <Link
              to="/finance/invoices"
              className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 flex items-center">
                Invoices & Billing
                <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Single and bulk invoice generation with atomic numbering and late fee calculation.
              </p>
            </Link>

            <Link
              to="/finance/payments"
              className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 flex items-center">
                Payments & Receipts
                <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Collect offline/online payments, partial disbursements, and issue verified receipts.
              </p>
            </Link>

            <Link
              to="/finance/reports"
              className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 flex items-center">
                Defaulters & Reports
                <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Ageing analysis (1-30, 31-60, 61-90, 90+ days), collection trends, and ledgers.
              </p>
            </Link>
          </div>

          {/* Dual Ledger: Recent Invoices & Recent Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Invoices */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Recent Invoices</h2>
                <Link
                  to="/finance/invoices"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View all &rarr;
                </Link>
              </div>

              {loadingInvoices ? (
                <div className="p-8 flex justify-center">
                  <Spinner />
                </div>
              ) : recentInvoices.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No invoices generated yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                      <tr>
                        <th className="px-4 py-3">Invoice #</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getInvoiceStatusBadge(
                                inv.status
                              )}`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-gray-900">
                            {Money.formatMoney(inv.totalAmount, currency)}
                          </td>
                          <td className="px-4 py-3 text-xs text-right font-bold text-rose-600">
                            {Money.formatMoney(inv.balanceAmount, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Payments */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Recent Collections</h2>
                <Link
                  to="/finance/payments"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View all &rarr;
                </Link>
              </div>

              {loadingPayments ? (
                <div className="p-8 flex justify-center">
                  <Spinner />
                </div>
              ) : recentPayments.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No payment collections recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                      <tr>
                        <th className="px-4 py-3">Receipt #</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-600">
                            {pay.receiptNumber}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-xs">
                              {pay.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {new Date(pay.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-xs text-right font-bold text-emerald-600">
                            {Money.formatMoney(pay.amount, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
