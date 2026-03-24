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
}

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/merchants", label: "Merchants", icon: Store },
  { to: "/categories", label: "Categories", icon: Tag },
];

export default function Sidebar({ collapsed, onToggle }: Props) {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 ease-out",
        collapsed ? "w-16" : "w-56",
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center transition-all duration-300 border-b border-border",
        collapsed ? "justify-center py-4" : "px-4 py-4",
      )}>
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="AutoTally"
            className={cn(
              "object-contain dark:invert transition-all duration-300",
              collapsed ? "h-7 w-7" : "h-8 w-8",
            )}
          />
          {!collapsed && (
            <span className="font-serif text-lg tracking-tight text-foreground">
              AutoTally
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 pt-3">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);

          if (collapsed) {
            return (
              <Tooltip key={to}>
                <TooltipTrigger
                  render={
                    <Link
                      to={to}
                      className={cn(
                        "flex items-center justify-center rounded-md p-2.5 transition-all duration-200",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    />
                  }
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.5} />
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-all duration-200",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.5} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="space-y-0.5 border-t border-border px-2 py-3">
        {collapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={toggle}
                    className="flex w-full items-center justify-center rounded-md p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
                    className="flex w-full items-center justify-center rounded-md p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronsLeft className="h-[18px] w-[18px] shrink-0" />
              <span>Collapse</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
