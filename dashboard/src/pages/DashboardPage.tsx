import SummaryCards from "@/components/dashboard/SummaryCards";
import SpendingChart from "@/components/dashboard/SpendingChart";
import CategoryBreakdown from "@/components/dashboard/CategoryBreakdown";
import TopMerchants from "@/components/dashboard/TopMerchants";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <SummaryCards />
      <SpendingChart />
      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryBreakdown />
        <TopMerchants />
      </div>
    </div>
  );
}
