import React, { useState } from 'react';
import {
  Bookmark,
  RotateCw,
  Plus,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  useGetInventoryReservationsQuery,
  useGetInventoryStoresQuery,
  useGetInventoryItemsQuery,
  useCreateInventoryReservationMutation,
  useFulfillInventoryReservationMutation,
  useCancelInventoryReservationMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { StockReservationStatus } from '@edusphere/common';

export const InventoryReservationsPage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [storeId, setStoreId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reservedForType, setReservedForType] = useState('EVENT');
  const [reservedForId, setReservedForId] = useState('');

  const { data: storesRes } = useGetInventoryStoresQuery();
  const { data: itemsRes } = useGetInventoryItemsQuery({ limit: 100 });
  const { data: res, isLoading, refetch } = useGetInventoryReservationsQuery();

  const [createReservation, { isLoading: isCreating }] = useCreateInventoryReservationMutation();
  const [fulfillReservation] = useFulfillInventoryReservationMutation();
  const [cancelReservation] = useCancelInventoryReservationMutation();

  const stores = storesRes?.data || [];
  const items = itemsRes?.data?.items || [];
  const reservations = res?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !itemId || !reservedForId || quantity <= 0) return;

    try {
      const selectedStore = stores.find((s) => (s.id || s._id) === storeId);
      await createReservation({
        schoolId: selectedStore?.schoolId,
        storeId,
        itemId,
        quantity: Number(quantity),
        reservedForType,
        reservedForId,
      }).unwrap();

      setIsOpen(false);
      setReservedForId('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Bookmark className="w-7 h-7 text-indigo-400" />
            Stock Reservations & Holds
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Hold stock allocations for upcoming exams, lab experiments, sports meets, or scheduled events
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
            Reserve Stock
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : reservations.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <Bookmark className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No active stock reservations</h3>
          <p className="text-sm text-slate-500 mt-1">Reserve supplies for future courses, labs, or school events.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Item Name</th>
                <th className="py-3.5 px-4">Store</th>
                <th className="py-3.5 px-4 text-center">Reserved Qty</th>
                <th className="py-3.5 px-4">Purpose / Target</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {reservations.map((r) => (
                <tr key={r.id || r._id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-medium text-white">
                    {(r.itemId as any)?.name || 'Item'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-200">
                    {(r.storeId as any)?.name || 'Store'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-400">{r.quantity}</td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <span className="text-xs text-slate-500 uppercase mr-1">{r.reservedForType}:</span>
                    {r.reservedForId}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        r.status === StockReservationStatus.FULFILLED
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : r.status === StockReservationStatus.CANCELLED
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {r.status === StockReservationStatus.ACTIVE && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                          onClick={() => fulfillReservation(r.id || r._id || '')}
                        >
                          Fulfill
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<XCircle className="w-3.5 h-3.5" />}
                          onClick={() => cancelReservation(r.id || r._id || '')}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reserve Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create Stock Reservation"
        description="Temporarily hold stock from available inventory."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-left">
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity to Hold *</label>
              <Input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Purpose Category</label>
              <select
                value={reservedForType}
                onChange={(e) => setReservedForType(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value="EVENT">Annual / Sports Event</option>
                <option value="EXAMINATION">Board Examination</option>
                <option value="COURSE_LAB">Laboratory Coursework</option>
                <option value="MAINTENANCE">Scheduled Renovation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Hold Reference / Event ID *</label>
            <Input
              required
              placeholder="e.g. LAB-PRACTICAL-2026-TERM1"
              value={reservedForId}
              onChange={(e) => setReservedForId(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Confirm Reservation
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
