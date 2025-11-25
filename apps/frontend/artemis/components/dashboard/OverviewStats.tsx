"use client";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

function StatCard({ title, value, change, changeType = 'neutral', icon }: StatCardProps) {
  const changeColor = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-neutral-500',
  }[changeType];

  return (
    <div className="bg-white rounded-xl p-6 border border-neutral-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="text-sm font-medium text-neutral-500">{title}</div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="text-3xl font-bold text-neutral-900 mb-2">{value}</div>
      {change && (
        <div className={`text-sm font-medium ${changeColor}`}>
          {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '→'} {change}
        </div>
      )}
    </div>
  );
}

interface OverviewStatsProps {
  totalChats: number;
  totalMessages: number;
  totalWidgets: number;
  activeToday: number;
}

export default function OverviewStats({ 
  totalChats, 
  totalMessages, 
  totalWidgets, 
  activeToday 
}: OverviewStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatCard
        title="Total Orders"
        value={totalChats}
        icon="📦"
      />
      <StatCard
        title="Total Revenue"
        value={`€${totalMessages.toLocaleString()}`}
        icon="💰"
      />
      <StatCard
        title="Active Customers"
        value={totalWidgets}
        icon="👥"
      />
      <StatCard
        title="Orders Today"
        value={activeToday}
        icon="⚡"
      />
    </div>
  );
}
