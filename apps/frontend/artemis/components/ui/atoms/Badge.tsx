import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  rounded?: boolean;
}

const Badge = ({
  variant = "default",
  size = "md",
  rounded = false,
  className,
  children,
  ...props
}: BadgeProps) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-colors";

  const variants = {
    default: "bg-gray-100 text-gray-800",
    primary: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-orange-100 text-orange-800",
    danger: "bg-red-100 text-red-800",
    outline: "border border-gray-300 text-gray-700 bg-transparent",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        rounded ? "rounded-full" : "rounded",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
