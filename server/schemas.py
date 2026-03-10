from pydantic import BaseModel, Field
from typing import List, Optional


class SmsIngestPayload(BaseModel):
    id: int = Field(alias="_id")
    address: str
    received: str
    body: str

    model_config = {"populate_by_name": True}


class IngestResponse(BaseModel):
    message: str
    processed: int
    ignored: int
    skipped: int
    failed: int
    errors: List[str]


# --- Merchant schemas ---


class CategorizeMerchantRequest(BaseModel):
    category_id: int


class MerchantResponse(BaseModel):
    id: int
    name: str
    vpa: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    is_confirmed: bool = False
    source: str = "pending"
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    transaction_count: int = 0


class UncategorizedMerchantResponse(BaseModel):
    id: int
    name: str
    vpa: Optional[str] = None
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    transaction_count: int = 0


# --- Category schemas ---


class CategoryCreateRequest(BaseModel):
    name: str
    icon: Optional[str] = None
    description: Optional[str] = None


class CategoryUpdateRequest(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None


class TransactionUpdateRequest(BaseModel):
    category_id: Optional[int] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    icon: Optional[str] = None
    description: Optional[str] = None
    transaction_count: int = 0
    total_debited: float = 0.0


# --- Dashboard schemas ---


class DashboardSummaryResponse(BaseModel):
    start_date: str
    end_date: str
    total_debited: float
    total_credited: float
    net: float
    transaction_count: int
    debit_count: int
    credit_count: int


class CategoryBreakdownItem(BaseModel):
    category_id: Optional[int] = None
    category_name: str
    icon: Optional[str] = None
    total_debited: float
    total_credited: float
    transaction_count: int


class MerchantBreakdownItem(BaseModel):
    merchant_id: int
    merchant_name: str
    category_name: Optional[str] = None
    total_amount: float
    transaction_count: int


class TimeSeriesItem(BaseModel):
    period: str
    total_debited: float
    total_credited: float
    transaction_count: int


class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total_count: int
    total_pages: int


class TransactionItem(BaseModel):
    id: int
    direction: str
    amount: float
    bank: str
    merchant_id: Optional[int] = None
    merchant_name: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    category_source: Optional[str] = None
    merchant_raw: Optional[str] = None
    account_last4: Optional[str] = None
    vpa: Optional[str] = None
    upi_ref: Optional[str] = None
    transaction_date: str
    sms_received_at: Optional[str] = None


class TransactionListResponse(BaseModel):
    transactions: List[TransactionItem]
    pagination: PaginationMeta


class CategoryDetailResponse(BaseModel):
    category_id: int
    category_name: str
    icon: Optional[str] = None
    total_debited: float
    total_credited: float
    transaction_count: int
    transactions: List[TransactionItem]
    pagination: PaginationMeta


class MerchantDetailResponse(BaseModel):
    merchant_id: int
    merchant_name: str
    vpa: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    total_debited: float
    total_credited: float
    transaction_count: int
    transactions: List[TransactionItem]
    pagination: PaginationMeta
