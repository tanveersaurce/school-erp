import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Compass,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetStopsQuery,
  useCreateStopMutation,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const StopsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [standardFare, setStandardFare] = useState(1500); // 15.00 default
  const [latitude, setLatitude] = useState(28.558);
  const [longitude, setLongitude] = useState(77.208);

  const { data: stopsRes, isLoading, refetch } = useGetStopsQuery();
  const [createStop, { isLoading: isCreating }] = useCreateStopMutation();

  const stops = (stopsRes?.data || []).filter((s) =>
    search ? (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.code || '').toLowerCase().includes(search.toLowerCase()) : true
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStop({
        name,
        code,
        landmark,
        standardFareMinorUnits: Number(standardFare),
        coordinates: {
          latitude: Number(latitude),
          longitude: Number(longitude),
        },
        isActive: true,
      }).unwrap();
      setIsCreateOpen(false);
      setName('');
      setCode('');
      setLandmark('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create transport stop');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <MapPin className="w-7 h-7 text-emerald-400" />
            Transport Stops Catalog
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Designated student pickup and drop points with GPS coordinates and standard fare models
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
          Add Stop
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search stops by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </Card>

      {/* Stops Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : stops.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          <MapPin className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-medium text-slate-300">No stops defined</p>
          <p className="text-xs text-slate-500 mt-1">Add pickup and drop locations to build transport routes.</p>
        </Card>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Stop Name</th>
                <th className="px-4 py-3">Landmark</th>
                <th className="px-4 py-3">GPS Coordinates</th>
                <th className="px-4 py-3">Standard Monthly Fare</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stops.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-mono text-xs text-emerald-400 font-bold">{s.code}</td>
                  <td className="px-4 py-3 font-bold text-white">{s.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{s.landmark || 'N/A'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-slate-500" />
                    <span>{s.coordinates?.latitude ? `${s.coordinates.latitude.toFixed(4)}, ${s.coordinates.longitude?.toFixed(4)}` : 'N/A'}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-emerald-400 font-medium">
                    {Money.format(s.standardFareMinorUnits || 0, 'INR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Stop Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              Add Transport Stop
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Stop Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. City Mall Junction"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Stop Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STOP-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Landmark / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Opposite Gate 2, Metro Station"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Monthly Fare (Minor Units)</label>
                  <input
                    type="number"
                    min={0}
                    value={standardFare}
                    onChange={(e) => setStandardFare(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">1500 = ₹15.00</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isCreating}>
                  {isCreating ? 'Saving...' : 'Add Stop'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
