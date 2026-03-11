import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { DateRangeProvider } from "@/hooks/use-date-range";
import AppLayout from "@/components/layout/AppLayout";
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
          <AppLayout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/merchants" element={<MerchantsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/category/:id" element={<CategoryDetailPage />} />
              <Route path="/merchant/:id" element={<MerchantDetailPage />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </DateRangeProvider>
    </ThemeProvider>
  );
}
