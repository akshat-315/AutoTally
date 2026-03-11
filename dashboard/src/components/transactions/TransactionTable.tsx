import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TransactionItem, PaginationMeta, Category } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { fetchCategories, updateTransactionCategory } from "@/lib/api";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

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
    if (sortBy !== field) return "";
    return sortOrder === "asc" ? " \u2191" : " \u2193";
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead
                className="cursor-pointer select-none text-xs font-medium text-muted-foreground"
                onClick={() => onSort("date")}
              >
                Date{sortIndicator("date")}
              </TableHead>
              <TableHead className="hidden md:table-cell text-xs font-medium text-muted-foreground w-10">
                Type
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right text-xs font-medium text-muted-foreground"
                onClick={() => onSort("amount")}
              >
                Amount{sortIndicator("amount")}
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Merchant
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Category
              </TableHead>
              <TableHead className="hidden lg:table-cell text-xs font-medium text-muted-foreground">
                Bank
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground text-sm"
                >
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => {
                const override = overrides[tx.id];
                const catId = override ? override.category_id : tx.category_id;
                const catName = override
                  ? override.category_name
                  : tx.category_name;

                return (
                  <TableRow key={tx.id} className="border-b border-border">
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(tx.transaction_date)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {tx.direction === "debit" ? (
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-sm">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell>
                      {tx.merchant_id ? (
                        <button
                          className="text-sm hover:underline text-left"
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
                        <span className="text-sm text-muted-foreground">
                          {tx.merchant_raw || "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={catId != null ? String(catId) : "__none__"}
                        onValueChange={(val) =>
                          val && handleCategoryChange(tx.id, val)
                        }
                      >
                        <SelectTrigger size="sm" className="min-w-[120px] border-0 shadow-none px-0">
                          <SelectValue>
                            {catName ? (
                              <Badge
                                variant="secondary"
                                className="text-xs cursor-pointer"
                              >
                                {catName}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">
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
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {tx.bank}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.total_pages} ({pagination.total_count} total)
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
