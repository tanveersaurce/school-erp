import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Warehouse, Plus, RotateCw, MapPin, ArrowRight } from 'lucide-react';
import {
  useGetInventoryStoresQuery,
  useCreateInventoryStoreMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { InventoryStoreStatus } from '@edusphere/common';

export const InventoryStoresPage: React.FC = () => {
  const { data: res, isLoading, refetch } = useGetInventoryStoresQuery();
  const [createStore, { isLoading: isCreating }] = useCreateInventoryStoreMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const stores = res?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    try {
      await createStore({
        name,
        code,
        location: location || undefined,
        description: description || undefined,
        status: InventoryStoreStatus.ACTIVE,
        active: true,
      }).unwrap();

      setIsOpen(false);
      setName('');
      setCode('');
      setLocation('');
      setDescription('');
    } catch (err) {
      console.error('Failed to create store', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Warehouse className="w-7 h-7 text-emerald-400" />
            Stores & Warehouses
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Campus supply depots, science labs, IT stockrooms, uniform stores, and sports equipment rooms
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
            Add Store
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : stores.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <Warehouse className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No stores created yet</h3>
          <p className="text-sm text-slate-500 mt-1">Configure campus warehouses to begin receiving and tracking inventory.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((st) => (
            <Card key={st.id || st._id} className="p-5 bg-slate-900/60 border-slate-800 hover:border-slate-700 transition flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-emerald-400 font-semibold">{st.code}</span>
                    <h3 className="text-base font-bold text-white mt-0.5">{st.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {st.status}
                  </span>
                </div>

                {st.location && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{st.location}</span>
                  </div>
                )}

                {st.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{st.description}</p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <Link to={`/inventory/stores/${st.id || st._id}`}>
                  <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Store Details & Bins
                  </Button>
                </Link>
                <Link to={`/inventory/stock?storeId=${st.id || st._id}`}>
                  <Button variant="ghost" size="sm">
                    View Stock
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create New Store / Warehouse"
        description="Add a physical inventory depot."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Store Code *</label>
              <Input
                required
                placeholder="e.g. STR-MAIN-01"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Store Name *</label>
              <Input
                required
                placeholder="e.g. Central Science Store"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Physical Location</label>
            <Input
              placeholder="e.g. Building B, Ground Floor, Room 104"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Notes</label>
            <Input
              placeholder="Store remarks or access instructions"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Create Store
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
