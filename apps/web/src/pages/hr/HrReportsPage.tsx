import React, { useState } from 'react';
import {
  FileText,
  Building,
  CalendarCheck,
  Filter,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetDepartmentPayrollSummaryQuery,
  useGetLeaveUtilizationReportQuery,
  useGetPayrollPeriodsQuery,
} from '../../features/hr/hrApi.js';
import { Card } from '../../components/ui/Card.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const HrReportsPage: React.FC = () => {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  const { data: periodsRes } = useGetPayrollPeriodsQuery();
  const { data: deptRes, isLoading: loadingDept } = useGetDepartmentPayrollSummaryQuery(
    selectedPeriodId || undefined
  );
  const { data: leaveRes, isLoading: loadingLeave } = useGetLeaveUtilizationReportQuery();

  const periods = Array.isArray(periodsRes?.data) ? periodsRes.data : [];
  const deptSummary = Array.isArray(deptRes?.data) ? deptRes.data : [];
  const leaveUtilization = Array.isArray(leaveRes?.data) ? leaveRes.data : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-sky-400" />
            HR & Payroll Analytics Reports
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Department-wise financial payroll allocations and organizational leave utilization metrics
          </p>
        </div>
      </div>

      {/* Report 1: Department Payroll Allocation */}
      <Card className="p-6 bg-slate-800 border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-400" />
              Department Payroll Summary
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Financial breakdown of salaries disbursed across faculty departments
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Processed Periods</option>
              {periods.map((p) => {
                const pid = p.id || (p as any)._id;
                return (
                  <option key={pid} value={pid}>
                    {p.name} ({p.status})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {loadingDept ? (
          <div className="py-12 flex justify-center">
            <Spinner size="md" />
          </div>
        ) : deptSummary.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No payroll data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Staff Count</th>
                  <th className="py-3 px-4 text-right">Total Gross Pay</th>
                  <th className="py-3 px-4 text-right">Total Deductions</th>
                  <th className="py-3 px-4 text-right">Net Disbursed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-slate-200">
                {deptSummary.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-700/20 transition">
                    <td className="py-3 px-4 font-semibold text-white">{d.departmentName}</td>
                    <td className="py-3 px-4 text-center font-bold text-indigo-400">{d.employeeCount}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      {Money.format(d.totalGross, 'USD')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-400">
                      {Money.format(d.totalDeductions, 'USD')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {Money.format(d.totalNet, 'USD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Report 2: Leave Utilization */}
      <Card className="p-6 bg-slate-800 border-slate-700 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-amber-400" />
            Leave Utilization Report
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organization-wide leave consumption analysis and pending demand
          </p>
        </div>

        {loadingLeave ? (
          <div className="py-12 flex justify-center">
            <Spinner size="md" />
          </div>
        ) : leaveUtilization.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No leave records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4 text-center">Allocated Days</th>
                  <th className="py-3 px-4 text-center">Used Days</th>
                  <th className="py-3 px-4 text-center">Pending Review</th>
                  <th className="py-3 px-4 text-center">Available Balance</th>
                  <th className="py-3 px-4 text-right">Utilization Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-slate-200">
                {leaveUtilization.map((l: any, i: number) => {
                  const allocated = l.allocated ?? l.totalAllocated ?? 0;
                  const used = l.used ?? l.totalUsed ?? 0;
                  const pending = l.pending ?? l.totalPending ?? 0;
                  const available = l.available ?? l.totalAvailable ?? 0;
                  const rate =
                    allocated > 0
                      ? Math.round((used / allocated) * 100)
                      : 0;

                  return (
                    <tr key={i} className="hover:bg-slate-700/20 transition">
                      <td className="py-3 px-4 font-semibold text-white">
                        {l.leaveTypeName || 'General Leave'}
                        {l.leaveTypeCode && (
                          <span className="ml-2 font-mono text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                            {l.leaveTypeCode}
                          </span>
                        )}
                        {l.employeeName && (
                          <span className="ml-2 text-xs text-slate-400">
                            ({l.employeeName})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">{allocated}</td>
                      <td className="py-3 px-4 text-center font-bold text-amber-400">{used}</td>
                      <td className="py-3 px-4 text-center text-slate-400">{pending}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-400">{available}</td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-400">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
