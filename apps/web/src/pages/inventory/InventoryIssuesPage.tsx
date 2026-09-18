import React, { useState } from 'react';
import {
  ArrowUpRight,
  Plus,
  RotateCw,
  Warehouse,
  AlertTriangle,
} from 'lucide-react';
import {
  useGetInventoryIssuesQuery,
  useGetInventoryStoresQuery,
  useGetInventoryItemsQuery,
  useCreateInventoryIssueMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { StockIssueDestinationType } from '@edusphere/common';

export const InventoryIssuesPage: React.FC = () => {
  const [storeFilter, setStoreFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [storeId, setStoreId] = useState('');
  const [destinationType, setDestinationType] = useState<StockIssueDestinationType>(
    StockIssueDestinationType.DEPARTMENT
  );
  const [destinationId, setDestinationId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState(1);

  const { data: storesRes } = useGetInventoryStoresQuery();
  const { data: itemsRes } = useGetInventoryItemsQuery({ limit: 100 });
  const { data: issuesRes, isLoading, refetch } = useGetInventoryIssuesQuery({
    storeId: storeFilter || undefined,
    page,
    limit: 20,
  });

  const [createIssue, { isLoading: isCreating }] = useCreateInventoryIssueMutation();

  const stores = storesRes?.data || [];
  const items = itemsRes?.data?.items || [];
  const issues = issuesRes?.data?.items || [];

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!storeId || !destinationId || !itemId || quantity <= 0) return;

    try {
      const selectedStore = stores.find((s) => (s.id || s._id) === storeId);
      await createIssue({
        schoolId: selectedStore?.schoolId,
        storeId,
        destinationType,
        destinationId,
        purpose: purpose || undefined,
        items: [{ itemId, quantity: Number(quantity) }],
      }).unwrap();

      setIsOpen(false);
      setPurpose('');
      setDestinationId('');
    } catch (err: any) {
      console.error('Failed to issue stock', err);
      setErrorMessage(err?.data?.message || 'Failed to issue stock. Verify available balance.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ArrowUpRight className="w-7 h-7 text-indigo-400" />
            Stock Issues (Outward Depletion)
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Allocate consumable supplies to departments, teachers, classrooms, students, and maintenance
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
            Issue Stock
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
            className="w-full sm:w-64 h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Issuing Stores</option>
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
      ) : issues.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <ArrowUpRight className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No stock issues recorded</h3>
          <p className="text-sm text-slate-500 mt-1">Issue stock to departments and classrooms as needed.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Issue Voucher</th>
                <th className="py-3.5 px-4">Store</th>
                <th className="py-3.5 px-4">Destination Type</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-center">Items Issued</th>
                <th className="py-3.5 px-4">Purpose / Remarks</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {issues.map((iss) => {
                const totalQty = (iss.items || []).reduce((s, i) => s + i.quantity, 0);
                return (
                  <tr key={iss.id || iss._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-indigo-400">
                      {iss.issueNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      {(iss.storeId as any)?.name || 'Store'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">
                        {iss.destinationType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(iss.issueDate || iss.createdAt || '').toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-white">
                      {totalQty} units
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 truncate max-w-xs">
                      {iss.purpose || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {iss.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Issue Stock Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setErrorMessage('');
        }}
        title="Issue Consumable Stock"
        description="Allocate inventory to a department, teacher, student, or lab."
      >
        <form onSubmit={handleCreateIssue} className="space-y-4 text-left">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Source Store *</label>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Type *</label>
              <select
                value={destinationType}
                onChange={(e) => setDestinationType(e.target.value as StockIssueDestinationType)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value={StockIssueDestinationType.DEPARTMENT}>Department</option>
                <option value={StockIssueDestinationType.EMPLOYEE}>Staff Member</option>
                <option value={StockIssueDestinationType.CLASSROOM}>Classroom / Lab</option>
                <option value={StockIssueDestinationType.STUDENT}>Student</option>
                <option value={StockIssueDestinationType.OTHER}>Maintenance / Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Recipient ID / Name *</label>
              <Input
                required
                placeholder="Target entity reference"
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
              />
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Item Allocation</h4>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Quantity *</label>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Purpose / Justification</label>
            <Input
              placeholder="e.g. Practical Exam Supplies for Grade 12 Chemistry"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Confirm Stock Issue
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
