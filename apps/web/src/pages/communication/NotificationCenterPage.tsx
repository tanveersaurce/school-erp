import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  Search,
  ExternalLink,
  Settings,
} from 'lucide-react';
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
} from '../../features/communication/communicationApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { NotificationCategory } from '@edusphere/common';

export const NotificationCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data: res, isLoading } = useGetNotificationsQuery({
    page,
    limit: 20,
    search: searchTerm || undefined,
    category: categoryFilter || undefined,
    unreadOnly: unreadOnly || undefined,
  });

  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const notifications = res?.data?.items || [];
  const total = res?.data?.total || 0;
  const totalPages = Math.ceil(total / 20) || 1;

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      await markAsRead(notif._id || notif.id);
    }
    if (notif.deepLink) {
      navigate(notif.deepLink);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    await deleteNotification(notifId);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-7 h-7 text-blue-600" />
            <span>Notification Center</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay informed with real-time school announcements, academic alerts, and system notifications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/communication/preferences')}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            <span>Preferences</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAll || total === 0}
            className="flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All Read</span>
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 items-center">
          <div className="sm:col-span-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <Input
                placeholder="Search notifications..."
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {Object.values(NotificationCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => {
                  setUnreadOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span>Unread only</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Notification List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">No Notifications</h3>
          <p className="text-sm text-gray-500 mt-1">You are all caught up with your updates.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif: any) => (
            <Card
              key={notif._id || notif.id}
              className={`p-4 transition-all hover:shadow-md cursor-pointer border ${
                !notif.isRead
                  ? 'bg-blue-50/50 border-blue-200'
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
              onClick={() => handleNotificationClick(notif)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {!notif.isRead && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 uppercase">
                        {notif.category}
                      </span>
                      {notif.priority === 'HIGH' || notif.priority === 'URGENT' ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-800">
                          {notif.priority}
                        </span>
                      ) : null}
                      <span className="text-xs text-gray-400">
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className={`text-base ${!notif.isRead ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                      {notif.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{notif.body}</p>
                    {notif.deepLink && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold mt-2 hover:underline">
                        <span>View linked details</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, notif._id || notif.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Dismiss"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                Showing {notifications.length} of {total} notifications
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
                <span className="text-sm font-medium text-gray-700 self-center px-2">
                  Page {page} of {totalPages}
                </span>
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
        </div>
      )}
    </div>
  );
};
