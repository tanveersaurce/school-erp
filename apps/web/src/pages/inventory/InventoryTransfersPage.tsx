import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  RotateCw,
} from 'lucide-react';
import {
  useGetInventoryTransfersQuery,
  useGetInventoryStoresQuery,
  useGetInventoryItemsQuery,
  useCreateInventoryTransferMutation,
  useDispatchInventoryTransferMutation,
  useReceiveInventoryTransferMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { StockTransferStatus } from '@edusphere/common';

export const InventoryTransfersPage: React.FC = () => {
  const [page] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [sourceStoreId, setSourceStoreId] = useState('');
  const [destinationStoreId, setDestinationStoreId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const { data: storesRes } = useGetInventoryStoresQuery();
  const { data: itemsRes } = useGetInventoryItemsQuery({ limit: 100 });
  const { data: transfersRes, isLoading, refetch } = useGetInventoryTransfersQuery({
    page,
    limit: 20,
  });

  const [createTransfer, { isLoading: isCreating }] = useCreateInventoryTransferMutation();
  const [dispatchTransfer] = useDispatchInventoryTransferMutation();
  const [receiveTransfer] = useReceiveInventoryTransferMutation();

  const stores = storesRes?.data || [];
  const items = itemsRes?.data?.items || [];
  const transfers = transfersRes?.data?.items || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceStoreId || !destinationStoreId || !itemId || quantity <= 0) return;
    if (sourceStoreId === destinationStoreId) return;

    try {
      const selectedSource = stores.find((s) => (s.id || s._id) === sourceStoreId);
      await createTransfer({
        schoolId: selectedSource?.schoolId,
        sourceStoreId,
        destinationStoreId,
        notes: notes || undefined,
        items: [{ itemId, quantity: Number(quantity) }],
      }).unwrap();

      setIsOpen(false);
      setNotes('');
    } catch (err) {
      console.error('Failed to create transfer', err);
    }
  };

  const getStatusBadge = (status: StockTransferStatus) => {
    switch (status) {
      case StockTransferStatus.RECEIVED:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case StockTransferStatus.IN_TRANSIT:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case StockTransferStatus.CANCELLED:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ArrowLeftRight className="w-7 h-7 text-purple-400" />
            Stock Transfers (Inter-Store Logistics)
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Safely relocate stock between campus warehouses with transit custody dispatch and delivery receipts
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
            Request Transfer
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : transfers.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <ArrowLeftRight className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No stock transfers recorded</h3>
          <p className="text-sm text-slate-500 mt-1">Initiate transfers between stores to balance depot stock.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Transfer #</th>
                <th className="py-3.5 px-4">Source Store</th>
                <th className="py-3.5 px-4">Destination Store</th>
                <th className="py-3.5 px-4 text-center">Items</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {transfers.map((trf) => {
                const totalQty = (trf.items || []).reduce((s, i) => s + i.quantity, 0);
                return (
                  <tr key={trf.id || trf._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-purple-400">
                      {trf.transferNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      {(trf.sourceStoreId as any)?.name || 'Source Store'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      {(trf.destinationStoreId as any)?.name || 'Destination Store'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-white">
                      {totalQty} units
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(trf.status)}`}>
                        {trf.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {trf.status === StockTransferStatus.REQUESTED && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => dispatchTransfer(trf.id || trf._id || '')}
                        >
                          Dispatch
                        </Button>
                      )}
                      {trf.status === StockTransferStatus.IN_TRANSIT && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => receiveTransfer(trf.id || trf._id || '')}
                        >
                          Receive
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

      {/* Transfer Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create Inter-Store Transfer"
        description="Transfer stock from one warehouse to another."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Source Store *</label>
              <select
                required
                value={sourceStoreId}
                onChange={(e) => setSourceStoreId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value="">Select Origin Store</option>
                {stores.map((s) => (
                  <option key={s.id || s._id} value={s.id || s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Store *</label>
              <select
                required
                value={destinationStoreId}
                onChange={(e) => setDestinationStoreId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value="">Select Destination Store</option>
                {stores
                  .filter((s) => (s.id || s._id) !== sourceStoreId)
                  .map((s) => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Item to Transfer</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Catalog Item *</label>
              <select
                required
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm"
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Transfer Quantity *</label>
              <Input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Transfer Reason / Notes</label>
            <Input
              placeholder="e.g. Replenishment for senior biology lab store"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Initiate Transfer
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
