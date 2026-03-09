import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_db
from database.operations.category_ops import (
    create_category,
    delete_category,
    get_all_categories,
    update_category,
)
from schemas import CategoryCreateRequest, CategoryResponse, CategoryUpdateRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


@router.get("", response_model=List[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    categories = await get_all_categories(db)
    return [
        CategoryResponse(
            id=c.id, name=c.name, icon=c.icon, description=c.description
        )
        for c in categories
    ]


@router.post("", response_model=CategoryResponse, status_code=201)
async def create(body: CategoryCreateRequest, db: AsyncSession = Depends(get_db)):
    category = await create_category(db, body.name, body.icon, body.description)
    await db.commit()
    return CategoryResponse(
        id=category.id,
        name=category.name,
        icon=category.icon,
        description=category.description,
    )


@router.put("/{category_id}", response_model=CategoryResponse)
async def update(
    category_id: int,
    body: CategoryUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    category = await update_category(
        db, category_id, body.name, body.icon, body.description
    )
    await db.commit()
    return CategoryResponse(
        id=category.id,
        name=category.name,
        icon=category.icon,
        description=category.description,
    )


@router.delete("/{category_id}", status_code=204)
async def delete(category_id: int, db: AsyncSession = Depends(get_db)):
    await delete_category(db, category_id)
    await db.commit()
