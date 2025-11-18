import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "label";
  variant?:
    | "display"
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "body"
    | "small"
    | "caption";
  weight?: "light" | "normal" | "medium" | "semibold" | "bold";
  color?: "primary" | "secondary" | "muted" | "success" | "warning" | "danger";
  align?: "left" | "center" | "right" | "justify";
  truncate?: boolean;
}

const Text = ({
  as: Component = "p",
  variant = "body",
  weight = "normal",
  color = "primary",
  align = "left",
  truncate = false,
  className,
  children,
  ...props
}: TextProps) => {
  const variants = {
    display: "text-5xl leading-tight",
    h1: "text-4xl leading-tight",
    h2: "text-3xl leading-snug",
    h3: "text-2xl leading-snug",
    h4: "text-xl leading-normal",
    body: "text-sm leading-relaxed",
    small: "text-xs leading-relaxed",
    caption: "text-xs leading-normal uppercase tracking-wider",
  };

  const weights = {
    light: "font-light",
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };

  const colors = {
    primary: "text-gray-900",
    secondary: "text-gray-700",
    muted: "text-gray-500",
    success: "text-green-600",
    warning: "text-orange-600",
    danger: "text-red-600",
  };

  const aligns = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
    justify: "text-justify",
  };

  return (
    <Component
      className={cn(
        variants[variant],
        weights[weight],
        colors[color],
        aligns[align],
        truncate && "truncate",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Text;
