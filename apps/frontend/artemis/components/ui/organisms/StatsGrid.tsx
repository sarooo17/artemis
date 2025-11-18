import StatCard, { StatCardProps } from "../molecules/StatCard";

export interface StatsGridProps {
  stats: (StatCardProps & { id: string })[];
  columns?: 2 | 3 | 4;
}

const StatsGrid = ({ stats, columns = 3 }: StatsGridProps) => {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {stats.map((stat) => (
        <StatCard key={stat.id} {...stat} />
      ))}
    </div>
  );
};

export default StatsGrid;
