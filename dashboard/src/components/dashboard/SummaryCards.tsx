import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchSummary } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-32" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      title: "Total Debited",
      value: formatCurrency(data.total_debited),
      sub: `${data.debit_count} transactions`,
      color: "text-red-500",
    },
    {
      title: "Total Credited",
      value: formatCurrency(data.total_credited),
      sub: `${data.credit_count} transactions`,
      color: "text-green-500",
    },
    {
      title: "Net Flow",
      value: formatCurrency(data.net),
      sub: data.net >= 0 ? "Positive" : "Negative",
      color: data.net >= 0 ? "text-green-500" : "text-red-500",
    },
    {
      title: "Transactions",
      value: data.transaction_count.toLocaleString("en-IN"),
      sub: "Total count",
      color: "text-foreground",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {c.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
