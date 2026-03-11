import { useState, useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const STORAGE_KEY = "sidebar-collapsed";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMd, setIsMd] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches,
  );
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Track md breakpoint
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMd(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return (
    <TooltipProvider delay={0}>
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div
          className="min-h-screen transition-[margin-left] duration-200"
          style={{ marginLeft: isMd ? (collapsed ? "3.5rem" : "15rem") : 0 }}
        >
          <TopBar onMobileMenuToggle={() => setMobileOpen((o) => !o)} />
          <main className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
