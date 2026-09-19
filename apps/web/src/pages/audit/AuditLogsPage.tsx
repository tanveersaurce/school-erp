import React, { useState } from 'react';
import {
  Shield,
  Filter,
  RefreshCw,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import { useGetAuditLogsQuery, useGetAuditLogByIdQuery } from '../../features/audit/auditApi.js';
import { AuditActorType, AuditStatus, IAuditLog } from '@edusphere/types';

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [status, setStatus] = useState<AuditStatus | ''>('');
  const [actorType, setActorType] = useState<AuditActorType | ''>('');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const queryParams = {
    page,
    limit,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    entity: entity || undefined,
    action: action || undefined,
    status: (status as AuditStatus) || undefined,
    actorType: (actorType as AuditActorType) || undefined,
  };

  const { data, isLoading, isFetching, refetch } = useGetAuditLogsQuery(queryParams);
  const { data: detailData, isFetching: isDetailFetching } = useGetAuditLogByIdQuery(
    selectedLogId || '',
    { skip: !selectedLogId }
  );

  const logs = data?.data?.logs || [];
  const pagination = data?.data?.pagination;
  const selectedLog: IAuditLog | undefined = detailData?.data;

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setEntity('');
    setAction('');
    setStatus('');
    setActorType('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Audit Trail &amp; Compliance Ledger
                <span className="text-xs font-mono font-normal uppercase bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded">
                  Append-Only
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Tamper-evident operational record of system activities, mutations, and user events
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action Filter */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Action</label>
            <input
              type="text"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. UPDATE, ENROLL"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Entity Filter */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Entity</label>
            <input
              type="text"
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. STUDENT, EXAM"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as AuditStatus | '');
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILURE">FAILURE</option>
            </select>
          </div>

          {/* Actor Type Filter */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Actor Type</label>
            <select
              value={actorType}
              onChange={(e) => {
                setActorType(e.target.value as AuditActorType | '');
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Actors</option>
              <option value="USER">USER</option>
              <option value="SYSTEM">SYSTEM</option>
              <option value="WORKER">WORKER</option>
              <option value="API">API</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {(action || entity || status || actorType || dateFrom || dateTo) && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition underline underline-offset-2"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading audit trail logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Database className="h-8 w-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-sm font-sans font-medium text-slate-300">No audit logs found</p>
                    <p className="text-xs font-sans text-slate-500 mt-1">Try adjusting your filter criteria</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isSelected = log.id === selectedLogId;
                  const dateStr = new Date(log.createdAt).toLocaleString();
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-indigo-950/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-slate-500 shrink-0" />
                          <span>{dateStr}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-sans">
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-800 border border-slate-700 text-slate-300">
                            {log.actorType}
                          </span>
                          <span className="text-slate-300 truncate max-w-[120px]" title={log.userId || 'System'}>
                            {log.userId ? log.userId.slice(-6) : 'SYSTEM'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                        {log.entity}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono">
                        {log.entityId}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-sans text-[11px]">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            SUCCESS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-sans text-[11px]">
                            <XCircle className="h-3 w-3 shrink-0" />
                            FAILURE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                        {log.ipAddress || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right font-sans">
                        <button
                          type="button"
                          onClick={() => setSelectedLogId(log.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-700 hover:border-indigo-500 transition text-xs"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Diff</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page <span className="font-semibold text-slate-200">{pagination.page}</span> of{' '}
              <span className="font-semibold text-slate-200">{pagination.totalPages}</span> ({pagination.totalRecords} total entries)
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Show:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={!pagination.hasPrevPage}
                  className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 text-slate-200"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNextPage}
                  className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 text-slate-200"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail & Diff Drawer Modal */}
      {selectedLogId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-end p-0"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setSelectedLogId(null)}
          />

          {/* Drawer Content */}
          <div className="relative z-50 h-full w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-400" />
                <h3 className="font-semibold text-base text-white">
                  Audit Log Details &amp; Change Diff
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogId(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
              {isDetailFetching ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  Loading record details...
                </div>
              ) : selectedLog ? (
                <>
                  {/* Summary Card */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-500 block text-[11px]">EVENT ID</span>
                        <span className="text-slate-200">{selectedLog.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">ACTION</span>
                        <span className="text-indigo-300 font-semibold">{selectedLog.action}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">TARGET ENTITY</span>
                        <span className="text-slate-200">
                          {selectedLog.entity} ({selectedLog.entityId})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">STATUS</span>
                        <span
                          className={
                            selectedLog.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'
                          }
                        >
                          {selectedLog.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">ACTOR TYPE / USER</span>
                        <span className="text-slate-200">
                          {selectedLog.actorType} {selectedLog.userId ? `(${selectedLog.userId})` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">TIMESTAMP</span>
                        <span className="text-slate-200">
                          {new Date(selectedLog.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {(selectedLog.requestId || selectedLog.correlationId || selectedLog.ipAddress) && (
                      <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                        {selectedLog.ipAddress && (
                          <div>
                            <span className="text-slate-500">IP: </span>
                            <span className="text-slate-400">{selectedLog.ipAddress}</span>
                          </div>
                        )}
                        {selectedLog.requestId && (
                          <div>
                            <span className="text-slate-500">Request: </span>
                            <span className="text-slate-400">{selectedLog.requestId}</span>
                          </div>
                        )}
                        {selectedLog.correlationId && (
                          <div>
                            <span className="text-slate-500">Correlation: </span>
                            <span className="text-slate-400">{selectedLog.correlationId}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Changes Diff Table */}
                  <div>
                    <h4 className="font-semibold text-sm text-slate-200 mb-2 font-sans flex items-center gap-1.5">
                      <span>Field Changes</span>
                      {selectedLog.changes && (
                        <span className="text-xs font-mono font-normal text-slate-400">
                          ({selectedLog.changes.length})
                        </span>
                      )}
                    </h4>

                    {selectedLog.changes && selectedLog.changes.length > 0 ? (
                      <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 font-mono">
                        {selectedLog.changes.map((change, idx) => (
                          <div key={idx} className="p-3 bg-slate-950/40">
                            <div className="font-semibold text-indigo-300 text-xs mb-2">
                              {change.field}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2 rounded bg-rose-950/20 border border-rose-900/40 text-rose-300 break-all">
                                <span className="text-rose-500 block font-sans text-[10px] uppercase font-bold mb-0.5">
                                  Before
                                </span>
                                {change.oldValue !== undefined && change.oldValue !== null
                                  ? JSON.stringify(change.oldValue, null, 2)
                                  : 'null'}
                              </div>
                              <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 break-all">
                                <span className="text-emerald-500 block font-sans text-[10px] uppercase font-bold mb-0.5">
                                  After
                                </span>
                                {change.newValue !== undefined && change.newValue !== null
                                  ? JSON.stringify(change.newValue, null, 2)
                                  : 'null'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-center text-slate-500 font-sans">
                        No field-level diff recorded for this event.
                      </div>
                    )}
                  </div>

                  {/* Raw Metadata Viewer */}
                  {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-slate-200 mb-2 font-sans">
                        Event Metadata
                      </h4>
                      <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto text-[11px] font-mono">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* User Agent */}
                  {selectedLog.userAgent && (
                    <div className="text-[11px] text-slate-500 font-mono break-all pt-2 border-t border-slate-800">
                      User-Agent: {selectedLog.userAgent}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
