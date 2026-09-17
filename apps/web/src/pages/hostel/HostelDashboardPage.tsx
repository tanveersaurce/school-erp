import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Bed,
  Users,
  CalendarCheck,
  Compass,
  AlertTriangle,
  Wrench,
  ShieldCheck,
  PlusCircle,
  RotateCw,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Home,
  DoorOpen,
} from 'lucide-react';
import { useGetHostelDashboardStatsQuery } from '../../features/hostel/hostelApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const HostelDashboardPage: React.FC = () => {
  const { data: statsRes, isLoading, refetch } = useGetHostelDashboardStatsQuery();
  const stats = statsRes?.data;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Building2 className="w-8 h-8 text-indigo-400" />
            Hostel & Residential Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Physical Bed Capacity, Boarding Allocations, Residential Attendance, Outing Permits & Safety
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/hostel/allocations">
            <Button variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />}>
              Allocate Bed
            </Button>
          </Link>
          <Link to="/hostel/outings">
            <Button variant="secondary" leftIcon={<Compass className="w-4 h-4" />}>
              Outing Permits
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => refetch()} title="Refresh Data">
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Core Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Beds */}
            <Card className="bg-slate-900/60 border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bed Capacity</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats?.totalCapacity ?? 0}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-emerald-400 font-medium">{stats?.occupiedBeds ?? 0} Occupied</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-sky-400 font-medium">{stats?.vacantBeds ?? 0} Vacant</span>
                  </div>
                </div>
                <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <Bed className="w-6 h-6 text-indigo-400" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Occupancy Rate</span>
                  <span className="font-semibold text-white">{stats?.occupancyRate ?? 0}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, stats?.occupancyRate ?? 0)}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Hostels & Rooms */}
            <Card className="bg-slate-900/60 border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hostel Blocks</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats?.totalHostels ?? 0}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-slate-300 font-medium">{stats?.totalBuildings ?? 0} Buildings</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-300 font-medium">{stats?.totalRooms ?? 0} Rooms</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <Home className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <DoorOpen className="w-4 h-4 text-slate-500" />
                <span>Across campuses & residential wings</span>
              </div>
            </Card>

            {/* Active Outings */}
            <Card className="bg-slate-900/60 border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Outings</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats?.activeOutings ?? 0}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className={stats?.overdueOutings ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-medium'}>
                      {stats?.overdueOutings ?? 0} Overdue Curfew
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <Compass className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Gate pass & curfew monitoring</span>
              </div>
            </Card>

            {/* Safety & Maintenance */}
            <Card className="bg-slate-900/60 border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Maintenance & Safety</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats?.openMaintenance ?? 0}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-amber-400 font-medium">{stats?.openMaintenance ?? 0} Work Orders</span>
                    <span className="text-slate-600">•</span>
                    <span className={stats?.openIncidents ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                      {stats?.openIncidents ?? 0} Incidents
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <Wrench className="w-6 h-6 text-rose-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span>Room inspections & health safety</span>
              </div>
            </Card>
          </div>

          {/* Secondary Row: Attendance Breakdown & Hostels List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Residential Attendance */}
            <Card className="bg-slate-900/60 border-slate-800 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-indigo-400" />
                    Today's Attendance
                  </h2>
                  <Link to="/hostel/attendance" className="text-xs text-indigo-400 hover:underline">
                    Mark Roll Call &rarr;
                  </Link>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Residential roll call status logged for the current night
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <span className="text-sm text-slate-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      Present in Hostel
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {stats?.attendanceBreakdown?.PRESENT ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <span className="text-sm text-slate-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      Unexcused Absent
                    </span>
                    <span className="text-sm font-semibold text-rose-400">
                      {stats?.attendanceBreakdown?.ABSENT ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <span className="text-sm text-slate-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      On Approved Outing
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {stats?.attendanceBreakdown?.OUT ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <span className="text-sm text-slate-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                      Official Home Leave
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {stats?.attendanceBreakdown?.LEAVE ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <Link to="/hostel/attendance">
                  <Button variant="secondary" className="w-full">
                    Open Attendance Roster
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Hostel Occupancy Breakdown */}
            <Card className="bg-slate-900/60 border-slate-800 p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  Hostel Capacity Overview
                </h2>
                <Link to="/hostel/hostels" className="text-xs text-indigo-400 hover:underline">
                  Manage Hostels &rarr;
                </Link>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Physical bed occupancy across active residential blocks
              </p>

              {(!stats?.hostels || stats.hostels.length === 0) ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No hostels registered yet. Create your first hostel to begin allocations.
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.hostels.map((hostel) => (
                    <div
                      key={hostel.id}
                      className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div>
                          <span className="text-sm font-semibold text-white">{hostel.name}</span>
                          <span className="ml-2 text-xs font-mono text-slate-400">({hostel.code})</span>
                          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {hostel.type}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300">
                          <span className="font-semibold text-white">{hostel.occupied}</span> / {hostel.capacity} beds occupied
                          <span className="ml-2 font-bold text-indigo-400">({hostel.occupancyRate}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-700/50 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            hostel.occupancyRate >= 90
                              ? 'bg-rose-500'
                              : hostel.occupancyRate >= 70
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, hostel.occupancyRate)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                        <span>{hostel.vacant} beds available</span>
                        <Link to={`/hostel/hostels/${hostel.id}`} className="text-indigo-400 hover:underline">
                          View Rooms &rarr;
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Quick Hub Navigation Modules */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Link
              to="/hostel/hostels"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Hostels</span>
            </Link>

            <Link
              to="/hostel/buildings"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <Home className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Buildings</span>
            </Link>

            <Link
              to="/hostel/rooms"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
                <DoorOpen className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Rooms</span>
            </Link>

            <Link
              to="/hostel/beds"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <Bed className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Beds</span>
            </Link>

            <Link
              to="/hostel/allocations"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Allocations</span>
            </Link>

            <Link
              to="/hostel/transfers"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <RotateCw className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Transfers</span>
            </Link>

            <Link
              to="/hostel/check-in-out"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Check In/Out</span>
            </Link>

            <Link
              to="/hostel/outings"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Outings</span>
            </Link>

            <Link
              to="/hostel/attendance"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Attendance</span>
            </Link>

            <Link
              to="/hostel/incidents"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Incidents</span>
            </Link>

            <Link
              to="/hostel/maintenance"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-400 group-hover:scale-110 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Maintenance</span>
            </Link>

            <Link
              to="/hostel/reports"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Reports</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};
