import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Plus,
  Play,
  Trash2,
  Edit2,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Mail,
  FileSpreadsheet,
} from 'lucide-react';
import {
  useListScheduledReportsQuery,
  useGetReportDefinitionsQuery,
  useCreateScheduledReportMutation,
  useUpdateScheduledReportMutation,
  useDeleteScheduledReportMutation,
  useTriggerScheduledReportMutation,
} from '../../features/reports/reportsApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { Input } from '../../components/ui/Input.js';
import type { IScheduledReport, IReportDefinition } from '@edusphere/types';

export const ScheduledReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formReportKey, setFormReportKey] = useState<string>('');
  const [formFrequency, setFormFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'TERM'>('WEEKLY');
  const [formFormat, setFormFormat] = useState<'CSV' | 'JSON'>('CSV');
  const [formRecipients, setFormRecipients] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Queries & Mutations
  const { data: listRes, isLoading, isFetching, refetch } = useListScheduledReportsQuery();
  const { data: defsRes } = useGetReportDefinitionsQuery();
  const [createReport, { isLoading: isCreating }] = useCreateScheduledReportMutation();
  const [updateReport, { isLoading: isUpdating }] = useUpdateScheduledReportMutation();
  const [deleteReport, { isLoading: isDeleting }] = useDeleteScheduledReportMutation();
  const [triggerReport, { isLoading: isTriggering }] = useTriggerScheduledReportMutation();

  const schedules: IScheduledReport[] = listRes?.data || [];
  const definitions: IReportDefinition[] = defsRes?.data || [];

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormName('');
    setFormDescription('');
    const firstKey = definitions[0]?.reportKey || definitions[0]?.key || '';
    setFormReportKey(firstKey);
    setFormFrequency('WEEKLY');
    setFormFormat('CSV');
    setFormRecipients('');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (schedule: IScheduledReport) => {
    const id = schedule.id || schedule._id || '';
    setEditingId(id);
    setFormName(schedule.name);
    setFormDescription(schedule.description || '');
    setFormReportKey(schedule.reportKey);
    setFormFrequency(schedule.frequency as any);
    setFormFormat((schedule.format as any) || 'CSV');
    setFormRecipients(schedule.recipients?.join(', ') || '');
    setFormIsActive(schedule.isActive ?? true);
    setIsModalOpen(true);
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formReportKey) return;

    const recipientsList = formRecipients
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    try {
      if (editingId) {
        await updateReport({
          id: editingId,
          data: {
            name: formName,
            description: formDescription,
            reportKey: formReportKey,
            frequency: formFrequency,
            format: formFormat,
            recipients: recipientsList,
            isActive: formIsActive,
          },
        }).unwrap();
        setMessage({ type: 'success', text: 'Schedule updated successfully.' });
      } else {
        await createReport({
          name: formName,
          description: formDescription,
          reportKey: formReportKey,
          frequency: formFrequency,
          format: formFormat,
          recipients: recipientsList,
          isActive: formIsActive,
        }).unwrap();
        setMessage({ type: 'success', text: 'New schedule created successfully.' });
      }
      setIsModalOpen(false);
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.message || 'Failed to save scheduled report.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this scheduled report?')) return;
    try {
      await deleteReport(id).unwrap();
      setMessage({ type: 'success', text: 'Schedule deleted.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.message || 'Failed to delete schedule.' });
    }
  };

  const handleTriggerNow = async (id: string) => {
    try {
      await triggerReport(id).unwrap();
      setMessage({ type: 'success', text: 'Report execution triggered! Dispatched to export jobs queue.' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.data?.message || 'Failed to trigger schedule execution.' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Clock className="h-7 w-7 text-indigo-400" />
            Scheduled Reports
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Configure automated recurring reports with automated multi-channel email delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5"
          >
            <RotateCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/reports/exports')}
            className="flex items-center gap-1.5 text-emerald-300 border-emerald-500/30 hover:bg-emerald-950/30"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Jobs
          </Button>

          <Button
            variant="primary"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            New Schedule
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg border p-3 text-sm flex items-center justify-between ${
            message.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
              : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Schedules Table */}
      <Card className="p-6">
        {schedules.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Clock className="h-10 w-10 mx-auto text-slate-600" />
            <p className="text-base font-semibold text-slate-300">No scheduled reports yet</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Automate weekly attendance summaries, monthly fee collection ledgers, or term grade distributions.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateModal}
              className="mt-2 bg-indigo-600 hover:bg-indigo-500"
            >
              Create First Schedule
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-700">Schedule Name</th>
                  <th className="px-4 py-3 border-b border-slate-700">Report Key</th>
                  <th className="px-4 py-3 border-b border-slate-700">Frequency</th>
                  <th className="px-4 py-3 border-b border-slate-700">Recipients</th>
                  <th className="px-4 py-3 border-b border-slate-700">Next Run</th>
                  <th className="px-4 py-3 border-b border-slate-700">Status</th>
                  <th className="px-4 py-3 border-b border-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {schedules.map((item) => {
                  const id = item.id || item._id || '';
                  return (
                    <tr key={id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{item.name}</div>
                        {item.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-indigo-300">
                          {item.reportKey}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-indigo-950/80 text-indigo-300 px-2 py-0.5 text-[10px] font-bold border border-indigo-800/40">
                          {item.frequency}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-slate-300">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.recipients?.length || 0} recipient(s)</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {item.nextRunAt ? new Date(item.nextRunAt).toLocaleString() : 'Pending'}
                      </td>
                      <td className="px-4 py-3">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                            Paused
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            title="Run Now"
                            onClick={() => handleTriggerNow(id)}
                            disabled={isTriggering}
                            className="p-1.5 text-indigo-400 border-indigo-500/30 hover:bg-indigo-950/30"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Edit"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-300 hover:text-white"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Delete"
                            onClick={() => handleDelete(id)}
                            disabled={isDeleting}
                            className="p-1.5 text-rose-400 border-rose-500/30 hover:bg-rose-950/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create / Edit Modal Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Scheduled Report' : 'Create Automated Schedule'}
        description="Automate periodic reporting generation and distribution to stakeholders."
      >
        <form onSubmit={handleSubmitModal} className="space-y-4">
          <Input
            label="Schedule Name"
            placeholder="e.g. Weekly Attendance Summary"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Report Definition
            </label>
            <select
              value={formReportKey}
              onChange={(e) => setFormReportKey(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              required
            >
              <option value="">Select report...</option>
              {definitions.map((def) => {
                const key = def.reportKey || def.key || '';
                const name = def.title || def.name;
                return (
                  <option key={key} value={key}>
                    [{def.category}] {name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Frequency
              </label>
              <select
                value={formFrequency}
                onChange={(e) => setFormFrequency(e.target.value as any)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="TERM">Term</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Export Format
              </label>
              <select
                value={formFormat}
                onChange={(e) => setFormFormat(e.target.value as any)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="CSV">CSV</option>
                <option value="JSON">JSON</option>
              </select>
            </div>
          </div>

          <Input
            label="Recipients (Comma-separated emails)"
            placeholder="admin@school.edu, principal@school.edu"
            value={formRecipients}
            onChange={(e) => setFormRecipients(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Description</label>
            <textarea
              rows={2}
              placeholder="Optional notes or context for this schedule..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isActiveToggle" className="text-xs text-slate-300 font-medium cursor-pointer">
              Active schedule (runs automatically according to frequency)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isCreating || isUpdating}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              {editingId ? 'Save Changes' : 'Create Schedule'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
