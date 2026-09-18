import React, { useState } from 'react';
import { Tag, Plus, RotateCw, FolderTree } from 'lucide-react';
import {
  useGetInventoryCategoriesQuery,
  useCreateInventoryCategoryMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Dialog } from '../../components/ui/Dialog.js';

export const InventoryCategoriesPage: React.FC = () => {
  const { data: res, isLoading, refetch } = useGetInventoryCategoriesQuery();
  const [createCategory, { isLoading: isCreating }] = useCreateInventoryCategoryMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');

  const categories = res?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    try {
      await createCategory({
        name,
        code,
        description,
        parentCategoryId: parentCategoryId || undefined,
        active: true,
      }).unwrap();

      setIsOpen(false);
      setName('');
      setCode('');
      setDescription('');
      setParentCategoryId('');
    } catch (err) {
      console.error('Failed to create category', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Tag className="w-7 h-7 text-indigo-400" />
            Inventory Categories
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Hierarchical classification for lab supplies, textbooks, IT hardware, sports gear & uniforms
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
            Add Category
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : categories.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <FolderTree className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No categories created yet</h3>
          <p className="text-sm text-slate-500 mt-1">Structure your inventory catalog by defining categories.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Category Name</th>
                <th className="py-3.5 px-4">Parent Category</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {categories.map((c) => (
                <tr key={c.id || c._id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-mono font-medium text-indigo-400">{c.code}</td>
                  <td className="py-3.5 px-4 font-medium text-white">{c.name}</td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {(c.parentCategoryId as any)?.name || '— Root Category —'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 truncate max-w-sm">{c.description || '—'}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create Category"
        description="Add a new catalog classification group."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category Code *</label>
              <Input
                required
                placeholder="e.g. SCI-LAB"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category Name *</label>
              <Input
                required
                placeholder="e.g. Science Laboratory"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Parent Category</label>
            <select
              value={parentCategoryId}
              onChange={(e) => setParentCategoryId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
            >
              <option value="">None (Top-Level Category)</option>
              {categories.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <Input
              placeholder="Optional notes or description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Create Category
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
