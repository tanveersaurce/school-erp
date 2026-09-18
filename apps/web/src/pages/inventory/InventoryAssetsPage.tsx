import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Plus,
  RotateCw,
  Search,
  ArrowRight,
} from 'lucide-react';
import {
  useGetInventoryAssetsQuery,
  useGetInventoryStoresQuery,
  useGetInventoryItemsQuery,
  useCreateInventoryAssetMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Dialog } from '../../components/ui/Dialog.js';
import {
  AssetStatus,
  AssetCondition,
  AssetAssignmentType,
  InventoryItemType,
} from '@edusphere/common';

export const InventoryAssetsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [itemId, setItemId] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [costDollars, setCostDollars] = useState(500);
  const [currentStoreId, setCurrentStoreId] = useState('');

  const { data: storesRes } = useGetInventoryStoresQuery();
  const { data: itemsRes } = useGetInventoryItemsQuery({ itemType: InventoryItemType.ASSET, limit: 100 });
  const { data: assetsRes, isLoading, refetch } = useGetInventoryAssetsQuery({
    search: searchTerm || undefined,
    status: statusFilter || undefined,
    page,
    limit: 20,
  });

  const [createAsset, { isLoading: isCreating }] = useCreateInventoryAssetMutation();

  const stores = storesRes?.data || [];
  const items = itemsRes?.data?.items || [];
  const assets = assetsRes?.data?.items || [];
  const pagination = assetsRes?.data?.pagination;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId || !assetTag) return;

    try {
      const selectedItem = items.find((i) => (i.id || i._id) === itemId);
      await createAsset({
        schoolId: selectedItem?.schoolId,
        itemId,
        assetTag,
        serialNumber: serialNumber || undefined,
        model: model || undefined,
        manufacturer: manufacturer || undefined,
        purchaseCostMinorUnits: Math.round(Number(costDollars) * 100),
        currentStoreId: currentStoreId || undefined,
        status: AssetStatus.AVAILABLE,
        condition: AssetCondition.NEW,
        assignedToType: AssetAssignmentType.NONE,
      }).unwrap();

      setIsOpen(false);
      setAssetTag('');
      setSerialNumber('');
      setModel('');
      setManufacturer('');
    } catch (err) {
      console.error('Failed to create asset', err);
    }
  };

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case AssetStatus.AVAILABLE:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case AssetStatus.ASSIGNED:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case AssetStatus.MAINTENANCE:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case AssetStatus.DISPOSED:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-sky-400" />
            Durable Asset Register
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Serialized asset tags, lab equipment, IT devices, classroom furniture, custody tracking & maintenance
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
            Register Asset
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-slate-900/60 border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <Input
              placeholder="Search by tag, serial number, model, or name..."
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
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Asset Statuses</option>
              <option value={AssetStatus.AVAILABLE}>Available in Store</option>
              <option value={AssetStatus.ASSIGNED}>Assigned / In Custody</option>
              <option value={AssetStatus.MAINTENANCE}>Under Maintenance</option>
              <option value={AssetStatus.DAMAGED}>Damaged</option>
              <option value={AssetStatus.LOST}>Lost</option>
              <option value={AssetStatus.DISPOSED}>Disposed / Decommissioned</option>
            </select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : assets.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No assets found</h3>
          <p className="text-sm text-slate-500 mt-1">Register durable equipment with asset tags and serial numbers.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Asset Tag / SN</th>
                <th className="py-3.5 px-4">Asset Name</th>
                <th className="py-3.5 px-4">Model / Brand</th>
                <th className="py-3.5 px-4">Condition</th>
                <th className="py-3.5 px-4">Current Custody</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {assets.map((ast) => (
                <tr key={ast.id || ast._id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-mono">
                    <span className="font-bold text-sky-400">{ast.assetTag}</span>
                    {ast.serialNumber && (
                      <div className="text-xs text-slate-500">SN: {ast.serialNumber}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-white">
                    {(ast.itemId as any)?.name || 'Equipment Asset'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {ast.model || ast.manufacturer || 'Standard'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">
                      {ast.condition}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-300">
                    {ast.status === AssetStatus.ASSIGNED ? (
                      <span className="text-sky-300 font-medium">
                        Assigned ({ast.assignedToType})
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        In Store: {(ast.currentStoreId as any)?.name || 'Central'}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(ast.status)}`}>
                      {ast.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link to={`/inventory/assets/${ast.id || ast._id}`}>
                      <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Manage
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
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total assets)
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

      {/* Register Asset Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Register Durable Asset"
        description="Add a physical asset tag and serial number for lifecycle tracking."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Catalog Item *</label>
            <select
              required
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
            >
              <option value="">Select Asset Model / Product</option>
              {items.map((it) => (
                <option key={it.id || it._id} value={it.id || it._id}>
                  {it.name} ({it.itemCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Tag *</label>
              <Input
                required
                placeholder="e.g. AST-MIC-2026-101"
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Serial Number</label>
              <Input
                placeholder="Manufacturer Serial #"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Model Name / Spec</label>
              <Input
                placeholder="e.g. CX23 Binocular"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Manufacturer</label>
              <Input
                placeholder="e.g. Olympus / Dell"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Acquisition Cost ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costDollars}
                onChange={(e) => setCostDollars(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Location Store</label>
              <select
                value={currentStoreId}
                onChange={(e) => setCurrentStoreId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value="">Select Depot Store</option>
                {stores.map((s) => (
                  <option key={s.id || s._id} value={s.id || s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Register Asset
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
