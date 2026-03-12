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
import { formatDate, cn } from "@/lib/utils";
import { Search, CheckCircle2, ChevronRight } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

type SortField = "name" | "category_name" | "transaction_count" | "last_seen" | "source";
type Tab = "all" | "review";

const AVATAR_COLORS = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
  "bg-chart-5/15 text-chart-5",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

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
    if (sortBy !== field) return null;
    return <span className="ml-1 text-primary">{sortOrder === "asc" ? "\u2191" : "\u2193"}</span>;
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
        <div className="flex rounded-lg border border-border p-0.5 bg-card">
          <button
            className={cn(
              "rounded-md px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
              tab === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab("all")}
          >
            All Merchants
          </button>
          <button
            className={cn(
              "rounded-md px-3.5 py-1.5 text-xs font-medium transition-all duration-200 flex items-center gap-1.5",
              tab === "review"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab("review")}
          >
            Review Queue
            {uncategorizedCount > 0 && (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none",
                  tab === "review"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/10 text-primary",
                )}
              >
                {uncategorizedCount}
              </span>
            )}
          </button>
        </div>
        <div className="relative sm:ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search merchants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs sm:w-64 bg-card"
          />
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : tab === "review" ? (
        /* Review Queue */
        filtered.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up!"
            description="No uncategorized merchants to review."
          />
        ) : (
          <div className="mx-auto max-w-2xl space-y-2">
            {filtered.map((m) => {
              const colorIdx = hashStr(m.name) % AVATAR_COLORS.length;
              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-1 duration-200"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${AVATAR_COLORS[colorIdx]}`}>
                      {(m.display_name || m.name).slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className="text-sm font-semibold truncate cursor-pointer hover:text-primary transition-colors"
                          onClick={() => navigate(`/merchant/${m.id}`)}
                        >
                          {m.display_name || m.name}
                        </p>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 hidden sm:block" />
                      </div>
                      {m.vpa && (
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
                          {m.vpa}
                        </p>
                      )}
                      <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground">
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
              );
            })}
          </div>
        )
      ) : (
        /* All Merchants - Table */
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead
                    className="cursor-pointer select-none text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                    onClick={() => handleSort("name")}
                  >
                    Merchant{sortIndicator("name")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                    onClick={() => handleSort("category_name")}
                  >
                    Category{sortIndicator("category_name")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                    onClick={() => handleSort("transaction_count")}
                  >
                    Txns{sortIndicator("transaction_count")}
                  </TableHead>
                  <TableHead
                    className="hidden lg:table-cell cursor-pointer select-none text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                    onClick={() => handleSort("source")}
                  >
                    Source{sortIndicator("source")}
                  </TableHead>
                  <TableHead
                    className="hidden lg:table-cell cursor-pointer select-none text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                    onClick={() => handleSort("last_seen")}
                  >
                    Last Seen{sortIndicator("last_seen")}
                  </TableHead>
                  <TableHead className="hidden xl:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    VPA
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      No merchants found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => {
                    const colorIdx = hashStr(m.name) % AVATAR_COLORS.length;
                    return (
                      <TableRow
                        key={m.id}
                        className="cursor-pointer border-b border-border transition-colors hover:bg-accent/50"
                        onClick={() => navigate(`/merchant/${m.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${AVATAR_COLORS[colorIdx]}`}>
                              {(m.display_name || m.name).slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {m.display_name || m.name}
                              </p>
                              {m.display_name && m.display_name !== m.name && (
                                <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                  {m.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={m.category_id != null ? String(m.category_id) : ""}
                            onValueChange={(val) => {
                              const catId = Number(val);
                              if (!isNaN(catId)) handleCategorize(m.id, catId);
                            }}
                          >
                            <SelectTrigger size="sm" className="min-w-[120px] border-0 shadow-none px-0 bg-transparent">
                              <SelectValue>
                                {m.category_name ? (
                                  <Badge variant="secondary" className="text-xs font-medium">
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
                        <TableCell className="text-right font-semibold tabular-nums text-sm">
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
                            className="text-[10px] font-medium"
                          >
                            {m.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground tabular-nums">
                          {m.last_seen ? formatDate(m.last_seen) : "-"}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-xs text-muted-foreground truncate max-w-[180px] font-mono">
                          {m.vpa || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground tabular-nums">
                Showing {filtered.length} of {merchants.length} merchants
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
