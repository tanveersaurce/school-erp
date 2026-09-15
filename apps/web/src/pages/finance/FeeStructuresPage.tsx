import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Copy,
  Tag,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';
import { Money, FeeFrequency, FeeCategoryType, LateFeeType } from '@edusphere/common';
import type { IFeeHead } from '@edusphere/types';
import {
  useGetFeeCategoriesQuery,
  useCreateFeeCategoryMutation,
  useGetFeeStructuresQuery,
  useCreateFeeStructureMutation,
  useCloneFeeStructureMutation,
} from '../../features/finance/financeApi.js';
import { useToast } from '../../components/common/Toast.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const FeeStructuresPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'structures' | 'categories'>('structures');

  // Query categories and structures
  const { data: categoriesRes, isLoading: loadingCategories } = useGetFeeCategoriesQuery();
  const { data: structuresRes, isLoading: loadingStructures } = useGetFeeStructuresQuery();

  const [createCategory, { isLoading: creatingCategory }] = useCreateFeeCategoryMutation();
  const [createStructure, { isLoading: creatingStructure }] = useCreateFeeStructureMutation();
  const [cloneStructure, { isLoading: cloningStructure }] = useCloneFeeStructureMutation();

  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);

  // Category Form
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catType, setCatType] = useState<FeeCategoryType>(FeeCategoryType.TUITION);
  const [catDescription, setCatDescription] = useState('');

  // Structure Form
  const [strTitle, setStrTitle] = useState('');
  const [strFrequency, setStrFrequency] = useState<FeeFrequency>(FeeFrequency.MONTHLY);
  const [feeHeads, setFeeHeads] = useState<
    Array<{ feeCategoryId: string; name: string; amount: number; isOptional: boolean; frequency: FeeFrequency }>
  >([
    { feeCategoryId: '', name: 'Tuition Fee', amount: 500, isOptional: false, frequency: FeeFrequency.MONTHLY },
  ]);
  const [lateFeeType, setLateFeeType] = useState<LateFeeType>(LateFeeType.FLAT);
  const [lateFeeEnabled, setLateFeeEnabled] = useState(false);
  const [gracePeriodDays, setGracePeriodDays] = useState(7);
  const [lateFeeAmount, setLateFeeAmount] = useState(10);

  // Clone Form
  const [targetYearId, setTargetYearId] = useState('');

  const categories = categoriesRes?.data || [];
  const structures = structuresRes?.data || [];
  const currency = 'USD';

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !catCode.trim()) {
      showToast('Name and code are required', 'error');
      return;
    }
    try {
      await createCategory({
        name: catName.trim(),
        code: catCode.trim().toUpperCase(),
        type: catType,
        description: catDescription.trim(),
        isActive: true,
      }).unwrap();
      showToast('Fee category created successfully', 'success');
      setShowCategoryModal(false);
      setCatName('');
      setCatCode('');
      setCatDescription('');
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to create fee category', 'error');
    }
  };

  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strTitle.trim() || feeHeads.length === 0) {
      showToast('Structure title and at least one fee head are required', 'error');
      return;
    }

    try {
      const formattedHeads: IFeeHead[] = feeHeads.map((h) => ({
        feeCategoryId: h.feeCategoryId || categories[0]?.id || 'cat_default',
        name: h.name,
        amount: Money.toMinorUnits(Number(h.amount) || 0),
        isOptional: h.isOptional,
        frequency: h.frequency || strFrequency,
      }));

      await createStructure({
        title: strTitle.trim(),
        academicYearId: 'ay_current',
        classId: 'class_all',
        heads: formattedHeads,
        lateFeePolicy: {
          enabled: lateFeeEnabled,
          lateFeeType,
          gracePeriodDays: Number(gracePeriodDays) || 0,
          amount: Money.toMinorUnits(Number(lateFeeAmount) || 0),
        },
        isActive: true,
      }).unwrap();

      showToast('Fee structure created successfully', 'success');
      setShowStructureModal(false);
      setStrTitle('');
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to create fee structure', 'error');
    }
  };

  const handleCloneStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStructureId || !targetYearId.trim()) {
      showToast('Target academic year is required', 'error');
      return;
    }
    try {
      await cloneStructure({
        id: selectedStructureId,
        targetAcademicYearId: targetYearId.trim(),
      }).unwrap();
      showToast('Fee structure cloned successfully to new academic year', 'success');
      setShowCloneModal(false);
      setSelectedStructureId(null);
      setTargetYearId('');
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to clone fee structure', 'error');
    }
  };

  const addFeeHeadRow = () => {
    setFeeHeads([
      ...feeHeads,
      { feeCategoryId: categories[0]?.id || '', name: '', amount: 100, isOptional: false, frequency: strFrequency },
    ]);
  };

  const removeFeeHeadRow = (index: number) => {
    if (feeHeads.length <= 1) return;
    setFeeHeads(feeHeads.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Configuration & Structures</h1>
          <p className="text-sm text-gray-500 mt-1">
            Standardize fee categories, tuition schedules, frequency schedules, and late fee policies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'structures' ? (
            <button
              onClick={() => setShowStructureModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Fee Structure
            </button>
          ) : (
            <button
              onClick={() => setShowCategoryModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Fee Category
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('structures')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'structures'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            Fee Structures ({structures.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'categories'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Tag className="w-4 h-4" />
            Fee Categories ({categories.length})
          </button>
        </nav>
      </div>

      {/* TAB 1: STRUCTURES */}
      {activeTab === 'structures' && (
        <div className="space-y-4">
          {loadingStructures ? (
            <div className="p-8 flex justify-center">
              <Spinner />
            </div>
          ) : structures.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
              <Layers className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-base font-medium text-gray-900">No fee structures configured</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Define your academic term fee structures and line item heads to start billing.
              </p>
              <button
                onClick={() => setShowStructureModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Structure
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {structures.map((str) => (
                <div
                  key={str.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{str.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {str.code && (
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {str.code}
                          </span>
                        )}
                        {str.isActive ? (
                          <span className="inline-flex items-center text-xs text-emerald-600">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-gray-400">
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Inactive
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500 block">Total Base Fee</span>
                      <span className="text-xl font-bold text-gray-900">
                        {Money.formatMoney(str.totalAmount, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Fee Heads */}
                  <div className="border-t border-b border-gray-100 py-3 space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Fee Heads ({str.heads?.length || 0})
                    </p>
                    {str.heads?.map((head: IFeeHead, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
                        <span>
                          {head.name}{' '}
                          {head.isOptional && (
                            <span className="text-gray-400 font-normal">(Optional)</span>
                          )}
                        </span>
                        <span className="font-mono font-medium">
                          {Money.formatMoney(head.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Late Fee & Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-gray-500">
                      Late Policy:{' '}
                      <span className="font-medium text-gray-700">
                        {str.lateFeePolicy?.enabled ? str.lateFeePolicy.lateFeeType : 'NONE'}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStructureId(str.id);
                        setShowCloneModal(true);
                      }}
                      className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Clone to Next Year
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Master Fee Categories</h2>
          </div>

          {loadingCategories ? (
            <div className="p-8 flex justify-center">
              <Spinner />
            </div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No categories defined. Click "Add Fee Category" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                  <tr>
                    <th className="px-6 py-3">Category Name</th>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{cat.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-indigo-600">{cat.code}</td>
                      <td className="px-6 py-4 text-xs font-medium">{cat.type}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">{cat.description || '—'}</td>
                      <td className="px-6 py-4 text-xs">
                        {cat.isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">Create Fee Category</h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Tuition Fee"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category Code *
                </label>
                <input
                  type="text"
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value)}
                  placeholder="e.g. TUITION"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase font-mono focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category Type
                </label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as FeeCategoryType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {Object.values(FeeCategoryType).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder="Description of this fee category..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCategory}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creatingCategory ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE STRUCTURE MODAL */}
      {showStructureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">Create Fee Structure</h3>
              <button
                onClick={() => setShowStructureModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateStructure} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Structure Title *
                  </label>
                  <input
                    type="text"
                    value={strTitle}
                    onChange={(e) => setStrTitle(e.target.value)}
                    placeholder="e.g. Standard High School Termly 2026"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Billing Frequency
                  </label>
                  <select
                    value={strFrequency}
                    onChange={(e) => setStrFrequency(e.target.value as FeeFrequency)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {Object.values(FeeFrequency).map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Fee Heads */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700">
                    Fee Heads (Breakdown)
                  </label>
                  <button
                    type="button"
                    onClick={addFeeHeadRow}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    + Add Head
                  </button>
                </div>
                {feeHeads.map((head, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Head Name"
                      value={head.name}
                      onChange={(e) => {
                        const newHeads = [...feeHeads];
                        newHeads[idx].name = e.target.value;
                        setFeeHeads(newHeads);
                      }}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      required
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Amount"
                      value={head.amount}
                      onChange={(e) => {
                        const newHeads = [...feeHeads];
                        newHeads[idx].amount = Number(e.target.value);
                        setFeeHeads(newHeads);
                      }}
                      className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      required
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={head.isOptional}
                        onChange={(e) => {
                          const newHeads = [...feeHeads];
                          newHeads[idx].isOptional = e.target.checked;
                          setFeeHeads(newHeads);
                        }}
                      />
                      Optional
                    </label>
                    {feeHeads.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFeeHeadRow(idx)}
                        className="text-gray-400 hover:text-rose-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Late Fee Policy */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Late Fee Policy
                  </h4>
                  <label className="flex items-center gap-1.5 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={lateFeeEnabled}
                      onChange={(e) => setLateFeeEnabled(e.target.checked)}
                    />
                    Enable Late Fee
                  </label>
                </div>
                {lateFeeEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Policy Type</label>
                      <select
                        value={lateFeeType}
                        onChange={(e) => setLateFeeType(e.target.value as LateFeeType)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
                      >
                        {Object.values(LateFeeType).map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Grace Period (Days)</label>
                      <input
                        type="number"
                        min="0"
                        value={gracePeriodDays}
                        onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Amount ($ / Rate)</label>
                      <input
                        type="number"
                        min="0"
                        value={lateFeeAmount}
                        onChange={(e) => setLateFeeAmount(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStructureModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingStructure}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creatingStructure ? 'Saving...' : 'Save Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLONE STRUCTURE MODAL */}
      {showCloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">Clone Fee Structure</h3>
              <button
                onClick={() => setShowCloneModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCloneStructure} className="space-y-4">
              <p className="text-xs text-gray-500">
                Clone all fee heads, late fee rules, and frequency config to a target academic year cycle.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Target Academic Year ID *
                </label>
                <input
                  type="text"
                  value={targetYearId}
                  onChange={(e) => setTargetYearId(e.target.value)}
                  placeholder="e.g. ay_2027_2028"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloneModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cloningStructure}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {cloningStructure ? 'Cloning...' : 'Clone Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
