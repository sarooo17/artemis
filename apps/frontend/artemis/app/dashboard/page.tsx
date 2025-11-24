"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";

function DashboardPage() {
  return (
    <div className="w-screen h-screen bg-white flex gap-2">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-normal text-neutral-500 mb-4">Dashboard</h1>
          <p className="text-neutral-400">Coming soon...</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
}
