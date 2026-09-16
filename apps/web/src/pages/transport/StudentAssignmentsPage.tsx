import React, { useState } from 'react';
import {
  Users,
  Plus,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetTransportAssignmentsQuery,
  useCreateTransportAssignmentMutation,
  useCancelTransportAssignmentMutation,
  useGetRoutesQuery,
  useGetStopsQuery,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const StudentAssignmentsPage: React.FC = () => {
  const [routeFilter, setRouteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [studentId, setStudentId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [pickupStopId, setPickupStopId] = useState('');
  const [dropStopId, setDropStopId] = useState('');

  const { data: assignmentsRes, isLoading, refetch } = useGetTransportAssignmentsQuery({
    routeId: routeFilter || undefined,
    status: statusFilter || undefined,
    page,
    limit: 15,
  });

  const { data: routesRes } = useGetRoutesQuery();
  const { data: stopsRes } = useGetStopsQuery();

  const [createAssignment, { isLoading: isCreating }] = useCreateTransportAssignmentMutation();
  const [cancelAssignment] = useCancelTransportAssignmentMutation();

  const assignments = assignmentsRes?.data?.items || [];
  const pagination = assignmentsRes?.data?.pagination;
  const routes = routesRes?.data || [];
  const stops = stopsRes?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAssignment({
        studentId: studentId as any,
        routeId: routeId as any,
        pickupStopId: pickupStopId as any,
        dropStopId: dropStopId as any,
        status: 'ACTIVE' as any,
      }).unwrap();
      setIsCreateOpen(false);
      setStudentId('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to assign student to transport');
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Please enter a cancellation reason:');
    if (reason === null) return;
    try {
      await cancelAssignment({ id, cancellationReason: reason || 'Cancelled by transport admin' }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to cancel transport assignment');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-teal-400" />
            Student Transport Allocations
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Assign students to routes and stops with atomic vehicle capacity limits & anti-concurrency safety
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
          Assign Student
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
            >
              <option value="">All Routes</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code} - {r.assignedCount || 0}/{r.maxCapacity || 40} seats)
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Assignments Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : assignments.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-medium text-slate-300">No transport assignments found</p>
          <p className="text-xs text-slate-500 mt-1">Assign students to bus routes to generate transport fee schedules.</p>
        </Card>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Admission #</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Pickup Stop</th>
                <th className="px-4 py-3">Drop Stop</th>
                <th className="px-4 py-3">Monthly Fare</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {assignments.map((a: any) => (
                <tr key={a.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-mono text-xs text-teal-400 font-bold">
                    {a.studentId?.admissionNumber || 'ADM-N/A'}
                  </td>
                  <td className="px-4 py-3 font-bold text-white">
                    {a.studentId?.personalDetails?.firstName} {a.studentId?.personalDetails?.lastName}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-semibold text-white">{a.routeId?.name || 'Route'}</span>
                    <span className="text-slate-500 block font-mono">({a.routeId?.code || 'RT'})</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">{a.pickupStopId?.name || 'Assigned Stop'}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">{a.dropStopId?.name || 'Assigned Stop'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-emerald-400 font-semibold">
                    {Money.format(a.fareMinorUnits || 0, 'INR')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        a.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.status === 'ACTIVE' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCancel(a.id)}
                      >
                        Cancel Seat
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} assignments)</span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assign Student Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-400" />
              Assign Student to Transport Route
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Student ID *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Student MongoDB ObjectId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Route *</label>
                <select
                  required
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="">-- Select Route --</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code} - {r.assignedCount || 0}/{r.maxCapacity || 40} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Pickup Stop *</label>
                  <select
                    required
                    value={pickupStopId}
                    onChange={(e) => setPickupStopId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Select Pickup Stop --</option>
                    {stops.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Drop Stop *</label>
                  <select
                    required
                    value={dropStopId}
                    onChange={(e) => setDropStopId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Select Drop Stop --</option>
                    {stops.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isCreating}>
                  {isCreating ? 'Assigning...' : 'Confirm Assignment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
