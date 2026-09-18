import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Layers,
  ArrowLeft,
  UserCheck,
  RotateCcw,
  Wrench,
  Trash2,
} from 'lucide-react';
import {
  useGetInventoryAssetByIdQuery,
  useGetInventoryStoresQuery,
  useAssignInventoryAssetMutation,
  useReturnInventoryAssetMutation,
  useDisposeInventoryAssetMutation,
  useLogInventoryMaintenanceMutation,
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
  AssetMaintenanceType,
  AssetDisposalReason,
  AssetDisposalMethod,
} from '@edusphere/common';

export const InventoryAssetDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: assetRes, isLoading, refetch } = useGetInventoryAssetByIdQuery(id || '');
  const { data: storesRes } = useGetInventoryStoresQuery();

  const [assignAsset, { isLoading: isAssigning }] = useAssignInventoryAssetMutation();
  const [returnAsset, { isLoading: isReturning }] = useReturnInventoryAssetMutation();
  const [disposeAsset, { isLoading: isDisposing }] = useDisposeInventoryAssetMutation();
  const [logMaintenance, { isLoading: isLoggingMaint }] = useLogInventoryMaintenanceMutation();

  // Modals State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [isDisposeModalOpen, setIsDisposeModalOpen] = useState(false);

  // Assign Form
  const [assignType, setAssignType] = useState<AssetAssignmentType>(AssetAssignmentType.EMPLOYEE);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');

  // Return Form
  const [returnCondition, setReturnCondition] = useState<AssetCondition>(AssetCondition.GOOD);
  const [returnStoreId, setReturnStoreId] = useState('');
  const [returnRemarks, setReturnRemarks] = useState('');

  // Maintenance Form
  const [maintType, setMaintType] = useState<AssetMaintenanceType>(AssetMaintenanceType.PREVENTIVE);
  const [maintDesc, setMaintDesc] = useState('');
  const [maintCost, setMaintCost] = useState(45);

  // Disposal Form
  const [disposalReason, setDisposalReason] = useState<AssetDisposalReason>(AssetDisposalReason.OBSOLETE);
  const [disposalMethod, setDisposalMethod] = useState<AssetDisposalMethod>(AssetDisposalMethod.DONATION);
  const [disposalNotes, setDisposalNotes] = useState('');

  const asset = assetRes?.data;
  const stores = storesRes?.data || [];

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Asset record not found.</p>
        <Link to="/inventory/assets" className="mt-4 inline-block">
          <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Assets
          </Button>
        </Link>
      </div>
    );
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigneeId || !id) return;
    try {
      await assignAsset({
        id,
        data: {
          assignedToType: assignType,
          assignedToId: assigneeId,
          remarks: assignRemarks || undefined,
        },
      }).unwrap();
      setIsAssignModalOpen(false);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await returnAsset({
        id,
        data: {
          conditionOnReturn: returnCondition,
          returnStoreId: returnStoreId || undefined,
          remarks: returnRemarks || undefined,
        },
      }).unwrap();
      setIsReturnModalOpen(false);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !maintDesc) return;
    try {
      await logMaintenance({
        schoolId: asset.schoolId,
        assetId: id,
        maintenanceType: maintType,
        description: maintDesc,
        costMinorUnits: Math.round(Number(maintCost) * 100),
      }).unwrap();
      setIsMaintModalOpen(false);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDispose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await disposeAsset({
        id,
        data: {
          reason: disposalReason,
          method: disposalMethod,
          notes: disposalNotes || 'Decommissioned',
        },
      }).unwrap();
      setIsDisposeModalOpen(false);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/inventory/assets">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Layers className="w-7 h-7 text-sky-400" />
              {asset.assetTag}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {(asset.itemId as any)?.name} • {asset.model || 'Standard'} • Condition: {asset.condition}
            </p>
          </div>
        </div>

        {/* Action Buttons based on Asset State */}
        <div className="flex items-center gap-2 flex-wrap">
          {asset.status === AssetStatus.AVAILABLE && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserCheck className="w-4 h-4" />}
              onClick={() => setIsAssignModalOpen(true)}
            >
              Assign Asset
            </Button>
          )}

          {asset.status === AssetStatus.ASSIGNED && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={() => setIsReturnModalOpen(true)}
            >
              Return Custody
            </Button>
          )}

          {asset.status !== AssetStatus.DISPOSED && (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Wrench className="w-4 h-4" />}
                onClick={() => setIsMaintModalOpen(true)}
              >
                Log Maintenance
              </Button>
              <Button
                variant="destructive"
                size="sm"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => setIsDisposeModalOpen(true)}
              >
                Decommission / Dispose
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <span className="text-xs uppercase text-slate-400 font-semibold block">Asset Status</span>
          <span className="text-xl font-bold text-sky-400 mt-1 block">{asset.status}</span>
        </Card>
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <span className="text-xs uppercase text-slate-400 font-semibold block">Current Condition</span>
          <span className="text-xl font-bold text-white mt-1 block">{asset.condition}</span>
        </Card>
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <span className="text-xs uppercase text-slate-400 font-semibold block">Acquisition Cost</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">
            ${((asset.purchaseCostMinorUnits || 0) / 100).toFixed(2)}
          </span>
        </Card>
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <span className="text-xs uppercase text-slate-400 font-semibold block">Assigned Custody</span>
          <span className="text-xl font-bold text-slate-200 mt-1 block truncate">
            {asset.assignedToType !== AssetAssignmentType.NONE
              ? `${asset.assignedToType}: ${asset.assignedToId || 'Active'}`
              : 'In Store Depot'}
          </span>
        </Card>
      </div>

      {/* Details & Specs */}
      <Card className="p-5 bg-slate-900/60 border-slate-800">
        <h3 className="text-sm font-semibold text-white mb-4">Hardware Specifications & Identification</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Manufacturer / Brand</span>
            <span className="font-medium text-slate-200 mt-0.5 block">{asset.manufacturer || '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Model Number</span>
            <span className="font-medium text-slate-200 mt-0.5 block">{asset.model || '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Serial Number</span>
            <span className="font-mono font-medium text-indigo-400 mt-0.5 block">
              {asset.serialNumber || '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Current Store Depot</span>
            <span className="font-medium text-slate-200 mt-0.5 block">
              {(asset.currentStoreId as any)?.name || 'Default Store'}
            </span>
          </div>
        </div>

        {asset.notes && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs">
            <span className="text-slate-500 block">Asset Notes & Audit Log:</span>
            <pre className="mt-1 font-mono text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] whitespace-pre-wrap">
              {asset.notes}
            </pre>
          </div>
        )}
      </Card>

      {/* Assign Modal */}
      <Dialog
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Asset Custody"
        description="Transfer physical custody to an employee, department, classroom, or student."
      >
        <form onSubmit={handleAssign} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Assignment Recipient Type *</label>
            <select
              value={assignType}
              onChange={(e) => setAssignType(e.target.value as AssetAssignmentType)}
              className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
            >
              <option value={AssetAssignmentType.EMPLOYEE}>Staff Member / Teacher</option>
              <option value={AssetAssignmentType.DEPARTMENT}>Department</option>
              <option value={AssetAssignmentType.CLASSROOM}>Classroom / Lab</option>
              <option value={AssetAssignmentType.STUDENT}>Student</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Assignee ID / Reference *</label>
            <Input
              required
              placeholder="e.g. Employee ID, Department ID, or Student ID"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Assignment Purpose / Remarks</label>
            <Input
              placeholder="e.g. Issued for Advanced Biology practical lab course"
              value={assignRemarks}
              onChange={(e) => setAssignRemarks(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isAssigning}>
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Return Modal */}
      <Dialog
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Return Asset to Store"
        description="Check in asset, inspect condition, and return to warehouse inventory."
      >
        <form onSubmit={handleReturn} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Condition on Return *</label>
            <select
              value={returnCondition}
              onChange={(e) => setReturnCondition(e.target.value as AssetCondition)}
              className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
            >
              <option value={AssetCondition.GOOD}>Good (No issues)</option>
              <option value={AssetCondition.FAIR}>Fair (Normal wear & tear)</option>
              <option value={AssetCondition.CRITICAL}>Critical (Requires service)</option>
              <option value={AssetCondition.DAMAGED}>Damaged</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Return To Store</label>
            <select
              value={returnStoreId}
              onChange={(e) => setReturnStoreId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
            >
              <option value="">Default Store</option>
              {stores.map((s) => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Inspection Notes</label>
            <Input
              placeholder="Condition details upon return"
              value={returnRemarks}
              onChange={(e) => setReturnRemarks(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isReturning}>
              Complete Return
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Maintenance Modal */}
      <Dialog
        isOpen={isMaintModalOpen}
        onClose={() => setIsMaintModalOpen(false)}
        title="Schedule / Log Maintenance"
        description="Register maintenance or repair service for this asset."
      >
        <form onSubmit={handleLogMaintenance} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Maintenance Type</label>
              <select
                value={maintType}
                onChange={(e) => setMaintType(e.target.value as AssetMaintenanceType)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value={AssetMaintenanceType.PREVENTIVE}>Preventive Servicing</option>
                <option value={AssetMaintenanceType.REPAIR}>Corrective Repair</option>
                <option value={AssetMaintenanceType.CALIBRATION}>Calibration</option>
                <option value={AssetMaintenanceType.INSPECTION}>Safety Inspection</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Estimated Cost ($)</label>
              <Input
                type="number"
                step="0.01"
                value={maintCost}
                onChange={(e) => setMaintCost(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Service Description *</label>
            <Input
              required
              placeholder="e.g. Lens cleaning and optical recalibration"
              value={maintDesc}
              onChange={(e) => setMaintDesc(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsMaintModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isLoggingMaint}>
              Schedule Service
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Disposal Modal */}
      <Dialog
        isOpen={isDisposeModalOpen}
        onClose={() => setIsDisposeModalOpen(false)}
        title="Decommission & Dispose Asset"
        description="Permanently retire this asset. History will be archived for audit compliance."
      >
        <form onSubmit={handleDispose} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Disposal Reason *</label>
              <select
                value={disposalReason}
                onChange={(e) => setDisposalReason(e.target.value as AssetDisposalReason)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value={AssetDisposalReason.OBSOLETE}>Obsolete / Replaced</option>
                <option value={AssetDisposalReason.BEYOND_REPAIR}>Beyond Economical Repair</option>
                <option value={AssetDisposalReason.DAMAGED}>Severely Damaged</option>
                <option value={AssetDisposalReason.LOST}>Lost / Missing</option>
                <option value={AssetDisposalReason.OTHER}>Other Reason</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Disposal Method *</label>
              <select
                value={disposalMethod}
                onChange={(e) => setDisposalMethod(e.target.value as AssetDisposalMethod)}
                className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              >
                <option value={AssetDisposalMethod.DONATION}>Educational Donation</option>
                <option value={AssetDisposalMethod.SCRAP}>Scrapped / Sold as Scrap</option>
                <option value={AssetDisposalMethod.E_WASTE}>E-Waste Recycling</option>
                <option value={AssetDisposalMethod.SALE}>Auction / Sale</option>
                <option value={AssetDisposalMethod.OTHER}>Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Disposal Justification</label>
            <Input
              placeholder="e.g. Donated to partner school lab"
              value={disposalNotes}
              onChange={(e) => setDisposalNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsDisposeModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" type="submit" isLoading={isDisposing}>
              Confirm Disposal
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
