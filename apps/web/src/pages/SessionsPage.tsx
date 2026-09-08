import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Laptop,
  Smartphone,
  Globe,
  Shield,
  LogOut,
  Trash2,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import {
  useGetSessionsQuery,
  useRevokeSessionMutation,
  useLogoutAllMutation,
  useLogoutMutation,
} from '../services/authApi.js';
import { useAppSelector, useAppDispatch } from '../store/index.js';
import { clearCredentials } from '../store/slices/authSlice.js';

export function SessionsPage(): React.JSX.Element {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { data: response, isLoading, refetch } = useGetSessionsQuery();
  const [revokeSession, { isLoading: isRevoking }] = useRevokeSessionMutation();
  const [logoutAll, { isLoading: isLoggingOutAll }] = useLogoutAllMutation();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const [notification, setNotification] = useState<string | null>(null);

  const sessions = response?.data || [];

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId).unwrap();
      setNotification('Session revoked successfully.');
      refetch();
    } catch {
      setNotification('Failed to revoke session.');
    }
  };

  const handleLogoutAllOther = async () => {
    try {
      await logoutAll().unwrap();
      setNotification('All other active sessions have been terminated.');
      refetch();
    } catch {
      setNotification('Failed to terminate other sessions.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } finally {
      dispatch(clearCredentials());
      sessionStorage.removeItem('accessToken');
      navigate('/login');
    }
  };

  const getDeviceIcon = (deviceName?: string) => {
    if (!deviceName) return <Globe className="w-5 h-5 text-slate-400" />;
    const lower = deviceName.toLowerCase();
    if (lower.includes('mobile') || lower.includes('iphone') || lower.includes('android')) {
      return <Smartphone className="w-5 h-5 text-indigo-400" />;
    }
    return <Laptop className="w-5 h-5 text-indigo-400" />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-indigo-500/20">
                E
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Active Sessions</h1>
                <p className="text-xs text-slate-400">
                  Signed in as <span className="text-indigo-400 font-medium">{user?.email}</span> (
                  {user?.userType})
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link to="/">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Sign Out
            </Button>
          </div>
        </div>

        {notification && (
          <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-xs text-indigo-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-indigo-400" />
              <span>{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Sessions Card */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center">
                <Shield className="w-4 h-4 mr-2 text-indigo-400" />
                Connected Devices & Sessions
              </CardTitle>
              <CardDescription>
                Review and revoke any suspicious or unused device sessions
              </CardDescription>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogoutAllOther}
                isLoading={isLoggingOutAll}
                disabled={sessions.length <= 1}
              >
                Revoke All Others
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="py-12 flex justify-center items-center space-x-3">
                <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                <span className="text-xs text-slate-400">Loading active sessions...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No active sessions found.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 mt-1">
                        {getDeviceIcon(session.deviceName)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-white">
                            {session.deviceName || 'Web Browser'}
                          </span>
                          {session.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Current Session
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 space-x-3">
                          <span>IP: {session.ipAddress || '127.0.0.1'}</span>
                          <span>•</span>
                          <span>Last active: {new Date(session.lastUsedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {!session.isCurrent ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={isRevoking}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        >
                          Revoke
                        </Button>
                      ) : (
                        <span className="text-xs text-emerald-400 flex items-center font-medium">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Active Now
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
