"use client";

import { useState } from "react";
import Avatar from "../atoms/Avatar";
import Icon from "../atoms/Icon";
import { cn } from "@/lib/utils";

export interface NavItem {
  id: string;
  icon: string;
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface NavigationSidebarProps {
  items: NavItem[];
  logoIcon?: string;
  userName?: string;
  userAvatar?: string;
  userStatus?: "online" | "offline" | "busy" | "away";
  activeItem?: string;
  onItemClick?: (id: string) => void;
}

const NavigationSidebar = ({
  items,
  logoIcon = "A",
  userName = "User",
  userAvatar,
  userStatus,
  activeItem,
  onItemClick,
}: NavigationSidebarProps) => {
  const [active, setActive] = useState(activeItem || items[0]?.id);

  const handleItemClick = (item: NavItem) => {
    setActive(item.id);
    if (onItemClick) onItemClick(item.id);
    if (item.onClick) item.onClick();
  };

  return (
    <aside className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4">
      {/* Logo */}
      <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
        <span className="text-white font-bold text-xl">{logoIcon}</span>
      </div>

      {/* Navigation Items */}
      <nav className="flex flex-col gap-2 flex-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
              active === item.id
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            )}
            aria-label={item.label}
            title={item.label}
          >
            <Icon icon={item.icon} size="lg" />
          </button>
        ))}
      </nav>

      {/* User Avatar */}
      <Avatar
        src={userAvatar}
        alt={userName}
        fallback={userName}
        status={userStatus}
        size="md"
        className="cursor-pointer"
      />
    </aside>
  );
};

export default NavigationSidebar;
