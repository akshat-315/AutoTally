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
    <div>
      <SectionHeader className="mb-4">Top Merchants</SectionHeader>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={Store} title="No data for this period" />
      ) : (
        <ul className="space-y-0.5">
          {data.map((m) => (
            <li
              key={m.merchant_id}
              className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-accent transition-colors cursor-pointer"
              onClick={() => navigate(`/merchant/${m.merchant_id}`)}
            >
              <span className="text-sm font-medium truncate">
                {m.display_name || m.merchant_name}
              </span>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {m.transaction_count} txns
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {formatCurrency(m.total_amount)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
