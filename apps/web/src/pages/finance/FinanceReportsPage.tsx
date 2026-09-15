import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetFeeDefaultersReportQuery,
  useGetFeeCollectionReportQuery,
} from '../../features/finance/financeApi.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const FinanceReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'defaulters' | 'collections'>('defaulters');
  const [minDaysOverdue, setMinDaysOverdue] = useState<number>(0);

  // Queries
  const { data: defaultersRes, isLoading: loadingDefaulters } = useGetFeeDefaultersReportQuery({
    minDaysOverdue: minDaysOverdue > 0 ? minDaysOverdue : undefined,
  });

  const { data: collectionsRes, isLoading: loadingCollections } = useGetFeeCollectionReportQuery();

  const defaulters = defaultersRes?.data || [];
  const collectionData = collectionsRes?.data;
  const currency = 'USD';

  const totalOverdue = defaulters.reduce((sum, d) => sum + d.outstandingAmount, 0);

  const getAgeingBadge = (days: number) => {
    if (days > 90) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (days > 60) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (days > 30) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Defaulters Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overdue ageing analysis brackets (1-30, 31-60, 61-90, 90+ days) and collection breakdown.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('defaulters')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'defaulters'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Defaulters Ageing Report ({defaulters.length})
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'collections'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Collection Summary Breakdown
          </button>
        </nav>
      </div>

      {/* TAB 1: DEFAULTERS REPORT */}
      {activeTab === 'defaulters' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Defaulters Count
              </span>
              <p className="text-2xl font-bold text-rose-600 mt-1">{defaulters.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Overdue Debt
              </span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {Money.formatMoney(totalOverdue, currency)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Filter by Ageing Days
              </span>
              <select
                value={minDaysOverdue}
                onChange={(e) => setMinDaysOverdue(Number(e.target.value))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-rose-500 focus:border-rose-500"
              >
                <option value={0}>All Overdue Invoices</option>
                <option value={30}>Over 30 Days Overdue</option>
                <option value={60}>Over 60 Days Overdue</option>
                <option value={90}>Critical: Over 90 Days Overdue</option>
              </select>
            </div>
          </div>

          {/* Defaulters Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Student Overdue Balances</h2>
            </div>

            {loadingDefaulters ? (
              <div className="p-12 flex justify-center">
                <Spinner />
              </div>
            ) : defaulters.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
                <p className="text-base font-medium text-gray-900">No Defaulters Found</p>
                <p className="text-sm text-gray-500 mt-1">
                  All fee invoices are either fully paid or currently within their active grace periods.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                    <tr>
                      <th className="px-6 py-3">Student Name</th>
                      <th className="px-6 py-3">Admission #</th>
                      <th className="px-6 py-3">Class</th>
                      <th className="px-6 py-3">Total Overdue</th>
                      <th className="px-6 py-3">Days Overdue</th>
                      <th className="px-6 py-3">Ageing Bracket</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {defaulters.map((d, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{d.studentName}</td>
                        <td className="px-6 py-4 font-mono text-xs text-indigo-600">
                          {d.admissionNumber}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-700">
                          {d.className}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-rose-600">
                          {Money.formatMoney(d.outstandingAmount, currency)}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-800">
                          {d.daysOverdue} days
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getAgeingBadge(
                              d.daysOverdue
                            )}`}
                          >
                            {d.daysOverdue > 90
                              ? '90+ Days'
                              : d.daysOverdue > 60
                                ? '61-90 Days'
                                : d.daysOverdue > 30
                                  ? '31-60 Days'
                                  : '1-30 Days'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/finance/ledger?studentId=${d.studentId}`}
                            className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            Ledger
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
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

      {/* TAB 2: COLLECTION SUMMARY */}
      {activeTab === 'collections' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 text-lg mb-4">
              Collection Breakdown by Payment Method
            </h2>

            {loadingCollections ? (
              <div className="p-8 flex justify-center">
                <Spinner />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {collectionData?.breakdown ? (
                  collectionData.breakdown.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-2"
                    >
                      <span className="text-xs font-mono uppercase tracking-wider text-gray-500 block">
                        {item._id || item.method}
                      </span>
                      <p className="text-xl font-bold text-gray-900">
                        {Money.formatMoney(item.totalAmount, currency)}
                      </p>
                      <p className="text-xs text-gray-400">{item.count} total transactions</p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-4 text-center text-gray-500 py-8 text-sm">
                    No collection summary records available for this reporting period.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
