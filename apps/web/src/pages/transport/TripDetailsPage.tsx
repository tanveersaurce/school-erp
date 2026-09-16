import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Navigation,
  ArrowLeft,
  Users,
  Compass,
  Play,
  Square,
  Shield,
} from 'lucide-react';
import {
  useGetTripByIdQuery,
  useRecordTripTelemetryMutation,
  useRecordStudentBoardingMutation,
  useStartTripMutation,
  useEndTripMutation,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const TripDetailsPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();

  // Telemetry simulation state
  const [lat, setLat] = useState(28.5585);
  const [lng, setLng] = useState(77.2085);
  const [speed, setSpeed] = useState(35);

  const { data: tripRes, isLoading, refetch } = useGetTripByIdQuery(id);
  const [recordTelemetry, { isLoading: isPinging }] = useRecordTripTelemetryMutation();
  const [recordBoarding] = useRecordStudentBoardingMutation();
  const [startTrip] = useStartTripMutation();
  const [endTrip] = useEndTripMutation();

  const trip = tripRes?.data as any;

  const handlePushTelemetry = async () => {
    try {
      await recordTelemetry({
        id,
        latitude: lat,
        longitude: lng,
        speed,
      }).unwrap();
      // Drift slightly for next ping
      setLat((prev) => prev + 0.001);
      setLng((prev) => prev + 0.001);
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update telemetry');
    }
  };

  const handleBoarding = async (studentId: string, status: string) => {
    try {
      await recordBoarding({
        id,
        studentId,
        status,
      }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to record student status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-8 text-center text-slate-400">
        Trip not found.
        <div className="mt-4">
          <Link to="/transport/trips">
            <Button variant="secondary">Back to Trips</Button>
          </Link>
        </div>
      </div>
    );
  }

  const coords = trip.currentLocation?.coordinates || [77.208, 28.558];
  const isMasked = trip.telemetryMasked || trip.status !== 'IN_PROGRESS';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/transport/trips">
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Trips
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Navigation className="w-6 h-6 text-cyan-400" />
              {trip.routeId?.name || 'Trip Dispatch'}
              <span className="text-xs font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">
                {trip.tripType}
              </span>
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Date: {new Date(trip.tripDate).toLocaleDateString()} • Scheduled: {trip.scheduledStartTime} - {trip.scheduledEndTime || 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {trip.status === 'SCHEDULED' && (
            <Button variant="primary" size="sm" leftIcon={<Play className="w-3.5 h-3.5" />} onClick={() => startTrip({ id })}>
              Start Trip
            </Button>
          )}
          {trip.status === 'IN_PROGRESS' && (
            <Button variant="secondary" size="sm" leftIcon={<Square className="w-3.5 h-3.5 text-emerald-400" />} onClick={() => endTrip({ id })}>
              End Trip
            </Button>
          )}
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              trip.status === 'IN_PROGRESS'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                : trip.status === 'COMPLETED'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {trip.status}
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <div className="text-xs text-slate-400">Assigned Vehicle</div>
          <div className="text-lg font-bold text-white mt-1">
            {trip.vehicleId?.registrationNumber || 'BUS'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {trip.vehicleId?.make} {trip.vehicleId?.model}
          </div>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <div className="text-xs text-slate-400">Assigned Driver</div>
          <div className="text-lg font-bold text-white mt-1">
            {trip.driverId?.employeeId?.firstName || 'Assigned Driver'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            License: {trip.driverId?.licenseNumber || 'Verified'}
          </div>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <div className="text-xs text-slate-400">Trip Progression</div>
          <div className="text-lg font-bold text-cyan-400 mt-1">
            {trip.students?.filter((s: any) => s.status === 'BOARDED').length || 0} Boarded
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Total Students: {trip.students?.length || 0}
          </div>
        </Card>
      </div>

      {/* Live Telemetry & GPS Masking Panel */}
      <Card className="bg-slate-900/60 border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              Live Fleet GPS Telemetry
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Privacy-safe tracking with off-duty coordinate masking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isMasked ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              <Shield className="w-3 h-3 inline mr-1" />
              {isMasked ? 'Off-Duty Privacy Masked' : 'Live BroadCast Active'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/60 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block">Current Longitude, Latitude</span>
            <span className="text-base font-mono font-bold text-white">
              {isMasked ? 'Coordinates Hidden (Off Duty)' : `${coords[1]?.toFixed(5)}, ${coords[0]?.toFixed(5)}`}
            </span>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block">Speed</span>
            <span className="text-base font-mono font-bold text-cyan-400">
              {isMasked ? '--' : `${speed} km/h`}
            </span>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block">Last Ping At</span>
            <span className="text-base font-mono text-slate-300">
              {trip.lastTelemetryAt ? new Date(trip.lastTelemetryAt).toLocaleTimeString() : 'No ping recorded'}
            </span>
          </div>
        </div>

        {/* Telemetry Simulator Form */}
        {trip.status === 'IN_PROGRESS' && (
          <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Simulate Device Telemetry Ping
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
                placeholder="Lat"
                className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white w-28 font-mono"
              />
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(Number(e.target.value))}
                placeholder="Lng"
                className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white w-28 font-mono"
              />
              <input
                type="number"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                placeholder="Speed"
                className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white w-24 font-mono"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handlePushTelemetry}
                disabled={isPinging}
              >
                {isPinging ? 'Sending...' : 'Send GPS Ping'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Student Boarding & Attendance Roster */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-400" />
          Passenger Boarding Roster
        </h2>

        {!trip.students || trip.students.length === 0 ? (
          <Card className="bg-slate-900/40 border-slate-800 p-8 text-center text-slate-400">
            No students scheduled on this trip.
          </Card>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Boarding Status</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3 text-right">Quick Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {trip.students.map((st: any, idx: number) => (
                  <tr key={st.studentId || idx} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-bold text-white">
                      {st.studentName || `Student (${st.studentId})`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          st.status === 'BOARDED'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : st.status === 'DROPPED'
                            ? 'bg-sky-500/10 text-sky-400'
                            : st.status === 'ABSENT'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {st.status || 'SCHEDULED'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">
                      {st.boardedAt ? new Date(st.boardedAt).toLocaleTimeString() : '--'}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleBoarding(st.studentId, 'BOARDED')}
                      >
                        Board
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleBoarding(st.studentId, 'DROPPED')}
                      >
                        Drop
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleBoarding(st.studentId, 'ABSENT')}
                      >
                        Absent
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
