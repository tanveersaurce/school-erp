import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Archive,
  ChevronRight,
} from 'lucide-react';
import { useGetTemplatesQuery } from '../../features/communication/communicationApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Spinner } from '../../components/ui/Spinner.js';
import {
  NotificationCategory,
  NotificationChannel,
  TemplateStatus,
} from '@edusphere/common';

export const NotificationTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: res, isLoading } = useGetTemplatesQuery({
    search: searchTerm || undefined,
    category: categoryFilter || undefined,
    channel: channelFilter || undefined,
    page,
    limit: 15,
  });

  const templates = res?.data?.items || [];
  const total = res?.data?.total || 0;
  const totalPages = Math.ceil(total / 15) || 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case TemplateStatus.ACTIVE:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case TemplateStatus.DRAFT:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" />
            Draft
          </span>
        );
      case TemplateStatus.ARCHIVED:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
            <Archive className="w-3 h-3" />
            Archived
          </span>
        );
      default:
        return <span className="text-xs text-gray-600">{status}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600" />
            <span>Notification Templates</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage reusable message templates, event triggers, and variable substitutions.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/communication/templates/new')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <Input
                placeholder="Search by key, title, or body..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {Object.values(NotificationCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Channels</option>
              {Object.values(NotificationChannel).map((ch) => (
                <option key={ch} value={ch}>
                  {ch.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Templates Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">No Notification Templates</h3>
          <p className="text-sm text-gray-500 mt-1">
            Create your first message template for automated domain triggers.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="px-5 py-3">Template Key</th>
                  <th className="px-5 py-3">Event Trigger</th>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Version</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templates.map((tpl: any) => (
                  <tr
                    key={tpl._id || tpl.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => navigate(`/communication/templates/${tpl._id || tpl.id}`)}
                  >
                    <td className="px-5 py-4 font-mono font-bold text-gray-900">
                      {tpl.templateKey}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-600">
                      {tpl.eventType}
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-gray-700">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {tpl.channel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                        {tpl.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-gray-500">
                      v{tpl.version}
                    </td>
                    <td className="px-5 py-4">{getStatusBadge(tpl.status)}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 text-xs">
                        <span>Edit</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {templates.length} of {total} templates
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
