import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Search,
  Printer,
} from 'lucide-react';
import { useAppSelector } from '../../store/index.js';
import { UserType, Money } from '@edusphere/common';
import {
  useGetStudentLedgerQuery,
  useGetMyLedgerQuery,
  useGetChildLedgerQuery,
} from '../../features/finance/financeApi.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const StudentLedgerPage: React.FC = () => {
  const { studentId: paramStudentId } = useParams<{ studentId?: string }>();
  const { user } = useAppSelector((state) => state.auth);

  const isStudent = user?.userType === UserType.STUDENT;
  const isParent = user?.userType === UserType.PARENT;

  // If staff/admin, allow searching student ID
  const [searchStudentId, setSearchStudentId] = useState<string>(paramStudentId || '');
  const [activeStudentId, setActiveStudentId] = useState<string>(paramStudentId || '');

  // Dynamic ledger query based on role
  const { data: myLedgerRes, isLoading: loadingMyLedger } = useGetMyLedgerQuery(undefined, {
    skip: !isStudent,
  });

  const { data: childLedgerRes, isLoading: loadingChildLedger } = useGetChildLedgerQuery(
    { studentId: activeStudentId },
    { skip: !isParent || !activeStudentId }
  );

  const { data: adminLedgerRes, isLoading: loadingAdminLedger } = useGetStudentLedgerQuery(
    { studentId: activeStudentId },
    { skip: isStudent || isParent || !activeStudentId }
  );

  const statement = isStudent
    ? myLedgerRes?.data
    : isParent
      ? childLedgerRes?.data
      : adminLedgerRes?.data;

  const isLoading = isStudent
    ? loadingMyLedger
    : isParent
      ? loadingChildLedger
      : loadingAdminLedger;

  const currency = 'USD';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchStudentId.trim()) {
      setActiveStudentId(searchStudentId.trim());
    }
  };

  const getEntryBadge = (type: string) => {
    switch (type) {
      case 'INVOICE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PAYMENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REFUND':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ADJUSTMENT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Financial Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete chronological debit & credit journal entries with verified running balance statements.
          </p>
        </div>
        {statement && (
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2 text-gray-500" />
            Print Statement
          </button>
        )}
      </div>

      {/* Admin/Staff Search Bar */}
      {!isStudent && !isParent && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Enter Student ID to inspect ledger statement (e.g. stu_alice)..."
                value={searchStudentId}
                onChange={(e) => setSearchStudentId(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm"
            >
              Lookup Ledger
            </button>
          </form>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="p-12 flex justify-center">
          <Spinner />
        </div>
      )}

      {/* No selection state */}
      {!isLoading && !statement && !isStudent && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-base font-medium text-gray-900">No Student Selected</p>
          <p className="text-sm text-gray-500 mt-1">
            Search for a student ID above to load their real-time financial ledger statement.
          </p>
        </div>
      )}

      {/* Ledger Statement */}
      {statement && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Invoiced (Debit)
              </span>
              <p className="text-xl font-bold text-blue-600 mt-1">
                +{Money.formatMoney(statement.totalInvoiced, currency)}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Paid (Credit)
              </span>
              <p className="text-xl font-bold text-emerald-600 mt-1">
                -{Money.formatMoney(statement.totalPaid, currency)}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Refunded
              </span>
              <p className="text-xl font-bold text-amber-600 mt-1">
                {Money.formatMoney(statement.totalRefunded, currency)}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Outstanding Balance
              </span>
              <p className="text-xl font-extrabold text-rose-600 mt-1">
                {Money.formatMoney(statement.outstandingBalance, currency)}
              </p>
            </div>
          </div>

          {/* Chronological Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {statement.studentName || 'Student Ledger'}
                </h2>
                <p className="text-xs text-gray-400">
                  ID: <span className="font-mono text-gray-600">{statement.studentId}</span>
                  {statement.className && ` | Class: ${statement.className}`}
                  {statement.academicYearName && ` | AY: ${statement.academicYearName}`}
                </p>
              </div>
              <span className="text-xs text-gray-500">
                Statement Date: {new Date().toLocaleDateString()}
              </span>
            </div>

            {statement.entries.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No ledger transactions found for this student.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Reference #</th>
                      <th className="px-6 py-3">Description</th>
                      <th className="px-6 py-3 text-right">Debit (+)</th>
                      <th className="px-6 py-3 text-right">Credit (-)</th>
                      <th className="px-6 py-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {statement.entries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-xs">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getEntryBadge(
                              entry.type
                            )}`}
                          >
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-indigo-600">
                          {entry.referenceNumber}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-700">{entry.description}</td>
                        <td className="px-6 py-4 text-right text-xs font-mono text-blue-600">
                          {entry.debit > 0
                            ? `+${Money.formatMoney(entry.debit, currency)}`
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-mono text-emerald-600">
                          {entry.credit > 0
                            ? `-${Money.formatMoney(entry.credit, currency)}`
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-mono font-bold text-gray-900">
                          {Money.formatMoney(entry.runningBalance, currency)}
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
    </div>
  );
};
