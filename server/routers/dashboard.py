import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_db
from database.operations.dashboard_ops import (
    get_summary,
    get_category_breakdown,
    get_merchant_breakdown,
    get_time_series,
    get_category_detail,
    get_merchant_detail,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/summary")
async def summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    return await get_summary(db, start_date, end_date)


@router.get("/by-category")
async def by_category(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    direction: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    return await get_category_breakdown(db, start_date, end_date, direction)


@router.get("/by-merchant")
async def by_merchant(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    direction: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await get_merchant_breakdown(db, start_date, end_date, direction, limit)


@router.get("/time-series")
async def time_series(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = Query(default="daily", pattern="^(daily|weekly|monthly)$"),
    db: AsyncSession = Depends(get_db),
):
    return await get_time_series(db, start_date, end_date, granularity)


@router.get("/category/{category_id}")
async def category_detail(
    category_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await get_category_detail(db, category_id, start_date, end_date, page, per_page)


@router.get("/merchant/{merchant_id}")
async def merchant_detail(
    merchant_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await get_merchant_detail(db, merchant_id, start_date, end_date, page, per_page)
