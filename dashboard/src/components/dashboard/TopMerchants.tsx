import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchMerchantBreakdown } from "@/lib/api";
import type { MerchantBreakdownItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Merchants</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No data for this period
          </p>
        ) : (
          <ul className="space-y-1">
            {data.map((m, i) => (
              <li
                key={m.merchant_id}
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent transition-colors cursor-pointer"
                onClick={() => navigate(`/merchant/${m.merchant_id}`)}
              >
                <span className="text-xs text-muted-foreground w-5 text-right">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.display_name || m.merchant_name}
                  </p>
                  {m.category_name && (
                    <Badge variant="secondary" className="text-[10px] mt-0.5">
                      {m.category_name}
                    </Badge>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium tabular-nums">
                    {formatCurrency(m.total_amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {m.transaction_count} txns
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
