import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchCategoryDetail } from "@/lib/api";
import type { CategoryDetailResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import TransactionTable from "@/components/transactions/TransactionTable";
import StatRow from "@/components/shared/StatRow";
import { ChevronRight } from "lucide-react";

export default function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { startDate, endDate } = useDateRange();
  const [data, setData] = useState<CategoryDetailResponse | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetchCategoryDetail(Number(id), startDate, endDate, page)
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
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  if (!data) {
    return <p className="text-muted-foreground">Category not found</p>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link to="/categories" className="text-muted-foreground hover:text-foreground transition-colors">
          Categories
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium flex items-center gap-1.5">
          {data.icon && <span className="text-base">{data.icon}</span>}
          {data.category_name}
        </span>
      </nav>

      <StatRow
        stats={[
          {
            label: "Total Debited",
            value: formatCurrency(data.total_debited),
            color: "text-debit",
          },
          {
            label: "Total Credited",
            value: formatCurrency(data.total_credited),
            color: "text-credit",
          },
          {
            label: "Transactions",
            value: data.transaction_count.toLocaleString("en-IN"),
          },
        ]}
      />

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
