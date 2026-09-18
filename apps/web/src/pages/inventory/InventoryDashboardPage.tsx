import React from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ClipboardCheck,
  AlertTriangle,
  RotateCw,
  Warehouse,
  FileSpreadsheet,
  Coins,
} from 'lucide-react';
import { useGetInventoryDashboardKPIsQuery } from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const InventoryDashboardPage: React.FC = () => {
  const { data: res, isLoading, refetch } = useGetInventoryDashboardKPIsQuery();
  const kpis = res?.data;

  const formatCurrency = (minorUnits: number) => {
    return (minorUnits / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Boxes className="w-8 h-8 text-emerald-400" />
            Inventory & Asset Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Consumable Stock, Durable Asset Tracking, Multi-Store Logistics, Physical Stocktakes & Valuation
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/inventory/receipts">
            <Button variant="primary" leftIcon={<ArrowDownLeft className="w-4 h-4" />}>
              Receive Stock
            </Button>
          </Link>
          <Link to="/inventory/issues">
            <Button variant="secondary" leftIcon={<ArrowUpRight className="w-4 h-4" />}>
              Issue Stock
            </Button>
          </Link>
          <Link to="/inventory/assets">
            <Button variant="secondary" leftIcon={<Layers className="w-4 h-4" />}>
              Durable Assets
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => refetch()} title="Refresh Data">
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Core Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Valuation */}
            <Card className="bg-slate-900/60 border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Stock Valuation</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    {formatCurrency(kpis?.totalStockValuationMinorUnits ?? 0)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Weighted average cost</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                  <Coins className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </Card>

            {/* Catalog Items */}
            <Card className="bg-slate-900/60 border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Catalog Items</p>
                  <p className="text-2xl font-bold text-white mt-1">{kpis?.totalItems ?? 0}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-emerald-400">{kpis?.activeItems ?? 0} Active</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">{kpis?.totalStockQuantity ?? 0} Units in Stock</span>
                  </div>
                </div>
                <div className="p-3 bg-indigo-500/10 rounded-xl">
                  <Package className="w-6 h-6 text-indigo-400" />
                </div>
              </div>
            </Card>

            {/* Durable Assets */}
            <Card className="bg-slate-900/60 border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Durable Assets</p>
                  <p className="text-2xl font-bold text-white mt-1">{kpis?.totalAssets ?? 0}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-sky-400">{kpis?.assignedAssets ?? 0} Assigned</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-emerald-400">{kpis?.availableAssets ?? 0} Available</span>
                  </div>
                </div>
                <div className="p-3 bg-sky-500/10 rounded-xl">
                  <Layers className="w-6 h-6 text-sky-400" />
                </div>
              </div>
            </Card>

            {/* Alerts & Critical Stock */}
            <Card className="bg-slate-900/60 border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stock Alerts</p>
                  <p className="text-2xl font-bold text-amber-400 mt-1">
                    {(kpis?.lowStockItemsCount ?? 0) + (kpis?.outOfStockItemsCount ?? 0)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-rose-400">{kpis?.outOfStockItemsCount ?? 0} Depleted</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-400">{kpis?.lowStockItemsCount ?? 0} Low Stock</span>
                  </div>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Navigation Cards */}
          <h2 className="text-lg font-semibold text-white mt-6">Inventory Operations & Workflows</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/inventory/items" className="block group">
              <Card className="p-5 bg-slate-900/40 border-slate-800 hover:border-slate-700 transition group-hover:bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition">Item Master Catalog</h3>
                    <p className="text-xs text-slate-400 mt-0.5">SKUs, categories, measurement units & reorder thresholds</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/inventory/stores" className="block group">
              <Card className="p-5 bg-slate-900/40 border-slate-800 hover:border-slate-700 transition group-hover:bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <Warehouse className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition">Stores & Warehouses</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Multi-campus store network and storage location hierarchy</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/inventory/stock" className="block group">
              <Card className="p-5 bg-slate-900/40 border-slate-800 hover:border-slate-700 transition group-hover:bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-500/10 rounded-lg text-sky-400">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-sky-400 transition">Current Stock & Batches</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Real-time balances, reserved allocations & lot tracking</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/inventory/transfers" className="block group">
              <Card className="p-5 bg-slate-900/40 border-slate-800 hover:border-slate-700 transition group-hover:bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-400">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-purple-400 transition">Stock Transfers</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Inter-store dispatch, transit custody & receiving confirmation</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/inventory/stocktakes" className="block group">
              <Card className="p-5 bg-slate-900/40 border-slate-800 hover:border-slate-700 transition group-hover:bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-amber-400 transition">Physical Stocktakes</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Periodic cycle counting, variance audits & ledger reconciliation</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/inventory/reports" className="block group">
              <Card className="p-5 bg-slate-900/40 border-slate-800 hover:border-slate-700 transition group-hover:bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-teal-500/10 rounded-lg text-teal-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-teal-400 transition">Valuation & Audit Reports</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Weighted average balance sheet, asset depreciation & lot expiry</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};
