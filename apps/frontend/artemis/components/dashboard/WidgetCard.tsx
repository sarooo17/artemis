"use client";

import { useState } from "react";

interface WidgetCardProps {
  widget: {
    id: string;
    type: string;
    title: string;
    description?: string;
    data: any;
    config: any;
    position: { x: number; y: number; w: number; h: number };
  };
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export default function WidgetCard({ widget, onDelete, onEdit }: WidgetCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const renderContent = () => {
    switch (widget.type) {
      case 'metric':
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-4xl font-bold text-neutral-900">{widget.data.value}</div>
            {widget.data.change && (
              <div className={`text-sm mt-2 ${widget.data.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {widget.data.change > 0 ? '↑' : '↓'} {Math.abs(widget.data.change)}%
              </div>
            )}
          </div>
        );
      
      case 'chart':
        return (
          <div className="h-full flex items-center justify-center text-neutral-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm">Chart visualization</p>
            </div>
          </div>
        );
      
      case 'table':
        return (
          <div className="overflow-auto h-full">
            {widget.data.rows && widget.data.rows.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 sticky top-0">
                  <tr>
                    {widget.data.columns?.map((col: string, i: number) => (
                      <th key={i} className="px-4 py-2 text-left font-medium text-neutral-600">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {widget.data.rows.map((row: any[], i: number) => (
                    <tr key={i} className="border-t border-neutral-100">
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-2 text-neutral-700">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-400">
                No data
              </div>
            )}
          </div>
        );
      
      case 'list':
        return (
          <div className="overflow-auto h-full">
            {widget.data.items && widget.data.items.length > 0 ? (
              <ul className="space-y-2">
                {widget.data.items.map((item: any, i: number) => (
                  <li key={i} className="px-4 py-2 hover:bg-neutral-50 rounded-lg">
                    <div className="font-medium text-neutral-900">{item.title || item.name}</div>
                    {item.subtitle && (
                      <div className="text-sm text-neutral-500">{item.subtitle}</div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-400">
                No items
              </div>
            )}
          </div>
        );
      
      case 'text':
        return (
          <div className="p-4 overflow-auto h-full">
            <p className="text-neutral-700 whitespace-pre-wrap">{widget.data.text}</p>
          </div>
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-full text-neutral-400">
            <p>Unknown widget type: {widget.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-neutral-900 truncate">{widget.title}</h3>
          {widget.description && (
            <p className="text-xs text-neutral-500 truncate mt-0.5">{widget.description}</p>
          )}
        </div>
        <div className="relative ml-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 flex items-center justify-center hover:bg-neutral-200 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-neutral-200 z-10">
              <button
                onClick={() => {
                  onEdit?.(widget.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 rounded-t-lg"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  onDelete?.(widget.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4">
        {renderContent()}
      </div>
    </div>
  );
}
