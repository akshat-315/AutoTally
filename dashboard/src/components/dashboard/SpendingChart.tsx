import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchTimeSeries } from "@/lib/api";
import type { TimeSeriesItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spending Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-16 text-center">
            No data for this period
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) => formatCurrency(v)}
                width={80}
                className="fill-muted-foreground"
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.5rem",
                  color: "var(--color-card-foreground)",
                }}
              />
              <Area
                type="monotone"
                dataKey="total_debited"
                name="Debited"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.15}
              />
              <Area
                type="monotone"
                dataKey="total_credited"
                name="Credited"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
