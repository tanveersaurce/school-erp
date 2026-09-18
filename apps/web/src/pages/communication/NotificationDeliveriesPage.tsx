import React, { useState } from 'react';
import {
  Send,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Smartphone,
  Phone,
  Bell,
  Eye,
  RotateCcw,
} from 'lucide-react';
import {
  useGetDeliveriesQuery,
  useRetryDeliveryMutation,
} from '../../features/communication/communicationApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Dialog } from '../../components/ui/Dialog.js';
import {
  NotificationChannel,
  DeliveryStatus,
} from '@edusphere/common';
import type { INotificationDelivery } from '@edusphere/types';

export const NotificationDeliveriesPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchRecipient, setSearchRecipient] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<INotificationDelivery | null>(null);

  const {
    data: res,
    isLoading,
    isFetching,
    refetch,
  } = useGetDeliveriesQuery({
    page,
    limit: 20,
    channel: channelFilter || undefined,
    status: statusFilter || undefined,
    recipientId: searchRecipient || undefined,
  });

  const [retryDelivery, { isLoading: isRetrying }] = useRetryDeliveryMutation();

  const deliveries = res?.data?.items || [];
  const total = res?.data?.total || 0;
  const totalPages = Math.ceil(total / 20) || 1;

  const handleRetry = async (id: string) => {
    try {
      await retryDelivery(id).unwrap();
      refetch();
    } catch (err: any) {
      console.error('Failed to retry delivery', err);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return <Mail className="h-4 w-4 text-blue-500" />;
      case NotificationChannel.SMS:
        return <MessageSquare className="h-4 w-4 text-emerald-500" />;
      case NotificationChannel.PUSH:
        return <Smartphone className="h-4 w-4 text-purple-500" />;
      case NotificationChannel.WHATSAPP:
        return <Phone className="h-4 w-4 text-teal-500" />;
      case NotificationChannel.IN_APP:
      default:
        return <Bell className="h-4 w-4 text-indigo-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case DeliveryStatus.DELIVERED:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle2 className="h-3 w-3" /> Delivered
          </span>
        );
      case DeliveryStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-300">
            <AlertTriangle className="h-3 w-3" /> Failed
          </span>
        );
      case DeliveryStatus.SENT:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <RefreshCw className="h-3 w-3 animate-spin" /> Sent / In Flight
          </span>
        );
      case DeliveryStatus.PENDING:
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            <Clock className="h-3 w-3" /> Queued
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Delivery Logs & Audit Trail
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time status, retry controls, and diagnostic logs across all notification channels.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search recipient ID..."
              value={searchRecipient}
              onChange={(e) => {
                setSearchRecipient(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Channels</option>
              <option value={NotificationChannel.IN_APP}>In-App</option>
              <option value={NotificationChannel.EMAIL}>Email</option>
              <option value={NotificationChannel.SMS}>SMS</option>
              <option value={NotificationChannel.PUSH}>Push</option>
              <option value={NotificationChannel.WHATSAPP}>WhatsApp</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value={DeliveryStatus.DELIVERED}>Delivered</option>
              <option value={DeliveryStatus.PENDING}>Queued / Pending</option>
              <option value={DeliveryStatus.SENT}>Sent / In Flight</option>
              <option value={DeliveryStatus.FAILED}>Failed</option>
            </select>
          </div>

          <div className="flex items-center justify-end text-sm text-gray-500 dark:text-gray-400">
            Total records: <span className="ml-1 font-semibold text-gray-900 dark:text-white">{total}</span>
          </div>
        </div>
      </Card>

      {/* Deliveries Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : deliveries.length === 0 ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center p-8 text-center">
            <Send className="h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
              No delivery records found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No delivery logs match your filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Channel</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Recipient</th>
                  <th className="py-3.5 px-3">Provider</th>
                  <th className="py-3.5 px-3 text-center">Attempts</th>
                  <th className="py-3.5 px-3">Sent / Delivered At</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {deliveries.map((item: any) => (
                  <tr key={item.id || item._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                    <td className="py-3.5 pl-6 pr-3">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(item.channel)}
                        <span className="font-medium capitalize text-gray-900 dark:text-white">
                          {item.channel.toLowerCase().replace('_', '-')}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      {getStatusBadge(item.status)}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-mono text-xs text-gray-700 dark:text-gray-300">
                        {item.recipientId?.length > 18
                          ? `${item.recipientId.substring(0, 8)}...${item.recipientId.substring(item.recipientId.length - 6)}`
                          : item.recipientId}
                      </div>
                      {item.failureReason && (
                        <div className="mt-1 max-w-xs truncate text-xs text-red-600 dark:text-red-400" title={item.failureReason}>
                          {item.failureCode ? `[${item.failureCode}] ` : ''}{item.failureReason}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-xs text-gray-600 dark:text-gray-300">
                      {item.provider || 'Internal'}
                      {item.providerMessageId && (
                        <div className="font-mono text-[10px] text-gray-400">
                          {item.providerMessageId.substring(0, 12)}...
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center font-medium text-gray-900 dark:text-white">
                      {item.attemptCount || 1}
                    </td>

                    <td className="py-3.5 px-3 text-xs text-gray-500 dark:text-gray-400">
                      {item.deliveredAt ? (
                        <div>Delivered: {new Date(item.deliveredAt).toLocaleString()}</div>
                      ) : item.sentAt ? (
                        <div>Sent: {new Date(item.sentAt).toLocaleString()}</div>
                      ) : item.failedAt ? (
                        <div className="text-red-500">Failed: {new Date(item.failedAt).toLocaleString()}</div>
                      ) : (
                        <div>Queued: {new Date(item.queuedAt || item.createdAt).toLocaleTimeString()}</div>
                      )}
                    </td>

                    <td className="py-3.5 pl-3 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedDelivery(item)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {item.status === DeliveryStatus.FAILED && (
                          <button
                            onClick={() => handleRetry(item.id || item._id)}
                            disabled={isRetrying}
                            className="flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400"
                            title="Retry Delivery"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Retry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Details Dialog */}
      {selectedDelivery && (
        <Dialog
          isOpen={!!selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
          title="Delivery Record Details"
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
              <div>
                <span className="text-xs text-gray-400">Delivery ID</span>
                <p className="font-mono text-xs font-semibold text-gray-900 dark:text-white">
                  {selectedDelivery.id || (selectedDelivery as any)._id}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Notification ID</span>
                <p className="font-mono text-xs font-semibold text-gray-900 dark:text-white">
                  {selectedDelivery.notificationId}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Recipient ID</span>
                <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
                  {selectedDelivery.recipientId}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Channel & Provider</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedDelivery.channel} ({selectedDelivery.provider})
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Status</span>
                <div className="mt-0.5">{getStatusBadge(selectedDelivery.status)}</div>
              </div>
              <div>
                <span className="text-xs text-gray-400">Attempts</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedDelivery.attemptCount}
                </p>
              </div>
            </div>

            {selectedDelivery.failureReason && (
              <div className="rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <div className="font-semibold">Failure Diagnostic:</div>
                <div className="mt-1 text-xs">
                  {selectedDelivery.failureCode && <span className="font-mono font-bold">[{selectedDelivery.failureCode}] </span>}
                  {selectedDelivery.failureReason}
                </div>
              </div>
            )}

            {selectedDelivery.metadata && Object.keys(selectedDelivery.metadata).length > 0 && (
              <div>
                <div className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Delivery Metadata:
                </div>
                <pre className="max-h-40 overflow-y-auto rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                  {JSON.stringify(selectedDelivery.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {selectedDelivery.status === DeliveryStatus.FAILED && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleRetry(selectedDelivery.id || (selectedDelivery as any)._id);
                    setSelectedDelivery(null);
                  }}
                  disabled={isRetrying}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Retry Now
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedDelivery(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
