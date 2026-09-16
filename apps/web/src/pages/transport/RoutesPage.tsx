import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Plus,
  Search,
  Eye,
  Bus,
} from 'lucide-react';
import {
  useGetRoutesQuery,
  useCreateRouteMutation,
  useGetVehiclesQuery,
  useGetStopsQuery,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const RoutesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [direction, setDirection] = useState('FORWARD');
  const [maxCapacity, setMaxCapacity] = useState(40);
  const [defaultVehicleId, setDefaultVehicleId] = useState('');

  const { data: routesRes, isLoading, refetch } = useGetRoutesQuery({ search: search || undefined });
  const { data: vehiclesRes } = useGetVehiclesQuery({ limit: 100 });
  const { data: stopsRes } = useGetStopsQuery();

  const [createRoute, { isLoading: isCreating }] = useCreateRouteMutation();

  const routes = routesRes?.data || [];
  const vehicles = vehiclesRes?.data?.items || [];
  const stops = stopsRes?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRoute({
        name,
        code,
        direction: direction as any,
        maxCapacity: Number(maxCapacity),
        defaultVehicleId: defaultVehicleId || undefined,
        isActive: true,
        stops: stops.slice(0, 2).map((s, idx) => ({
          stopId: s.id,
          sequence: idx + 1,
          pickupFareMinorUnits: s.standardFareMinorUnits || 1000,
          dropFareMinorUnits: s.standardFareMinorUnits || 1000,
        })),
      }).unwrap();
      setIsCreateOpen(false);
      setName('');
      setCode('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create route');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <MapPin className="w-7 h-7 text-sky-400" />
            Transport Routes
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure bus pickup and drop routes, stop sequences, and seat capacity limits
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
          Create Route
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search routes by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>
      </Card>

      {/* Routes Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : routes.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          <MapPin className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-medium text-slate-300">No routes found</p>
          <p className="text-xs text-slate-500 mt-1">Create your first transport route to start assigning students.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((r) => {
            const cap = r.maxCapacity || 40;
            const assigned = r.assignedCount || 0;
            const pct = Math.min(100, Math.round((assigned / cap) * 100));
            const isFull = assigned >= cap;
            return (
              <Card key={r.id} className="bg-slate-900/60 border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono bg-sky-950 text-sky-400 border border-sky-800 px-2.5 py-0.5 rounded-md">
                      {r.code}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-white mb-1">{r.name}</h2>
                  <p className="text-xs text-slate-400 mb-4">
                    Direction: <span className="text-slate-300 font-medium">{r.direction}</span> • {r.stops?.length || 0} Stops
                  </p>

                  {/* Capacity Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Seat Occupancy</span>
                      <span className={`font-semibold ${isFull ? 'text-rose-400' : 'text-slate-200'}`}>
                        {assigned} / {cap} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFull ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-sky-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Bus className="w-3.5 h-3.5 text-slate-500" />
                    <span>{r.defaultVehicleId ? 'Vehicle Assigned' : 'No Vehicle'}</span>
                  </div>
                  <Link to={`/transport/routes/${r.id}`}>
                    <Button variant="secondary" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                      Details & Stops
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Route Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-400" />
              Create Transport Route
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Route Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Route Alpha (North Campus)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Route Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RT-NORTH-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Direction</label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="FORWARD">Forward (Pickup to School)</option>
                    <option value="RETURN">Return (School to Drop)</option>
                    <option value="CIRCULAR">Circular</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Max Capacity (Seats) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Default Assigned Vehicle</label>
                <select
                  value={defaultVehicleId}
                  onChange={(e) => setDefaultVehicleId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Select Default Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} ({v.make} {v.model} - {v.capacity || v.seatingCapacity} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isCreating}>
                  {isCreating ? 'Saving...' : 'Create Route'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
