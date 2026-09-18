import React, { useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  RotateCw,
  Play,
  CheckCircle,
  FileCheck,
} from 'lucide-react';
import {
  useGetInventoryStocktakesQuery,
  useGetInventoryStoresQuery,
  useCreateStocktakeMutation,
  useStartStocktakeMutation,
  useReviewStocktakeMutation,
  useReconcileStocktakeMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { StocktakeStatus } from '@edusphere/common';

export const InventoryStocktakesPage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [storeId, setStoreId] = useState('');
  const [stocktakeNumber, setStocktakeNumber] = useState(`ST-${new Date().getFullYear()}-Q${Math.floor((new Date().getMonth() + 3) / 3)}-001`);
  const [notes, setNotes] = useState('');

  const { data: storesRes } = useGetInventoryStoresQuery();
  const { data: stocktakesRes, isLoading, refetch } = useGetInventoryStocktakesQuery();

  const [createStocktake, { isLoading: isCreating }] = useCreateStocktakeMutation();
  const [startStocktake] = useStartStocktakeMutation();
  const [reviewStocktake] = useReviewStocktakeMutation();
  const [reconcileStocktake] = useReconcileStocktakeMutation();

  const stores = storesRes?.data || [];
  const stocktakes = stocktakesRes?.data?.items || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !stocktakeNumber) return;

    try {
      const selectedStore = stores.find((s) => (s.id || s._id) === storeId);
      await createStocktake({
        schoolId: selectedStore?.schoolId,
        storeId,
        stocktakeNumber,
        notes: notes || undefined,
      }).unwrap();

      setIsOpen(false);
      setNotes('');
    } catch (err) {
      console.error('Failed to create stocktake', err);
    }
  };

  const getStatusBadge = (status: StocktakeStatus) => {
    switch (status) {
      case StocktakeStatus.CLOSED:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case StocktakeStatus.REVIEW:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case StocktakeStatus.COUNTING:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ClipboardCheck className="w-7 h-7 text-amber-400" />
            Physical Stocktake & Cycle Counts
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Periodic physical count audits, system variance reconciliation, and automated adjustments
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
            Schedule Stocktake
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : stocktakes.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <ClipboardCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No stocktake sessions</h3>
          <p className="text-sm text-slate-500 mt-1">Schedule an audit session to verify physical inventory counts against system records.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Audit Session #</th>
                <th className="py-3.5 px-4">Store</th>
                <th className="py-3.5 px-4">Started</th>
                <th className="py-3.5 px-4 text-center">Items Audited</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {stocktakes.map((stk) => {
                const totalItems = stk.items?.length || 0;
                return (
                  <tr key={stk.id || stk._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-amber-400">
                      {stk.stocktakeNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      {(stk.storeId as any)?.name || 'Store'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(stk.startDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-white">
                      {totalItems} items
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(stk.status)}`}>
                        {stk.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {stk.status === StocktakeStatus.DRAFT && (
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Play className="w-3.5 h-3.5" />}
                          onClick={() => startStocktake(stk.id || stk._id || '')}
                        >
                          Start Counting
                        </Button>
                      )}
                      {stk.status === StocktakeStatus.COUNTING && (
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<FileCheck className="w-3.5 h-3.5" />}
                          onClick={() => reviewStocktake(stk.id || stk._id || '')}
                        >
                          Submit for Review
                        </Button>
                      )}
                      {stk.status === StocktakeStatus.REVIEW && (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                          onClick={() => reconcileStocktake(stk.id || stk._id || '')}
                        >
                          Approve & Reconcile
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule Stocktake Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Initiate Physical Stocktake Audit"
        description="Freeze or audit physical store inventory against ledger counts."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Session Number *</label>
              <Input
                required
                value={stocktakeNumber}
                onChange={(e) => setStocktakeNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Store to Audit *</label>
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
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Audit Notes / Objective</label>
            <Input
              placeholder="e.g. End of term annual verification"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Create Session
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
