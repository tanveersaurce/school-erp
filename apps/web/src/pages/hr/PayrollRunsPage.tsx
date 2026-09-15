import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Plus,
  Calendar,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetPayrollPeriodsQuery,
  useCreatePayrollPeriodMutation,
} from '../../features/hr/hrApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const PayrollRunsPage: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workingDays, setWorkingDays] = useState(22);

  const { data: periodsRes, isLoading, refetch } = useGetPayrollPeriodsQuery();
  const [createPeriod, { isLoading: creating }] = useCreatePayrollPeriodMutation();

  const periods = periodsRes?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPeriod({
        name,
        month: Number(month),
        year: Number(year),
        periodStart: new Date(startDate).toISOString(),
        periodEnd: new Date(endDate).toISOString(),
        workingDays: Number(workingDays),
      }).unwrap();
      setShowCreateModal(false);
      setName('');
      refetch();
      alert('Payroll cycle created successfully.');
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create payroll period.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            Payroll Processing Cycles
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Deterministic salary run calculations, multi-step review workflows, and immutable payroll locking
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          New Payroll Cycle
        </Button>
      </div>

      {/* Cycles Grid */}
      {isLoading ? (
        <div className="py-24 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : periods.length === 0 ? (
        <Card className="p-12 text-center bg-slate-800 border-slate-700">
          <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-300">No Payroll Periods Found</h3>
          <p className="text-slate-500 text-sm mt-1 mb-4">
            Initialize your first monthly payroll cycle to compute gross pay, attendance deductions, and net disbursements.
          </p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            Create Period
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {periods.map((period) => {
            const periodId = (period as any)._id || period.id;
            return (
              <Card
                key={periodId}
                className="p-5 bg-slate-800 border-slate-700 hover:border-slate-600 transition space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white text-lg">{period.name}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                        period.status === 'LOCKED'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : period.status === 'PROCESSED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : period.status === 'APPROVED'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {period.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(period.periodStart).toLocaleDateString()} - {new Date(period.periodEnd).toLocaleDateString()}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-700/60 text-xs">
                    <div>
                      <span className="text-slate-400 block">Working Days</span>
                      <span className="font-bold text-white text-sm">{period.workingDays}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Employees</span>
                      <span className="font-bold text-white text-sm">{period.totalEmployees || 0}</span>
                    </div>
                    <div className="col-span-2 pt-1">
                      <span className="text-slate-400 block">Total Net Disbursement</span>
                      <span className="font-extrabold text-emerald-400 text-base">
                        {Money.format(period.totalNetPay || 0, 'USD')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
                  {period.status === 'LOCKED' && (
                    <span className="text-[11px] text-purple-400 font-semibold flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Immutable
                    </span>
                  )}
                  <div className="ml-auto">
                    <Link to={`/hr/payroll/${periodId}`}>
                      <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Open Cycle
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL: Create Period */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create Payroll Period</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Period Name</label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. October 2026 Regular"
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Month (1-12)</label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Year</label>
                  <Input
                    type="number"
                    required
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Start Date</label>
                  <Input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">End Date</label>
                  <Input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Working Days</label>
                <Input
                  type="number"
                  required
                  min={1}
                  max={31}
                  value={workingDays}
                  onChange={(e) => setWorkingDays(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={creating}>
                  Create Period
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
