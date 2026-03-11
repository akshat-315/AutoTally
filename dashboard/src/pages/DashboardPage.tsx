import SummaryCards from "@/components/dashboard/SummaryCards";
import SpendingChart from "@/components/dashboard/SpendingChart";
import CategoryBreakdown from "@/components/dashboard/CategoryBreakdown";
import TopMerchants from "@/components/dashboard/TopMerchants";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <SummaryCards />
      <SpendingChart />
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <CategoryBreakdown />
        <TopMerchants />
      </div>
    </div>
  );
}
