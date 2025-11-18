import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  icon: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "primary" | "secondary" | "muted" | "success" | "warning" | "danger";
}

const Icon = ({
  icon,
  size = "md",
  color = "primary",
  className,
  ...props
}: IconProps) => {
  const sizes = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl",
  };

  const colors = {
    primary: "text-gray-900",
    secondary: "text-gray-700",
    muted: "text-gray-400",
    success: "text-green-600",
    warning: "text-orange-600",
    danger: "text-red-600",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        sizes[size],
        colors[color],
        className
      )}
      role="img"
      aria-label={icon}
      {...props}
    >
      {icon}
    </span>
  );
};

export default Icon;
