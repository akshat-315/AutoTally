import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchCategoryBreakdown } from "@/lib/api";
import type { CategoryBreakdownItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import EmptyState from "@/components/shared/EmptyState";
import { Tag } from "lucide-react";

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
    <div className="border border-border rounded bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Where Your Money Goes</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {total > 0 ? `${formatCurrency(total)} across ${data.length} categories` : "Category spending breakdown"}
        </p>
      </div>

      <div className="divide-y divide-border">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <Skeleton className="h-5 w-full" />
            </div>
          ))
        ) : data.length === 0 ? (
          <EmptyState icon={Tag} title="No spending data" />
        ) : (
          data.map((item) => {
            const pct = total > 0 ? (item.total_debited / total) * 100 : 0;

            return (
              <div
                key={item.category_id ?? "uncategorized"}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => item.category_id != null && navigate(`/category/${item.category_id}`)}
              >
                {/* Icon */}
                <span className="text-base w-6 text-center shrink-0">
                  {item.icon || item.category_name.charAt(0).toUpperCase()}
                </span>

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-medium truncate">{item.category_name}</span>
                    <span className="font-serif text-sm tabular-nums shrink-0">
                      {formatCurrency(item.total_debited)}
                    </span>
                  </div>
                  {/* Proportion bar */}
                  <div className="mt-1 h-1 w-full rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Percentage */}
                <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right shrink-0">
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
