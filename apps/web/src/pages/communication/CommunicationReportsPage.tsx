import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Phone,
  Megaphone,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  Settings,
  ArrowUpRight,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { useGetCommunicationStatsQuery } from '../../features/communication/communicationApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const CommunicationReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: res, isLoading, isFetching, refetch } = useGetCommunicationStatsQuery();

  const stats = res?.data;

  const channelIcons: Record<string, any> = {
    IN_APP: Bell,
    EMAIL: Mail,
    SMS: MessageSquare,
    PUSH: Smartphone,
    WHATSAPP: Phone,
  };

  const channelColors: Record<string, { bg: string; text: string; bar: string }> = {
    IN_APP: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400', bar: 'bg-indigo-500' },
    EMAIL: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
    SMS: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
    PUSH: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400', bar: 'bg-purple-500' },
    WHATSAPP: { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-600 dark:text-teal-400', bar: 'bg-teal-500' },
  };

  const channelBreakdown = stats?.channelBreakdown || {};
  const totalDeliveriesCount = Object.values(channelBreakdown).reduce((acc, v) => acc + (v || 0), 0);

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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Communication Intelligence & Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time telemetry, channel performance metrics, and multi-tenant delivery reliability analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2"
          >
            <RotateCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/communication/announcements/new')}
            className="flex items-center gap-2"
          >
            <Megaphone className="h-4 w-4" />
            New Broadcast
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Notifications */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Total Dispatched
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {(stats?.totalNotificationsSent || 0).toLocaleString()}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Bell className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-300 mr-1">
              {(stats?.unreadNotificationsCount || 0).toLocaleString()}
            </span>{' '}
            unread by recipients
          </div>
        </Card>

        {/* Delivery Rate */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Delivery Success Rate
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.deliveryRatePercentage != null ? `${stats.deliveryRatePercentage.toFixed(1)}%` : '100%'}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-900/50 dark:text-green-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <TrendingUp className="h-4 w-4" />
            <span>High reliability target &gt; 99%</span>
          </div>
        </Card>

        {/* Active Broadcasts */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Published Broadcasts
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {(stats?.activeAnnouncementsCount || 0).toLocaleString()}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
              <Megaphone className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>School-wide alerts</span>
            <button
              onClick={() => navigate('/communication/announcements')}
              className="flex items-center font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              View all <ArrowUpRight className="h-3 w-3 ml-0.5" />
            </button>
          </div>
        </Card>

        {/* Queue Depth / Failures */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Pending / Failed
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.pendingQueueDepth || 0}{' '}
                <span className="text-base font-normal text-gray-400">/</span>{' '}
                <span className={stats?.failedDeliveriesCount ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}>
                  {stats?.failedDeliveriesCount || 0}
                </span>
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{stats?.failedDeliveriesCount ? `${stats.failedDeliveriesCount} failures need retry` : 'Zero dead-letters'}</span>
            <button
              onClick={() => navigate('/communication/deliveries')}
              className="flex items-center font-medium text-amber-600 hover:underline dark:text-amber-400"
            >
              Audit <ArrowUpRight className="h-3 w-3 ml-0.5" />
            </button>
          </div>
        </Card>
      </div>

      {/* Main Content Sections: Channel Breakdown & Quick Hub */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Channel Breakdown Card */}
        <Card className="p-6 lg:col-span-2">
          <div className="border-b border-gray-100 pb-4 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Channel Volume & Telemetry
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Dispatched messages segmented across integrated delivery adapters.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            {['IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WHATSAPP'].map((channelKey) => {
              const Icon = channelIcons[channelKey] || Bell;
              const color = channelColors[channelKey] || channelColors.IN_APP;
              const count = channelBreakdown[channelKey] || 0;
              const pct = totalDeliveriesCount > 0 ? (count / totalDeliveriesCount) * 100 : 0;

              return (
                <div key={channelKey} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-md ${color.bg} ${color.text}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="capitalize">{channelKey.toLowerCase().replace('_', '-')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {count.toLocaleString()}
                      </span>
                      <span className="w-12 text-right text-xs text-gray-400">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Deliveries are queued asynchronously via BullMQ workers with exponential backoff retry.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/communication/deliveries')}
              className="text-xs"
            >
              Inspect Audit Log
            </Button>
          </div>
        </Card>

        {/* Quick Access & Modules */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Communication Hub
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Quick shortcuts to core communication management modules.
            </p>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => navigate('/communication/announcements')}
                className="flex w-full items-center justify-between rounded-lg border border-gray-100 p-3 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Announcements</div>
                    <div className="text-xs text-gray-500">School-wide broadcasts</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </button>

              <button
                onClick={() => navigate('/communication/templates')}
                className="flex w-full items-center justify-between rounded-lg border border-gray-100 p-3 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Notification Templates</div>
                    <div className="text-xs text-gray-500">Multi-lingual variables</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </button>

              <button
                onClick={() => navigate('/communication/jobs')}
                className="flex w-full items-center justify-between rounded-lg border border-gray-100 p-3 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Bulk Communication Jobs</div>
                    <div className="text-xs text-gray-500">Batch targeting & progress</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </button>

              <button
                onClick={() => navigate('/communication/preferences')}
                className="flex w-full items-center justify-between rounded-lg border border-gray-100 p-3 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Preferences & Quiet Hours</div>
                    <div className="text-xs text-gray-500">Channel overrides</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
