"use client";

interface Activity {
  id: string;
  type: 'chat' | 'widget' | 'dashboard';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-neutral-200">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">Recent Activity</h3>
      
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <p>No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-neutral-100 last:border-0 last:pb-0">
              <div className="text-2xl">{activity.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-neutral-900 truncate">{activity.title}</div>
                <div className="text-sm text-neutral-500 truncate">{activity.description}</div>
              </div>
              <div className="text-xs text-neutral-400 whitespace-nowrap">
                {formatTime(activity.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
