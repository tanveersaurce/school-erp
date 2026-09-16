import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bus,
  MapPin,
  Users,
  Navigation,
  AlertTriangle,
  Wrench,
  FileCheck,
  Clock,
  Shield,
  PlusCircle,
  ChevronRight,
  RotateCw,
} from 'lucide-react';
import {
  useGetTransportDashboardKPIsQuery,
  useGetRouteOccupancyReportQuery,
} from '../../features/transport/transportApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const TransportDashboardPage: React.FC = () => {
  const { data: kpiRes, isLoading: loadingKpis, refetch: refetchKpis } = useGetTransportDashboardKPIsQuery();
  const { data: occupancyRes, isLoading: loadingOccupancy } = useGetRouteOccupancyReportQuery();

  const kpis = kpiRes?.data;
  const occupancyRoutes = occupancyRes?.data || [];

  const isLoading = loadingKpis || loadingOccupancy;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Bus className="w-8 h-8 text-amber-400" />
            Transport & Fleet Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time Fleet Tracking, Capacity Control, Driver Compliance & Route Safety
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/transport/trips">
            <Button variant="primary" leftIcon={<Navigation className="w-4 h-4" />}>
              Live Trips Dispatch
            </Button>
          </Link>
          <Link to="/transport/vehicles">
            <Button variant="secondary" leftIcon={<PlusCircle className="w-4 h-4" />}>
              Fleet Roster
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => refetchKpis()} title="Refresh Data">
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
            <Card className="bg-slate-900/60 border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fleet Vehicles</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {kpis?.totalVehicles ?? 0}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-emerald-400 font-medium">{kpis?.activeVehicles ?? 0} Active</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-400 font-medium">{kpis?.maintenanceVehicles ?? 0} Maint.</span>
                  </div>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <Bus className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Routes</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {kpis?.activeRoutes ?? 0}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-sky-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{kpis?.studentsAssigned ?? 0} Students Assigned</span>
                  </div>
                </div>
                <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20">
                  <MapPin className="w-6 h-6 text-sky-400" />
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Crew Compliance</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {(kpis?.activeDrivers ?? 0) + (kpis?.activeAttendants ?? 0)}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-emerald-400 font-medium">{kpis?.activeDrivers ?? 0} Drivers</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-sky-400 font-medium">{kpis?.activeAttendants ?? 0} Attendants</span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Safety & Alerts</p>
                  <p className="text-2xl font-bold text-rose-400 mt-1">
                    {kpis?.openIncidents ?? 0}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{kpis?.expiringDocumentsCount ?? 0} Expiring Docs</span>
                  </div>
                </div>
                <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Today's Trips Summary Ribbon */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Today's Fleet Operations</h2>
                <p className="text-xs text-slate-400">Real-time trip progression and dispatch schedule</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="text-slate-400">Scheduled:</span>
                <span className="font-semibold text-white">{kpis?.todayTrips?.scheduled ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-slate-400">In Progress:</span>
                <span className="font-semibold text-amber-400">{kpis?.todayTrips?.inProgress ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-400">Completed:</span>
                <span className="font-semibold text-emerald-400">{kpis?.todayTrips?.completed ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-400">Delayed:</span>
                <span className="font-semibold text-rose-400">{kpis?.todayTrips?.delayed ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Route Occupancy & Capacity Meter */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-400" />
                  Route Capacity & Occupancy
                </h2>
                <Link to="/transport/routes" className="text-xs text-amber-400 hover:underline flex items-center gap-1">
                  Manage Routes <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {occupancyRoutes.length === 0 ? (
                  <Card className="bg-slate-900/40 border-slate-800 p-8 text-center text-slate-400 text-sm">
                    No active routes found. Create routes to track vehicle occupancy.
                  </Card>
                ) : (
                  occupancyRoutes.slice(0, 5).map((route) => {
                    const pct = route.vehicleCapacity > 0 ? Math.min(100, Math.round((route.assignedStudentsCount / route.vehicleCapacity) * 100)) : 0;
                    const isOver = route.isOverCapacity || pct >= 100;
                    return (
                      <Card key={route.routeId} className="bg-slate-900/60 border-slate-800 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold text-white text-sm">{route.routeName}</span>
                            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded ml-2">
                              {route.routeCode}
                            </span>
                            <span className="text-xs text-slate-400 ml-2">({route.direction})</span>
                          </div>
                          <div className="text-xs">
                            <span className={`font-semibold ${isOver ? 'text-rose-400' : 'text-slate-300'}`}>
                              {route.assignedStudentsCount} / {route.vehicleCapacity} Seats
                            </span>
                            <span className="text-slate-500 ml-1">({pct}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOver ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Operations Panel */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Navigation className="w-5 h-5 text-sky-400" />
                Quick Operations
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/transport/vehicles"
                  className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-xl transition flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <Bus className="w-6 h-6 text-amber-400 group-hover:scale-110 transition" />
                  <span className="text-xs font-medium text-slate-200">Vehicles</span>
                </Link>

                <Link
                  to="/transport/routes"
                  className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-xl transition flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <MapPin className="w-6 h-6 text-sky-400 group-hover:scale-110 transition" />
                  <span className="text-xs font-medium text-slate-200">Routes</span>
                </Link>

                <Link
                  to="/transport/stops"
                  className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-xl transition flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <MapPin className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition" />
                  <span className="text-xs font-medium text-slate-200">Stops</span>
                </Link>

                <Link
                  to="/transport/drivers"
                  className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-xl transition flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <Users className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition" />
                  <span className="text-xs font-medium text-slate-200">Drivers</span>
                </Link>

                <Link
                  to="/transport/assignments"
                  className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-xl transition flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <Users className="w-6 h-6 text-teal-400 group-hover:scale-110 transition" />
                  <span className="text-xs font-medium text-slate-200">Assignments</span>
                </Link>

                <Link
                  to="/transport/trips"
                  className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-xl transition flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <Navigation className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition" />
                  <span className="text-xs font-medium text-slate-200">Trips</span>
                </Link>

                <Link
                  to="/transport/incidents"
                  className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-xl transition flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <AlertTriangle className="w-6 h-6 text-rose-400 group-hover:scale-110 transition" />
                  <span className="text-xs font-medium text-slate-200">Incidents</span>
                </Link>

                <Link
                  to="/transport/maintenance"
                  className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-xl transition flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <Wrench className="w-6 h-6 text-yellow-400 group-hover:scale-110 transition" />
                  <span className="text-xs font-medium text-slate-200">Maintenance</span>
                </Link>

                <Link
                  to="/transport/documents"
                  className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-xl transition flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <FileCheck className="w-6 h-6 text-purple-400 group-hover:scale-110 transition" />
                  <span className="text-xs font-medium text-slate-200">Compliance</span>
                </Link>

                <Link
                  to="/transport/settings"
                  className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-xl transition flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <Shield className="w-6 h-6 text-slate-400 group-hover:scale-110 transition" />
                  <span className="text-xs font-medium text-slate-200">Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
