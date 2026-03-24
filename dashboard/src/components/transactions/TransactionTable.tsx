import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TransactionItem, PaginationMeta, Category } from "@/lib/types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { fetchCategories, updateTransactionCategory } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  transactions: TransactionItem[];
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  sortBy: string;
  sortOrder: string;
  onSort: (field: string) => void;
}

export default function TransactionTable({
  transactions,
  pagination,
  onPageChange,
  sortBy,
  sortOrder,
  onSort,
}: Props) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [overrides, setOverrides] = useState<
    Record<number, { category_id: number | null; category_name: string | null }>
  >({});

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  const handleCategoryChange = async (txnId: number, value: string) => {
    const categoryId = value === "__none__" ? null : Number(value);
    await updateTransactionCategory(txnId, categoryId);
    const cat = categories.find((c) => c.id === categoryId);
    setOverrides((prev) => ({
      ...prev,
      [txnId]: {
        category_id: categoryId,
        category_name: cat?.name ?? null,
      },
    }));
  };

  const sortIndicator = (field: string) => {
    if (sortBy !== field) return null;
    return (
      <span className="ml-0.5 text-primary">
        {sortOrder === "asc" ? "\u2191" : "\u2193"}
      </span>
    );
  };

  return (
    <div className="border border-border rounded bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border">
              <th
                className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest cursor-pointer select-none"
                onClick={() => onSort("date")}
              >
                Date{sortIndicator("date")}
              </th>
              <th className="hidden md:table-cell text-left px-2 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest w-12">
                Type
              </th>
              <th
                className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest cursor-pointer select-none"
                onClick={() => onSort("amount")}
              >
                Amount{sortIndicator("amount")}
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Merchant
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Category
              </th>
              <th className="hidden lg:table-cell text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Bank
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-12 text-muted-foreground text-sm"
                >
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const override = overrides[tx.id];
                const catId = override ? override.category_id : tx.category_id;
                const catName = override
                  ? override.category_name
                  : tx.category_name;

                return (
                  <tr
                    key={tx.id}
                    className="border-b border-border/60 transition-colors hover:bg-accent/30"
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                      {formatDate(tx.transaction_date)}
                    </td>
                    <td className="hidden md:table-cell px-2 py-2.5">
                      <span className={cn(
                        "text-[11px] font-medium",
                        tx.direction === "debit" ? "text-debit" : "text-credit",
                      )}>
                        {tx.direction === "debit" ? "DR" : "CR"}
                      </span>
                    </td>
                    <td className={cn(
                      "text-right px-4 py-2.5 font-serif tabular-nums whitespace-nowrap",
                      tx.direction === "debit" ? "text-debit" : "text-credit",
                    )}>
                      {tx.direction === "debit" ? "-" : "+"}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      {tx.merchant_id ? (
                        <button
                          className="text-[13px] font-medium hover:text-primary transition-colors text-left"
                          onClick={() =>
                            navigate(`/merchant/${tx.merchant_id}`)
                          }
                        >
                          {tx.merchant_display_name ||
                            tx.merchant_name ||
                            tx.merchant_raw ||
                            "-"}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">
                          {tx.merchant_raw || "-"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Select
                        value={catId != null ? String(catId) : "__none__"}
                        onValueChange={(val) =>
                          val && handleCategoryChange(tx.id, val)
                        }
                      >
                        <SelectTrigger size="sm" className="min-w-[110px] border-0 shadow-none px-0 bg-transparent h-auto">
                          <SelectValue>
                            {catName ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px] cursor-pointer font-medium"
                              >
                                {catName}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">
                                Add category
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            Uncategorized
                          </SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.icon ? `${c.icon} ` : ""}
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-2.5 text-muted-foreground">
                      {tx.bank}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
          <p className="text-[11px] text-muted-foreground tabular-nums">
            Page {pagination.page} of {pagination.total_pages}
            <span className="hidden sm:inline"> ({pagination.total_count.toLocaleString("en-IN")} total)</span>
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="h-6 w-6"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="h-6 w-6"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
