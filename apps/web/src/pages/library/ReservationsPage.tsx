import React, { useState } from 'react';
import {
  BookmarkCheck,
  Plus,
  X,
} from 'lucide-react';
import {
  useGetReservationsQuery,
  useReserveBookMutation,
  useCancelReservationMutation,
  useGetLibrariesQuery,
} from '../../features/library/libraryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const ReservationsPage: React.FC = () => {
  const [isReserveOpen, setIsReserveOpen] = useState(false);
  const [reserveBookId, setReserveBookId] = useState('');
  const [reserveMemberId, setReserveMemberId] = useState('');
  const [reserveLibraryId, setReserveLibraryId] = useState('');
  const [reserveNotes, setReserveNotes] = useState('');

  const { data: resRes, isLoading: loadingReservations } = useGetReservationsQuery(undefined);
  const { data: libRes } = useGetLibrariesQuery();

  const [reserveBook, { isLoading: reserving }] = useReserveBookMutation();
  const [cancelReservation] = useCancelReservationMutation();

  const reservations = resRes?.data?.items || [];
  const libraries = libRes?.data || [];

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reserveBook({
        bookId: reserveBookId.trim(),
        memberId: reserveMemberId.trim(),
        libraryId: reserveLibraryId || (libraries[0] as any)?._id || libraries[0]?.id,
        notes: reserveNotes.trim() || undefined,
      }).unwrap();

      setIsReserveOpen(false);
      setReserveBookId('');
      setReserveMemberId('');
      setReserveNotes('');
    } catch (err) {
      console.error('Failed to reserve book', err);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      await cancelReservation(id).unwrap();
    } catch (err) {
      console.error('Failed to cancel reservation', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <BookmarkCheck className="w-8 h-8 text-purple-400" />
            Hold & Reservation Queue
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Waitlist prioritization, copy hold notifications & fulfillment tracking
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsReserveOpen(true)}
        >
          Place Reservation
        </Button>
      </div>

      {/* Reservations Table */}
      <Card className="bg-slate-800/80 border-slate-700/60 overflow-hidden shadow-lg">
        {loadingReservations ? (
          <div className="flex justify-center items-center py-24">
            <Spinner size="lg" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No active book reservations in the queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-700/60">
                <tr>
                  <th className="px-4 py-3">Book Title</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Requested Date</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {reservations.map((res: any) => (
                  <tr key={res._id} className="hover:bg-slate-700/20">
                    <td className="px-4 py-3 font-semibold text-white">
                      {res.bookId?.title || 'Book Title'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {res.memberId?.memberNumber || 'Member'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center">
                        {res.queuePosition ?? 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(res.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {res.expiresAt ? new Date(res.expiresAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          res.status === 'READY'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : res.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : res.status === 'FULFILLED'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {res.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {res.status === 'PENDING' || res.status === 'READY' ? (
                        <button
                          onClick={() => handleCancel(res._id)}
                          className="text-xs px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Place Reservation Modal */}
      {isReserveOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-900 border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-purple-400" />
                Place Hold Reservation
              </h2>
              <button onClick={() => setIsReserveOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReservation} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Book Title ID *</label>
                <input
                  type="text"
                  required
                  value={reserveBookId}
                  onChange={(e) => setReserveBookId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  placeholder="Enter Book ID"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Member ID *</label>
                <input
                  type="text"
                  required
                  value={reserveMemberId}
                  onChange={(e) => setReserveMemberId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  placeholder="Enter Member ID"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Library Location</label>
                <select
                  value={reserveLibraryId}
                  onChange={(e) => setReserveLibraryId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Default Branch</option>
                  {libraries.map((l: any) => (
                    <option key={l._id} value={l._id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={reserveNotes}
                  onChange={(e) => setReserveNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="secondary" onClick={() => setIsReserveOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={reserving}>
                  {reserving ? <Spinner size="sm" /> : 'Confirm Reservation'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
