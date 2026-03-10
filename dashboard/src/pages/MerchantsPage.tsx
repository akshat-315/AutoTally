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

type SortField = "name" | "category_name" | "transaction_count" | "last_seen" | "source";

export default function MerchantsPage() {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("transaction_count");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterCategory, setFilterCategory] = useState<"all" | "categorized" | "uncategorized">("all");
  const [categories, setCategories] = useState<Category[]>([]);

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

  const filtered = merchants
    .filter((m) => {
      if (filterCategory === "categorized") return m.category_id !== null;
      if (filterCategory === "uncategorized") return m.category_id === null;
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

  const uncategorizedCount = merchants.filter((m) => m.category_id === null).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Merchants</h1>
        <p className="text-sm text-muted-foreground">
          {merchants.length} total, {uncategorizedCount} uncategorized
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search merchants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-1">
          {(["all", "categorized", "uncategorized"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterCategory(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filterCategory === f
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  Merchant{sortIndicator("name")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("category_name")}
                >
                  Category{sortIndicator("category_name")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort("transaction_count")}
                >
                  Transactions{sortIndicator("transaction_count")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("source")}
                >
                  Source{sortIndicator("source")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("last_seen")}
                >
                  Last Seen{sortIndicator("last_seen")}
                </TableHead>
                <TableHead>VPA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No merchants found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow
                    key={m.id}
                    className="cursor-pointer"
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
                        <SelectTrigger size="sm" className="min-w-[120px]">
                          <SelectValue placeholder="Uncategorized" />
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
                    <TableCell className="text-right font-medium tabular-nums">
                      {m.transaction_count}
                    </TableCell>
                    <TableCell>
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
                    <TableCell className="text-sm">
                      {m.last_seen ? formatDate(m.last_seen) : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {m.vpa || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {merchants.length} merchants
        </p>
      )}
    </div>
  );
}
