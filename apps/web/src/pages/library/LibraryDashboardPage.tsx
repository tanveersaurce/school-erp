import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  BookmarkCheck,
  RotateCcw,
  AlertTriangle,
  Users,
  DollarSign,
  Layers,
  ChevronRight,
  PlusCircle,
  FileText,
  Settings,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetLibraryDashboardKPIsQuery,
  useGetOverdueReportQuery,
  useGetPopularBooksQuery,
  useGetCirculationsQuery,
} from '../../features/library/libraryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const LibraryDashboardPage: React.FC = () => {
  const { data: kpiRes, isLoading: loadingKpis } = useGetLibraryDashboardKPIsQuery();
  const { data: overdueRes, isLoading: loadingOverdue } = useGetOverdueReportQuery();
  const { data: popularRes, isLoading: loadingPopular } = useGetPopularBooksQuery({ limit: 5 });
  const { data: circRes, isLoading: loadingCircs } = useGetCirculationsQuery({ limit: 5 });

  const kpis = kpiRes?.data;
  const overdueLoans = overdueRes?.data || [];
  const popularBooks = popularRes?.data || [];
  const recentLoans = circRes?.data?.items || [];

  const isLoading = loadingKpis || loadingOverdue || loadingPopular || loadingCircs;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-sky-400" />
            Library & Resource Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Physical Asset Cataloging, Real-time Circulation Desk, Hold Queues & Zero-Float Fine Management
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/library/circulation">
            <Button variant="primary" leftIcon={<RotateCcw className="w-4 h-4" />}>
              Circulation Desk
            </Button>
          </Link>
          <Link to="/library/catalog">
            <Button variant="secondary" leftIcon={<PlusCircle className="w-4 h-4" />}>
              Add Book
            </Button>
          </Link>
          <Link to="/library/settings">
            <Button variant="secondary" leftIcon={<Settings className="w-4 h-4" />}>
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="p-5 bg-slate-800/80 border-slate-700/60 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Book Titles</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">{kpis?.totalBooks ?? (kpis as any)?.totalTitles ?? 0}</h3>
                  <p className="text-xs text-sky-400 mt-1 flex items-center gap-1 font-medium">
                    <Layers className="w-3.5 h-3.5" />
                    {kpis?.totalCopies ?? 0} Physical Copies
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-slate-800/80 border-slate-700/60 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Borrowings</p>
                  <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">{kpis?.issuedCopies ?? (kpis as any)?.activeLoans ?? 0}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {kpis?.availableCopies ?? 0} Available on Shelves
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <RotateCcw className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-slate-800/80 border-slate-700/60 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overdue Items</p>
                  <h3 className="text-2xl font-extrabold text-rose-400 mt-1">{(kpis as any)?.overdueLoans ?? kpis?.overdueCount ?? overdueLoans.length}</h3>
                  <p className="text-xs text-rose-400/80 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Action Required
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-slate-800/80 border-slate-700/60 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Outstanding Fines</p>
                  <h3 className="text-2xl font-extrabold text-amber-400 mt-1">
                    {Money.formatMoney(kpis?.totalOutstandingFines ?? (kpis as any)?.unpaidFinesTotalMinorUnits ?? 0, 'USD')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {kpis?.pendingReservations ?? (kpis as any)?.activeReservations ?? 0} Hold Reservations
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Nav Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Catalog', href: '/library/catalog', icon: BookOpen, color: 'text-sky-400', bg: 'bg-sky-500/10' },
              { label: 'Circulation', href: '/library/circulation', icon: RotateCcw, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Members', href: '/library/members', icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
              { label: 'Hold Queue', href: '/library/reservations', icon: BookmarkCheck, color: 'text-purple-400', bg: 'bg-purple-500/10' },
              { label: 'Fines Desk', href: '/library/fines', icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Reports', href: '/library/reports', icon: FileText, color: 'text-teal-400', bg: 'bg-teal-500/10' },
            ].map((tile) => (
              <Link
                key={tile.label}
                to={tile.href}
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-all hover:bg-slate-800 group text-center"
              >
                <div className={`w-10 h-10 rounded-lg ${tile.bg} flex items-center justify-center ${tile.color} mb-2 group-hover:scale-110 transition-transform`}>
                  <tile.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white">{tile.label}</span>
              </Link>
            ))}
          </div>

          {/* Main 2-Column Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Checkouts (2 Cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-sky-400" />
                  Recent Circulations
                </h3>
                <Link to="/library/circulation" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <Card className="bg-slate-800/80 border-slate-700/60 overflow-hidden shadow-lg">
                {recentLoans.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">No recent circulations recorded.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-700/60">
                        <tr>
                          <th className="px-4 py-3">Book Title</th>
                          <th className="px-4 py-3">Borrower</th>
                          <th className="px-4 py-3">Due Date</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/40">
                        {recentLoans.map((loan: any) => (
                          <tr key={loan._id} className="hover:bg-slate-700/20">
                            <td className="px-4 py-3 font-medium text-white">
                              {loan.bookId?.title || 'Book Copy'}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {loan.memberId?.memberNumber || loan.borrowerType}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {new Date(loan.dueAt).toLocaleDateString()}
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            {/* Popular Books (1 Col) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Most Borrowed Titles
                </h3>
                <Link to="/library/reports" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
                  Full Report <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <Card className="bg-slate-800/80 border-slate-700/60 p-4 shadow-lg divide-y divide-slate-700/50">
                {popularBooks.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">No circulation history yet.</div>
                ) : (
                  popularBooks.map((item: any, idx: number) => (
                    <div key={item._id || idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-white truncate max-w-[160px]">{item.title}</p>
                          <p className="text-xs text-slate-400">{item.category || 'General'}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                        {item.borrowCount} loans
                      </span>
                    </div>
                  ))
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
