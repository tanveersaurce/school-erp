import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Settings, ExternalLink } from 'lucide-react';
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from '../../features/communication/communicationApi.js';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: countData } = useGetUnreadCountQuery(undefined, {
    pollingInterval: 30000,
  });
  const unreadCount = countData?.data?.unreadCount || 0;

  const { data: notifData } = useGetNotificationsQuery(
    { limit: 5 },
    { skip: !isOpen }
  );
  const notifications = notifData?.data?.items || [];

  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      await markAsRead(notif._id || notif.id);
    }
    setIsOpen(false);
    if (notif.deepLink) {
      navigate(notif.deepLink);
    } else {
      navigate('/notifications');
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 sm:w-96 rounded-xl shadow-2xl bg-white border border-gray-100 z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 hover:underline"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark read
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/communication/preferences');
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
                title="Notification Preferences"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                No notifications right now.
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n._id || n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                    !n.isRead ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-1">{n.body}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {n.category}
                    </span>
                    {n.priority === 'HIGH' || n.priority === 'URGENT' ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                        {n.priority}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 border-t border-gray-100 bg-gray-50 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1.5 w-full py-1 hover:underline"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
