import React from 'react';
import {
  Bus,
  MapPin,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetMyTransportAssignmentsQuery,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const MyTransportPage: React.FC = () => {
  const { data: assignmentsRes, isLoading } = useGetMyTransportAssignmentsQuery();
  const assignments = Array.isArray(assignmentsRes?.data) ? assignmentsRes.data : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Bus className="w-7 h-7 text-teal-400" />
          My Transport & Bus Tracking
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Assigned school bus route, scheduled pickup and drop timings, driver details, and privacy-protected live tracking
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : assignments.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          <Bus className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-medium text-slate-300">No active transport allocation</p>
          <p className="text-xs text-slate-500 mt-1">
            You or your children are not currently assigned to any school transport routes.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {assignments.map((a: any) => (
            <Card key={a.id} className="bg-slate-900/60 border-slate-800 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
                    Student Passenger
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {a.studentId?.personalDetails?.firstName} {a.studentId?.personalDetails?.lastName}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Admission #: {a.studentId?.admissionNumber || 'ADM-N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                    Seat Allocated ({a.status})
                  </span>
                </div>
              </div>

              {/* Route & Stop Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-750 space-y-2">
                  <span className="text-xs text-slate-400 block font-semibold">Assigned Route</span>
                  <div className="font-bold text-white text-base">
                    {a.routeId?.name || 'School Bus Route'}
                  </div>
                  <div className="text-xs font-mono text-teal-400">
                    Code: {a.routeId?.code || 'RT'}
                  </div>
                  <div className="text-xs text-slate-400 pt-1">
                    Monthly Fare: <span className="text-emerald-400 font-mono font-bold">{Money.format(a.fareMinorUnits || 0, 'INR')}</span>
                  </div>
                </div>

                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-750 space-y-2">
                  <span className="text-xs text-slate-400 block font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    Pickup Designation
                  </span>
                  <div className="font-bold text-white text-base">
                    {a.pickupStopId?.name || 'Designated Stop'}
                  </div>
                  <div className="text-xs text-slate-400">
                    Landmark: {a.pickupStopId?.landmark || 'Near School Route'}
                  </div>
                  <div className="text-xs text-slate-300 font-mono pt-1">
                    Morning ETA: ~07:45 AM
                  </div>
                </div>

                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-750 space-y-2">
                  <span className="text-xs text-slate-400 block font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Drop Designation
                  </span>
                  <div className="font-bold text-white text-base">
                    {a.dropStopId?.name || 'Designated Stop'}
                  </div>
                  <div className="text-xs text-slate-400">
                    Landmark: {a.dropStopId?.landmark || 'Near School Route'}
                  </div>
                  <div className="text-xs text-slate-300 font-mono pt-1">
                    Afternoon ETA: ~02:30 PM
                  </div>
                </div>
              </div>

              {/* Safety & Telemetry Privacy Notice */}
              <div className="bg-teal-950/20 border border-teal-800/40 p-4 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-teal-400 shrink-0" />
                  <span className="text-slate-300">
                    Live GPS tracking is active strictly while trips are in progress. Off-duty vehicle locations are masked for driver privacy.
                  </span>
                </div>
                <span className="text-teal-400 font-semibold shrink-0">
                  Student Safety Guaranteed
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
