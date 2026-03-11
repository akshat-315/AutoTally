import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchTimeSeries } from "@/lib/api";
import type { TimeSeriesItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import SectionHeader from "@/components/shared/SectionHeader";
import EmptyState from "@/components/shared/EmptyState";
import { BarChart3 } from "lucide-react";

function getGranularity(start: string, end: string): string {
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
  if (diff <= 31) return "daily";
  if (diff <= 90) return "weekly";
  return "monthly";
}

export default function SpendingChart() {
  const { startDate, endDate } = useDateRange();
  const [data, setData] = useState<TimeSeriesItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const granularity = getGranularity(startDate, endDate);
    fetchTimeSeries(startDate, endDate, granularity)
      .then(setData)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  return (
    <div>
      <SectionHeader className="mb-4">Spending Over Time</SectionHeader>
      {loading ? (
        <Skeleton className="h-60 w-full" />
      ) : data.length === 0 ? (
        <EmptyState icon={BarChart3} title="No data for this period" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCurrency(v)}
              width={72}
              className="fill-muted-foreground"
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{
                backgroundColor: "var(--color-popover)",
                border: "none",
                borderRadius: "0.5rem",
                color: "var(--color-popover-foreground)",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />
            <Area
              type="monotone"
              dataKey="total_debited"
              name="Debited"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.08}
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="total_credited"
              name="Credited"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.08}
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
