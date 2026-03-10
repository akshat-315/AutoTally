import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";
import { useDateRange } from "@/hooks/use-date-range";
import { cn } from "@/lib/utils";

export default function Header() {
  const { theme, toggle } = useTheme();
  const { startDate, endDate, setStartDate, setEndDate } = useDateRange();
  const { pathname } = useLocation();

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={cn(
        "text-sm font-medium transition-colors hover:text-foreground",
        pathname === to ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link to="/" className="text-lg font-bold tracking-tight">
          AutoTally
        </Link>

        <nav className="flex gap-4">
          {navLink("/", "Dashboard")}
          {navLink("/transactions", "Transactions")}
          {navLink("/merchants", "Merchants")}
          {navLink("/categories", "Categories")}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          />

          <button
            onClick={toggle}
            className="ml-2 rounded-md p-2 hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
