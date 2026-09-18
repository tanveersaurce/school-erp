import React, { useState } from 'react';
import {
  RotateCcw,
  RotateCw,
  Plus,
} from 'lucide-react';
import {
  useGetInventoryReturnsQuery,
  useGetInventoryStoresQuery,
  useGetInventoryItemsQuery,
  useCreateInventoryReturnMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Dialog } from '../../components/ui/Dialog.js';

export const InventoryReturnsPage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [storeId, setStoreId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('GOOD');
  const [reason, setReason] = useState('');

  const { data: storesRes } = useGetInventoryStoresQuery();
  const { data: itemsRes } = useGetInventoryItemsQuery({ limit: 100 });
  const { data: res, isLoading, refetch } = useGetInventoryReturnsQuery();

  const [createReturn, { isLoading: isCreating }] = useCreateInventoryReturnMutation();

  const stores = storesRes?.data || [];
  const items = itemsRes?.data?.items || [];
  const returns = res?.data?.items || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !itemId || quantity <= 0) return;

    try {
      const selectedStore = stores.find((s) => (s.id || s._id) === storeId);
      await createReturn({
        schoolId: selectedStore?.schoolId,
        storeId,
        reason: reason || undefined,
        items: [
          {
            itemId,
            quantity: Number(quantity),
            condition,
            reason: reason || undefined,
          },
        ],
      }).unwrap();

      setIsOpen(false);
      setReason('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <RotateCcw className="w-7 h-7 text-emerald-400" />
            Stock Returns (Check-In to Store)
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Return unconsumed supplies or equipment back into warehouse inventory with condition grading
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
            Record Return
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : returns.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <RotateCcw className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No stock returns recorded</h3>
          <p className="text-sm text-slate-500 mt-1">Check in unused materials back into store stock.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Return #</th>
                <th className="py-3.5 px-4">Store</th>
                <th className="py-3.5 px-4 text-center">Items Returned</th>
                <th className="py-3.5 px-4">Reason / Remarks</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {returns.map((ret) => {
                const totalQty = (ret.items || []).reduce((s, i) => s + i.quantity, 0);
                return (
                  <tr key={ret.id || ret._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-emerald-400">
                      {ret.returnNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      {(ret.storeId as any)?.name || 'Store'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-white">
                      {totalQty} units
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 truncate max-w-xs">
                      {ret.reason || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {ret.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Return Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Check-In Returned Stock"
        description="Return unused stock into store balance."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Receiving Store *</label>
              <select
                required
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value="">Select Store</option>
                {stores.map((s) => (
                  <option key={s.id || s._id} value={s.id || s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Catalog Item *</label>
              <select
                required
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value="">Select Item</option>
                {items.map((it) => (
                  <option key={it.id || it._id} value={it.id || it._id}>
                    {it.name} ({it.itemCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity Returned *</label>
              <Input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value="GOOD">Good / Restockable</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor / Damaged</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Return Reason / Source</label>
            <Input
              placeholder="e.g. Unused chemicals returned from Chem 102 experiment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Confirm Return
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
