import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchSummary } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, ArrowUpDown, Wallet } from "lucide-react";

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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-3 w-16 mb-3" />
            <Skeleton className="h-8 w-28" />
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
      icon: TrendingUp,
      glow: "glow-debit",
      iconColor: "text-debit",
      iconBg: "bg-debit-muted",
    },
    {
      label: "Credited",
      value: formatCurrency(data.total_credited),
      sub: `${data.credit_count} transactions`,
      icon: TrendingDown,
      glow: "glow-credit",
      iconColor: "text-credit",
      iconBg: "bg-credit-muted",
    },
    {
      label: "Net Flow",
      value: formatCurrency(Math.abs(data.net)),
      sub: data.net >= 0 ? "Surplus" : "Deficit",
      icon: Wallet,
      glow: data.net >= 0 ? "glow-credit" : "glow-debit",
      iconColor: data.net >= 0 ? "text-credit" : "text-debit",
      iconBg: data.net >= 0 ? "bg-credit-muted" : "bg-debit-muted",
      prefix: data.net >= 0 ? "+" : "-",
    },
    {
      label: "Transactions",
      value: data.transaction_count.toLocaleString("en-IN"),
      sub: "Total count",
      icon: ArrowUpDown,
      glow: "glow-primary",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            "glow-card relative rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
            card.glow,
          )}
        >
          <div className="relative flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-xl sm:text-2xl font-bold tabular-nums mt-2 tracking-tight truncate">
                {card.prefix}{card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </div>
            <div className={cn("rounded-lg p-2 shrink-0", card.iconBg)}>
              <card.icon className={cn("h-4 w-4", card.iconColor)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
