"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { api } from '@/lib/api';
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import WidgetCard from "@/components/dashboard/WidgetCard";
import CreateCategoryModal from "@/components/dashboard/CreateCategoryModal";
import OverviewStats from "@/components/dashboard/OverviewStats";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { useRouter } from "next/navigation";

interface DashboardCategory {
  id: string;
  name: string;
  icon?: string;
  order: number;
  isDefault: boolean;
  dashboards: Dashboard[];
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: Widget[];
}

interface Widget {
  id: string;
  type: string;
  title: string;
  description?: string;
  data: any;
  config: any;
  position: { x: number; y: number; w: number; h: number };
}

function DashboardPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<DashboardCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [overviewStats, setOverviewStats] = useState({
    totalChats: 0,
    totalMessages: 0,
    totalWidgets: 0,
    activeToday: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    loadCategories();
    loadOverviewData();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await api.get('/dashboard/categories');

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
        
        // Set active category to default or first
        const defaultCat = data.categories.find((c: DashboardCategory) => c.isDefault);
        setActiveCategory(defaultCat?.id || data.categories[0]?.id || "");
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (name: string, icon: string) => {
    try {
      const response = await api.post('/dashboard/categories', { name, icon });

      if (response.ok) {
        await loadCategories();
      }
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const loadOverviewData = async () => {
    try {
      // TODO: Load ERP data here (orders, customers, products, revenue)
      // For now showing placeholder data
      
      setOverviewStats({
        totalChats: 0, // Replace with: Total Orders
        totalMessages: 0, // Replace with: Total Revenue
        totalWidgets: 0, // Replace with: Total Customers
        activeToday: 0, // Replace with: Orders Today
      });
      
      // TODO: Load recent ERP activities (new orders, shipments, etc.)
      const activities: any[] = [
        // Placeholder - replace with real ERP data
        {
          id: '1',
          type: 'dashboard',
          title: 'New Order #1234',
          description: 'Customer ABC - €1,250.00',
          timestamp: new Date(),
          icon: '📦',
        },
        {
          id: '2',
          type: 'dashboard',
          title: 'Payment Received',
          description: 'Invoice #5678 - €890.00',
          timestamp: new Date(Date.now() - 3600000),
          icon: '💰',
        },
        {
          id: '3',
          type: 'dashboard',
          title: 'Product Shipped',
          description: 'Order #1200 - Tracking: XYZ123',
          timestamp: new Date(Date.now() - 7200000),
          icon: '🚚',
        },
      ];
      
      setRecentActivities(activities);
    } catch (error) {
      console.error('Failed to load overview data:', error);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!confirm('Are you sure you want to delete this widget?')) return;

    try {
      const response = await api.delete(`/dashboard/widgets/${widgetId}`);

      if (response.ok) {
        await loadCategories();
      }
    } catch (error) {
      console.error('Failed to delete widget:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const response = await api.delete(`/dashboard/categories/${categoryId}`);

      if (response.ok) {
        await loadCategories();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Failed to delete category');
    }
  };

  const activeData = categories.find(c => c.id === activeCategory);
  const isOverviewActive = activeData?.isDefault || false;
  const allWidgets = activeData?.dashboards.flatMap(d => d.widgets) || [];

  if (loading) {
    return (
      <div className="w-screen h-screen bg-white flex gap-2">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-neutral-50 flex">
      <Navbar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <DashboardTabs
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          onCreateCategory={() => setIsCreateModalOpen(true)}
          onDeleteCategory={handleDeleteCategory}
        />

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isOverviewActive ? (
            /* Overview Page */
            <div className="max-w-7xl mx-auto space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900 mb-2">Overview</h1>
                <p className="text-neutral-500">Your workspace at a glance</p>
              </div>
              
              <OverviewStats
                totalChats={overviewStats.totalChats}
                totalMessages={overviewStats.totalMessages}
                totalWidgets={overviewStats.totalWidgets}
                activeToday={overviewStats.activeToday}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentActivity activities={recentActivities} />
                
                <div className="bg-white rounded-xl p-6 border border-neutral-200">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => router.push('/chat/temp-' + Date.now())}
                      className="w-full px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-left flex items-center gap-3"
                    >
                      <span className="text-xl">💬</span>
                      <span>Start AI Chat</span>
                    </button>
                    <button 
                      onClick={() => setIsCreateModalOpen(true)}
                      className="w-full px-4 py-3 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-left flex items-center gap-3"
                    >
                      <span className="text-xl">📊</span>
                      <span>Create Category</span>
                    </button>
                    <button className="w-full px-4 py-3 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-left flex items-center gap-3">
                      <span className="text-xl">📈</span>
                      <span>View Reports</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : allWidgets.length === 0 ? (
            /* Empty State for other categories */
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-24 h-24 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-xl font-semibold text-neutral-700 mb-2">No widgets yet</h3>
                <p className="text-neutral-500 mb-4">
                  Widgets will appear here when you save them from AI chat sessions
                </p>
                <button className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors">
                  Start a chat
                </button>
              </div>
            </div>
          ) : (
            /* Widget Grid for other categories */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-[250px]">
              {allWidgets.map((widget) => (
                <div
                  key={widget.id}
                  className={`col-span-${widget.position.w || 1} row-span-${widget.position.h || 1}`}
                >
                  <WidgetCard
                    widget={widget}
                    onDelete={handleDeleteWidget}
                    onEdit={(id) => console.log('Edit widget:', id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Category Modal */}
      <CreateCategoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateCategory}
      />
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
