import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  Barcode,
  Warehouse,
  History,
} from 'lucide-react';
import {
  useGetInventoryItemByIdQuery,
  useGetInventoryStockQuery,
  useGetInventoryStockBatchesQuery,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { InventoryItemType } from '@edusphere/common';

export const InventoryItemDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: itemRes, isLoading: isItemLoading } = useGetInventoryItemByIdQuery(id || '');
  const { data: stockRes, isLoading: isStockLoading } = useGetInventoryStockQuery({ itemId: id });
  const { data: batchesRes, isLoading: isBatchesLoading } = useGetInventoryStockBatchesQuery({ itemId: id });

  const item = itemRes?.data;
  const stocks = stockRes?.data || [];
  const batches = batchesRes?.data || [];

  if (isItemLoading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Item not found.</p>
        <Link to="/inventory/items" className="mt-4 inline-block">
          <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Items
          </Button>
        </Link>
      </div>
    );
  }

  const totalOnHand = stocks.reduce((sum, s) => sum + s.quantityOnHand, 0);
  const totalReserved = stocks.reduce((sum, s) => sum + s.quantityReserved, 0);
  const totalAvailable = stocks.reduce((sum, s) => sum + s.quantityAvailable, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/inventory/items">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Package className="w-7 h-7 text-indigo-400" />
              {item.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="font-mono text-indigo-400 font-semibold">{item.itemCode}</span>
              {item.sku && <span>• SKU: {item.sku}</span>}
              <span>• {(item.categoryId as any)?.name || 'General'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/inventory/stock?itemId=${item.id || item._id}`}>
            <Button variant="outline" size="sm" leftIcon={<History className="w-4 h-4" />}>
              Stock Ledger
            </Button>
          </Link>
        </div>
      </div>

      {/* Stock Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total On Hand</p>
          <p className="text-2xl font-bold text-white mt-1">{totalOnHand}</p>
          <p className="text-xs text-slate-500 mt-1">Across all registered stores</p>
        </Card>
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Reserved Stock</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{totalReserved}</p>
          <p className="text-xs text-slate-500 mt-1">Pending issues / requisitions</p>
        </Card>
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Available Stock</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{totalAvailable}</p>
          <p className="text-xs text-slate-500 mt-1">Ready for allocation</p>
        </Card>
      </div>

      {/* Item Specifications & Metadata */}
      <Card className="p-5 bg-slate-900/60 border-slate-800">
        <h3 className="text-sm font-semibold text-white mb-4">Item Specifications</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Item Classification</span>
            <span className="font-medium text-slate-200 mt-0.5 block">
              {item.itemType === InventoryItemType.ASSET ? 'Durable Capital Asset' : 'Consumable Supply'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Reorder Threshold</span>
            <span className="font-medium text-slate-200 mt-0.5 block">{item.reorderLevel} units</span>
          </div>
          <div>
            <span className="text-slate-500 block">Safety Minimum Stock</span>
            <span className="font-medium text-slate-200 mt-0.5 block">{item.minimumStock} units</span>
          </div>
          <div>
            <span className="text-slate-500 block">Batch / Expiry Tracking</span>
            <span className="font-medium text-slate-200 mt-0.5 block">
              {item.trackBatch ? 'Batch Enabled' : 'No Batches'} / {item.trackExpiry ? 'Expiry Tracked' : 'No Expiry'}
            </span>
          </div>
        </div>
      </Card>

      {/* Stock By Store Table */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-emerald-400" />
          Store Balance Breakdown
        </h3>
        {isStockLoading ? (
          <Spinner size="sm" />
        ) : stocks.length === 0 ? (
          <Card className="p-6 text-center text-xs text-slate-500 bg-slate-900/40 border-slate-800">
            No stock received for this item yet.
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Store Name</th>
                  <th className="py-3 px-4">On Hand</th>
                  <th className="py-3 px-4">Reserved</th>
                  <th className="py-3 px-4">Available</th>
                  <th className="py-3 px-4">Avg Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {stocks.map((stk) => (
                  <tr key={stk.id || stk._id}>
                    <td className="py-3 px-4 font-medium text-white">
                      {(stk.storeId as any)?.name || 'Default Store'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{stk.quantityOnHand}</td>
                    <td className="py-3 px-4 text-amber-400">{stk.quantityReserved}</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">{stk.quantityAvailable}</td>
                    <td className="py-3 px-4 text-slate-400">
                      ${((stk.averageCostMinorUnits || 0) / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Batches Table if batch-tracked */}
      {item.trackBatch && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Barcode className="w-5 h-5 text-indigo-400" />
            Active Batches & Lots
          </h3>
          {isBatchesLoading ? (
            <Spinner size="sm" />
          ) : batches.length === 0 ? (
            <Card className="p-6 text-center text-xs text-slate-500 bg-slate-900/40 border-slate-800">
              No active batches registered.
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {batches.map((b) => (
                    <tr key={b.id || b._id}>
                      <td className="py-3 px-4 font-mono text-indigo-400">{b.batchNumber}</td>
                      <td className="py-3 px-4 font-medium">{b.quantityOnHand}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">${((b.unitCostMinorUnits || 0) / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
