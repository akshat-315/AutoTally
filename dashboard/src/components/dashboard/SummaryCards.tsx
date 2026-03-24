import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchSummary } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
      <div className="grid grid-cols-2 gap-px border border-border rounded bg-border lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card p-4">
            <Skeleton className="h-3 w-16 mb-3" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      label: "Debited",
      value: formatCurrency(data.total_debited),
      sub: `${data.debit_count} transactions`,
      color: "text-debit",
    },
    {
      label: "Credited",
      value: formatCurrency(data.total_credited),
      sub: `${data.credit_count} transactions`,
      color: "text-credit",
    },
    {
      label: "Net Flow",
      value: formatCurrency(Math.abs(data.net)),
      sub: data.net >= 0 ? "Surplus" : "Deficit",
      color: data.net >= 0 ? "text-credit" : "text-debit",
      prefix: data.net >= 0 ? "+" : "-",
    },
    {
      label: "Transactions",
      value: data.transaction_count.toLocaleString("en-IN"),
      sub: "Total count",
      color: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px border border-border rounded bg-border lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card p-4"
        >
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
            {card.label}
          </p>
          <p className={cn("font-serif text-xl sm:text-2xl tabular-nums mt-1.5 tracking-tight", card.color)}>
            {card.prefix}{card.value}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
