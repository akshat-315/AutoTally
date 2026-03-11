import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchCategoryBreakdown } from "@/lib/api";
import type { CategoryBreakdownItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import SectionHeader from "@/components/shared/SectionHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Tag } from "lucide-react";

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
    <div>
      <SectionHeader className="mb-4">Spending by Category</SectionHeader>
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : data.length === 0 ? (
        <EmptyState icon={Tag} title="No data for this period" />
      ) : (
        <ul className="space-y-2.5">
          {data.map((item, i) => {
            const pct = total > 0 ? (item.total_debited / total) * 100 : 0;
            return (
              <li
                key={item.category_id ?? "uncategorized"}
                className="group cursor-pointer rounded-md px-2 py-2 hover:bg-accent transition-colors"
                onClick={() => item.category_id && navigate(`/category/${item.category_id}`)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm font-medium truncate">
                      {item.icon ? `${item.icon} ` : ""}
                      {item.category_name}
                    </span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {formatCurrency(item.total_debited)}
                  </span>
                </div>
                <div className="ml-5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: COLORS[i % COLORS.length],
                      opacity: 0.7,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
