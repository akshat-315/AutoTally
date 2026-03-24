import { Link, useLocation } from "react-router-dom";
import { useDateRange } from "@/hooks/use-date-range";
import { toISODate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

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

export default function TopBar() {
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
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-sm">
      {/* Top row: title + logo on mobile */}
      <div className="flex h-12 items-center justify-between px-4 sm:px-5 lg:px-8">
        <div className="flex items-center gap-3">
          {/* Mobile-only logo */}
          <Link to="/" className="md:hidden flex items-center gap-2 shrink-0">
            <img
              src="/logo.png"
              alt="AutoTally"
              className="h-6 object-contain dark:invert"
            />
          </Link>
          <h1 className="text-sm font-semibold tracking-tight font-serif">{title}</h1>
        </div>

        {/* Date controls */}
        <div className="flex items-center gap-1.5">
          {/* Quick presets */}
          <div className="hidden sm:flex items-center gap-0.5">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.days)}
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-medium transition-colors",
                  activePreset === p.label
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-[11px]">
            <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-5 bg-transparent px-0.5 outline-none w-[6rem] text-foreground"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-5 bg-transparent px-0.5 outline-none w-[6rem] text-foreground"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
