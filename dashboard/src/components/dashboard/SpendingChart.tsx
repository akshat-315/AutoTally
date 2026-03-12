import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchTimeSeries } from "@/lib/api";
import type { TimeSeriesItem } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import SectionHeader from "@/components/shared/SectionHeader";
import EmptyState from "@/components/shared/EmptyState";
import { BarChart3, TrendingUp, TrendingDown, Zap } from "lucide-react";

function getGranularity(start: string, end: string): string {
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
  if (diff <= 31) return "daily";
  if (diff <= 90) return "weekly";
  return "monthly";
}

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatPeriodLabel(period: string, granularity: string): string {
  if (granularity === "weekly") {
    // Format: "2026-W10" → "W10"
    const wMatch = period.match(/W(\d+)$/);
    return wMatch ? `W${wMatch[1]}` : period;
  }
  if (granularity === "monthly") {
    // Format: "2026-03" → "Mar '26"
    const parts = period.split("-");
    if (parts.length >= 2) {
      const monthIdx = parseInt(parts[1], 10) - 1;
      return `${MONTH_SHORT[monthIdx] ?? parts[1]} '${parts[0].slice(2)}`;
    }
    return period;
  }
  // Daily: "2026-03-12" → "12 Mar"
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

  // Trigger animation after data loads
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
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-0">
        <SectionHeader
          className="mb-4"
          action={
            <div className="flex rounded-lg border border-border p-0.5 bg-background">
              {viewOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setView(opt.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200",
                    view === opt.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
        >
          Cash Flow
        </SectionHeader>

        {/* Quick stats strip */}
        {stats && !loading && (
          <div className="flex flex-wrap gap-4 mb-5">
            {view !== "credit" && (
              <div className="flex items-center gap-2 text-xs"
                style={{ animation: "fade-up 0.4s ease both" }}>
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-debit-muted">
                  <TrendingUp className="h-3 w-3 text-debit" />
                </div>
                <div>
                  <span className="text-muted-foreground">Avg spend</span>
                  <span className="ml-1.5 font-semibold tabular-nums">{formatCurrency(stats.avgDebited)}</span>
                  <span className="text-muted-foreground">/{granularity === "daily" ? "day" : granularity === "weekly" ? "week" : "month"}</span>
                </div>
              </div>
            )}
            {view !== "credit" && (
              <div className="flex items-center gap-2 text-xs"
                style={{ animation: "fade-up 0.4s ease 0.1s both" }}>
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-debit-muted">
                  <Zap className="h-3 w-3 text-debit" />
                </div>
                <div>
                  <span className="text-muted-foreground">Peak</span>
                  <span className="ml-1.5 font-semibold tabular-nums">{formatCurrency(data[stats.peakIdx].total_debited)}</span>
                  <span className="text-muted-foreground ml-1">({formatPeriodLabel(data[stats.peakIdx].period, granularity)})</span>
                </div>
              </div>
            )}
            {view !== "debit" && (
              <div className="flex items-center gap-2 text-xs"
                style={{ animation: "fade-up 0.4s ease 0.15s both" }}>
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-credit-muted">
                  <TrendingDown className="h-3 w-3 text-credit" />
                </div>
                <div>
                  <span className="text-muted-foreground">Top inflow</span>
                  <span className="ml-1.5 font-semibold tabular-nums">{formatCurrency(data[stats.peakCreditIdx].total_credited)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart area */}
      <div className="px-5 pb-5">
        {loading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : data.length === 0 ? (
          <EmptyState icon={BarChart3} title="No data for this period" />
        ) : (
          <div>
            {/* Tooltip */}
            {hoveredIdx !== null && (
              <div
                className="mb-2 px-3 py-2 rounded-lg bg-accent text-xs flex items-center gap-4 transition-all"
                style={{ animation: "fade-up 0.15s ease both" }}
              >
                <span className="font-medium">{formatPeriodLabel(data[hoveredIdx].period, granularity)}</span>
                {view !== "credit" && (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-debit" />
                    <span className="text-muted-foreground">Spent</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(data[hoveredIdx].total_debited)}</span>
                  </span>
                )}
                {view !== "debit" && (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-credit" />
                    <span className="text-muted-foreground">Received</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(data[hoveredIdx].total_credited)}</span>
                  </span>
                )}
                <span className="text-muted-foreground">
                  {data[hoveredIdx].transaction_count} txns
                </span>
              </div>
            )}

            {/* Bar chart */}
            <div className="relative h-56 flex items-end gap-[2px]">
              {/* Horizontal guide lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="border-b border-border/40 w-full" />
                ))}
              </div>

              {/* Y-axis labels */}
              <div className="absolute left-0 inset-y-0 flex flex-col justify-between pointer-events-none text-[10px] text-muted-foreground tabular-nums">
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
                  const isPeak = stats && i === stats.peakIdx && view !== "credit";
                  const isHovered = hoveredIdx === i;
                  const barDelay = `${i * 25}ms`;

                  return (
                    <div
                      key={d.period}
                      className="flex-1 flex flex-col items-center gap-[1px] h-full justify-end cursor-pointer group relative"
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      {/* Peak indicator */}
                      {isPeak && animated && (
                        <div
                          className="absolute -top-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-debit"
                          style={{ animation: "pulse-glow 2s ease-in-out infinite" }}
                        />
                      )}

                      {/* Debit bar */}
                      {view !== "credit" && (
                        <div
                          className={cn(
                            "w-full rounded-t-sm transition-all duration-150 origin-bottom",
                            isHovered ? "opacity-100" : "opacity-80",
                          )}
                          style={{
                            height: animated ? `${Math.max(debitH, 0.5)}%` : "0%",
                            background: isPeak
                              ? "linear-gradient(to top, var(--color-debit), oklch(0.75 0.22 25))"
                              : "var(--color-debit)",
                            transition: `height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${barDelay}`,
                          }}
                        />
                      )}

                      {/* Credit bar */}
                      {view !== "debit" && (
                        <div
                          className={cn(
                            "w-full rounded-t-sm transition-all duration-150 origin-bottom",
                            isHovered ? "opacity-100" : "opacity-60",
                          )}
                          style={{
                            height: animated ? `${Math.max(creditH, 0.5)}%` : "0%",
                            background: "var(--color-credit)",
                            transition: `height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${barDelay}`,
                          }}
                        />
                      )}

                      {/* Hover highlight */}
                      {isHovered && (
                        <div className="absolute inset-0 rounded-sm bg-foreground/5 pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex pl-14 mt-2 gap-[2px]">
              {data.map((d, i) => {
                // Show every nth label to avoid crowding
                const showLabel = data.length <= 14 || i % Math.ceil(data.length / 10) === 0;
                return (
                  <div key={d.period} className="flex-1 text-center">
                    {showLabel && (
                      <span className={cn(
                        "text-[9px] tabular-nums transition-colors",
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

      {/* Legend footer */}
      {!loading && data.length > 0 && (
        <div className="flex items-center gap-4 px-5 py-3 border-t border-border text-xs text-muted-foreground">
          {view !== "credit" && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-8 rounded-full bg-debit opacity-80" />
              Debits
            </span>
          )}
          {view !== "debit" && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-8 rounded-full bg-credit opacity-60" />
              Credits
            </span>
          )}
          <span className="ml-auto tabular-nums">{data.length} {granularity === "daily" ? "days" : granularity === "weekly" ? "weeks" : "months"}</span>
        </div>
      )}
    </div>
  );
}
