import React, { useState } from 'react';
import {
  ArrowDownLeft,
  Plus,
  RotateCw,
  Warehouse,
} from 'lucide-react';
import {
  useGetInventoryReceiptsQuery,
  useGetInventoryStoresQuery,
  useGetInventorySuppliersQuery,
  useGetInventoryItemsQuery,
  useCreateInventoryReceiptMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Dialog } from '../../components/ui/Dialog.js';

export const InventoryReceiptsPage: React.FC = () => {
  const [storeFilter, setStoreFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  // Modal Form State
  const [storeId, setStoreId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [itemId, setItemId] = useState('');
  const [receivedQuantity, setReceivedQuantity] = useState(10);
  const [unitCostDollars, setUnitCostDollars] = useState(25.0);
  const [batchNumber, setBatchNumber] = useState('');

  const { data: storesRes } = useGetInventoryStoresQuery();
  const { data: suppliersRes } = useGetInventorySuppliersQuery();
  const { data: itemsRes } = useGetInventoryItemsQuery({ limit: 100 });
  const { data: receiptsRes, isLoading, refetch } = useGetInventoryReceiptsQuery({
    storeId: storeFilter || undefined,
    page,
    limit: 20,
  });

  const [createReceipt, { isLoading: isCreating }] = useCreateInventoryReceiptMutation();

  const stores = storesRes?.data || [];
  const suppliers = suppliersRes?.data || [];
  const items = itemsRes?.data?.items || [];
  const receipts = receiptsRes?.data?.items || [];

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !supplierId || !itemId || receivedQuantity <= 0) return;

    try {
      const selectedStore = stores.find((s) => (s.id || s._id) === storeId);
      await createReceipt({
        schoolId: selectedStore?.schoolId,
        storeId,
        supplierId,
        purchaseOrderNumber: purchaseOrderNumber || undefined,
        invoiceNumber: invoiceNumber || undefined,
        notes: notes || undefined,
        items: [
          {
            itemId,
            receivedQuantity: Number(receivedQuantity),
            unitCostMinorUnits: Math.round(Number(unitCostDollars) * 100),
            batchNumber: batchNumber || undefined,
          },
        ],
      }).unwrap();

      setIsOpen(false);
      setPurchaseOrderNumber('');
      setInvoiceNumber('');
      setNotes('');
      setBatchNumber('');
    } catch (err) {
      console.error('Failed to create receipt', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ArrowDownLeft className="w-7 h-7 text-emerald-400" />
            Goods Receipts (Inward Stock / GRN)
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Record supplier deliveries, vendor PO deliveries, batch numbers, and acquisition cost
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
            Receive Inward Stock
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
            className="w-full sm:w-64 h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Receiving Stores</option>
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
      ) : receipts.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <ArrowDownLeft className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No goods receipts registered</h3>
          <p className="text-sm text-slate-500 mt-1">Receive new stock deliveries to update inventory on hand.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">GRN Voucher</th>
                <th className="py-3.5 px-4">Store</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-center">Items Received</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {receipts.map((rcv) => {
                const totalQty = (rcv.items || []).reduce((s, i) => s + i.quantity, 0);
                return (
                  <tr key={rcv.id || rcv._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-emerald-400">
                      {rcv.receiptNumber}
                      {rcv.referenceNumber && (
                        <div className="text-xs text-slate-500">Ref: {rcv.referenceNumber}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      {(rcv.storeId as any)?.name || 'Store'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {(rcv.supplierId as any)?.name || 'Direct Vendor'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(rcv.receiptDate || rcv.createdAt || '').toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-white">
                      {totalQty} units ({rcv.items?.length || 0} lines)
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-400">
                      ${((rcv.totalAmountMinorUnits || 0) / 100).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {rcv.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Receive Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Record Goods Inward Receipt (GRN)"
        description="Receive stock from approved supplier into a school store."
      >
        <form onSubmit={handleCreateReceipt} className="space-y-4 text-left">
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier / Vendor *</label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((sup) => (
                  <option key={sup.id || sup._id} value={sup.id || sup._id}>
                    {sup.name} ({sup.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Purchase Order #</label>
              <Input
                placeholder="e.g. PO-2026-881"
                value={purchaseOrderNumber}
                onChange={(e) => setPurchaseOrderNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier Invoice #</label>
              <Input
                placeholder="e.g. INV-9902"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Line Item</h4>
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

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Received Qty *</label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={receivedQuantity}
                  onChange={(e) => setReceivedQuantity(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Unit Cost ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={unitCostDollars}
                  onChange={(e) => setUnitCostDollars(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Batch / Lot #</label>
                <Input
                  placeholder="Optional Batch"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Inspection Notes / Remarks</label>
            <Input
              placeholder="Delivery condition or inspection remarks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Confirm Inward Receipt
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
