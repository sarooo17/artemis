"use client";

import { useState, useEffect } from "react";
import { api } from '@/lib/api';

interface CompanySettingsProps {
  onSave: (settings: any) => Promise<void>;
}

export default function CompanySettings({ onSave }: CompanySettingsProps) {
  const [company, setCompany] = useState({
    name: "",
    vatNumber: "",
    domain: "",
    address: "",
    sector: "",
    language: "en",
    currency: "EUR",
    employeeCount: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      const response = await api.get('/settings/company');
      
      if (response.status === 403) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setCompany({
          name: data.name || "",
          vatNumber: data.vatNumber || "",
          domain: data.domain || "",
          address: data.address || "",
          sector: data.sector || "",
          language: data.language || "en",
          currency: data.currency || "EUR",
          employeeCount: data.employeeCount || "",
        });
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Failed to load company settings:', error);
      setError("Failed to load company settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await onSave(company);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save company settings:', error);
      setError("Failed to save company settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-yellow-900">Access Restricted</h4>
              <p className="text-sm text-yellow-700 mt-1">
                You don't have permission to view or modify company settings. Only company owners and administrators can access this section.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-semibold text-neutral-900 mb-4">Company Settings</h4>
        <p className="text-sm text-neutral-600 mb-6">Manage your company information and preferences.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={company.name}
            onChange={(e) => setCompany({ ...company, name: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* VAT Number */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              VAT Number
            </label>
            <input
              type="text"
              value={company.vatNumber}
              onChange={(e) => setCompany({ ...company, vatNumber: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="IT12345678901"
            />
          </div>

          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Email Domain
            </label>
            <input
              type="text"
              value={company.domain}
              onChange={(e) => setCompany({ ...company, domain: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example.com"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Address
          </label>
          <textarea
            value={company.address}
            onChange={(e) => setCompany({ ...company, address: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Full company address"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Sector */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Industry Sector
            </label>
            <select
              value={company.sector}
              onChange={(e) => setCompany({ ...company, sector: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select sector</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="technology">Technology</option>
              <option value="healthcare">Healthcare</option>
              <option value="finance">Finance</option>
              <option value="retail">Retail</option>
              <option value="education">Education</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Employee Count */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Number of Employees
            </label>
            <select
              value={company.employeeCount}
              onChange={(e) => setCompany({ ...company, employeeCount: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select range</option>
              <option value="1-10">1-10</option>
              <option value="11-50">11-50</option>
              <option value="51-200">51-200</option>
              <option value="201-500">201-500</option>
              <option value="500+">500+</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Default Language
            </label>
            <select
              value={company.language}
              onChange={(e) => setCompany({ ...company, language: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="it">Italiano</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Default Currency
            </label>
            <select
              value={company.currency}
              onChange={(e) => setCompany({ ...company, currency: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Company settings saved
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !company.name}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
