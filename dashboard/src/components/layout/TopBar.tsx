import { useLocation } from "react-router-dom";
import { useDateRange } from "@/hooks/use-date-range";
import { Menu } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/transactions": "Transactions",
  "/merchants": "Merchants",
  "/categories": "Categories",
};

interface Props {
  onMobileMenuToggle: () => void;
}

export default function TopBar({ onMobileMenuToggle }: Props) {
  const { pathname } = useLocation();
  const { startDate, endDate, setStartDate, setEndDate } = useDateRange();

  const title =
    pageTitles[pathname] ??
    (pathname.startsWith("/category/")
      ? "Category Details"
      : pathname.startsWith("/merchant/")
        ? "Merchant Details"
        : "");

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b bg-background/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden rounded-md p-1.5 hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex items-center rounded-md border bg-background text-xs">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-8 bg-transparent px-1.5 sm:px-2 outline-none w-[7rem] sm:w-auto"
        />
        <span className="text-muted-foreground px-0.5 sm:px-1">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="h-8 bg-transparent px-1.5 sm:px-2 outline-none w-[7rem] sm:w-auto"
        />
      </div>
    </header>
  );
}
