"use client";

import { useState, useEffect } from "react";

interface NotificationsSettingsProps {
  onSave: (settings: any) => Promise<void>;
}

export default function NotificationsSettings({ onSave }: NotificationsSettingsProps) {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    notifyOnMentions: true,
    notifyOnWorkflowComplete: true,
    notifyOnTeamUpdates: true,
    digestFrequency: "daily",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3001/api/settings/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSettings({
          emailNotifications: data.emailNotifications,
          pushNotifications: data.pushNotifications,
          notifyOnMentions: data.notifyOnMentions,
          notifyOnWorkflowComplete: data.notifyOnWorkflowComplete,
          notifyOnTeamUpdates: data.notifyOnTeamUpdates,
          digestFrequency: data.digestFrequency,
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      await onSave(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-semibold text-neutral-900 mb-4">Notification Preferences</h4>
        <p className="text-sm text-neutral-600 mb-6">Manage how and when you receive notifications.</p>
      </div>

      <div className="space-y-4">
        {/* Email Notifications */}
        <label className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
          <div>
            <span className="text-sm font-medium text-neutral-700">Email Notifications</span>
            <p className="text-xs text-neutral-500 mt-1">Receive notifications via email</p>
          </div>
          <input
            type="checkbox"
            checked={settings.emailNotifications}
            onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {/* Push Notifications */}
        <label className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
          <div>
            <span className="text-sm font-medium text-neutral-700">Push Notifications</span>
            <p className="text-xs text-neutral-500 mt-1">Receive browser push notifications</p>
          </div>
          <input
            type="checkbox"
            checked={settings.pushNotifications}
            onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <div className="pt-4 border-t border-neutral-200">
          <h5 className="text-sm font-semibold text-neutral-900 mb-4">Notification Types</h5>
          
          {/* Mentions */}
          <label className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors mb-3">
            <div>
              <span className="text-sm font-medium text-neutral-700">Mentions</span>
              <p className="text-xs text-neutral-500 mt-1">When someone mentions you in a chat</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyOnMentions}
              onChange={(e) => setSettings({ ...settings, notifyOnMentions: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>

          {/* Workflow Complete */}
          <label className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors mb-3">
            <div>
              <span className="text-sm font-medium text-neutral-700">Workflow Completion</span>
              <p className="text-xs text-neutral-500 mt-1">When a workflow or integration completes</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyOnWorkflowComplete}
              onChange={(e) => setSettings({ ...settings, notifyOnWorkflowComplete: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>

          {/* Team Updates */}
          <label className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
            <div>
              <span className="text-sm font-medium text-neutral-700">Team Updates</span>
              <p className="text-xs text-neutral-500 mt-1">Updates about your team and workspace</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyOnTeamUpdates}
              onChange={(e) => setSettings({ ...settings, notifyOnTeamUpdates: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>

        {/* Digest Frequency */}
        <div className="pt-4 border-t border-neutral-200">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Email Digest Frequency
          </label>
          <select
            value={settings.digestFrequency}
            onChange={(e) => setSettings({ ...settings, digestFrequency: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="never">Never</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <p className="text-xs text-neutral-500 mt-1">Receive a summary of your notifications</p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Notification preferences saved
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
