"use client";

import { useState, useEffect } from "react";

interface Company {
  id: string;
  name: string;
  logo?: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface CurrentContext {
  companyId: string | null;
  companyName?: string;
  departmentId: string | null;
  departmentName?: string;
  roleId: string | null;
  roleName?: string;
}

interface CompanySwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitch: () => void;
  isNavExpanded: boolean;
}

export default function CompanySwitcher({ isOpen, onClose, onSwitch, isNavExpanded }: CompanySwitcherProps) {
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [currentContext, setCurrentContext] = useState<CurrentContext | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      loadAvailableContexts();
    }
  }, [isOpen]);

  const loadAvailableContexts = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3001/api/user/available-contexts', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load contexts');
      }

      const data = await response.json();
      setCurrentContext(data.currentContext);
      setAvailableCompanies(data.availableCompanies);
      setAvailableDepartments(data.availableDepartments);
      setSelectedCompanyId(data.currentContext.companyId || "");
      
      // Check localStorage for saved context preference
      const savedContext = localStorage.getItem('userContext');
      if (savedContext) {
        const context = JSON.parse(savedContext);
        setSelectedDepartmentId(context.departmentId || "");
      } else {
        setSelectedDepartmentId(data.currentContext.departmentId || "");
      }
    } catch (error) {
      console.error('Failed to load contexts:', error);
      setError('Failed to load available companies and departments');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async () => {
    if (!selectedCompanyId) {
      setError('Please select a company');
      return;
    }

    if (!selectedDepartmentId) {
      setError('Please select a department or "All departments"');
      return;
    }

    setSwitching(true);
    setError("");
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3001/api/user/switch-context', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          departmentId: selectedDepartmentId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to switch context');
      }

      const data = await response.json();
      console.log('Context switched:', data);
      
      // Save to localStorage for persistence
      localStorage.setItem('userContext', JSON.stringify({
        companyName: data.currentContext.companyName,
        departmentName: data.currentContext.departmentName,
        companyId: data.currentContext.companyId,
        departmentId: data.currentContext.departmentId,
      }));
      
      // Notify parent to refresh
      onSwitch();
      onClose();
    } catch (error: any) {
      console.error('Failed to switch context:', error);
      setError(error.message || 'Failed to switch context');
    } finally {
      setSwitching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-start justify-start z-50 pointer-events-auto p-2 pt-2 pl-2" onClick={onClose}>
      <div className={`w-60 bg-white rounded-2xl border-2 border-neutral-100 flex flex-col shadow-[0px_0px_53px_-50px_rgba(0,0,0,0.35)] overflow-hidden mt-0`} onClick={(e) => e.stopPropagation()}>
        {/* Current Context Section */}
        <div className="p-4 bg-neutral-50">
          <p className="text-xs font-medium text-neutral-500 mb-2">Current Context</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-neutral-200">
              <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">{currentContext?.companyName || 'No company'}</p>
              <p className="text-xs text-neutral-500">{currentContext?.departmentName || 'No department'}</p>
            </div>
          </div>
        </div>

        {/* Selection Section */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-600"></div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Company Selection */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-2">Company</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400 outline-none bg-white"
                disabled={availableCompanies.length <= 1}
              >
                <option value="">Select a company</option>
                {availableCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {availableCompanies.length <= 1 && (
                <p className="text-xs text-neutral-400 mt-1">You only have access to one company</p>
              )}
            </div>

            {/* Department Selection */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-2">Department</label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400 outline-none bg-white"
                disabled={!selectedCompanyId || availableDepartments.length === 0}
              >
                <option value="">Select a department</option>
                <option value="all">All departments</option>
                {availableDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {availableDepartments.length === 0 && (
                <p className="text-xs text-neutral-400 mt-1">No departments available</p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-1.5">
          <button
            onClick={handleSwitch}
            disabled={switching || loading || !selectedCompanyId}
            className="w-full h-9 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {switching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Switching...</span>
              </>
            ) : (
              'Switch Context'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
