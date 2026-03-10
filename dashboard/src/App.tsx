import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { DateRangeProvider } from "@/hooks/use-date-range";
import Header from "@/components/layout/Header";
import DashboardPage from "@/pages/DashboardPage";
import TransactionsPage from "@/pages/TransactionsPage";
import CategoryDetailPage from "@/pages/CategoryDetailPage";
import MerchantDetailPage from "@/pages/MerchantDetailPage";
import MerchantsPage from "@/pages/MerchantsPage";
import CategoriesPage from "@/pages/CategoriesPage";

export default function App() {
  return (
    <ThemeProvider>
      <DateRangeProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground">
            <Header />
            <main className="mx-auto max-w-7xl px-4 py-6">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/merchants" element={<MerchantsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/category/:id" element={<CategoryDetailPage />} />
                <Route path="/merchant/:id" element={<MerchantDetailPage />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </DateRangeProvider>
    </ThemeProvider>
  );
}
