import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Navigation,
  Plus,
  Play,
  Square,
  Eye,
} from 'lucide-react';
import {
  useGetTripsQuery,
  useScheduleTripMutation,
  useStartTripMutation,
  useEndTripMutation,
  useCancelTripMutation,
  useGetRoutesQuery,
  useGetVehiclesQuery,
  useGetDriversQuery,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const TripsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [routeId, setRouteId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [tripType, setTripType] = useState('MORNING_PICKUP');
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledStartTime, setScheduledStartTime] = useState('07:30');
  const [scheduledEndTime, setScheduledEndTime] = useState('08:30');

  const { data: tripsRes, isLoading, refetch } = useGetTripsQuery({
    status: statusFilter || undefined,
    page,
    limit: 15,
  });

  const { data: routesRes } = useGetRoutesQuery();
  const { data: vehiclesRes } = useGetVehiclesQuery({ limit: 100 });
  const { data: driversRes } = useGetDriversQuery({ limit: 100 });

  const [scheduleTrip, { isLoading: isScheduling }] = useScheduleTripMutation();
  const [startTrip] = useStartTripMutation();
  const [endTrip] = useEndTripMutation();
  const [cancelTrip] = useCancelTripMutation();

  const trips = tripsRes?.data?.items || [];
  const pagination = tripsRes?.data?.pagination;
  const routes = routesRes?.data || [];
  const vehicles = vehiclesRes?.data?.items || [];
  const drivers = driversRes?.data?.items || [];

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await scheduleTrip({
        routeId: routeId as any,
        vehicleId: vehicleId as any,
        driverId: driverId as any,
        tripType: tripType as any,
        tripDate: new Date(tripDate),
        scheduledStartTime,
        scheduledEndTime,
        status: 'SCHEDULED' as any,
      }).unwrap();
      setIsCreateOpen(false);
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to schedule trip');
    }
  };

  const handleStart = async (id: string) => {
    const odo = prompt('Enter starting odometer reading (km):', '12500');
    if (odo === null) return;
    try {
      await startTrip({ id, startingOdometerKm: Number(odo) }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to start trip');
    }
  };

  const handleEnd = async (id: string) => {
    const odo = prompt('Enter ending odometer reading (km):', '12530');
    if (odo === null) return;
    try {
      await endTrip({ id, endingOdometerKm: Number(odo) }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to end trip');
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Reason for cancelling trip:');
    if (reason === null) return;
    try {
      await cancelTrip({ id, reason }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to cancel trip');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Navigation className="w-7 h-7 text-cyan-400" />
            Trips Dispatch & Live Operations
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Dispatch daily morning pickups, afternoon drops, and track live student boarding status
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
          Schedule Trip
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Trip Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="DELAYED">Delayed</option>
          </select>
        </div>
      </Card>

      {/* Trips Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : trips.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          <Navigation className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-medium text-slate-300">No trips scheduled</p>
          <p className="text-xs text-slate-500 mt-1">Schedule trips to dispatch vehicles and track student boarding.</p>
        </Card>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Route / Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time Schedule</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {trips.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{t.routeId?.name || 'Route'}</div>
                    <div className="text-xs text-cyan-400 font-mono">{t.tripType}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(t.tripDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-300">
                    {t.scheduledStartTime} - {t.scheduledEndTime || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-bold text-white">{t.vehicleId?.registrationNumber || 'BUS'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t.driverId?.employeeId?.firstName || 'Assigned Driver'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        t.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                          : t.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : t.status === 'SCHEDULED'
                          ? 'bg-sky-500/10 text-sky-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1.5">
                    <Link to={`/transport/trips/${t.id}`}>
                      <Button variant="secondary" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                        Track
                      </Button>
                    </Link>
                    {t.status === 'SCHEDULED' && (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Play className="w-3 h-3" />}
                        onClick={() => handleStart(t.id)}
                      >
                        Start
                      </Button>
                    )}
                    {t.status === 'IN_PROGRESS' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Square className="w-3 h-3 text-emerald-400" />}
                        onClick={() => handleEnd(t.id)}
                      >
                        Complete
                      </Button>
                    )}
                    {t.status === 'SCHEDULED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCancel(t.id)}
                      >
                        Cancel
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
              <span>Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} trips)</span>
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

      {/* Schedule Trip Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Navigation className="w-5 h-5 text-cyan-400" />
              Schedule New Trip
            </h2>
            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Route *</label>
                <select
                  required
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Select Route --</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Vehicle *</label>
                  <select
                    required
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.registrationNumber} ({v.make})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Driver *</label>
                  <select
                    required
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Select Driver --</option>
                    {drivers.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.employeeId?.firstName} {d.employeeId?.lastName || 'Driver'} ({d.licenseNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Trip Date *</label>
                  <input
                    type="date"
                    required
                    value={tripDate}
                    onChange={(e) => setTripDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={scheduledStartTime}
                    onChange={(e) => setScheduledStartTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">End Time</label>
                  <input
                    type="time"
                    value={scheduledEndTime}
                    onChange={(e) => setScheduledEndTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Trip Type</label>
                <select
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="MORNING_PICKUP">Morning Pickup</option>
                  <option value="AFTERNOON_DROP">Afternoon Drop</option>
                  <option value="SPECIAL_TRIP">Special / Field Trip</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isScheduling}>
                  {isScheduling ? 'Scheduling...' : 'Schedule Trip'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
