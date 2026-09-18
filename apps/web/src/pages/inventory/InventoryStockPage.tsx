import React, { useState } from 'react';
import {
  Boxes,
  RotateCw,
  Warehouse,
  History,
  AlertTriangle,
} from 'lucide-react';
import {
  useGetInventoryStockQuery,
  useGetInventoryStoresQuery,
  useGetInventoryStockLedgerQuery,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const InventoryStockPage: React.FC = () => {
  const [storeFilter, setStoreFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'balances' | 'ledger'>('balances');
  const [ledgerPage] = useState(1);

  const { data: storesRes } = useGetInventoryStoresQuery();
  const { data: stockRes, isLoading: isStockLoading, refetch: refetchStock } = useGetInventoryStockQuery({
    storeId: storeFilter || undefined,
  });
  const { data: ledgerRes, isLoading: isLedgerLoading, refetch: refetchLedger } = useGetInventoryStockLedgerQuery(
    {
      storeId: storeFilter || undefined,
      page: ledgerPage,
      limit: 25,
    },
    { skip: activeTab !== 'ledger' }
  );

  const stores = storesRes?.data || [];
  const stocks = stockRes?.data || [];
  const ledgerItems = ledgerRes?.data?.items || [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-sky-400" />
            Stock & Inventory Balances
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Real-time stock on hand, allocated reservations, available inventory & immutable audit trail
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => {
              refetchStock();
              if (activeTab === 'ledger') refetchLedger();
            }}
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setActiveTab('balances')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                activeTab === 'balances' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Current Balances
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                activeTab === 'ledger' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Audit Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Filter by Store */}
      <Card className="p-4 bg-slate-900/60 border-slate-800">
        <div className="flex items-center gap-3">
          <Warehouse className="w-4 h-4 text-slate-500" />
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="w-full sm:w-64 h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Stores & Depots</option>
            {stores.map((st) => (
              <option key={st.id || st._id} value={st.id || st._id}>
                {st.name} ({st.code})
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Balances Tab */}
      {activeTab === 'balances' && (
        <>
          {isStockLoading ? (
            <div className="flex justify-center p-12">
              <Spinner size="lg" />
            </div>
          ) : stocks.length === 0 ? (
            <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
              <Boxes className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-300">No stock balances found</h3>
              <p className="text-sm text-slate-500 mt-1">Receive stock through a Goods Receipt Note (GRN).</p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Item Code</th>
                    <th className="py-3.5 px-4">Item Name</th>
                    <th className="py-3.5 px-4">Store</th>
                    <th className="py-3.5 px-4 text-center">On Hand</th>
                    <th className="py-3.5 px-4 text-center">Reserved</th>
                    <th className="py-3.5 px-4 text-center">Available</th>
                    <th className="py-3.5 px-4 text-right">Avg Unit Cost</th>
                    <th className="py-3.5 px-4 text-right">Total Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {stocks.map((s) => {
                    const totalVal = ((s.averageCostMinorUnits || 0) * s.quantityOnHand) / 100;
                    const isLow = s.quantityAvailable <= (s.reorderLevel || 10);
                    return (
                      <tr key={s.id || s._id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-4 font-mono font-medium text-indigo-400">
                          {(s.itemId as any)?.itemCode || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-white">{(s.itemId as any)?.name || 'Unknown'}</span>
                          {isLow && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                              <AlertTriangle className="w-3 h-3" /> Low Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {(s.storeId as any)?.name || 'General Store'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-200">{s.quantityOnHand}</td>
                        <td className="py-3.5 px-4 text-center text-amber-400">{s.quantityReserved}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-400">{s.quantityAvailable}</td>
                        <td className="py-3.5 px-4 text-right text-slate-400">
                          ${((s.averageCostMinorUnits || 0) / 100).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-emerald-400">
                          ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Audit Ledger Tab */}
      {activeTab === 'ledger' && (
        <>
          {isLedgerLoading ? (
            <div className="flex justify-center p-12">
              <Spinner size="lg" />
            </div>
          ) : ledgerItems.length === 0 ? (
            <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
              <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-300">No ledger transactions recorded</h3>
              <p className="text-sm text-slate-500 mt-1">Movement operations will append immutable journal entries here.</p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Item</th>
                    <th className="py-3.5 px-4">Store</th>
                    <th className="py-3.5 px-4 text-center">Change</th>
                    <th className="py-3.5 px-4 text-center">Balance After</th>
                    <th className="py-3.5 px-4">Voucher Ref</th>
                    <th className="py-3.5 px-4">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {ledgerItems.map((entry) => (
                    <tr key={entry.id || entry._id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                            entry.quantity > 0
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {entry.movementType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white">
                        {(entry.itemId as any)?.name || 'Item'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {(entry.storeId as any)?.name || 'Store'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold font-mono">
                        <span className={entry.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                        {entry.balanceAfter}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-indigo-400">
                        {entry.referenceId || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 truncate max-w-xs">
                        {entry.reason || '—'}
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
