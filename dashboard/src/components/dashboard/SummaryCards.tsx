import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchSummary } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import StatRow from "@/components/shared/StatRow";

export default function SummaryCards() {
  const { startDate, endDate } = useDateRange();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSummary(startDate, endDate)
      .then(setData)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <StatRow
      stats={[
        {
          label: "Total Debited",
          value: formatCurrency(data.total_debited),
          sub: `${data.debit_count} transactions`,
          color: "text-red-500",
        },
        {
          label: "Total Credited",
          value: formatCurrency(data.total_credited),
          sub: `${data.credit_count} transactions`,
          color: "text-green-500",
        },
        {
          label: "Net Flow",
          value: formatCurrency(data.net),
          sub: data.net >= 0 ? "Positive" : "Negative",
          color: data.net >= 0 ? "text-green-500" : "text-red-500",
        },
        {
          label: "Transactions",
          value: data.transaction_count.toLocaleString("en-IN"),
          sub: "Total count",
        },
      ]}
    />
  );
}
