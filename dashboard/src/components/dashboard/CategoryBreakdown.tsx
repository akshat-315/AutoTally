import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchCategoryBreakdown } from "@/lib/api";
import type { CategoryBreakdownItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const COLORS = [
  "#6366f1", "#f43f5e", "#f59e0b", "#22c55e", "#06b6d4",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b",
];

export default function CategoryBreakdown() {
  const { startDate, endDate } = useDateRange();
  const [data, setData] = useState<CategoryBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetchCategoryBreakdown(startDate, endDate, "debit")
      .then(setData)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  const total = data.reduce((s, d) => s + d.total_debited, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-16 text-center">
            No data for this period
          </p>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="w-48 h-48 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="total_debited"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="flex-1 space-y-2 w-full">
              {data.map((item, i) => {
                const pct = total > 0 ? (item.total_debited / total) * 100 : 0;
                return (
                  <li
                    key={item.category_id ?? "uncategorized"}
                    className="flex items-center gap-3 cursor-pointer rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
                    onClick={() => item.category_id && navigate(`/category/${item.category_id}`)}
                  >
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm flex-1 truncate">
                      {item.icon ? `${item.icon} ` : ""}
                      {item.category_name}
                    </span>
                    <span className="text-sm font-medium tabular-nums">
                      {formatCurrency(item.total_debited)}
                    </span>
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
