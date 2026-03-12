import { useLocation } from "react-router-dom";
import { useDateRange } from "@/hooks/use-date-range";
import { toISODate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Menu, Calendar } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/transactions": "Transactions",
  "/merchants": "Merchants",
  "/categories": "Categories",
};

const presets = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "YTD", days: -1 },
];

function getPresetRange(days: number): { start: string; end: string } {
  const now = new Date();
  const end = toISODate(now);
  if (days === -1) {
    return { start: toISODate(new Date(now.getFullYear(), 0, 1)), end };
  }
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  return { start: toISODate(start), end };
}

function getActivePreset(startDate: string, endDate: string): string | null {
  for (const p of presets) {
    const range = getPresetRange(p.days);
    if (range.start === startDate && range.end === endDate) return p.label;
  }
  return null;
}

interface Props {
  onMobileMenuToggle: () => void;
}

export default function TopBar({ onMobileMenuToggle }: Props) {
  const { pathname } = useLocation();
  const { startDate, endDate, setStartDate, setEndDate } = useDateRange();
  const activePreset = getActivePreset(startDate, endDate);

  const title =
    pageTitles[pathname] ??
    (pathname.startsWith("/category/")
      ? "Category Details"
      : pathname.startsWith("/merchant/")
        ? "Merchant Details"
        : "");

  const applyPreset = (days: number) => {
    const range = getPresetRange(days);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden rounded-lg p-2 hover:bg-accent transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Quick presets */}
        <div className="hidden sm:flex items-center gap-1">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.days)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-all duration-200",
                activePreset === p.label
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-xs shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-6 bg-transparent px-1 outline-none w-[6.5rem] text-foreground"
          />
          <span className="text-muted-foreground">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-6 bg-transparent px-1 outline-none w-[6.5rem] text-foreground"
          />
        </div>
      </div>
    </header>
  );
}
