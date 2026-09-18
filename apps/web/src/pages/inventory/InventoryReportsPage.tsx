import React, { useState } from 'react';
import {
  FileSpreadsheet,
  RotateCw,
  Coins,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  useGetInventoryValuationReportQuery,
  useGetInventoryAssetAuditReportQuery,
  useGetInventoryLowStockReportQuery,
  useGetInventoryExpiringStockReportQuery,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const InventoryReportsPage: React.FC = () => {
  const [reportTab, setReportTab] = useState<'valuation' | 'assets' | 'lowstock' | 'expiring'>('valuation');

  const { data: valRes, isLoading: isValLoading, refetch: refetchVal } = useGetInventoryValuationReportQuery();
  const { data: astRes, refetch: refetchAst } = useGetInventoryAssetAuditReportQuery();
  const { data: lowRes, isLoading: isLowLoading, refetch: refetchLow } = useGetInventoryLowStockReportQuery();
  const { data: expRes, isLoading: isExpLoading, refetch: refetchExp } = useGetInventoryExpiringStockReportQuery();

  const valuationData = valRes?.data;
  const assetData = astRes?.data;
  const lowStockItems = lowRes?.data?.items || [];
  const expiringBatches = expRes?.data?.batches || [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-teal-400" />
            Inventory Analytics & Audit Reports
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Financial stock valuation, asset depreciation audits, critical reorder levels, and expiration monitoring
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => {
              refetchVal();
              refetchAst();
              refetchLow();
              refetchExp();
            }}
            title="Refresh All"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setReportTab('valuation')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                reportTab === 'valuation' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Stock Valuation
            </button>
            <button
              onClick={() => setReportTab('assets')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                reportTab === 'assets' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Asset Audit
            </button>
            <button
              onClick={() => setReportTab('lowstock')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                reportTab === 'lowstock' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Low Stock Alerts
            </button>
            <button
              onClick={() => setReportTab('expiring')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                reportTab === 'expiring' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Expiring Batches
            </button>
          </div>
        </div>
      </div>

      {/* Valuation Report */}
      {reportTab === 'valuation' && (
        <div className="space-y-4">
          <Card className="p-6 bg-slate-900/60 border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Grand Total Valuation</p>
              <p className="text-3xl font-extrabold text-emerald-400 mt-1">
                ${(((valuationData?.grandTotalMinorUnits ?? 0) / 100)).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Valuation method: {valuationData?.valuationMethod || 'Weighted Average Cost'}
              </p>
            </div>
            <div className="p-4 bg-emerald-500/10 rounded-2xl">
              <Coins className="w-8 h-8 text-emerald-400" />
            </div>
          </Card>

          {isValLoading ? (
            <Spinner size="lg" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Store / Warehouse Depot</th>
                    <th className="py-3.5 px-4 text-center">SKU Lines</th>
                    <th className="py-3.5 px-4 text-right">Store Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {(valuationData?.stores || []).map((st: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-medium text-white">{st.storeName}</td>
                      <td className="py-3.5 px-4 text-center">{st.totalItems}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-400">
                        ${((st.totalValuationMinorUnits || 0) / 100).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Asset Audit Report */}
      {reportTab === 'assets' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-6 bg-slate-900/60 border-slate-800">
              <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Total Durable Assets</p>
              <p className="text-3xl font-bold text-white mt-1">{assetData?.totalAssetsCount ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1">Serialized fixed assets recorded in system</p>
            </Card>
            <Card className="p-6 bg-slate-900/60 border-slate-800">
              <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Total Acquisition Cost</p>
              <p className="text-3xl font-bold text-sky-400 mt-1">
                ${(((assetData?.totalAcquisitionCostMinorUnits ?? 0) / 100)).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-slate-500 mt-1">Original purchase cost before depreciation</p>
            </Card>
          </div>

          <Card className="p-5 bg-slate-900/60 border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-3">Asset Status Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(assetData?.byStatus || {}).map(([st, count]) => (
                <div key={st} className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-500 block uppercase">{st}</span>
                  <span className="text-xl font-bold text-slate-200 mt-0.5 block">{count as number}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Low Stock Alerts */}
      {reportTab === 'lowstock' && (
        <>
          {isLowLoading ? (
            <Spinner size="lg" />
          ) : lowStockItems.length === 0 ? (
            <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
              <AlertTriangle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-300">All inventory levels healthy</h3>
              <p className="text-sm text-slate-500 mt-1">No items have fallen below their reorder threshold.</p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Item Code</th>
                    <th className="py-3.5 px-4">Item Name</th>
                    <th className="py-3.5 px-4">Store</th>
                    <th className="py-3.5 px-4 text-center">Available Stock</th>
                    <th className="py-3.5 px-4 text-center">Reorder Threshold</th>
                    <th className="py-3.5 px-4 text-center">Deficit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {lowStockItems.map((item: any) => (
                    <tr key={item.id || item._id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-medium text-amber-400">
                        {item.itemCode || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white">{item.name}</td>
                      <td className="py-3.5 px-4 text-slate-400">{item.storeName || 'Central Store'}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-rose-400">{item.quantityAvailable}</td>
                      <td className="py-3.5 px-4 text-center text-slate-300">{item.reorderLevel}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-400">
                        -{Math.max(0, item.reorderLevel - item.quantityAvailable)} units
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Expiring Batches */}
      {reportTab === 'expiring' && (
        <>
          {isExpLoading ? (
            <Spinner size="lg" />
          ) : expiringBatches.length === 0 ? (
            <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
              <Clock className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-300">No near-expiry lots</h3>
              <p className="text-sm text-slate-500 mt-1">All chemical reagents and perishable supplies are within valid shelf life.</p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Batch Number</th>
                    <th className="py-3.5 px-4">Item Name</th>
                    <th className="py-3.5 px-4">Store</th>
                    <th className="py-3.5 px-4 text-center">Remaining Quantity</th>
                    <th className="py-3.5 px-4">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {expiringBatches.map((b: any) => (
                    <tr key={b.id || b._id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-medium text-indigo-400">{b.batchNumber}</td>
                      <td className="py-3.5 px-4 font-medium text-white">{b.itemName}</td>
                      <td className="py-3.5 px-4 text-slate-400">{b.storeName}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-400">{b.quantityOnHand}</td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-rose-400">
                        {new Date(b.expiryDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
