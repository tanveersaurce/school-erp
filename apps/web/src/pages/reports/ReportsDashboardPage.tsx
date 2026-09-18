import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  RotateCcw,
  FileSpreadsheet,
  Clock,
  ArrowUpRight,
  Filter,
  Users,
  GraduationCap,
  DollarSign,
  Briefcase,
  BookOpen,
  PieChart as PieIcon,
  Layers,
} from 'lucide-react';
import { useGetDashboardOverviewQuery } from '../../features/reports/reportsApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import type { IDashboardKPI, IDashboardWidget } from '@edusphere/types';

export const ReportsDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const { data: res, isLoading, isFetching, refetch } = useGetDashboardOverviewQuery();
  const overview = res?.data;

  const rawKpis = overview?.kpis;
  const kpiList: IDashboardKPI[] = Array.isArray(rawKpis)
    ? (rawKpis as unknown as IDashboardKPI[])
    : rawKpis && typeof rawKpis === 'object'
    ? (Object.values(rawKpis).filter((item: any) => item && typeof item === 'object' && 'id' in item) as unknown as IDashboardKPI[])
    : [];

  const filteredKpis = selectedCategory === 'ALL'
    ? kpiList
    : kpiList.filter((k) => k.category === selectedCategory);

  const widgets: IDashboardWidget[] = (overview?.widgets || []) as IDashboardWidget[];
  const filteredWidgets = selectedCategory === 'ALL'
    ? widgets
    : widgets.filter((w) => w.category === selectedCategory);

  const getKpiIcon = (id: string) => {
    switch (id) {
      case 'totalStudents':
      case 'students':
        return GraduationCap;
      case 'attendanceRate':
      case 'attendance':
        return Users;
      case 'feeCollection':
      case 'fees':
      case 'revenue':
        return DollarSign;
      case 'staffCount':
      case 'staff':
        return Briefcase;
      case 'libraryLoans':
      case 'library':
        return BookOpen;
      default:
        return BarChart3;
    }
  };

  const categories = ['ALL', 'ACADEMIC', 'STUDENT', 'ATTENDANCE', 'FINANCE', 'HR', 'LIBRARY'];

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-indigo-400" />
            Executive Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time institutional business intelligence, cross-module KPI metrics, and operational performance trends.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2"
          >
            <RotateCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/reports/scheduled')}
            className="flex items-center gap-2 text-indigo-300 border-indigo-500/30 hover:bg-indigo-950/30"
          >
            <Clock className="h-4 w-4" />
            Schedules
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/reports/exports')}
            className="flex items-center gap-2 text-emerald-300 border-emerald-500/30 hover:bg-emerald-950/30"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Jobs
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate('/reports/explorer')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500"
          >
            <ArrowUpRight className="h-4 w-4" />
            Report Explorer
          </Button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        <Filter className="h-4 w-4 text-slate-400 ml-1 mr-2" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {filteredKpis.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-500">
            No KPI metrics found for category: {selectedCategory}
          </div>
        ) : (
          filteredKpis.map((kpi) => {
            const Icon = getKpiIcon(kpi.id);
            const trendUpper = (kpi.trend || kpi.changeDirection || '').toUpperCase();
            return (
              <Card key={kpi.id} className="p-5 border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {kpi.label || kpi.title || kpi.id}
                  </span>
                  <div className="rounded-lg bg-indigo-950/60 p-2 text-indigo-400 border border-indigo-800/40">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                  </h3>
                  {kpi.unit && (
                    <span className="text-xs font-medium text-slate-400">{kpi.unit}</span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    {trendUpper === 'UP' && (
                      <span className="flex items-center text-emerald-400">
                        <TrendingUp className="h-3.5 w-3.5 mr-0.5" />
                        {kpi.changePercentage !== undefined ? `+${kpi.changePercentage}%` : 'Rising'}
                      </span>
                    )}
                    {trendUpper === 'DOWN' && (
                      <span className="flex items-center text-rose-400">
                        <TrendingDown className="h-3.5 w-3.5 mr-0.5" />
                        {kpi.changePercentage !== undefined ? `${kpi.changePercentage}%` : 'Falling'}
                      </span>
                    )}
                    {(!trendUpper || trendUpper === 'NEUTRAL') && (
                      <span className="flex items-center text-slate-400">
                        <Minus className="h-3.5 w-3.5 mr-0.5" />
                        Stable
                      </span>
                    )}
                  </div>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                    {kpi.category}
                  </span>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Widgets & Trend Analysis */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            Operational Trend Widgets
          </h2>
          <span className="text-xs text-slate-400">
            {filteredWidgets.length} active analytics cards
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredWidgets.length === 0 ? (
            <Card className="col-span-full p-8 text-center text-slate-500">
              No trend widgets available for category: {selectedCategory}
            </Card>
          ) : (
            filteredWidgets.map((widget) => {
              const widgetType = String(widget.type);
              const widgetData = widget.data as any;
              return (
                <Card key={widget.id} className="p-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="font-semibold text-white text-base">{widget.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{widget.category} • {widgetType}</p>
                    </div>
                    <div className="rounded-lg bg-slate-800 p-2 text-slate-400">
                      {widgetType.includes('PIE') ? (
                        <PieIcon className="h-4 w-4" />
                      ) : (
                        <BarChart3 className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {/* Render widget content based on type */}
                  <div className="mt-4 min-h-[220px] flex flex-col justify-center">
                    {widgetType.includes('BAR') && Array.isArray(widgetData) && (
                      <div className="space-y-3">
                        {widgetData.map((item: any, idx: number) => {
                          const label = item.label || item.name || item._id || `Item ${idx + 1}`;
                          const value = item.value ?? item.count ?? item.amount ?? 0;
                          const maxVal = Math.max(...widgetData.map((d: any) => d.value ?? d.count ?? d.amount ?? 1));
                          const pct = Math.min(100, Math.round((Number(value) / (maxVal || 1)) * 100));

                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-medium">
                                <span className="text-slate-300">{label}</span>
                                <span className="text-slate-400">{typeof value === 'number' ? value.toLocaleString() : value}</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {widgetType.includes('PIE') && Array.isArray(widgetData) && (
                      <div className="grid grid-cols-2 gap-3">
                        {widgetData.map((item: any, idx: number) => {
                          const label = item.label || item.name || item._id || `Segment ${idx + 1}`;
                          const value = item.value ?? item.count ?? 0;
                          return (
                            <div key={idx} className="rounded-lg bg-slate-800/60 p-3 border border-slate-700/50">
                              <p className="text-xs text-slate-400 font-medium">{label}</p>
                              <p className="text-lg font-bold text-white mt-1">
                                {typeof value === 'number' ? value.toLocaleString() : value}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!widgetType.includes('BAR') && !widgetType.includes('PIE') && (
                      <div className="rounded-lg bg-slate-800/40 p-4 font-mono text-xs text-slate-300 overflow-auto max-h-48">
                        <pre>{JSON.stringify(widgetData, null, 2)}</pre>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/reports/explorer?category=${widget.category}`)}
                      className="text-xs text-indigo-400 border-indigo-500/30 hover:bg-indigo-950/30"
                    >
                      Explore Details &rarr;
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
