import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from database.db import get_db
from database.models import Category
from database.operations.merchant_ops import (
    categorize_merchant,
    get_all_merchants,
    get_uncategorized_merchants,
)
from schemas import (
    CategorizeMerchantRequest,
    MerchantResponse,
    UncategorizedMerchantResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/merchants", tags=["merchants"])


@router.get("", response_model=List[MerchantResponse])
async def list_merchants(db: AsyncSession = Depends(get_db)):
    merchants = await get_all_merchants(db)
    return merchants


@router.get("/uncategorized", response_model=List[UncategorizedMerchantResponse])
async def list_uncategorized(db: AsyncSession = Depends(get_db)):
    return await get_uncategorized_merchants(db)


@router.put("/{merchant_id}/categorize", response_model=MerchantResponse)
async def categorize(
    merchant_id: int,
    body: CategorizeMerchantRequest,
    db: AsyncSession = Depends(get_db),
):
    merchant = await categorize_merchant(db, merchant_id, body.category_id)

    cat_name = None
    if merchant.category_id:
        cat_result = await db.execute(select(Category.name).where(Category.id == merchant.category_id))
        cat_row = cat_result.one_or_none()
        cat_name = cat_row[0] if cat_row else None

    result = {
        "id": merchant.id,
        "name": merchant.name,
        "display_name": merchant.display_name,
        "vpa": merchant.vpa,
        "category_id": merchant.category_id,
        "category_name": cat_name,
        "is_confirmed": merchant.is_confirmed,
        "source": merchant.source,
        "first_seen": merchant.first_seen.isoformat() if merchant.first_seen else None,
        "last_seen": merchant.last_seen.isoformat() if merchant.last_seen else None,
        "transaction_count": 0,
    }
    await db.commit()
    return result
