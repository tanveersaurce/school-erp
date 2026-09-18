import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Warehouse,
  ArrowLeft,
  Plus,
  Boxes,
  Layers,
} from 'lucide-react';
import {
  useGetInventoryStoreByIdQuery,
  useGetInventoryLocationsQuery,
  useCreateInventoryLocationMutation,
  useGetInventoryStockQuery,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { InventoryLocationType } from '@edusphere/common';

export const InventoryStoreDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: storeRes, isLoading: isStoreLoading } = useGetInventoryStoreByIdQuery(id || '');
  const { data: locsRes, isLoading: isLocsLoading } = useGetInventoryLocationsQuery({ storeId: id });
  const { data: stockRes, isLoading: isStockLoading } = useGetInventoryStockQuery({ storeId: id });
  const [createLocation, { isLoading: isCreatingLoc }] = useCreateInventoryLocationMutation();

  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locType, setLocType] = useState<InventoryLocationType>(InventoryLocationType.SHELF);

  const store = storeRes?.data;
  const locations = locsRes?.data || [];
  const stocks = stockRes?.data || [];

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName || !locCode || !id) return;

    try {
      await createLocation({
        storeId: id,
        name: locName,
        code: locCode,
        type: locType,
        active: true,
      }).unwrap();

      setIsLocModalOpen(false);
      setLocName('');
      setLocCode('');
    } catch (err) {
      console.error('Failed to create location', err);
    }
  };

  if (isStoreLoading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Store not found.</p>
        <Link to="/inventory/stores" className="mt-4 inline-block">
          <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Stores
          </Button>
        </Link>
      </div>
    );
  }

  const totalOnHand = stocks.reduce((sum, s) => sum + s.quantityOnHand, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/inventory/stores">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Warehouse className="w-7 h-7 text-emerald-400" />
              {store.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="font-mono text-emerald-400 font-semibold">{store.code}</span>
              {store.location && <span>• {store.location}</span>}
              <span className="px-1.5 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {store.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsLocModalOpen(true)}>
            Add Storage Bin / Shelf
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tracked SKU Items</p>
          <p className="text-2xl font-bold text-white mt-1">{stocks.length}</p>
          <p className="text-xs text-slate-500 mt-1">Unique item product lines</p>
        </Card>
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Stock on Hand</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{totalOnHand}</p>
          <p className="text-xs text-slate-500 mt-1">Units physically in this store</p>
        </Card>
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Storage Locations</p>
          <p className="text-2xl font-bold text-sky-400 mt-1">{locations.length}</p>
          <p className="text-xs text-slate-500 mt-1">Racks, shelves, and bin slots</p>
        </Card>
      </div>

      {/* Internal Storage Locations Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Internal Storage Locations (Aisles, Racks, Shelves, Bins)
          </h3>
        </div>

        {isLocsLoading ? (
          <Spinner size="sm" />
        ) : locations.length === 0 ? (
          <Card className="p-6 text-center text-xs text-slate-500 bg-slate-900/40 border-slate-800">
            No specific bins or shelves configured yet. Items are stored at store level.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {locations.map((loc) => (
              <Card key={loc.id || loc._id} className="p-3 bg-slate-900/40 border-slate-800">
                <span className="font-mono text-xs text-indigo-400 font-semibold">{loc.code}</span>
                <p className="text-sm font-semibold text-white mt-0.5">{loc.name}</p>
                <span className="inline-block mt-1 text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {loc.type}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Stock Listing for this Store */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Boxes className="w-5 h-5 text-emerald-400" />
          Current Stock Inventory
        </h3>
        {isStockLoading ? (
          <Spinner size="sm" />
        ) : stocks.length === 0 ? (
          <Card className="p-6 text-center text-xs text-slate-500 bg-slate-900/40 border-slate-800">
            Store is currently empty. Receive stock via a Goods Receipt Note (GRN).
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Item Code</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">On Hand</th>
                  <th className="py-3 px-4">Reserved</th>
                  <th className="py-3 px-4">Available</th>
                  <th className="py-3 px-4">Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {stocks.map((s) => (
                  <tr key={s.id || s._id}>
                    <td className="py-3 px-4 font-mono text-indigo-400">
                      {(s.itemId as any)?.itemCode || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {(s.itemId as any)?.name || 'Unknown Item'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{s.quantityOnHand}</td>
                    <td className="py-3 px-4 text-amber-400">{s.quantityReserved}</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">{s.quantityAvailable}</td>
                    <td className="py-3 px-4 text-slate-400">
                      ${((s.averageCostMinorUnits || 0) / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Location Dialog */}
      <Dialog
        isOpen={isLocModalOpen}
        onClose={() => setIsLocModalOpen(false)}
        title="Add Storage Location"
        description="Register an aisle, rack, shelf or bin inside this store."
      >
        <form onSubmit={handleCreateLocation} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Code *</label>
              <Input
                required
                placeholder="e.g. RCK-A-01"
                value={locCode}
                onChange={(e) => setLocCode(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Name *</label>
              <Input
                required
                placeholder="e.g. Rack A - Shelf 1"
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Location Type</label>
            <select
              value={locType}
              onChange={(e) => setLocType(e.target.value as InventoryLocationType)}
              className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
            >
              <option value={InventoryLocationType.AISLE}>Aisle</option>
              <option value={InventoryLocationType.RACK}>Rack</option>
              <option value={InventoryLocationType.SHELF}>Shelf</option>
              <option value={InventoryLocationType.BIN}>Bin</option>
              <option value={InventoryLocationType.ROOM}>Room</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsLocModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreatingLoc}>
              Save Location
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
