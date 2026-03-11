import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Store,
  Tag,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/merchants", label: "Merchants", icon: Store },
  { to: "/categories", label: "Categories", icon: Tag },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: Props) {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();

  // Show labels when mobile overlay is open, or when desktop sidebar is expanded
  const showLabels = mobileOpen || !collapsed;
  // Only show tooltips when collapsed on desktop (not on mobile)
  const showTooltips = collapsed && !mobileOpen;

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <>
      {/* Backdrop — mobile only */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-background transition-all duration-200",
          // Mobile: slide in/out, always expanded width
          "max-md:-translate-x-full max-md:w-60",
          mobileOpen && "max-md:translate-x-0",
          // Desktop: width based on collapsed state
          "md:translate-x-0",
          collapsed ? "md:w-14" : "md:w-60",
        )}
      >
        {/* Logo */}
        <div className="flex h-12 items-center border-b px-3">
          <Link to="/" className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold">
              AT
            </span>
            {showLabels && (
              <span className="text-sm font-semibold tracking-tight whitespace-nowrap">
                AutoTally
              </span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            const link = (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-foreground border-l-2 border-foreground -ml-px"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {showLabels && <span className="truncate">{label}</span>}
              </Link>
            );

            if (showTooltips) {
              return (
                <Tooltip key={to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }
            return link;
          })}
        </nav>

        {/* Bottom actions */}
        <div className="space-y-1 border-t px-2 py-3">
          <button
            onClick={toggle}
            className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 shrink-0" />
            ) : (
              <Moon className="h-4 w-4 shrink-0" />
            )}
            {showLabels && (
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            )}
          </button>
          {/* Collapse button — desktop only */}
          <button
            onClick={onToggle}
            className="hidden md:flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4 shrink-0" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0" />
            )}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
