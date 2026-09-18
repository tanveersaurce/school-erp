import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  RotateCw,
} from 'lucide-react';
import {
  useGetInventoryItemsQuery,
  useGetInventoryCategoriesQuery,
  useGetInventoryUnitsQuery,
  useCreateInventoryItemMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { InventoryItemType } from '@edusphere/common';

export const InventoryItemsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [itemCode, setItemCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [itemType, setItemType] = useState<InventoryItemType>(InventoryItemType.CONSUMABLE);
  const [reorderLevel, setReorderLevel] = useState(10);
  const [minimumStock, setMinimumStock] = useState(5);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [trackBatch, setTrackBatch] = useState(false);
  const [trackExpiry, setTrackExpiry] = useState(false);

  const { data: itemsRes, isLoading, refetch } = useGetInventoryItemsQuery({
    search: searchTerm || undefined,
    categoryId: categoryFilter || undefined,
    itemType: typeFilter || undefined,
    page,
    limit: 20,
  });

  const { data: categoriesRes } = useGetInventoryCategoriesQuery();
  const { data: unitsRes } = useGetInventoryUnitsQuery();
  const [createItem, { isLoading: isCreating }] = useCreateInventoryItemMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !itemCode || !categoryId || !unitId) return;

    try {
      await createItem({
        itemCode,
        name,
        description,
        categoryId,
        unitId,
        itemType,
        reorderLevel: Number(reorderLevel),
        minimumStock: Number(minimumStock),
        sku: sku || undefined,
        barcode: barcode || undefined,
        trackBatch,
        trackExpiry,
        active: true,
      }).unwrap();

      setIsCreateOpen(false);
      setItemCode('');
      setName('');
      setDescription('');
      setSku('');
      setBarcode('');
    } catch (err) {
      console.error('Failed to create item', err);
    }
  };

  const items = itemsRes?.data?.items || [];
  const pagination = itemsRes?.data?.pagination;
  const categories = categoriesRes?.data || [];
  const units = unitsRes?.data || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Package className="w-7 h-7 text-indigo-400" />
            Inventory Item Catalog
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Master definitions for consumable stock, durable assets, and equipment
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
            Add New Item
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-slate-900/60 border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <Input
              placeholder="Search by name, code, SKU, or barcode..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Types (Consumable & Asset)</option>
              <option value={InventoryItemType.CONSUMABLE}>Consumable Supplies</option>
              <option value={InventoryItemType.ASSET}>Durable Assets</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Catalog Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No items found</h3>
          <p className="text-sm text-slate-500 mt-1">Get started by adding items to your school catalog.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Code / SKU</th>
                <th className="py-3.5 px-4">Item Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Unit</th>
                <th className="py-3.5 px-4">Reorder Level</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {items.map((item) => (
                <tr key={item.id || item._id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-mono font-medium text-indigo-400">
                    {item.itemCode}
                    {item.sku && <div className="text-xs text-slate-500">{item.sku}</div>}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-white">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-slate-500 truncate max-w-xs">{item.description}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {(item.categoryId as any)?.name || 'General'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.itemType === InventoryItemType.ASSET
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {item.itemType === InventoryItemType.ASSET ? 'Durable Asset' : 'Consumable'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {(item.unitId as any)?.symbol || (item.unitId as any)?.name || 'units'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-200">{item.reorderLevel}</span>
                    <span className="text-xs text-slate-500 ml-1">(Min: {item.minimumStock})</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link to={`/inventory/items/${item.id || item._id}`}>
                      <Button variant="outline" size="sm">
                        Details
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400 px-1">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total items)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Item Modal */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Catalog Item"
        description="Register a new consumable material or durable asset in the catalog."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Item Code *</label>
              <Input
                required
                placeholder="e.g. CHM-SUL-001"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">SKU / Model</label>
              <Input
                placeholder="Optional SKU"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Item Name *</label>
            <Input
              required
              placeholder="e.g. Sulfuric Acid 98% AR Grade"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit of Measurement *</label>
              <select
                required
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value="">Select Unit</option>
                {units.map((u) => (
                  <option key={u.id || u._id} value={u.id || u._id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Type</label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as InventoryItemType)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value={InventoryItemType.CONSUMABLE}>Consumable</option>
                <option value={InventoryItemType.ASSET}>Durable Asset</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reorder Level</label>
              <Input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Minimum Stock</label>
              <Input
                type="number"
                min="0"
                value={minimumStock}
                onChange={(e) => setMinimumStock(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={trackBatch}
                onChange={(e) => setTrackBatch(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600"
              />
              Track Batches / Lots
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={trackExpiry}
                onChange={(e) => setTrackExpiry(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600"
              />
              Track Expiration Dates
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Save Item
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
