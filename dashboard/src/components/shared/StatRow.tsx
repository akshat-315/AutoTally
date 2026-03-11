import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

interface Props {
  stats: StatItem[];
  className?: string;
}

export default function StatRow({ stats, className }: Props) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:gap-0 sm:divide-x sm:divide-border",
        stats.length <= 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4",
        className,
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="px-0 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
          <p className={cn("text-2xl font-semibold tabular-nums mt-1", s.color)}>
            {s.value}
          </p>
          {s.sub && (
            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
