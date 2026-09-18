import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  RotateCw,
  AlertTriangle,
  Warehouse,
} from 'lucide-react';
import {
  useGetInventoryAdjustmentsQuery,
  useGetInventoryStoresQuery,
  useGetInventoryItemsQuery,
  useCreateInventoryAdjustmentMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { StockAdjustmentType, StockAdjustmentReason } from '@edusphere/common';

export const InventoryAdjustmentsPage: React.FC = () => {
  const [storeFilter, setStoreFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [storeId, setStoreId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType>(StockAdjustmentType.DECREASE);
  const [reason, setReason] = useState<StockAdjustmentReason>(StockAdjustmentReason.DAMAGE);
  const [itemId, setItemId] = useState('');
  const [quantityChange, setQuantityChange] = useState(1);
  const [notes, setNotes] = useState('');

  const { data: storesRes } = useGetInventoryStoresQuery();
  const { data: itemsRes } = useGetInventoryItemsQuery({ limit: 100 });
  const { data: adjsRes, isLoading, refetch } = useGetInventoryAdjustmentsQuery({
    storeId: storeFilter || undefined,
    page,
    limit: 20,
  });

  const [createAdjustment, { isLoading: isCreating }] = useCreateInventoryAdjustmentMutation();

  const stores = storesRes?.data || [];
  const items = itemsRes?.data?.items || [];
  const adjustments = adjsRes?.data?.items || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!storeId || !itemId || quantityChange <= 0) return;

    try {
      const selectedStore = stores.find((s) => (s.id || s._id) === storeId);
      await createAdjustment({
        schoolId: selectedStore?.schoolId,
        storeId,
        adjustmentType,
        reason,
        notes: notes || undefined,
        quantity: Number(quantityChange),
        itemId,
      }).unwrap();

      setIsOpen(false);
      setNotes('');
    } catch (err: any) {
      console.error('Failed to create adjustment', err);
      setErrorMessage(err?.data?.message || 'Failed to adjust stock. Please check available quantity.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <SlidersHorizontal className="w-7 h-7 text-amber-400" />
            Stock Adjustments & Write-Offs
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Reconcile stock discrepancies, record damaged items, expired chemicals, and inventory shrinkage
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
            Record Adjustment
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-slate-900/60 border-slate-800">
        <div className="flex items-center gap-3">
          <Warehouse className="w-4 h-4 text-slate-500" />
          <select
            value={storeFilter}
            onChange={(e) => {
              setStoreFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-64 h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All Stores</option>
            {stores.map((st) => (
              <option key={st.id || st._id} value={st.id || st._id}>
                {st.name} ({st.code})
              </option>
            ))}
          </select>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : adjustments.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <SlidersHorizontal className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No stock adjustments recorded</h3>
          <p className="text-sm text-slate-500 mt-1">Adjustments recorded here impact physical balances and the ledger.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Adjustment #</th>
                <th className="py-3.5 px-4">Store</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4 text-center">Qty Impact</th>
                <th className="py-3.5 px-4">Notes</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {adjustments.map((adj) => {
                const totalChange = (adj.items || []).reduce((s, i) => s + i.quantityChange, 0);
                return (
                  <tr key={adj.id || adj._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-amber-400">
                      {adj.adjustmentNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      {(adj.storeId as any)?.name || 'Store'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          adj.adjustmentType === StockAdjustmentType.INCREASE
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {adj.adjustmentType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{adj.reason}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold">
                      <span className={totalChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {totalChange > 0 ? `+${totalChange}` : totalChange}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 truncate max-w-xs">{adj.notes || '—'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {adj.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Adjustment Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setErrorMessage('');
        }}
        title="Record Stock Adjustment"
        description="Write off damaged goods, expired reagents, or adjust physical variances."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-left">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Store *</label>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Adjustment Type *</label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as StockAdjustmentType)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value={StockAdjustmentType.DECREASE}>Decrease Stock (Write-Off / Loss)</option>
                <option value={StockAdjustmentType.INCREASE}>Increase Stock (Found / Surplus)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reason *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as StockAdjustmentReason)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value={StockAdjustmentReason.DAMAGE}>Damaged Goods</option>
                <option value={StockAdjustmentReason.EXPIRY}>Expired Item</option>
                <option value={StockAdjustmentReason.LOSS}>Theft / Loss / Shrinkage</option>
                <option value={StockAdjustmentReason.CORRECTION}>Data Correction</option>
                <option value={StockAdjustmentReason.PHYSICAL_COUNT}>Physical Verification</option>
                <option value={StockAdjustmentReason.OTHER}>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity *</label>
              <Input
                type="number"
                min="1"
                required
                value={quantityChange}
                onChange={(e) => setQuantityChange(Number(e.target.value))}
              />
            </div>
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

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Explanation</label>
            <Input
              placeholder="e.g. Glass beaker broken during seismic safety drill"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Apply Adjustment
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
