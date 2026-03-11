import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchMerchantDetail, fetchCategories, categorizeMerchant } from "@/lib/api";
import type { MerchantDetailResponse, Category } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import TransactionTable from "@/components/transactions/TransactionTable";
import StatRow from "@/components/shared/StatRow";
import { ChevronRight } from "lucide-react";

export default function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { startDate, endDate } = useDateRange();
  const [data, setData] = useState<MerchantDetailResponse | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchMerchantDetail(Number(id), startDate, endDate, page),
      fetchCategories(),
    ])
      .then(([d, c]) => {
        setData(d);
        setCategories(c);
      })
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

  const handleCategorize = async (categoryId: number) => {
    if (!data) return;
    const updated = await categorizeMerchant(Number(id), categoryId);
    setData({
      ...data,
      category_id: updated.category_id,
      category_name: updated.category_name,
    });
  };

  if (loading && !data) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!data) {
    return <p className="text-muted-foreground">Merchant not found</p>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/merchants" className="hover:text-foreground transition-colors">
          Merchants
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">
          {data.display_name || data.merchant_name}
        </span>
      </div>

      {/* Metadata */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {data.category_name ? (
            <Badge variant="secondary">{data.category_name}</Badge>
          ) : (
            <Select
              value=""
              onValueChange={(val) => {
                const catId = Number(val);
                if (!isNaN(catId)) handleCategorize(catId);
              }}
            >
              <SelectTrigger size="sm" className="w-auto min-w-[140px]">
                <SelectValue placeholder="Set category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.icon ? `${c.icon} ` : ""}{c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {(data.vpa || data.variants.length > 1) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {data.vpa && (
              <span className="font-mono">{data.vpa}</span>
            )}
            {data.variants.length > 1 && (
              <span>
                {data.variants.length} variants:{" "}
                {data.variants
                  .map((v) => (v as Record<string, string>).name || "")
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}
          </div>
        )}
      </div>

      <StatRow
        stats={[
          {
            label: "Total Debited",
            value: formatCurrency(data.total_debited),
            color: "text-red-500",
          },
          {
            label: "Total Credited",
            value: formatCurrency(data.total_credited),
            color: "text-green-500",
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
