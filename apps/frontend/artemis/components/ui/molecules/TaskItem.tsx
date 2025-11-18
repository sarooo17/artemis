import { HTMLAttributes } from "react";
import Card from "../atoms/Card";
import Text from "../atoms/Text";
import Icon from "../atoms/Icon";
import Badge from "../atoms/Badge";
import { cn } from "@/lib/utils";

export interface TaskItemProps extends HTMLAttributes<HTMLDivElement> {
  icon?: string;
  title: string;
  description?: string;
  badge?: string;
  timestamp?: string;
  completed?: boolean;
  onToggle?: () => void;
  onAction?: () => void;
}

const TaskItem = ({
  icon,
  title,
  description,
  badge,
  timestamp,
  completed = false,
  onToggle,
  onAction,
  className,
  ...props
}: TaskItemProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors group",
        "hover:bg-gray-50 cursor-pointer",
        completed && "opacity-60",
        className
      )}
      {...props}
    >
      {/* Checkbox */}
      {onToggle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            "w-5 h-5 rounded border-2 transition-colors flex items-center justify-center",
            completed
              ? "bg-blue-500 border-blue-500"
              : "border-gray-300 hover:border-blue-500"
          )}
        >
          {completed && <span className="text-white text-xs">✓</span>}
        </button>
      )}

      {/* Icon */}
      {icon && <Icon icon={icon} size="md" color="secondary" />}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Text
            weight="medium"
            className={cn(completed && "line-through")}
            truncate
          >
            {title}
          </Text>
          {badge && (
            <Badge size="sm" variant="outline">
              {badge}
            </Badge>
          )}
        </div>
        {description && (
          <Text variant="small" color="muted" truncate>
            {description}
          </Text>
        )}
        {timestamp && (
          <Text variant="caption" color="muted">
            {timestamp}
          </Text>
        )}
      </div>

      {/* Action Button */}
      {onAction && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-600"
        >
          <Icon icon="↗" size="sm" />
        </button>
      )}
    </div>
  );
};

export default TaskItem;
