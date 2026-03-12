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
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  if (!data) {
    return <p className="text-muted-foreground">Merchant not found</p>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link to="/merchants" className="text-muted-foreground hover:text-foreground transition-colors">
          Merchants
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">
          {data.display_name || data.merchant_name}
        </span>
      </nav>

      {/* Merchant header card */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary text-sm font-bold">
            {(data.display_name || data.merchant_name).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">
              {data.display_name || data.merchant_name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
              {data.category_name ? (
                <Badge variant="secondary" className="font-medium">{data.category_name}</Badge>
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
              {data.vpa && (
                <span className="font-mono text-[11px]">{data.vpa}</span>
              )}
              {data.variants.length > 1 && (
                <span>{data.variants.length} variants</span>
              )}
            </div>
          </div>
        </div>

        {data.variants.length > 1 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Variants</p>
            <div className="flex flex-wrap gap-1.5">
              {data.variants.map((v, i) => {
                const name = (v as Record<string, string>).name;
                return name ? (
                  <Badge key={i} variant="outline" className="text-[11px] font-normal">
                    {name}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>

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
