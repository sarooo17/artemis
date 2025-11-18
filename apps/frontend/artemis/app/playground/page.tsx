"use client";

import { useState } from "react";
import { NavigationSidebar } from "@/components/ui/organisms";
import { TaskItem } from "@/components/ui/molecules";
import { Text, Icon } from "@/components/ui/atoms";

export default function PlaygroundPage() {
  const [inputValue, setInputValue] = useState("");

  const navItems = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "external", icon: "↗", label: "External" },
    { id: "grid", icon: "⊞", label: "Grid" },
    { id: "search", icon: "🔍", label: "Search" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <NavigationSidebar
        items={navItems}
        logoIcon="A"
        userName="Riccardo Saro"
        userStatus="online"
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="w-full max-w-2xl space-y-8">
          {/* Main Title */}
          <Text variant="h1" weight="light" className="text-center mb-12">
            What are you working on?
          </Text>

          {/* Input Field */}
          <div className="relative">
            <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-200 px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
              <button className="text-gray-400 hover:text-gray-600 text-xl">
                +
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask for sales review"
                className="flex-1 outline-none text-gray-700 placeholder-gray-400"
              />
              <button className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Today Section */}
          <div className="space-y-4 mt-12">
            <Text variant="small" className="uppercase tracking-wider" color="muted">
              Today you might want to...
            </Text>
            <div className="space-y-1">
              <TaskItem
                icon="👥"
                title="2 Orders are overdue for delivery"
                badge="Review now"
                onAction={() => console.log("Review orders")}
              />
              <TaskItem
                icon="📄"
                title="3 invoices are due today"
                badge="Send reminders?"
                onAction={() => console.log("Send reminders")}
              />
              <TaskItem
                icon="📦"
                title="Stock of @item_0472 will run out in 3 days"
                onAction={() => console.log("Check stock")}
              />
            </div>
          </div>

          {/* Recent Section */}
          <div className="space-y-4 mt-12">
            <Text variant="small" className="uppercase tracking-wider" color="muted">
              Recent
            </Text>
            <div className="space-y-1">
              <TaskItem
                icon="📄"
                title="Invoice Draft - Rossi SRL"
                description="Edited 17 min ago · Ctrl + Shift + Z"
                timestamp="Edited 17 min ago"
              />
              <TaskItem
                icon="📊"
                title="Margin Report - Q2"
                description="Viewed 3 days ago"
                timestamp="Viewed 3 days ago"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
