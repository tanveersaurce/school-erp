import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Lock,
  Play,
  Clock,
  Plus,
  FileText,
  ArrowLeft,
  Briefcase,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetPayrollPeriodByIdQuery,
  useGetPayrollItemsQuery,
  useCalculatePayrollMutation,
  useReviewPayrollPeriodMutation,
  useApprovePayrollPeriodMutation,
  useProcessPayrollPeriodMutation,
  useLockPayrollPeriodMutation,
  useAddPayrollAdjustmentMutation,
  useRecordOvertimeMutation,
} from '../../features/hr/hrApi.js';
import { useGetEmployeesQuery } from '../../features/employee/employeeApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const PayrollDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const periodId = id || '';

  // Modals state
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjEmpId, setAdjEmpId] = useState('');
  const [adjType, setAdjType] = useState('BONUS');
  const [adjAmount, setAdjAmount] = useState(100);
  const [adjReason, setAdjReason] = useState('');

  const [showOtModal, setShowOtModal] = useState(false);
  const [otEmpId, setOtEmpId] = useState('');
  const [otHours, setOtHours] = useState(2);
  const [otRate, setOtRate] = useState(25);
  const [otDate, setOtDate] = useState(new Date().toISOString().substring(0, 10));

  // Queries
  const {
    data: periodRes,
    isLoading: loadingPeriod,
    refetch: refetchPeriod,
  } = useGetPayrollPeriodByIdQuery(periodId, { skip: !periodId });

  const {
    data: itemsRes,
    isLoading: loadingItems,
    refetch: refetchItems,
  } = useGetPayrollItemsQuery(periodId, { skip: !periodId });

  const { data: employeesRes } = useGetEmployeesQuery();

  // Mutations
  const [calcPayroll, { isLoading: calculating }] = useCalculatePayrollMutation();
  const [reviewPeriod, { isLoading: reviewing }] = useReviewPayrollPeriodMutation();
  const [approvePeriod, { isLoading: approving }] = useApprovePayrollPeriodMutation();
  const [processPeriod, { isLoading: processing }] = useProcessPayrollPeriodMutation();
  const [lockPeriod, { isLoading: locking }] = useLockPayrollPeriodMutation();
  const [addAdjustment, { isLoading: addingAdj }] = useAddPayrollAdjustmentMutation();
  const [recordOt, { isLoading: recordingOt }] = useRecordOvertimeMutation();

  const period = periodRes?.data;
  const items = itemsRes?.data || [];
  const employees = employeesRes?.data || [];

  const handleCalculate = async () => {
    try {
      await calcPayroll({ payrollPeriodId: periodId }).unwrap();
      refetchPeriod();
      refetchItems();
      alert('Payroll calculated successfully!');
    } catch (err: any) {
      alert(err?.data?.message || 'Calculation failed.');
    }
  };

  const handleReview = async () => {
    try {
      await reviewPeriod(periodId).unwrap();
      refetchPeriod();
      alert('Period submitted for review.');
    } catch (err: any) {
      alert(err?.data?.message || 'Action failed.');
    }
  };

  const handleApprove = async () => {
    try {
      await approvePeriod(periodId).unwrap();
      refetchPeriod();
      alert('Payroll period approved.');
    } catch (err: any) {
      alert(err?.data?.message || 'Approval failed.');
    }
  };

  const handleProcess = async () => {
    try {
      await processPeriod({ id: periodId, data: { paymentMethod: 'BANK_TRANSFER' } }).unwrap();
      refetchPeriod();
      alert('Payroll processed successfully.');
    } catch (err: any) {
      alert(err?.data?.message || 'Processing failed.');
    }
  };

  const handleLock = async () => {
    if (!confirm('Warning: Locking this period is irreversible. All records will become permanently sealed. Proceed?')) {
      return;
    }
    try {
      await lockPeriod(periodId).unwrap();
      refetchPeriod();
      alert('Payroll period permanently locked.');
    } catch (err: any) {
      alert(err?.data?.message || 'Locking failed.');
    }
  };

  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAdjustment({
        payrollPeriodId: periodId,
        employeeId: adjEmpId,
        type: adjType,
        amount: Money.toMinorUnits(adjAmount),
        reason: adjReason,
      }).unwrap();
      setShowAdjModal(false);
      setAdjReason('');
      refetchPeriod();
      alert('Adjustment added. Please re-run calculation to reflect changes.');
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to add adjustment.');
    }
  };

  const handleRecordOvertime = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await recordOt({
        employeeId: otEmpId,
        date: new Date(otDate).toISOString(),
        hours: Number(otHours),
        hourlyRate: Money.toMinorUnits(otRate),
        reason: 'Staff Overtime',
      }).unwrap();
      setShowOtModal(false);
      alert('Overtime recorded. Once approved, it will be included in the payroll run.');
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to record overtime.');
    }
  };

  if (loadingPeriod) {
    return (
      <div className="py-24 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!period) {
    return (
      <div className="py-12 text-center text-slate-400">
        <p>Payroll period not found.</p>
        <Link to="/hr/payroll" className="text-indigo-400 text-sm mt-2 inline-block">
          &larr; Return to Payroll Cycles
        </Link>
      </div>
    );
  }

  const isLocked = period.status === 'LOCKED';

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation & Header */}
      <div>
        <Link
          to="/hr/payroll"
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Payroll Cycles
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{period.name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                  isLocked
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : period.status === 'PROCESSED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {period.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Working Days: {period.workingDays} &bull; Window:{' '}
              {new Date(period.periodStart).toLocaleDateString()} to{' '}
              {new Date(period.periodEnd).toLocaleDateString()}
            </p>
          </div>

          {/* Workflow Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!isLocked && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Play className="w-3.5 h-3.5" />}
                  isLoading={calculating}
                  onClick={handleCalculate}
                >
                  Calculate Run
                </Button>

                {period.status === 'CALCULATED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={reviewing}
                    onClick={handleReview}
                  >
                    Submit for Review
                  </Button>
                )}

                {period.status === 'UNDER_REVIEW' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={approving}
                    onClick={handleApprove}
                  >
                    Approve Payroll
                  </Button>
                )}

                {period.status === 'APPROVED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={processing}
                    onClick={handleProcess}
                  >
                    Process Disbursement
                  </Button>
                )}

                {period.status === 'PROCESSED' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    leftIcon={<Lock className="w-3.5 h-3.5" />}
                    isLoading={locking}
                    onClick={handleLock}
                  >
                    Lock Period Permanently
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setShowAdjModal(true)}
                >
                  Add Adjustment
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Clock className="w-3.5 h-3.5" />}
                  onClick={() => setShowOtModal(true)}
                >
                  Record Overtime
                </Button>
              </>
            )}

            {isLocked && (
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Lock className="w-4 h-4" /> This period is permanently locked and immutable
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-800/80 border-slate-700">
          <p className="text-xs text-slate-400 uppercase font-semibold">Employees Included</p>
          <p className="text-2xl font-extrabold text-white mt-1">{period.totalEmployees || 0}</p>
        </Card>
        <Card className="p-4 bg-slate-800/80 border-slate-700">
          <p className="text-xs text-slate-400 uppercase font-semibold">Total Gross Payroll</p>
          <p className="text-2xl font-extrabold text-white mt-1">
            {Money.format(period.totalGrossPay || 0, 'USD')}
          </p>
        </Card>
        <Card className="p-4 bg-slate-800/80 border-slate-700">
          <p className="text-xs text-slate-400 uppercase font-semibold">Total Deductions</p>
          <p className="text-2xl font-extrabold text-rose-400 mt-1">
            {Money.format(period.totalDeductions || 0, 'USD')}
          </p>
        </Card>
        <Card className="p-4 bg-slate-800/80 border-slate-700">
          <p className="text-xs text-slate-400 uppercase font-semibold">Net Disbursed Pay</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">
            {Money.format(period.totalNetPay || 0, 'USD')}
          </p>
        </Card>
      </div>

      {/* Itemized Employees Payroll Table */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <h2 className="text-base font-bold text-white mb-4">Itemized Employee Disbursements</h2>

        {loadingItems ? (
          <div className="py-12 flex justify-center">
            <Spinner size="md" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p>No payroll items calculated yet.</p>
            {!isLocked && (
              <Button size="sm" variant="primary" className="mt-3" onClick={handleCalculate}>
                Calculate Payroll
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Paid / Working Days</th>
                  <th className="py-3 px-4">Gross Pay</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Net Pay</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-slate-200">
                {items.map((item) => {
                  const itemId = (item as any)._id || item.id;
                  return (
                    <tr key={itemId} className="hover:bg-slate-700/20 transition">
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">{item.employeeCode}</td>
                      <td className="py-3 px-4 font-semibold">{item.employeeName}</td>
                      <td className="py-3 px-4 text-xs text-slate-300">
                        {item.paidDays} / {item.workingDays}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200">
                        {Money.format(item.grossEarnings, item.currency || 'USD')}
                      </td>
                      <td className="py-3 px-4 text-rose-400">
                        {Money.format(item.totalDeductions, item.currency || 'USD')}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400">
                        {Money.format(item.netPay, item.currency || 'USD')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-700 text-slate-300">
                          {item.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/hr/payslips/${itemId}`}>
                          <Button size="sm" variant="outline" leftIcon={<FileText className="w-3 h-3" />}>
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL: Add Adjustment */}
      {showAdjModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Add Payroll Adjustment</h3>
            <form onSubmit={handleAddAdjustment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Employee</label>
                <select
                  required
                  value={adjEmpId}
                  onChange={(e) => setAdjEmpId(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp: any) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.employeeId} - {emp.displayName || `${emp.firstName} ${emp.lastName}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Type</label>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="BONUS">BONUS</option>
                  <option value="INCENTIVE">INCENTIVE</option>
                  <option value="ARREARS">ARREARS</option>
                  <option value="REIMBURSEMENT">REIMBURSEMENT</option>
                  <option value="DEDUCTION">DEDUCTION</option>
                  <option value="FINE">FINE</option>
                  <option value="ADVANCE_RECOVERY">ADVANCE_RECOVERY</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Amount ($)</label>
                <Input
                  type="number"
                  required
                  min={0}
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Reason</label>
                <Input
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Performance Bonus Q3"
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={() => setShowAdjModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={addingAdj}>
                  Submit Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record Overtime */}
      {showOtModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Record Overtime</h3>
            <form onSubmit={handleRecordOvertime} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Employee</label>
                <select
                  required
                  value={otEmpId}
                  onChange={(e) => setOtEmpId(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp: any) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.employeeId} - {emp.displayName || `${emp.firstName} ${emp.lastName}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Hours</label>
                  <Input
                    type="number"
                    step="0.5"
                    required
                    min={0.5}
                    value={otHours}
                    onChange={(e) => setOtHours(Number(e.target.value))}
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Hourly Rate ($)</label>
                  <Input
                    type="number"
                    required
                    min={1}
                    value={otRate}
                    onChange={(e) => setOtRate(Number(e.target.value))}
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Date</label>
                <Input
                  type="date"
                  required
                  value={otDate}
                  onChange={(e) => setOtDate(e.target.value)}
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={() => setShowOtModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={recordingOt}>
                  Record Overtime
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
