import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchCategories } from "@/lib/api";
import type { Category } from "@/lib/types";

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

export default function TransactionFilters({ filters, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAmount, setShowAmount] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const set = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const directions = ["", "debit", "credit"] as const;
  const dirLabels = ["All", "Debits", "Credits"] as const;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-md border overflow-hidden">
        {directions.map((d, i) => (
          <button
            key={d}
            className={`px-3 py-1.5 text-sm transition-colors ${
              filters.direction === d
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
            onClick={() => set("direction", d)}
          >
            {dirLabels[i]}
          </button>
        ))}
      </div>

      <select
        value={filters.category_id}
        onChange={(e) => set("category_id", e.target.value)}
        className="h-9 rounded-md border bg-background px-3 text-sm"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon ? `${c.icon} ` : ""}{c.name}
          </option>
        ))}
      </select>

      <Input
        placeholder="Search merchant..."
        value={filters.search}
        onChange={(e) => set("search", e.target.value)}
        className="w-48 h-9"
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowAmount(!showAmount)}
      >
        {showAmount ? "Hide" : "Amount"}
      </Button>

      {showAmount && (
        <>
          <Input
            type="number"
            placeholder="Min"
            value={filters.min_amount}
            onChange={(e) => set("min_amount", e.target.value)}
            className="w-24 h-9"
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.max_amount}
            onChange={(e) => set("max_amount", e.target.value)}
            className="w-24 h-9"
          />
        </>
      )}
    </div>
  );
}
