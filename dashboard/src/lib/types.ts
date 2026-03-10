export interface DashboardSummary {
  start_date: string;
  end_date: string;
  total_debited: number;
  total_credited: number;
  net: number;
  transaction_count: number;
  debit_count: number;
  credit_count: number;
}

export interface CategoryBreakdownItem {
  category_id: number | null;
  category_name: string;
  icon: string | null;
  total_debited: number;
  total_credited: number;
  transaction_count: number;
}

export interface MerchantBreakdownItem {
  merchant_id: number;
  merchant_name: string;
  display_name: string | null;
  category_name: string | null;
  total_amount: number;
  transaction_count: number;
}

export interface TimeSeriesItem {
  period: string;
  total_debited: number;
  total_credited: number;
  transaction_count: number;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

export interface TransactionItem {
  id: number;
  direction: string;
  amount: number;
  bank: string;
  merchant_id: number | null;
  merchant_name: string | null;
  merchant_display_name: string | null;
  category_id: number | null;
  category_name: string | null;
  merchant_raw: string | null;
  account_last4: string | null;
  vpa: string | null;
  upi_ref: string | null;
  transaction_date: string;
  sms_received_at: string | null;
}

export interface TransactionListResponse {
  transactions: TransactionItem[];
  pagination: PaginationMeta;
}

export interface CategoryDetailResponse {
  category_id: number;
  category_name: string;
  icon: string | null;
  total_debited: number;
  total_credited: number;
  transaction_count: number;
  transactions: TransactionItem[];
  pagination: PaginationMeta;
}

export interface MerchantDetailResponse {
  merchant_id: number;
  merchant_name: string;
  display_name: string | null;
  vpa: string | null;
  category_id: number | null;
  category_name: string | null;
  variants: Record<string, unknown>[];
  total_debited: number;
  total_credited: number;
  transaction_count: number;
  transactions: TransactionItem[];
  pagination: PaginationMeta;
}

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  description: string | null;
  transaction_count: number;
  total_debited: number;
}

export interface MerchantItem {
  id: number;
  name: string;
  display_name: string | null;
  vpa: string | null;
  category_id: number | null;
  category_name: string | null;
  is_confirmed: boolean;
  source: string;
  first_seen: string | null;
  last_seen: string | null;
  transaction_count: number;
}
