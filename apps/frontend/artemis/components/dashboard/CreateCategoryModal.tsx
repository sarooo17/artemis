"use client";

import { useState } from "react";

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, icon: string) => void;
}

const ICON_OPTIONS = ['📊', '📈', '💼', '💰', '📱', '🎯', '⚡', '🔥', '⭐', '📦', '🚀', '💡'];

export default function CreateCategoryModal({ isOpen, onClose, onCreate }: CreateCategoryModalProps) {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("📊");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), selectedIcon);
      setName("");
      setSelectedIcon("📊");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm bg-black/20" onClick={onClose}>
      <div className="w-[400px] bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Create New Category</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Category Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sales, Marketing, Finance"
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400 outline-none"
              autoFocus
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Icon</label>
            <div className="grid grid-cols-6 gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`
                    w-12 h-12 flex items-center justify-center text-2xl rounded-lg border-2 transition-colors
                    ${selectedIcon === icon
                      ? 'border-neutral-900 bg-neutral-100'
                      : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                    }
                  `}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
