import React, { useState } from 'react';
import { Scale, Plus, RotateCw } from 'lucide-react';
import {
  useGetInventoryUnitsQuery,
  useCreateInventoryUnitMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Dialog } from '../../components/ui/Dialog.js';

export const InventoryUnitsPage: React.FC = () => {
  const { data: res, isLoading, refetch } = useGetInventoryUnitsQuery();
  const [createUnit, { isLoading: isCreating }] = useCreateInventoryUnitMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimalPrecision, setDecimalPrecision] = useState(0);

  const units = res?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !symbol) return;

    try {
      await createUnit({
        name,
        code,
        symbol,
        decimalPrecision: Number(decimalPrecision),
        active: true,
      }).unwrap();

      setIsOpen(false);
      setName('');
      setCode('');
      setSymbol('');
      setDecimalPrecision(0);
    } catch (err) {
      console.error('Failed to create unit', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-indigo-400" />
            Units of Measurement (UOM)
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Standard measure definitions: pieces, boxes, kilograms, liters, packets, pairs
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
            Add Unit
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : units.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <Scale className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No units configured</h3>
          <p className="text-sm text-slate-500 mt-1">Add standard measurement units for inventory tracking.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Unit Name</th>
                <th className="py-3.5 px-4">Symbol</th>
                <th className="py-3.5 px-4">Decimal Precision</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {units.map((u) => (
                <tr key={u.id || u._id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-mono font-medium text-indigo-400">{u.code}</td>
                  <td className="py-3.5 px-4 font-medium text-white">{u.name}</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{u.symbol}</td>
                  <td className="py-3.5 px-4 text-slate-400">{u.decimalPrecision} places</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add Unit of Measurement"
        description="Register a measurement scale unit for inventory items."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Code *</label>
              <Input
                required
                placeholder="e.g. PCS, LTR, KG"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit Name *</label>
              <Input
                required
                placeholder="e.g. Pieces, Liters"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Display Symbol *</label>
              <Input
                required
                placeholder="e.g. pcs, L, kg"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Decimal Precision</label>
              <Input
                type="number"
                min="0"
                max="4"
                value={decimalPrecision}
                onChange={(e) => setDecimalPrecision(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Save Unit
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
