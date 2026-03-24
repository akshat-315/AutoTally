import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchTimeSeries } from "@/lib/api";
import type { TimeSeriesItem } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import EmptyState from "@/components/shared/EmptyState";
import { BarChart3 } from "lucide-react";

function getGranularity(start: string, end: string): string {
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
  if (diff <= 31) return "daily";
  if (diff <= 90) return "weekly";
  return "monthly";
}

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatPeriodLabel(period: string, granularity: string): string {
  if (granularity === "weekly") {
    const wMatch = period.match(/W(\d+)$/);
    return wMatch ? `W${wMatch[1]}` : period;
  }
  if (granularity === "monthly") {
    const parts = period.split("-");
    if (parts.length >= 2) {
      const monthIdx = parseInt(parts[1], 10) - 1;
      return `${MONTH_SHORT[monthIdx] ?? parts[1]} '${parts[0].slice(2)}`;
    }
    return period;
  }
  const parts = period.split("-");
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${day} ${MONTH_SHORT[monthIdx] ?? parts[1]}`;
  }
  return period;
}

type View = "both" | "debit" | "credit";

export default function SpendingChart() {
  const { startDate, endDate } = useDateRange();
  const [data, setData] = useState<TimeSeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("both");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);

  const granularity = useMemo(() => getGranularity(startDate, endDate), [startDate, endDate]);

  useEffect(() => {
    setLoading(true);
    setAnimated(false);
    fetchTimeSeries(startDate, endDate, granularity)
      .then(setData)
      .finally(() => setLoading(false));
  }, [startDate, endDate, granularity]);

  useEffect(() => {
    if (!loading && data.length > 0) {
      requestAnimationFrame(() => setAnimated(true));
    }
  }, [loading, data]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const totalDebited = data.reduce((s, d) => s + d.total_debited, 0);
    const totalCredited = data.reduce((s, d) => s + d.total_credited, 0);
    const avgDebited = totalDebited / data.length;
    const peakIdx = data.reduce((best, d, i) => d.total_debited > data[best].total_debited ? i : best, 0);
    const peakCreditIdx = data.reduce((best, d, i) => d.total_credited > data[best].total_credited ? i : best, 0);
    return { totalDebited, totalCredited, avgDebited, peakIdx, peakCreditIdx };
  }, [data]);

  const maxVal = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(
      ...data.map((d) => Math.max(
        view !== "credit" ? d.total_debited : 0,
        view !== "debit" ? d.total_credited : 0,
      )),
      1,
    );
  }, [data, view]);

  const viewOptions: { value: View; label: string }[] = [
    { value: "both", label: "Both" },
    { value: "debit", label: "Debits" },
    { value: "credit", label: "Credits" },
  ];

  return (
    <div className="border border-border rounded bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Cash Flow</h2>
        <div className="flex rounded border border-border bg-background p-0.5">
          {viewOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setView(opt.value)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                view === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      {stats && !loading && (
        <div className="flex flex-wrap gap-4 px-4 py-2.5 border-b border-border text-[11px]">
          {view !== "credit" && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-debit" />
              <span className="text-muted-foreground">Avg</span>
              <span className="font-serif tabular-nums">{formatCurrency(stats.avgDebited)}</span>
              <span className="text-muted-foreground">/{granularity === "daily" ? "day" : granularity === "weekly" ? "week" : "mo"}</span>
            </div>
          )}
          {view !== "credit" && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Peak</span>
              <span className="font-serif tabular-nums">{formatCurrency(data[stats.peakIdx].total_debited)}</span>
              <span className="text-muted-foreground">({formatPeriodLabel(data[stats.peakIdx].period, granularity)})</span>
            </div>
          )}
          {view !== "debit" && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-credit" />
              <span className="text-muted-foreground">Top inflow</span>
              <span className="font-serif tabular-nums">{formatCurrency(data[stats.peakCreditIdx].total_credited)}</span>
            </div>
          )}
        </div>
      )}

      {/* Chart area */}
      <div className="px-4 py-4">
        {loading ? (
          <Skeleton className="h-48 w-full rounded" />
        ) : data.length === 0 ? (
          <EmptyState icon={BarChart3} title="No data for this period" />
        ) : (
          <div>
            {/* Tooltip */}
            {hoveredIdx !== null && (
              <div className="mb-2 px-3 py-1.5 rounded bg-accent text-[11px] flex items-center gap-3">
                <span className="font-medium">{formatPeriodLabel(data[hoveredIdx].period, granularity)}</span>
                {view !== "credit" && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-debit" />
                    <span className="font-serif tabular-nums">{formatCurrency(data[hoveredIdx].total_debited)}</span>
                  </span>
                )}
                {view !== "debit" && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-credit" />
                    <span className="font-serif tabular-nums">{formatCurrency(data[hoveredIdx].total_credited)}</span>
                  </span>
                )}
                <span className="text-muted-foreground">{data[hoveredIdx].transaction_count} txns</span>
              </div>
            )}

            {/* Bar chart */}
            <div className="relative h-48 flex items-end gap-[2px]">
              {/* Ruled guide lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="border-b border-border/60 w-full" />
                ))}
              </div>

              {/* Y-axis labels */}
              <div className="absolute left-0 inset-y-0 flex flex-col justify-between pointer-events-none text-[9px] text-muted-foreground font-serif tabular-nums">
                <span>{formatCurrency(maxVal)}</span>
                <span>{formatCurrency(maxVal * 0.66)}</span>
                <span>{formatCurrency(maxVal * 0.33)}</span>
                <span>0</span>
              </div>

              {/* Bars */}
              <div className="flex items-end gap-[2px] flex-1 h-full pl-14">
                {data.map((d, i) => {
                  const debitH = (d.total_debited / maxVal) * 100;
                  const creditH = (d.total_credited / maxVal) * 100;
                  const isHovered = hoveredIdx === i;
                  const barDelay = `${i * 25}ms`;

                  return (
                    <div
                      key={d.period}
                      className="flex-1 flex flex-col items-center gap-[1px] h-full justify-end cursor-pointer relative"
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      {/* Debit bar */}
                      {view !== "credit" && (
                        <div
                          className={cn(
                            "w-full rounded-t-sm transition-all duration-150 origin-bottom",
                            isHovered ? "opacity-100" : "opacity-75",
                          )}
                          style={{
                            height: animated ? `${Math.max(debitH, 0.5)}%` : "0%",
                            background: "var(--color-debit)",
                            transition: `height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${barDelay}`,
                          }}
                        />
                      )}

                      {/* Credit bar */}
                      {view !== "debit" && (
                        <div
                          className={cn(
                            "w-full rounded-t-sm transition-all duration-150 origin-bottom",
                            isHovered ? "opacity-100" : "opacity-55",
                          )}
                          style={{
                            height: animated ? `${Math.max(creditH, 0.5)}%` : "0%",
                            background: "var(--color-credit)",
                            transition: `height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${barDelay}`,
                          }}
                        />
                      )}

                      {isHovered && (
                        <div className="absolute inset-0 rounded-sm bg-foreground/5 pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex pl-14 mt-1.5 gap-[2px]">
              {data.map((d, i) => {
                const showLabel = data.length <= 14 || i % Math.ceil(data.length / 10) === 0;
                return (
                  <div key={d.period} className="flex-1 text-center">
                    {showLabel && (
                      <span className={cn(
                        "text-[8px] tabular-nums transition-colors",
                        hoveredIdx === i ? "text-foreground font-medium" : "text-muted-foreground",
                      )}>
                        {formatPeriodLabel(d.period, granularity)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {!loading && data.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border text-[11px] text-muted-foreground">
          {view !== "credit" && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-6 rounded-full bg-debit opacity-75" />
              Debits
            </span>
          )}
          {view !== "debit" && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-6 rounded-full bg-credit opacity-55" />
              Credits
            </span>
          )}
          <span className="ml-auto tabular-nums font-serif">{data.length} {granularity === "daily" ? "days" : granularity === "weekly" ? "weeks" : "months"}</span>
        </div>
      )}
    </div>
  );
}
