import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_db
from database.operations.category_ops import (
    create_category,
    delete_category,
    get_all_categories,
    get_category_by_id,
    update_category,
)
from schemas import CategoryCreateRequest, CategoryResponse, CategoryUpdateRequest, MerchantResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


@router.get("", response_model=List[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    categories = await get_all_categories(db)
    return [CategoryResponse(**c) for c in categories]


@router.post("", response_model=CategoryResponse, status_code=201)
async def create(body: CategoryCreateRequest, db: AsyncSession = Depends(get_db)):
    category = await create_category(db, body.name, body.icon, body.description)
    result = CategoryResponse(
        id=category.id,
        name=category.name,
        icon=category.icon,
        description=category.description,
    )
    await db.commit()
    return result


@router.put("/{category_id}", response_model=CategoryResponse)
async def update(
    category_id: int,
    body: CategoryUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    category = await update_category(
        db, category_id, body.name, body.icon, body.description
    )
    result = CategoryResponse(
        id=category.id,
        name=category.name,
        icon=category.icon,
        description=category.description,
    )
    await db.commit()
    return result


@router.delete("/{category_id}", status_code=204)
async def delete(category_id: int, db: AsyncSession = Depends(get_db)):
    await delete_category(db, category_id)
    await db.commit()


@router.get("/{category_id}/merchants", response_model=List[MerchantResponse])
async def list_category_merchants(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    from database.models import Merchant, Transaction
    from sqlalchemy import select, func

    stmt = (
        select(
            Merchant,
            func.count(Transaction.id).label("transaction_count"),
        )
        .outerjoin(Transaction, Transaction.merchant_id == Merchant.id)
        .where(Merchant.category_id == category_id)
        .group_by(Merchant.id)
        .order_by(Merchant.name)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        MerchantResponse(
            id=m.id,
            name=m.name,
            vpa=m.vpa,
            category_id=m.category_id,
            is_confirmed=m.is_confirmed,
            source=m.source,
            first_seen=str(m.first_seen) if m.first_seen else None,
            last_seen=str(m.last_seen) if m.last_seen else None,
            transaction_count=tx_count,
        )
        for m, tx_count in rows
    ]
