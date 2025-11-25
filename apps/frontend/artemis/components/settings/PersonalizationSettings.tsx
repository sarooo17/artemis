"use client";

import { useState, useEffect } from "react";

interface PersonalizationSettingsProps {
  onSave: (settings: any) => Promise<void>;
}

export default function PersonalizationSettings({ onSave }: PersonalizationSettingsProps) {
  const [settings, setSettings] = useState({
    theme: "light",
    accentColor: "#3B82F6",
    fontSize: "medium",
    sidebarCollapsed: false,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const accentColors = [
    { name: "Blue", value: "#3B82F6" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Pink", value: "#EC4899" },
    { name: "Green", value: "#10B981" },
    { name: "Orange", value: "#F97316" },
    { name: "Red", value: "#EF4444" },
  ];

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
          theme: data.theme,
          accentColor: data.accentColor,
          fontSize: data.fontSize,
          sidebarCollapsed: data.sidebarCollapsed,
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
        <h4 className="text-base font-semibold text-neutral-900 mb-4">Personalization</h4>
        <p className="text-sm text-neutral-600 mb-6">Customize your experience with themes and preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSettings({ ...settings, theme: "light" })}
              className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                settings.theme === "light" 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <svg className="w-8 h-8 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="text-sm font-medium">Light</span>
            </button>
            <button
              onClick={() => setSettings({ ...settings, theme: "dark" })}
              className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                settings.theme === "dark" 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <svg className="w-8 h-8 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <span className="text-sm font-medium">Dark</span>
            </button>
            <button
              onClick={() => setSettings({ ...settings, theme: "auto" })}
              className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                settings.theme === "auto" 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <svg className="w-8 h-8 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-sm font-medium">Auto</span>
            </button>
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            Accent Color
          </label>
          <div className="grid grid-cols-6 gap-3">
            {accentColors.map((color) => (
              <button
                key={color.value}
                onClick={() => setSettings({ ...settings, accentColor: color.value })}
                className={`h-12 rounded-lg border-2 transition-all ${
                  settings.accentColor === color.value 
                    ? "border-neutral-900 scale-110" 
                    : "border-neutral-200 hover:scale-105"
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {settings.accentColor === color.value && (
                  <svg className="w-6 h-6 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-3">
            Font Size
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSettings({ ...settings, fontSize: "small" })}
              className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                settings.fontSize === "small" 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <span className="text-xs font-medium">Aa</span>
              <span className="text-xs text-neutral-600">Small</span>
            </button>
            <button
              onClick={() => setSettings({ ...settings, fontSize: "medium" })}
              className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                settings.fontSize === "medium" 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <span className="text-base font-medium">Aa</span>
              <span className="text-xs text-neutral-600">Medium</span>
            </button>
            <button
              onClick={() => setSettings({ ...settings, fontSize: "large" })}
              className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                settings.fontSize === "large" 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <span className="text-lg font-medium">Aa</span>
              <span className="text-xs text-neutral-600">Large</span>
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <label className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
            <div>
              <span className="text-sm font-medium text-neutral-700">Collapse Sidebar by Default</span>
              <p className="text-xs text-neutral-500 mt-1">Sidebar will be collapsed when you open the app</p>
            </div>
            <input
              type="checkbox"
              checked={settings.sidebarCollapsed}
              onChange={(e) => setSettings({ ...settings, sidebarCollapsed: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Preferences saved successfully
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
