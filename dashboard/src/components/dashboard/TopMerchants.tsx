import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchMerchantBreakdown } from "@/lib/api";
import type { MerchantBreakdownItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import EmptyState from "@/components/shared/EmptyState";
import { Store } from "lucide-react";

export default function TopMerchants() {
  const { startDate, endDate } = useDateRange();
  const [data, setData] = useState<MerchantBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetchMerchantBreakdown(startDate, endDate, "debit", 10)
      .then(setData)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  return (
    <div className="border border-border rounded bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Top Merchants</h2>
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={Store} title="No data for this period" />
      ) : (
        <div className="divide-y divide-border">
          {data.map((m, i) => (
            <div
              key={m.merchant_id}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(`/merchant/${m.merchant_id}`)}
            >
              {/* Rank */}
              <span className="text-[11px] text-muted-foreground tabular-nums w-4 text-right shrink-0">
                {i + 1}
              </span>

              {/* Name + txns */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">
                  {m.display_name || m.merchant_name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {m.transaction_count} txns
                </p>
              </div>

              {/* Amount */}
              <span className="font-serif text-sm tabular-nums shrink-0">
                {formatCurrency(m.total_amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
