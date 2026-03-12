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
  ChevronsLeft,
  ChevronsRight,
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

  const showLabels = mobileOpen || !collapsed;
  const showTooltips = collapsed && !mobileOpen;

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  const navLink = (to: string, label: string, Icon: typeof LayoutDashboard, active: boolean) => (
    <Link
      to={to}
      onClick={mobileOpen ? onMobileClose : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
      {showLabels && <span className="truncate">{label}</span>}
    </Link>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar transition-all duration-300 ease-out",
          "border-r border-sidebar-border",
          "max-md:-translate-x-full max-md:w-60",
          mobileOpen && "max-md:translate-x-0",
          "md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-60",
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center justify-center border-b border-sidebar-border transition-all duration-300",
          showLabels ? "h-14 px-5" : "h-14 px-1.5",
        )}>
          <Link to="/" className="flex items-center justify-center">
            <img
              src="/logo.png"
              alt="AutoTally"
              className={cn(
                "object-contain dark:invert transition-all duration-300",
                showLabels ? "w-full max-w-[140px]" : "w-full max-w-[48px]",
              )}
            />
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);

            if (showTooltips) {
              return (
                <Tooltip key={to}>
                  <TooltipTrigger
                    render={
                      <Link
                        to={to}
                        className={cn(
                          "flex items-center justify-center rounded-lg p-2.5 transition-all duration-200",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                      />
                    }
                  >
                    <Icon className={cn("h-[18px] w-[18px]", active && "text-primary")} />
                  </TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }
            return (
              <div key={to}>
                {navLink(to, label, Icon, active)}
              </div>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="space-y-1 border-t border-sidebar-border px-2 py-3">
          {showTooltips ? (
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={toggle}
                      className="flex w-full items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    />
                  }
                >
                  {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
                </TooltipTrigger>
                <TooltipContent side="right">{theme === "dark" ? "Light mode" : "Dark mode"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={onToggle}
                      className="hidden md:flex w-full items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    />
                  }
                >
                  <ChevronsRight className="h-[18px] w-[18px]" />
                </TooltipTrigger>
                <TooltipContent side="right">Expand</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <button
                onClick={toggle}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {theme === "dark" ? (
                  <Sun className="h-[18px] w-[18px] shrink-0" />
                ) : (
                  <Moon className="h-[18px] w-[18px] shrink-0" />
                )}
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </button>
              <button
                onClick={onToggle}
                className="hidden md:flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronsLeft className="h-[18px] w-[18px] shrink-0" />
                <span>Collapse</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
