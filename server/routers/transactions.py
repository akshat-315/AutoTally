import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_db
from database.operations.transaction_ops import get_transactions_paginated, update_transaction_category
from schemas import TransactionUpdateRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


@router.get("")
async def list_transactions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    direction: Optional[str] = None,
    category_id: Optional[int] = None,
    merchant_id: Optional[int] = None,
    bank: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    search: Optional[str] = None,
    sort_by: str = Query(default="date", pattern="^(date|amount)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await get_transactions_paginated(
        db,
        start_date=start_date,
        end_date=end_date,
        direction=direction,
        category_id=category_id,
        merchant_id=merchant_id,
        bank=bank,
        min_amount=min_amount,
        max_amount=max_amount,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )


@router.patch("/{txn_id}")
async def update_category(
    txn_id: int,
    body: TransactionUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    txn = await update_transaction_category(db, txn_id, body.category_id)
    result = {"id": txn.id, "category_id": txn.category_id, "category_source": txn.category_source}
    await db.commit()
    return result
