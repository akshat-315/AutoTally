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
        "grid gap-4",
        stats.length <= 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4",
        className,
      )}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {s.label}
          </p>
          <p className={cn("text-2xl font-bold tabular-nums mt-1.5 tracking-tight", s.color)}>
            {s.value}
          </p>
          {s.sub && (
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
