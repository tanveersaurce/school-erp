import React, { useState } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  Boxes,
  User,
  BookOpen,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetOverdueReportQuery,
  useGetPopularBooksQuery,
  useGetInventoryReportQuery,
} from '../../features/library/libraryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';

export const LibraryReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OVERDUE' | 'POPULAR' | 'INVENTORY'>('OVERDUE');

  const { data: overdueRes, isLoading: loadingOverdue } = useGetOverdueReportQuery();
  const { data: popularRes, isLoading: loadingPopular } = useGetPopularBooksQuery({ limit: 15 });
  const { data: inventoryRes } = useGetInventoryReportQuery();

  const overdueData = overdueRes?.data || [];
  const popularData = popularRes?.data || [];
  const inventoryData = inventoryRes?.data || { totalCopies: 0, byStatus: {}, byCondition: {} };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Library Analytics & Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Audit overdue items, circulation trends, and physical inventory condition metrics.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('OVERDUE')}
          className={`pb-3 px-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'OVERDUE'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Overdue Loans ({Array.isArray(overdueData) ? overdueData.length : 0})
        </button>
        <button
          onClick={() => setActiveTab('POPULAR')}
          className={`pb-3 px-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'POPULAR'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Most Borrowed Books
        </button>
        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`pb-3 px-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'INVENTORY'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Inventory Condition & Health
        </button>
      </div>

      {/* TAB 1: Overdue Loans */}
      {activeTab === 'OVERDUE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Delinquent & Overdue Borrowers</h2>
            <span className="text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full font-medium">
              Requires circulation follow-up
            </span>
          </div>

          <Card>
            {loadingOverdue ? (
              <div className="p-12 flex justify-center">
                <Spinner />
              </div>
            ) : !Array.isArray(overdueData) || overdueData.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
                <p className="font-medium text-gray-900">No overdue items!</p>
                <p className="text-xs text-gray-400 mt-1">All borrowed materials are within their scheduled loan periods.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Borrower</th>
                      <th className="px-6 py-3">Book & Barcode</th>
                      <th className="px-6 py-3">Issued Date</th>
                      <th className="px-6 py-3">Due Date</th>
                      <th className="px-6 py-3">Days Overdue</th>
                      <th className="px-6 py-3">Est. Overdue Fine</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {overdueData.map((item: any, idx: number) => {
                      const daysLate = Math.max(0, Math.floor((Date.now() - new Date(item.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
                      return (
                        <tr key={item._id || idx} className="hover:bg-rose-50/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-medium text-xs">
                                <User className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {typeof item.memberId === 'object' ? item.memberId?.memberNumber : item.memberId}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {typeof item.memberId === 'object' ? item.memberId?.memberType : 'MEMBER'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">
                                {typeof item.bookId === 'object' ? item.bookId?.title : 'Book'}
                              </p>
                              <p className="text-xs font-mono text-gray-500">
                                {typeof item.copyId === 'object' ? item.copyId?.accessionNumber : item.copyId}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {new Date(item.issuedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-rose-600">
                            {new Date(item.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-semibold text-rose-600">
                            {daysLate} {daysLate === 1 ? 'day' : 'days'}
                          </td>
                          <td className="px-6 py-4 font-mono font-medium text-gray-900">
                            {item.fineAmount ? Money.format(item.fineAmount) : 'Pending calc'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: Popular Books */}
      {activeTab === 'POPULAR' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Most Frequently Circulated Books</h2>
            <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-medium">
              Top titles by loan demand
            </span>
          </div>

          <Card>
            {loadingPopular ? (
              <div className="p-12 flex justify-center">
                <Spinner />
              </div>
            ) : !Array.isArray(popularData) || popularData.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="font-medium text-gray-900">No circulation data yet</p>
                <p className="text-xs text-gray-400 mt-1">Popular books will appear as members check out items.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Rank</th>
                      <th className="px-6 py-3">Title & Authors</th>
                      <th className="px-6 py-3">ISBN</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3 text-center">Total Loans</th>
                      <th className="px-6 py-3 text-right">Available Copies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {popularData.map((book: any, idx: number) => (
                      <tr key={book._id || idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span
                            className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-800'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-800'
                                : idx === 2
                                ? 'bg-orange-100 text-orange-800'
                                : 'text-gray-500'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{book.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {Array.isArray(book.authors)
                                ? book.authors.map((a: any) => (typeof a === 'object' ? a.name : a)).join(', ')
                                : ''}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-600">
                          {book.isbn || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {typeof book.categoryId === 'object' ? book.categoryId?.name : 'General'}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-blue-600">
                          {book.borrowCount || book.loanCount || 0}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                            {book.availableCopies ?? 0} in library
                          </span>
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

      {/* TAB 3: Inventory Condition & Health */}
      {activeTab === 'INVENTORY' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Holdings</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {inventoryData.totalCopies ?? 0}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Physical accessioned copies</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Boxes className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Circulating</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {inventoryData.byStatus?.ISSUED ?? 0}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Currently checked out</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Lost or Damaged</p>
                  <p className="text-3xl font-bold text-rose-600 mt-2">
                    {(inventoryData.byStatus?.LOST ?? 0) + (inventoryData.byStatus?.DAMAGED ?? 0)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Requires replacement or write-off</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Inventory by Status</h3>
              <div className="space-y-3">
                {Object.entries(inventoryData.byStatus || {}).map(([status, count]: any) => {
                  const total = inventoryData.totalCopies || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-gray-700">
                        <span>{status}</span>
                        <span>{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            status === 'AVAILABLE'
                              ? 'bg-emerald-500'
                              : status === 'ISSUED'
                              ? 'bg-blue-500'
                              : status === 'LOST' || status === 'DAMAGED'
                              ? 'bg-rose-500'
                              : 'bg-gray-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Condition Breakdown */}
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Inventory by Physical Condition</h3>
              <div className="space-y-3">
                {Object.entries(inventoryData.byCondition || {}).map(([cond, count]: any) => {
                  const total = inventoryData.totalCopies || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={cond} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-gray-700">
                        <span>{cond}</span>
                        <span>{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            cond === 'NEW'
                              ? 'bg-emerald-600'
                              : cond === 'GOOD'
                              ? 'bg-teal-500'
                              : cond === 'FAIR'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
