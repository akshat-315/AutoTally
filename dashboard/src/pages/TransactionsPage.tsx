import { useCallback, useEffect, useState } from "react";
import { useDateRange } from "@/hooks/use-date-range";
import { fetchTransactions } from "@/lib/api";
import type { TransactionItem, PaginationMeta } from "@/lib/types";
import TransactionFilters from "@/components/transactions/TransactionFilters";
import TransactionTable from "@/components/transactions/TransactionTable";
import { Skeleton } from "@/components/ui/skeleton";

interface Filters {
  direction: string;
  category_id: string;
  search: string;
  min_amount: string;
  max_amount: string;
}

const defaultFilters: Filters = {
  direction: "",
  category_id: "",
  search: "",
  min_amount: "",
  max_amount: "",
};

export default function TransactionsPage() {
  const { startDate, endDate } = useDateRange();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    per_page: 20,
    total_count: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {
      start_date: startDate,
      end_date: endDate,
      sort_by: sortBy,
      sort_order: sortOrder,
      page: String(page),
      per_page: "20",
    };
    if (filters.direction) params.direction = filters.direction;
    if (filters.category_id) params.category_id = filters.category_id;
    if (filters.search) params.search = filters.search;
    if (filters.min_amount) params.min_amount = filters.min_amount;
    if (filters.max_amount) params.max_amount = filters.max_amount;

    fetchTransactions(params)
      .then((res) => {
        setTransactions(res.transactions);
        setPagination(res.pagination);
      })
      .finally(() => setLoading(false));
  }, [startDate, endDate, filters, sortBy, sortOrder, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilterChange = (f: Filters) => {
    setFilters(f);
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <TransactionFilters filters={filters} onChange={handleFilterChange} />
      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <TransactionTable
          transactions={transactions}
          pagination={pagination}
          onPageChange={setPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      )}
    </div>
  );
}
