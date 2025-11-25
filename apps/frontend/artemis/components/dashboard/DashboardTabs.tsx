"use client";

interface DashboardCategory {
  id: string;
  name: string;
  icon?: string;
  order: number;
  isDefault: boolean;
}

interface DashboardTabsProps {
  categories: DashboardCategory[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  onCreateCategory: () => void;
  onDeleteCategory: (categoryId: string) => void;
}

export default function DashboardTabs({ 
  categories, 
  activeCategory, 
  onCategoryChange, 
  onCreateCategory,
  onDeleteCategory 
}: DashboardTabsProps) {
  return (
    <div className="flex items-center gap-2 border-b border-neutral-200 px-6 bg-white">
      <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
        {categories.map((category) => (
          <div key={category.id} className="relative group">
            <button
              onClick={() => onCategoryChange(category.id)}
              className={`
                relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap
                ${activeCategory === category.id
                  ? 'text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-700'
                }
              `}
            >
              <span className="flex items-center gap-2">
                {category.icon && <span>{category.icon}</span>}
                <span>{category.name}</span>
              </span>
              {activeCategory === category.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900"></div>
              )}
            </button>
            
            {/* Delete button - only show for non-default categories */}
            {!category.isDefault && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCategory(category.id);
                }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neutral-600 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-neutral-800 text-xs"
                title="Delete category"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Category Button */}
      <button
        onClick={onCreateCategory}
        className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors whitespace-nowrap"
        title="Add category"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>New</span>
      </button>
    </div>
  );
}
