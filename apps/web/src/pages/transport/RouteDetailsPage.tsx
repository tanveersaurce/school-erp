import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  ArrowLeft,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetRouteByIdQuery,
  useGetRouteVersionsQuery,
  useGetTransportAssignmentsQuery,
  useGetStopsQuery,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const RouteDetailsPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'stops' | 'students' | 'versions'>('stops');

  const { data: routeRes, isLoading: loadingRoute } = useGetRouteByIdQuery(id);
  const { data: versionsRes } = useGetRouteVersionsQuery(id);
  const { data: assignmentsRes } = useGetTransportAssignmentsQuery({ routeId: id });
  const { data: stopsCatalogRes } = useGetStopsQuery();

  const route = routeRes?.data;
  const versions = versionsRes?.data || [];
  const assignments = assignmentsRes?.data?.items || [];
  const stopsCatalog = stopsCatalogRes?.data || [];

  if (loadingRoute) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="p-8 text-center text-slate-400">
        Route not found.
        <div className="mt-4">
          <Link to="/transport/routes">
            <Button variant="secondary">Back to Routes</Button>
          </Link>
        </div>
      </div>
    );
  }

  const cap = route.maxCapacity || 40;
  const assigned = route.assignedCount || assignments.length;
  const pct = Math.min(100, Math.round((assigned / cap) * 100));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/transport/routes">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Routes
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <MapPin className="w-6 h-6 text-sky-400" />
            {route.name}
            <span className="text-xs font-mono bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded">
              {route.code}
            </span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Direction: <span className="text-white font-medium">{route.direction}</span> • Version: v{route.currentVersion || 1}
          </p>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <div className="text-xs text-slate-400">Capacity & Occupancy</div>
          <div className="text-xl font-bold text-white mt-1">
            {assigned} / {cap} seats
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full ${assigned >= cap ? 'bg-rose-500' : 'bg-sky-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <div className="text-xs text-slate-400">Stops on Route</div>
          <div className="text-xl font-bold text-white mt-1">
            {route.stops?.length || 0} Designated Stops
          </div>
          <div className="text-xs text-slate-500 mt-2">Sequenced for optimal timing</div>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <div className="text-xs text-slate-400">Status & Route Control</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {route.isActive ? 'Active Route' : 'Inactive'}
          </div>
          <div className="text-xs text-slate-500 mt-2">Immutable versioning enabled</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('stops')}
          className={`pb-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'stops' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Route Stops & Fares ({route.stops?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'students' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Assigned Students ({assignments.length})
        </button>
        <button
          onClick={() => setActiveTab('versions')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'versions' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Route Version History ({versions.length})
        </button>
      </div>

      {/* Tab 1: Stops */}
      {activeTab === 'stops' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Sequence</th>
                  <th className="px-4 py-3">Stop Name</th>
                  <th className="px-4 py-3">Pickup Time Offset</th>
                  <th className="px-4 py-3">Drop Time Offset</th>
                  <th className="px-4 py-3">Pickup Fare</th>
                  <th className="px-4 py-3">Drop Fare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(route.stops || []).map((s: any, idx: number) => {
                  const stopObj = stopsCatalog.find((cat) => cat.id === (s.stopId?._id || s.stopId));
                  const stopName = s.stopId?.name || stopObj?.name || `Stop #${s.sequence || idx + 1}`;
                  const pickupFare = Money.format(s.pickupFareMinorUnits || 0, 'INR');
                  const dropFare = Money.format(s.dropFareMinorUnits || 0, 'INR');

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className="w-6 h-6 rounded-full bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center font-bold">
                          {s.sequence || idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-white">
                        {stopName}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        +{s.estimatedPickupOffsetMinutes || (idx * 5)} mins
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        +{s.estimatedDropOffsetMinutes || (idx * 5)} mins
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-mono font-medium">
                        {pickupFare}
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-mono font-medium">
                        {dropFare}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Students */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <Card className="bg-slate-900/40 border-slate-800 p-8 text-center text-slate-400">
              No students assigned to this route yet.
            </Card>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Admission #</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Pickup Stop</th>
                    <th className="px-4 py-3">Drop Stop</th>
                    <th className="px-4 py-3">Monthly Fare</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {assignments.map((a: any) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-mono text-xs">{a.studentId?.admissionNumber || 'ADM-N/A'}</td>
                      <td className="px-4 py-3 font-bold text-white">
                        {a.studentId?.personalDetails?.firstName} {a.studentId?.personalDetails?.lastName}
                      </td>
                      <td className="px-4 py-3 text-xs">{a.pickupStopId?.name || 'Assigned Stop'}</td>
                      <td className="px-4 py-3 text-xs">{a.dropStopId?.name || 'Assigned Stop'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-emerald-400">
                        {Money.format(a.fareMinorUnits || 0, 'INR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Versions */}
      {activeTab === 'versions' && (
        <div className="space-y-4">
          {versions.length === 0 ? (
            <Card className="bg-slate-900/40 border-slate-800 p-8 text-center text-slate-400">
              Initial route baseline active (v1). No previous revisions recorded.
            </Card>
          ) : (
            <div className="space-y-3">
              {versions.map((v) => (
                <Card key={v.id} className="bg-slate-900/60 border-slate-800 p-4 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white text-sm">Version {v.versionNumber}</span>
                    <span className="text-xs text-slate-400 ml-2">Reason: {v.changeReason || 'Route modification'}</span>
                    <div className="text-xs text-slate-500 mt-1">
                      Effective: {new Date(v.effectiveFrom).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-1 rounded">
                    {v.stops?.length || 0} stops configured
                  </span>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
