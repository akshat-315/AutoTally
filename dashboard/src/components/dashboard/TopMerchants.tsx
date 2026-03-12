import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchMerchantBreakdown } from "@/lib/api";
import type { MerchantBreakdownItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import SectionHeader from "@/components/shared/SectionHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Store } from "lucide-react";

const AVATAR_COLORS = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
  "bg-chart-5/15 text-chart-5",
];

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export default function TopMerchants() {
  const { startDate, endDate } = useDateRange();
  const [data, setData] = useState<MerchantBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const maxAmount = data.length > 0 ? Math.max(...data.map((m) => m.total_amount)) : 0;

  useEffect(() => {
    setLoading(true);
    fetchMerchantBreakdown(startDate, endDate, "debit", 10)
      .then(setData)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <SectionHeader className="mb-4">Top Merchants</SectionHeader>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={Store} title="No data for this period" />
      ) : (
        <ul className="space-y-1">
          {data.map((m, i) => {
            const barWidth = maxAmount > 0 ? (m.total_amount / maxAmount) * 100 : 0;
            return (
              <li
                key={m.merchant_id}
                className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors overflow-hidden"
                onClick={() => navigate(`/merchant/${m.merchant_id}`)}
              >
                {/* Background bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-muted/50 rounded-lg transition-all duration-500 ease-out"
                  style={{ width: `${barWidth}%` }}
                />

                {/* Avatar */}
                <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                  {getInitials(m.display_name || m.merchant_name)}
                </div>

                <div className="relative flex-1 min-w-0 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.display_name || m.merchant_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {m.transaction_count} txns
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {formatCurrency(m.total_amount)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
