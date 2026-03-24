import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllMerchants, fetchCategories, categorizeMerchant } from "@/lib/api";
import type { MerchantItem, Category } from "@/lib/types";
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
    if (sortBy !== field) return null;
    return <span className="ml-0.5 text-primary">{sortOrder === "asc" ? "\u2191" : "\u2193"}</span>;
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
        <div className="flex rounded border border-border p-0.5 bg-card">
          <button
            className={cn(
              "rounded px-3 py-1 text-[11px] font-medium transition-colors",
              tab === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab("all")}
          >
            All Merchants
          </button>
          <button
            className={cn(
              "rounded px-3 py-1 text-[11px] font-medium transition-colors flex items-center gap-1.5",
              tab === "review"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab("review")}
          >
            Review Queue
            {uncategorizedCount > 0 && (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full min-w-4 h-4 px-1 text-[9px] font-bold leading-none",
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
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search merchants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-7 text-[11px] sm:w-56 bg-card"
          />
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full rounded" />
      ) : tab === "review" ? (
        /* Review Queue — card-based */
        filtered.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up!"
            description="No uncategorized merchants to review."
          />
        ) : (
          <div className="border border-border rounded bg-card divide-y divide-border">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13px] font-medium truncate cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/merchant/${m.id}`)}
                  >
                    {m.display_name || m.name}
                  </p>
                  {m.vpa && (
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                      {m.vpa}
                    </p>
                  )}
                  <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span className="tabular-nums">{m.transaction_count} txns</span>
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
                  <SelectTrigger size="sm" className="min-w-[140px] shrink-0 text-[11px]">
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
            ))}
          </div>
        )
      ) : (
        /* All Merchants — Table */
        <div className="border border-border rounded bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  <th
                    className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest cursor-pointer select-none"
                    onClick={() => handleSort("name")}
                  >
                    Merchant{sortIndicator("name")}
                  </th>
                  <th
                    className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest cursor-pointer select-none"
                    onClick={() => handleSort("category_name")}
                  >
                    Category{sortIndicator("category_name")}
                  </th>
                  <th
                    className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest cursor-pointer select-none"
                    onClick={() => handleSort("transaction_count")}
                  >
                    Txns{sortIndicator("transaction_count")}
                  </th>
                  <th
                    className="hidden lg:table-cell text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest cursor-pointer select-none"
                    onClick={() => handleSort("source")}
                  >
                    Source{sortIndicator("source")}
                  </th>
                  <th
                    className="hidden lg:table-cell text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest cursor-pointer select-none"
                    onClick={() => handleSort("last_seen")}
                  >
                    Last Seen{sortIndicator("last_seen")}
                  </th>
                  <th className="hidden xl:table-cell text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    VPA
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      No merchants found
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => (
                    <tr
                      key={m.id}
                      className="cursor-pointer border-b border-border/60 transition-colors hover:bg-accent/30"
                      onClick={() => navigate(`/merchant/${m.id}`)}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-medium truncate">
                          {m.display_name || m.name}
                        </p>
                        {m.display_name && m.display_name !== m.name && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-44">
                            {m.name}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={m.category_id != null ? String(m.category_id) : ""}
                          onValueChange={(val) => {
                            const catId = Number(val);
                            if (!isNaN(catId)) handleCategorize(m.id, catId);
                          }}
                        >
                          <SelectTrigger size="sm" className="min-w-[110px] border-0 shadow-none px-0 bg-transparent h-auto">
                            <SelectValue>
                              {m.category_name ? (
                                <Badge variant="secondary" className="text-[10px] font-medium">
                                  {m.category_name}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">Uncategorized</span>
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
                      </td>
                      <td className="text-right px-4 py-2.5 font-serif tabular-nums">
                        {m.transaction_count}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-2.5">
                        <Badge
                          variant={
                            m.source === "user"
                              ? "default"
                              : m.source === "fuzzy"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-[9px] font-medium"
                        >
                          {m.source}
                        </Badge>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-2.5 text-muted-foreground tabular-nums">
                        {m.last_seen ? formatDate(m.last_seen) : "-"}
                      </td>
                      <td className="hidden xl:table-cell px-4 py-2.5 text-[11px] text-muted-foreground truncate max-w-44 font-mono">
                        {m.vpa || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border">
              <p className="text-[11px] text-muted-foreground tabular-nums">
                Showing {filtered.length} of {merchants.length} merchants
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
