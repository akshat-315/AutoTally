import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchMerchantDetail } from "@/lib/api";
import type { MerchantDetailResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import TransactionTable from "@/components/transactions/TransactionTable";

export default function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { startDate, endDate } = useDateRange();
  const [data, setData] = useState<MerchantDetailResponse | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetchMerchantDetail(Number(id), startDate, endDate, page)
      .then(setData)
      .finally(() => setLoading(false));
  }, [id, startDate, endDate, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  if (loading && !data) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!data) {
    return <p className="text-muted-foreground">Merchant not found</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Dashboard
        </Link>
        <h1 className="text-xl font-semibold mt-1">
          {data.display_name || data.merchant_name}
        </h1>
        <div className="flex flex-wrap gap-2 mt-1">
          {data.category_name && <Badge variant="secondary">{data.category_name}</Badge>}
          {data.vpa && (
            <span className="text-xs text-muted-foreground font-mono">{data.vpa}</span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Debited</p>
            <p className="text-xl font-bold text-red-500">{formatCurrency(data.total_debited)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Credited</p>
            <p className="text-xl font-bold text-green-500">{formatCurrency(data.total_credited)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="text-xl font-bold">{data.transaction_count}</p>
          </CardContent>
        </Card>
      </div>

      {data.variants.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium mb-2">Variants ({data.variants.length})</p>
            <div className="flex flex-wrap gap-2">
              {data.variants.map((v, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {(v as Record<string, string>).name || `Variant ${i + 1}`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <TransactionTable
        transactions={data.transactions}
        pagination={data.pagination}
        onPageChange={setPage}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />
    </div>
  );
}
