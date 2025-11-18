import { useState } from "react";
import Card from "../atoms/Card";
import Text from "../atoms/Text";
import Icon from "../atoms/Icon";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  onClick?: () => void;
}

const StatCard = ({
  title,
  value,
  icon,
  trend,
  loading = false,
  onClick,
}: StatCardProps) => {
  return (
    <Card
      variant="elevated"
      hoverable={!!onClick}
      onClick={onClick}
      className="relative overflow-hidden"
    >
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-2">
            <Text variant="small" color="muted" className="uppercase">
              {title}
            </Text>
            {icon && <Icon icon={icon} size="lg" color="muted" />}
          </div>
          <Text variant="h2" weight="bold">
            {value}
          </Text>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <Icon
                icon={trend.isPositive ? "↑" : "↓"}
                size="sm"
                color={trend.isPositive ? "success" : "danger"}
              />
              <Text
                variant="small"
                color={trend.isPositive ? "success" : "danger"}
                weight="medium"
              >
                {Math.abs(trend.value)}%
              </Text>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default StatCard;
