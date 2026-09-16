import React, { useState } from 'react';
import {
  BookOpen,
  AlertTriangle,
  BookmarkCheck,
  DollarSign,
  User,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetMyLibraryProfileQuery,
  useGetMyCirculationsQuery,
  useGetMyReservationsQuery,
  useGetMyFinesQuery,
  useCancelReservationMutation,
} from '../../features/library/libraryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const MyLibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'LOANS' | 'HOLDS' | 'FINES'>('LOANS');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: profileRes, isLoading: loadingProfile } = useGetMyLibraryProfileQuery();
  const { data: circsRes, isLoading: loadingCircs } = useGetMyCirculationsQuery();
  const { data: reservesRes, isLoading: loadingReserves, refetch: refetchReserves } = useGetMyReservationsQuery();
  const { data: finesRes, isLoading: loadingFines } = useGetMyFinesQuery();

  const [cancelReservation, { isLoading: cancellingHold }] = useCancelReservationMutation();

  const profile = profileRes?.data;
  const circulations = circsRes?.data?.items || [];
  const reservations = reservesRes?.data?.items || [];
  const fines = finesRes?.data?.items || [];

  const handleCancelHold = async (holdId: string) => {
    setActionSuccess(null);
    setActionError(null);
    try {
      await cancelReservation(holdId).unwrap();
      setActionSuccess('Reservation successfully cancelled.');
      refetchReserves();
    } catch (err: any) {
      setActionError(err?.data?.message || 'Failed to cancel reservation.');
    }
  };

  const activeLoans = circulations.filter((c: any) => c.status === 'ISSUED' || c.status === 'OVERDUE');
  const totalUnpaidFines = fines.reduce((sum: number, f: any) => {
    const rem = f.amount - (f.paidAmount || 0) - (f.waivedAmount || 0);
    return sum + (rem > 0 ? rem : 0);
  }, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Library Account</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review your active borrowed items, upcoming due dates, reservation queue status, and outstanding fines.
        </p>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      {loadingProfile ? (
        <div className="p-8 flex justify-center">
          <Spinner />
        </div>
      ) : profile ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Member ID</p>
              <p className="text-base font-bold text-gray-900">{profile.memberNumber}</p>
              <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                {profile.memberType}
              </span>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Loans</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeLoans.length}
                <span className="text-xs font-normal text-gray-400 ml-1">
                  / {profile.maxBooks ?? 3} allowed
                </span>
              </p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
              <BookmarkCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Holds</p>
              <p className="text-2xl font-bold text-gray-900">
                {reservations.filter((r: any) => r.status === 'PENDING' || r.status === 'AVAILABLE').length}
              </p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              totalUnpaidFines > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fines Balance</p>
              <p className={`text-xl font-bold ${totalUnpaidFines > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {Money.format(totalUnpaidFines)}
              </p>
              <p className="text-[11px] text-gray-400">
                {profile.status === 'SUSPENDED' ? 'Account Suspended' : 'In Good Standing'}
              </p>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-6 text-center text-gray-500">
          <ShieldAlert className="w-10 h-10 mx-auto text-amber-500 mb-2" />
          <p className="font-semibold text-gray-900">No Library Membership Found</p>
          <p className="text-xs text-gray-400 mt-1">Please contact your school librarian to register for a library card.</p>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('LOANS')}
          className={`pb-3 px-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'LOANS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Currently Borrowed ({activeLoans.length})
        </button>

        <button
          onClick={() => setActiveTab('HOLDS')}
          className={`pb-3 px-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'HOLDS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookmarkCheck className="w-4 h-4" />
          Holds & Reservations ({reservations.length})
        </button>

        <button
          onClick={() => setActiveTab('FINES')}
          className={`pb-3 px-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'FINES'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Fines & Dues ({fines.length})
        </button>
      </div>

      {/* TAB 1: Currently Borrowed Books */}
      {activeTab === 'LOANS' && (
        <Card>
          {loadingCircs ? (
            <div className="p-12 flex justify-center">
              <Spinner />
            </div>
          ) : activeLoans.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="font-medium text-gray-900">No books currently borrowed</p>
              <p className="text-xs text-gray-400 mt-1">Browse the library catalog to check out books.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Book Title</th>
                    <th className="px-6 py-3">Copy Accession #</th>
                    <th className="px-6 py-3">Borrow Date</th>
                    <th className="px-6 py-3">Due Date</th>
                    <th className="px-6 py-3">Renewals Used</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeLoans.map((loan: any) => {
                    const isOverdue = new Date(loan.dueDate).getTime() < Date.now();
                    return (
                      <tr key={loan._id} className={`hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">
                            {typeof loan.bookId === 'object' ? loan.bookId?.title : 'Book Title'}
                          </p>
                          <p className="text-xs text-gray-400">
                            ISBN: {typeof loan.bookId === 'object' ? loan.bookId?.isbn : 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-700">
                          {typeof loan.copyId === 'object' ? loan.copyId?.accessionNumber : loan.copyId}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {new Date(loan.issuedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          <span className={isOverdue ? 'text-rose-600' : 'text-gray-900'}>
                            {new Date(loan.dueDate).toLocaleDateString()}
                          </span>
                          {isOverdue && (
                            <span className="block text-[10px] text-rose-500 font-bold uppercase">Overdue</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600">
                          {loan.renewalCount ?? 0} times
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isOverdue ? 'OVERDUE' : 'ON LOAN'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: Holds & Reservations */}
      {activeTab === 'HOLDS' && (
        <Card>
          {loadingReserves ? (
            <div className="p-12 flex justify-center">
              <Spinner />
            </div>
          ) : reservations.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <BookmarkCheck className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="font-medium text-gray-900">No active reservations</p>
              <p className="text-xs text-gray-400 mt-1">Place holds on popular titles that are currently checked out.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Book Title</th>
                    <th className="px-6 py-3 text-center">Queue Position</th>
                    <th className="px-6 py-3">Reserved On</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reservations.map((hold: any) => (
                    <tr key={hold._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">
                          {typeof hold.bookId === 'object' ? hold.bookId?.title : 'Book Title'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-600">
                        #{hold.queuePosition ?? 1}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(hold.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          hold.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : hold.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {hold.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {hold.status === 'PENDING' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelHold(hold._id)}
                            disabled={cancellingHold}
                            className="text-rose-600 hover:bg-rose-50 border-rose-200"
                          >
                            Cancel Hold
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: Fines & Dues */}
      {activeTab === 'FINES' && (
        <Card>
          {loadingFines ? (
            <div className="p-12 flex justify-center">
              <Spinner />
            </div>
          ) : fines.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
              <p className="font-medium text-gray-900">Zero outstanding fines</p>
              <p className="text-xs text-gray-400 mt-1">Thank you for returning library items on time!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Reason</th>
                    <th className="px-6 py-3">Date Assessed</th>
                    <th className="px-6 py-3">Original Fine</th>
                    <th className="px-6 py-3">Paid / Waived</th>
                    <th className="px-6 py-3">Balance Due</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fines.map((fine: any) => {
                    const balance = fine.amount - (fine.paidAmount || 0) - (fine.waivedAmount || 0);
                    return (
                      <tr key={fine._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{(fine as any).fineType || fine.type}</p>
                          {fine.reason && <p className="text-xs text-gray-500">{fine.reason}</p>}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {new Date(fine.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-gray-900">
                          {Money.format(fine.amount)}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="font-mono text-emerald-600">
                            Paid: {Money.format(fine.paidAmount || 0)}
                          </div>
                          {fine.waivedAmount > 0 && (
                            <div className="font-mono text-blue-600">
                              Waived: {Money.format(fine.waivedAmount)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-mono font-bold ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {Money.format(balance)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            fine.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : fine.status === 'WAIVED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {fine.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
