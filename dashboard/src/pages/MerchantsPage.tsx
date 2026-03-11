import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllMerchants, fetchCategories, categorizeMerchant } from "@/lib/api";
import type { MerchantItem, Category } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Search, CheckCircle2 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

type SortField = "name" | "category_name" | "transaction_count" | "last_seen" | "source";
type Tab = "all" | "review";

export default function MerchantsPage() {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("transaction_count");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [categories, setCategories] = useState<Category[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [recentlyCategorized, setRecentlyCategorized] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAllMerchants(), fetchCategories()])
      .then(([m, c]) => {
        setMerchants(m);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCategorize = async (merchantId: number, categoryId: number) => {
    const updated = await categorizeMerchant(merchantId, categoryId);
    setMerchants((prev) =>
      prev.map((m) =>
        m.id === merchantId
          ? { ...m, category_id: updated.category_id, category_name: updated.category_name, source: updated.source }
          : m
      )
    );
    if (tab === "review") {
      setRecentlyCategorized((prev) => new Set(prev).add(merchantId));
      setTimeout(() => {
        setRecentlyCategorized((prev) => {
          const next = new Set(prev);
          next.delete(merchantId);
          return next;
        });
      }, 600);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
  };

  const sortIndicator = (field: SortField) => {
    if (sortBy !== field) return "";
    return sortOrder === "asc" ? " \u2191" : " \u2193";
  };

  const uncategorizedCount = merchants.filter((m) => m.category_id === null).length;

  const filtered = merchants
    .filter((m) => {
      if (tab === "review") return m.category_id === null && !recentlyCategorized.has(m.id);
      return true;
    })
    .filter((m) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        (m.display_name?.toLowerCase().includes(q) ?? false) ||
        (m.vpa?.toLowerCase().includes(q) ?? false) ||
        (m.category_name?.toLowerCase().includes(q) ?? false)
      );
    })
    .sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;
      switch (sortBy) {
        case "name":
          return dir * (a.display_name || a.name).localeCompare(b.display_name || b.name);
        case "category_name":
          return dir * (a.category_name || "").localeCompare(b.category_name || "");
        case "transaction_count":
          return dir * (a.transaction_count - b.transaction_count);
        case "last_seen":
          return dir * ((a.last_seen || "").localeCompare(b.last_seen || ""));
        case "source":
          return dir * a.source.localeCompare(b.source);
        default:
          return 0;
      }
    });

  return (
    <div className="space-y-4">
      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1">
          <button
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              tab === "all"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
            onClick={() => setTab("all")}
          >
            All Merchants
          </button>
          <button
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5",
              tab === "review"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
            onClick={() => setTab("review")}
          >
            Review Queue
            {uncategorizedCount > 0 && (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
                  tab === "review"
                    ? "bg-background text-foreground"
                    : "bg-foreground/10 text-foreground",
                )}
              >
                {uncategorizedCount}
              </span>
            )}
          </button>
        </div>
        <div className="relative sm:ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search merchants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs sm:w-64"
          />
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : tab === "review" ? (
        /* Review Queue - Card layout */
        filtered.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up!"
            description="No uncategorized merchants to review."
          />
        ) : (
          <div className="mx-auto max-w-2xl space-y-3">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border bg-card p-4 shadow-[0_0_0_1px_var(--color-border)] transition-all animate-in fade-in slide-in-from-bottom-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-medium truncate cursor-pointer hover:underline"
                      onClick={() => navigate(`/merchant/${m.id}`)}
                    >
                      {m.display_name || m.name}
                    </p>
                    {m.vpa && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                        {m.vpa}
                      </p>
                    )}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{m.transaction_count} transactions</span>
                      {m.last_seen && <span>Last seen {formatDate(m.last_seen)}</span>}
                    </div>
                  </div>
                  <Select
                    value=""
                    onValueChange={(val) => {
                      const catId = Number(val);
                      if (!isNaN(catId)) handleCategorize(m.id, catId);
                    }}
                  >
                    <SelectTrigger size="sm" className="min-w-[150px] shrink-0">
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
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* All Merchants - Table layout */
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead
                    className="cursor-pointer select-none text-xs font-medium text-muted-foreground"
                    onClick={() => handleSort("name")}
                  >
                    Merchant{sortIndicator("name")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-xs font-medium text-muted-foreground"
                    onClick={() => handleSort("category_name")}
                  >
                    Category{sortIndicator("category_name")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-right text-xs font-medium text-muted-foreground"
                    onClick={() => handleSort("transaction_count")}
                  >
                    Transactions{sortIndicator("transaction_count")}
                  </TableHead>
                  <TableHead
                    className="hidden lg:table-cell cursor-pointer select-none text-xs font-medium text-muted-foreground"
                    onClick={() => handleSort("source")}
                  >
                    Source{sortIndicator("source")}
                  </TableHead>
                  <TableHead
                    className="hidden lg:table-cell cursor-pointer select-none text-xs font-medium text-muted-foreground"
                    onClick={() => handleSort("last_seen")}
                  >
                    Last Seen{sortIndicator("last_seen")}
                  </TableHead>
                  <TableHead className="hidden xl:table-cell text-xs font-medium text-muted-foreground">
                    VPA
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      No merchants found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => (
                    <TableRow
                      key={m.id}
                      className="cursor-pointer border-b border-border"
                      onClick={() => navigate(`/merchant/${m.id}`)}
                    >
                      <TableCell>
                        <p className="text-sm font-medium">
                          {m.display_name || m.name}
                        </p>
                        {m.display_name && m.display_name !== m.name && (
                          <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {m.name}
                          </p>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={m.category_id != null ? String(m.category_id) : ""}
                          onValueChange={(val) => {
                            const catId = Number(val);
                            if (!isNaN(catId)) handleCategorize(m.id, catId);
                          }}
                        >
                          <SelectTrigger size="sm" className="min-w-[120px] border-0 shadow-none px-0">
                            <SelectValue>
                              {m.category_name ? (
                                <Badge variant="secondary" className="text-xs">
                                  {m.category_name}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">Uncategorized</span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.icon ? `${c.icon} ` : ""}{c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-sm">
                        {m.transaction_count}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge
                          variant={
                            m.source === "user"
                              ? "default"
                              : m.source === "fuzzy"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-[10px]"
                        >
                          {m.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {m.last_seen ? formatDate(m.last_seen) : "-"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground truncate max-w-[180px]">
                        {m.vpa || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && filtered.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {merchants.length} merchants
            </p>
          )}
        </>
      )}
    </div>
  );
}
