import { useState, useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomTabs from "./BottomTabs";

const STORAGE_KEY = "sidebar-collapsed";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [isMd, setIsMd] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches,
  );
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMd(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <TooltipProvider delay={0}>
      <div className="min-h-screen bg-background text-foreground">
        {/* Desktop sidebar */}
        {isMd && (
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
          />
        )}

        <div
          className="min-h-screen transition-[margin-left] duration-300 ease-out"
          style={{ marginLeft: isMd ? (collapsed ? "4rem" : "14rem") : 0 }}
        >
          <TopBar />
          <main className="px-4 py-4 sm:px-5 sm:py-5 lg:px-8 max-w-[1200px] pb-24 md:pb-5">
            {children}
          </main>
        </div>

        {/* Mobile bottom tabs */}
        {!isMd && <BottomTabs />}
      </div>
    </TooltipProvider>
  );
}
