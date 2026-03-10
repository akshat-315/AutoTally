import type {
  DashboardSummary,
  CategoryBreakdownItem,
  MerchantBreakdownItem,
  MerchantItem,
  TimeSeriesItem,
  TransactionListResponse,
  CategoryDetailResponse,
  MerchantDetailResponse,
  Category,
} from "./types";

async function mutate<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  const query = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(url + query);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

function dateParams(startDate: string, endDate: string): Record<string, string> {
  return { start_date: startDate, end_date: endDate };
}

export function fetchSummary(startDate: string, endDate: string) {
  return get<DashboardSummary>("/api/v1/dashboard/summary", dateParams(startDate, endDate));
}

export function fetchCategoryBreakdown(startDate: string, endDate: string, direction?: string) {
  const params: Record<string, string> = dateParams(startDate, endDate);
  if (direction) params.direction = direction;
  return get<CategoryBreakdownItem[]>("/api/v1/dashboard/by-category", params);
}

export function fetchMerchantBreakdown(startDate: string, endDate: string, direction?: string, limit = 10) {
  const params: Record<string, string> = { ...dateParams(startDate, endDate), limit: String(limit) };
  if (direction) params.direction = direction;
  return get<MerchantBreakdownItem[]>("/api/v1/dashboard/by-merchant", params);
}

export function fetchTimeSeries(startDate: string, endDate: string, granularity: string) {
  return get<TimeSeriesItem[]>("/api/v1/dashboard/time-series", {
    ...dateParams(startDate, endDate),
    granularity,
  });
}

export function fetchTransactions(params: Record<string, string>) {
  return get<TransactionListResponse>("/api/v1/transactions", params);
}

export function fetchCategoryDetail(
  id: number,
  startDate: string,
  endDate: string,
  page = 1,
  perPage = 20,
) {
  return get<CategoryDetailResponse>(`/api/v1/dashboard/category/${id}`, {
    ...dateParams(startDate, endDate),
    page: String(page),
    per_page: String(perPage),
  });
}

export function fetchMerchantDetail(
  id: number,
  startDate: string,
  endDate: string,
  page = 1,
  perPage = 20,
) {
  return get<MerchantDetailResponse>(`/api/v1/dashboard/merchant/${id}`, {
    ...dateParams(startDate, endDate),
    page: String(page),
    per_page: String(perPage),
  });
}

export function fetchCategories() {
  return get<Category[]>("/api/v1/categories");
}

export function fetchAllMerchants() {
  return get<MerchantItem[]>("/api/v1/merchants");
}

export function createCategory(data: { name: string; icon?: string; description?: string }) {
  return mutate<Category>("/api/v1/categories", "POST", data);
}

export function updateCategory(id: number, data: { name?: string; icon?: string; description?: string }) {
  return mutate<Category>(`/api/v1/categories/${id}`, "PUT", data);
}

export function deleteCategory(id: number) {
  return mutate<void>(`/api/v1/categories/${id}`, "DELETE");
}

export function categorizeMerchant(merchantId: number, categoryId: number) {
  return mutate<MerchantItem>(`/api/v1/merchants/${merchantId}/categorize`, "PUT", { category_id: categoryId });
}

export function updateTransactionCategory(txnId: number, categoryId: number | null) {
  return mutate<{ id: number; category_id: number | null; category_source: string | null }>(
    `/api/v1/transactions/${txnId}`,
    "PATCH",
    { category_id: categoryId },
  );
}

export function fetchCategoryMerchants(categoryId: number) {
  return get<MerchantItem[]>(`/api/v1/categories/${categoryId}/merchants`);
}
