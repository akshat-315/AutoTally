import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchCategories } from "@/lib/api";
import type { Category } from "@/lib/types";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Filters {
  direction: string;
  category_id: string;
  search: string;
  min_amount: string;
  max_amount: string;
}

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const directions = ["", "debit", "credit"] as const;
const dirLabels = ["All", "Debits", "Credits"] as const;

export default function TransactionFilters({ filters, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const set = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.direction !== "" ||
    filters.category_id !== "" ||
    filters.search !== "" ||
    filters.min_amount !== "" ||
    filters.max_amount !== "";

  const clearAll = () => {
    onChange({
      direction: "",
      category_id: "",
      search: "",
      min_amount: "",
      max_amount: "",
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Direction pills */}
      <div className="flex rounded-lg border border-border p-0.5 bg-card">
        {directions.map((d, i) => (
          <button
            key={d}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
              filters.direction === d
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => set("direction", d)}
          >
            {dirLabels[i]}
          </button>
        ))}
      </div>

      {/* Category select */}
      <Select
        value={filters.category_id || "__all__"}
        onValueChange={(val) => set("category_id", !val || val === "__all__" ? "" : val)}
      >
        <SelectTrigger size="sm" className="min-w-[140px] bg-card">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.icon ? `${c.icon} ` : ""}{c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search merchant..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="w-full sm:w-48 h-8 pl-8 text-xs bg-card"
        />
      </div>

      {/* Amount range popover */}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 bg-card",
                (filters.min_amount || filters.max_amount) &&
                  "border-primary/40 text-primary",
              )}
            />
          }
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="text-xs">Amount</span>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Amount Range
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.min_amount}
              onChange={(e) => set("min_amount", e.target.value)}
              className="h-8 text-xs"
            />
            <span className="text-muted-foreground text-xs shrink-0">to</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.max_amount}
              onChange={(e) => set("max_amount", e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear button */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
    </div>
  );
}
