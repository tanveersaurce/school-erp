import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CalendarCheck,
  DollarSign,
  Lock,
  Clock,
  Briefcase,
  AlertCircle,
  FileText,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetHrDashboardKPIsQuery,
  useGetPayrollDashboardKPIsQuery,
  useGetLeaveApplicationsQuery,
  useGetPayrollPeriodsQuery,
} from '../../features/hr/hrApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const HrDashboardPage: React.FC = () => {
  const { data: hrKpiRes, isLoading: loadingHrKpi } = useGetHrDashboardKPIsQuery();
  const { data: payKpiRes, isLoading: loadingPayKpi } = useGetPayrollDashboardKPIsQuery();
  const { data: pendingLeavesRes, isLoading: loadingLeaves } = useGetLeaveApplicationsQuery({
    status: 'PENDING',
    limit: 5,
  });
  const { data: periodsRes, isLoading: loadingPeriods } = useGetPayrollPeriodsQuery();

  const hrKpis = hrKpiRes?.data;
  const payKpis = payKpiRes?.data;
  const pendingLeaves = pendingLeavesRes?.data || [];
  const recentPeriods = (periodsRes?.data || []).slice(0, 5);

  const isLoading = loadingHrKpi || loadingPayKpi || loadingLeaves || loadingPeriods;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-indigo-400" />
            HR & Payroll Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Enterprise Human Resources, Leave Accruals, Salary Structures & Immutable Payroll Cycles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/hr/payroll">
            <Button variant="primary" leftIcon={<DollarSign className="w-4 h-4" />}>
              Payroll Cycles
            </Button>
          </Link>
          <Link to="/hr/leaves">
            <Button variant="secondary" leftIcon={<CalendarCheck className="w-4 h-4" />}>
              Leave Requests
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="p-5 bg-slate-800/80 border-slate-700/60 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Employees</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">{hrKpis?.totalEmployees ?? 0}</h3>
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                    {hrKpis?.activeEmployees ?? 0} Active Staff
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-slate-800/80 border-slate-700/60 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">On Leave Today</p>
                  <h3 className="text-2xl font-extrabold text-amber-400 mt-1">{hrKpis?.onLeaveEmployees ?? 0}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {hrKpis?.pendingLeaveRequestsCount ?? (hrKpis as any)?.pendingLeaveApplications ?? 0} pending requests
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-slate-800/80 border-slate-700/60 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Net Payroll</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">
                    {Money.format(payKpis?.totalNetPayroll ?? 0, payKpis?.currency || 'USD')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Gross: {Money.format(payKpis?.totalGrossPayroll ?? 0, payKpis?.currency || 'USD')}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-slate-800/80 border-slate-700/60 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Processed Cycles</p>
                  <h3 className="text-2xl font-extrabold text-indigo-300 mt-1">
                    {payKpis?.paidEmployeesCount ?? (payKpis as any)?.processedPeriodsCount ?? 0}
                  </h3>
                  <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1 font-medium">
                    <Lock className="w-3.5 h-3.5" /> Immutable audit trail
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Nav Shortcuts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              to="/hr/employees"
              className="p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 hover:border-slate-600 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-indigo-400" />
                <span className="font-semibold text-slate-200 text-sm">Employee Directory</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </Link>

            <Link
              to="/hr/leaves"
              className="p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 hover:border-slate-600 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-slate-200 text-sm">Leave Approvals</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </Link>

            <Link
              to="/hr/salaries"
              className="p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 hover:border-slate-600 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-slate-200 text-sm">Salary Structures</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </Link>

            <Link
              to="/hr/reports"
              className="p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 hover:border-slate-600 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-sky-400" />
                <span className="font-semibold text-slate-200 text-sm">HR & Payroll Reports</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </Link>
          </div>

          {/* 2-Column Operational Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Leave Requests */}
            <Card className="p-6 bg-slate-800/60 border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Pending Leave Applications
                </h2>
                <Link to="/hr/leaves" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                  View All
                </Link>
              </div>

              {pendingLeaves.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800">
                  <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No pending leave requests.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingLeaves.map((app) => {
                    const appId = (app as any)._id || app.id;
                    return (
                      <div
                        key={appId}
                        className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-700/50 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">
                              {(app as any).employeeId?.displayName || (app as any).employeeId?.firstName || 'Employee'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300">
                              {app.totalDays} {app.totalDays === 1 ? 'Day' : 'Days'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(app.startDate).toLocaleDateString()} - {new Date(app.endDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-slate-400 italic mt-1 line-clamp-1">"{app.reason}"</p>
                        </div>
                        <Link to="/hr/leaves">
                          <Button size="sm" variant="outline">
                            Review
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Recent Payroll Cycles */}
            <Card className="p-6 bg-slate-800/60 border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  Recent Payroll Periods
                </h2>
                <Link to="/hr/payroll" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                  Manage Runs
                </Link>
              </div>

              {recentPeriods.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800">
                  <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No payroll periods configured yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPeriods.map((period) => {
                    const pid = (period as any)._id || period.id;
                    return (
                      <div
                        key={pid}
                        className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-700/50 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{period.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                period.status === 'LOCKED'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : period.status === 'PROCESSED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : period.status === 'APPROVED'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {period.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Working Days: {period.workingDays} | Disbursed:{' '}
                            {Money.format(period.totalNetPay, 'USD')}
                          </p>
                        </div>
                        <Link to={`/hr/payroll/${pid}`}>
                          <Button size="sm" variant="outline">
                            Details
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
