import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RotateCw,
  ShieldAlert,
  Coins,
  FileText,
} from 'lucide-react';
import {
  useGetInventorySettingsQuery,
  useUpdateInventorySettingsMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { InventoryValuationMethod } from '@edusphere/common';

export const InventorySettingsPage: React.FC = () => {
  const { data: res, isLoading, refetch } = useGetInventorySettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateInventorySettingsMutation();

  const [valuationMethod, setValuationMethod] = useState<InventoryValuationMethod>(
    InventoryValuationMethod.WEIGHTED_AVERAGE
  );
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [enforceExpiryOnIssue, setEnforceExpiryOnIssue] = useState(true);
  const [nearExpiryThresholdDays, setNearExpiryThresholdDays] = useState(30);
  const [assetTagPrefix, setAssetTagPrefix] = useState('AST');
  const [receiptPrefix, setReceiptPrefix] = useState('RCV');
  const [issuePrefix, setIssuePrefix] = useState('ISS');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (res?.data) {
      const s = res.data;
      if (s.defaultValuationMethod) setValuationMethod(s.defaultValuationMethod);
      if (s.allowNegativeStock !== undefined) setAllowNegativeStock(s.allowNegativeStock);
      if (s.enforceExpiryOnIssue !== undefined) setEnforceExpiryOnIssue(s.enforceExpiryOnIssue);
      if (s.nearExpiryThresholdDays) setNearExpiryThresholdDays(s.nearExpiryThresholdDays);
      if (s.assetTagPrefix) setAssetTagPrefix(s.assetTagPrefix);
      if (s.receiptNumberPrefix) setReceiptPrefix(s.receiptNumberPrefix);
      if (s.issueNumberPrefix) setIssuePrefix(s.issueNumberPrefix);
    }
  }, [res]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    try {
      await updateSettings({
        schoolId: res?.data?.schoolId || '',
        defaultValuationMethod: valuationMethod,
        allowNegativeStock,
        enforceExpiryOnIssue,
        nearExpiryThresholdDays: Number(nearExpiryThresholdDays),
        assetTagPrefix,
        receiptNumberPrefix: receiptPrefix,
        issueNumberPrefix: issuePrefix,
      }).unwrap();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings', err);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-indigo-400" />
            Inventory & Asset Configuration
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Financial valuation rules, negative stock safety constraints, lot expiration guardrails, and voucher prefixing
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {saveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-semibold">
              Configuration settings saved successfully.
            </div>
          )}

          {/* Valuation & Accounting Policy */}
          <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              Accounting & Valuation Rules
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default Inventory Valuation Method
              </label>
              <select
                value={valuationMethod}
                onChange={(e) => setValuationMethod(e.target.value as InventoryValuationMethod)}
                className="w-full sm:w-80 h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value={InventoryValuationMethod.WEIGHTED_AVERAGE}>Weighted Average Cost (AVCO)</option>
                <option value={InventoryValuationMethod.FIFO}>First-In, First-Out (FIFO)</option>
                <option value={InventoryValuationMethod.STANDARD_COST}>Standard Fixed Cost</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                AVCO continuously recalculates unit cost upon each Goods Inward Receipt (GRN).
              </p>
            </div>
          </Card>

          {/* Negative Stock & Quality Control Policies */}
          <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Operational Guardrails & Quality Controls
            </h3>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowNegativeStock}
                  onChange={(e) => setAllowNegativeStock(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-600"
                />
                <div>
                  <span className="text-sm font-medium text-white block">Allow Negative Stock Balances</span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Recommended: Disabled. When disabled, issue transactions strictly abort if requested quantity exceeds on-hand stock.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enforceExpiryOnIssue}
                  onChange={(e) => setEnforceExpiryOnIssue(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-600"
                />
                <div>
                  <span className="text-sm font-medium text-white block">Block Issue of Expired Reagents / Lots</span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Prevents allocating expired lab chemicals or perishable supplies to students and staff.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Near-Expiry Alert Threshold (Days)
              </label>
              <Input
                type="number"
                min="1"
                max="365"
                value={nearExpiryThresholdDays}
                onChange={(e) => setNearExpiryThresholdDays(Number(e.target.value))}
                className="w-32"
              />
            </div>
          </Card>

          {/* Voucher Prefixing */}
          <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              Voucher & Serial Tag Prefixing
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Tag Prefix</label>
                <Input
                  value={assetTagPrefix}
                  onChange={(e) => setAssetTagPrefix(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Receipt GRN Prefix</label>
                <Input
                  value={receiptPrefix}
                  onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Voucher Prefix</label>
                <Input
                  value={issuePrefix}
                  onChange={(e) => setIssuePrefix(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button variant="primary" type="submit" isLoading={isUpdating} leftIcon={<Save className="w-4 h-4" />}>
              Save Changes
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
