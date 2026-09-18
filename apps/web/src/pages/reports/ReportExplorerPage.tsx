import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Play,
  Download,
  Filter,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  useGetReportDefinitionsQuery,
  useRunReportMutation,
  useCreateExportJobMutation,
} from '../../features/reports/reportsApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Input } from '../../components/ui/Input.js';
import type {
  IReportDefinition,
  IReportResult,
} from '@edusphere/types';

export const ReportExplorerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'ALL';
  const initialKey = searchParams.get('key') || '';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedReportKey, setSelectedReportKey] = useState<string>(initialKey);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // RTK Query hooks
  const { data: defsRes, isLoading: isLoadingDefs } = useGetReportDefinitionsQuery();
  const [runReport, { data: runRes, isLoading: isRunning, error: runError }] = useRunReportMutation();
  const [createExportJob, { isLoading: isExporting }] = useCreateExportJobMutation();

  const definitions: IReportDefinition[] = defsRes?.data || [];

  // Filter definitions based on category and search query
  const filteredDefs = definitions.filter((def) => {
    const key = def.reportKey || def.key || '';
    const title = def.title || def.name || '';
    const matchesCategory = selectedCategory === 'ALL' || def.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      def.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Selected report object
  const activeReport = definitions.find(
    (d) => (d.reportKey || d.key) === selectedReportKey
  );

  // Sync with URL params
  useEffect(() => {
    if (initialKey && definitions.length > 0 && !selectedReportKey) {
      setSelectedReportKey(initialKey);
    } else if (!selectedReportKey && filteredDefs.length > 0) {
      setSelectedReportKey(filteredDefs[0].reportKey || filteredDefs[0].key || '');
    }
  }, [initialKey, definitions]);

  // Reset page and filters when report changes
  useEffect(() => {
    if (activeReport) {
      const defaultFilters: Record<string, any> = {};
      const filters = activeReport.filters || activeReport.supportedFilters || [];
      filters.forEach((f) => {
        const fKey = f.key || f.name || '';
        if (f.defaultValue !== undefined && fKey) {
          defaultFilters[fKey] = f.defaultValue;
        }
      });
      setFilterValues(defaultFilters);
      setCurrentPage(1);
      setExportNotice(null);
    }
  }, [activeReport?.reportKey || activeReport?.key]);

  // Execute report
  const handleExecuteReport = (page = 1, refresh = false) => {
    const key = activeReport?.reportKey || activeReport?.key;
    if (!key) return;
    runReport({
      key,
      filters: filterValues,
      page,
      limit: pageSize,
      refreshCache: refresh,
    });
    setCurrentPage(page);
  };

  const handleFilterChange = (name: string, value: any) => {
    setFilterValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Instant CSV Download
  const handleDirectCsvDownload = () => {
    const key = activeReport?.reportKey || activeReport?.key;
    if (!key) return;
    const queryParams = new URLSearchParams();
    queryParams.set('format', 'CSV');
    Object.entries(filterValues).forEach(([k, v]) => {
      if (v !== undefined && v !== '') {
        queryParams.set(k, String(v));
      }
    });

    const exportUrl = `/api/v1/reports/export/${key}?${queryParams.toString()}`;
    const link = document.createElement('a');
    link.href = exportUrl;
    link.setAttribute('download', `${key}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportNotice('Direct CSV export initiated.');
  };

  // Asynchronous Background Export Job
  const handleQueueExportJob = async () => {
    const key = activeReport?.reportKey || activeReport?.key;
    if (!key) return;
    try {
      await createExportJob({
        reportKey: key,
        format: 'CSV',
        filters: filterValues,
      }).unwrap();
      setExportNotice('Export job queued successfully! Check Export Jobs page to monitor progress.');
      setTimeout(() => setExportNotice(null), 6000);
    } catch (err: any) {
      setExportNotice(err?.data?.message || 'Failed to queue export job.');
    }
  };

  const resultData: IReportResult | undefined = runRes?.data;
  const resultRows: any[] = resultData?.data || resultData?.items || [];
  const totalCount = resultData?.total ?? resultData?.totalCount ?? 0;
  const totalPages = resultData?.pageCount ?? resultData?.totalPages ?? Math.ceil(totalCount / pageSize);

  const categories = [
    'ALL',
    'ACADEMIC',
    'STUDENT',
    'ATTENDANCE',
    'EXAMINATION',
    'FINANCE',
    'HR',
    'PAYROLL',
    'LIBRARY',
    'TRANSPORT',
    'HOSTEL',
    'INVENTORY',
    'COMMUNICATION',
    'SYSTEM',
    'CUSTOM',
  ];

  const activeFilters = activeReport?.filters || activeReport?.supportedFilters || [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7 text-indigo-400" />
            Report Explorer
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Interactive analytical report generator with parameterized filtering, data preview, and CSV streaming.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/reports')}
            className="text-slate-300"
          >
            Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/reports/scheduled')}
            className="flex items-center gap-1.5 text-indigo-300 border-indigo-500/30 hover:bg-indigo-950/30"
          >
            <Clock className="h-4 w-4" />
            Schedules
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/reports/exports')}
            className="flex items-center gap-1.5 text-emerald-300 border-emerald-500/30 hover:bg-emerald-950/30"
          >
            <Layers className="h-4 w-4" />
            Export Jobs
          </Button>
        </div>
      </div>

      {exportNotice && (
        <div className="rounded-lg border border-indigo-500/40 bg-indigo-950/40 p-3 text-sm text-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>{exportNotice}</span>
          </div>
          <button
            onClick={() => setExportNotice(null)}
            className="text-xs text-indigo-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Catalog & Definition Selector */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSearchParams({ category: e.target.value });
                }}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>

            {/* Reports List */}
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Available Reports ({filteredDefs.length})
              </label>

              {isLoadingDefs ? (
                <div className="py-8 text-center">
                  <Spinner size="md" />
                </div>
              ) : filteredDefs.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No reports found matching selection.
                </p>
              ) : (
                filteredDefs.map((def) => {
                  const key = def.reportKey || def.key || '';
                  const title = def.title || def.name;
                  const isSelected = key === selectedReportKey;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedReportKey(key);
                        setSearchParams({ category: selectedCategory, key });
                      }}
                      className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors block ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-medium shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="font-semibold">{title}</div>
                      <div className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {def.description}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Parameters & Execution Output */}
        <div className="lg:col-span-3 space-y-6">
          {activeReport ? (
            <>
              {/* Report Header Card & Filter Panel */}
              <Card className="p-6 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-indigo-950/80 border border-indigo-700/50 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                        {activeReport.category}
                      </span>
                      <h2 className="text-xl font-bold text-white">{activeReport.title || activeReport.name}</h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{activeReport.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExecuteReport(1, true)}
                      disabled={isRunning}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                      Bypass Cache
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleExecuteReport(1, false)}
                      disabled={isRunning}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Run Report
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDirectCsvDownload}
                      className="text-xs text-emerald-400 border-emerald-600/40 hover:bg-emerald-950/30 flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export CSV
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleQueueExportJob}
                      disabled={isExporting}
                      className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Queue Batch
                    </Button>
                  </div>
                </div>

                {/* Filter Controls */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5" />
                    Query Filters & Parameters
                  </h3>

                  {activeFilters.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      This report runs across all institutional records without required parameters.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {activeFilters.map((filter) => {
                        const filterKey = filter.key || filter.name || '';
                        const val = filterValues[filterKey] ?? '';
                        return (
                          <div key={filterKey} className="space-y-1.5">
                            <label className="block text-xs font-medium text-slate-300">
                              {filter.label}
                              {filter.required && <span className="text-rose-400 ml-1">*</span>}
                            </label>

                            {filter.type === 'SELECT' ? (
                              <select
                                value={String(val)}
                                onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                              >
                                <option value="">All</option>
                                {filter.options?.map((opt) => (
                                  <option key={String(opt.value)} value={String(opt.value)}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : filter.type === 'DATE' ? (
                              <input
                                type="date"
                                value={val}
                                onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                              />
                            ) : filter.type === 'NUMBER' ? (
                              <input
                                type="number"
                                value={val}
                                onChange={(e) => handleFilterChange(filterKey, Number(e.target.value))}
                                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                              />
                            ) : (
                              <input
                                type="text"
                                placeholder={`Enter ${filter.label.toLowerCase()}...`}
                                value={val}
                                onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>

              {/* Execution Results Data Table */}
              <Card className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">Results Preview</h3>
                    {resultData && (
                      <span className="text-xs text-slate-400">
                        ({totalCount.toLocaleString()} total rows)
                      </span>
                    )}
                  </div>

                  {resultData && (
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {resultData.cached && (
                        <span className="rounded bg-indigo-950/70 text-indigo-300 px-2 py-0.5 font-medium border border-indigo-800/40">
                          Cached Result
                        </span>
                      )}
                      <span>Execution: {resultData.executionTimeMs || resultData.executionDurationMs || 0}ms</span>
                    </div>
                  )}
                </div>

                {isRunning ? (
                  <div className="py-16 text-center space-y-3">
                    <Spinner size="lg" />
                    <p className="text-xs text-slate-400">Executing server-side pipeline query...</p>
                  </div>
                ) : runError ? (
                  <div className="py-10 text-center space-y-2 text-rose-400">
                    <AlertCircle className="h-8 w-8 mx-auto" />
                    <p className="text-sm font-semibold">Failed to execute report</p>
                    <p className="text-xs text-slate-400">
                      {(runError as any)?.data?.message || 'An error occurred during report generation.'}
                    </p>
                  </div>
                ) : !resultData ? (
                  <div className="py-16 text-center text-slate-500 space-y-2">
                    <Sparkles className="h-8 w-8 mx-auto text-slate-600" />
                    <p className="text-sm font-medium">Ready to query</p>
                    <p className="text-xs text-slate-500">
                      Configure parameters above and click "Run Report" to generate analytics data.
                    </p>
                  </div>
                ) : resultRows.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    No data records matched the selected query parameters.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-800/80 text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
                          <tr>
                            {activeReport.columns?.map((col: any) => (
                              <th key={col.key || col.id} className="px-4 py-3 border-b border-slate-700">
                                {col.header || col.name || col.title}
                              </th>
                            )) || (
                              Object.keys(resultRows[0] || {}).map((k) => (
                                <th key={k} className="px-4 py-3 border-b border-slate-700">
                                  {k}
                                </th>
                              ))
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {resultRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                              {activeReport.columns?.map((col: any) => {
                                const key = col.key || col.id;
                                const val = row[key];
                                const type = col.type || col.format;

                                let displayVal = val !== undefined && val !== null ? String(val) : '—';
                                if (type === 'CURRENCY' && typeof val === 'number') {
                                  displayVal = `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                } else if (type === 'PERCENTAGE' && typeof val === 'number') {
                                  displayVal = `${val.toFixed(1)}%`;
                                } else if (type === 'DATE' && val) {
                                  displayVal = new Date(val).toLocaleDateString();
                                }

                                return (
                                  <td key={key} className="px-4 py-3 whitespace-nowrap">
                                    {type === 'STATUS' ? (
                                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                        {displayVal}
                                      </span>
                                    ) : (
                                      displayVal
                                    )}
                                  </td>
                                );
                              }) || (
                                Object.values(row).map((v: any, cIdx) => (
                                  <td key={cIdx} className="px-4 py-3 whitespace-nowrap">
                                    {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '—')}
                                  </td>
                                ))
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                      <div className="text-slate-400">
                        Page <span className="font-semibold text-white">{currentPage}</span> of{' '}
                        <span className="font-semibold text-white">{Math.max(1, totalPages)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage <= 1 || isRunning}
                          onClick={() => handleExecuteReport(currentPage - 1)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Previous
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages || isRunning}
                          onClick={() => handleExecuteReport(currentPage + 1)}
                          className="flex items-center gap-1 text-xs"
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center text-slate-500">
              Select a report from the catalog on the left to begin exploration.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
