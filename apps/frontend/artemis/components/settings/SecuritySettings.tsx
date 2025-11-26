"use client";

import { useState, useEffect } from "react";
import { api } from '@/lib/api';

interface SecuritySettingsProps {
  user: any;
}

export default function SecuritySettings({ user }: SecuritySettingsProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      // Load sessions
      const sessionsResponse = await api.get('/settings/security/sessions');
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setSessions(sessionsData);
      }

      // Load audit logs
      const logsResponse = await api.get('/settings/security/audit-logs?limit=20');
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setAuditLogs(logsData);
      }
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    const isLastSession = sessions.length === 1;
    const confirmMessage = isLastSession
      ? 'This is your current session. You will be logged out. Continue?'
      : 'Are you sure you want to revoke this session?';
    
    if (!confirm(confirmMessage)) return;

    try {
      const response = await api.delete(`/settings/security/sessions/${sessionId}`);

      if (response.ok) {
        // If it was the last/only session, logout
        if (isLastSession) {
          // Logout will handle redirect
          await api.post('/auth/logout');
          window.location.href = '/login';
        } else {
          setSessions(sessions.filter(s => s.id !== sessionId));
        }
      }
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionLabel = (action: string) => {
    const labels: { [key: string]: string } = {
      'login': 'Login',
      'logout': 'Logout',
      'password_change': 'Password Changed',
      '2fa_enable': '2FA Enabled',
      '2fa_disable': '2FA Disabled',
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-semibold text-neutral-900 mb-4">Security Settings</h4>
        <p className="text-sm text-neutral-600 mb-6">Configure security options and monitor account activity.</p>
      </div>

      {/* Two-Factor Authentication */}
      <div className="p-4 border border-neutral-200 rounded-lg">
        <div className="flex items-start justify-between">
          <div>
            <h5 className="text-sm font-semibold text-neutral-900 mb-1">Two-Factor Authentication</h5>
            <p className="text-xs text-neutral-500 mb-3">Add an extra layer of security to your account</p>
            {user?.isTwoFactorEnabled ? (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                Disabled
              </span>
            )}
          </div>
          <button className="px-4 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors">
            {user?.isTwoFactorEnabled ? 'Disable' : 'Enable'} 2FA
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div>
        <h5 className="text-sm font-semibold text-neutral-900 mb-3">Active Sessions</h5>
        <p className="text-xs text-neutral-500 mb-4">Manage devices where you're currently logged in</p>
        
        <div className="space-y-2">
          {sessions.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">No active sessions</p>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Browser Session</p>
                    <p className="text-xs text-neutral-500">
                      Created: {formatDate(session.createdAt)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Expires: {formatDate(session.expiresAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Security Audit Log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-semibold text-neutral-900">Security Activity</h5>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showLogs ? 'Hide' : 'Show'} Activity
          </button>
        </div>
        
        {showLogs && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4">No recent activity</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg text-sm">
                  <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900">{getActionLabel(log.action)}</p>
                    <p className="text-xs text-neutral-500">{formatDate(log.createdAt)}</p>
                    {log.ipAddress && (
                      <p className="text-xs text-neutral-400 mt-1">IP: {log.ipAddress}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Security Recommendations */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h5 className="text-sm font-semibold text-blue-900 mb-2">Security Recommendations</h5>
        <ul className="space-y-2 text-sm text-blue-800">
          {!user?.isTwoFactorEnabled && (
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Enable two-factor authentication for better security</span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Use a strong, unique password for your account</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Review your active sessions regularly and revoke any suspicious ones</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
