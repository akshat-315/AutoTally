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


class MergeMerchantRequest(BaseModel):
    into_merchant_id: int


class MerchantResponse(BaseModel):
    id: int
    name: str
    display_name: Optional[str] = None
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
    display_name: Optional[str] = None
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


class CategoryResponse(BaseModel):
    id: int
    name: str
    icon: Optional[str] = None
    description: Optional[str] = None
