import logging
import math
from datetime import date
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Transaction, Merchant, Category
from database.operations.dashboard_ops import (
    resolve_date_range,
    _transaction_to_dict,
)
from exceptions import DatabaseError

logger = logging.getLogger(__name__)


async def get_transaction_by_sms_id(db: AsyncSession, sms_id: int) -> Transaction | None:
    try:
        result = await db.execute(select(Transaction).where(Transaction.sms_id == sms_id))
        return result.scalar_one_or_none()
    except SQLAlchemyError as e:
        logger.error("Database error looking up sms_id=%s: %s", sms_id, e)
        raise DatabaseError("get_transaction_by_sms_id", original=e) from e


async def create_transaction(db: AsyncSession, **kwargs) -> Transaction:
    try:
        transaction = Transaction(**kwargs)
        db.add(transaction)
        return transaction
    except SQLAlchemyError as e:
        sms_id = kwargs.get("sms_id", "unknown")
        logger.error("Database error creating transaction for sms_id=%s: %s", sms_id, e)
        raise DatabaseError("create_transaction", original=e) from e


async def get_transactions_paginated(
    db: AsyncSession,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    direction: Optional[str] = None,
    category_id: Optional[int] = None,
    merchant_id: Optional[int] = None,
    bank: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    search: Optional[str] = None,
    sort_by: str = "date",
    sort_order: str = "desc",
    page: int = 1,
    per_page: int = 20,
) -> dict:
    start, end = resolve_date_range(start_date, end_date)
    try:
        filters = [
            Transaction.transaction_date >= start,
            Transaction.transaction_date <= end,
        ]

        if direction:
            filters.append(Transaction.direction == direction)
        if category_id is not None:
            filters.append(Transaction.category_id == category_id)
        if merchant_id is not None:
            filters.append(Transaction.merchant_id == merchant_id)
        if bank:
            filters.append(Transaction.bank == bank)
        if min_amount is not None:
            filters.append(Transaction.amount >= min_amount)
        if max_amount is not None:
            filters.append(Transaction.amount <= max_amount)
        if search:
            filters.append(Transaction.merchant_raw.ilike(f"%{search}%"))

        # Count query
        count_stmt = select(func.count(Transaction.id)).where(*filters)
        total_count = (await db.execute(count_stmt)).scalar() or 0
        total_pages = max(1, math.ceil(total_count / per_page))
        offset = (page - 1) * per_page

        # Sort
        if sort_by == "amount":
            order_col = Transaction.amount
        else:
            order_col = Transaction.transaction_date

        if sort_order == "asc":
            order_expr = order_col.asc()
        else:
            order_expr = order_col.desc()

        tx_stmt = (
            select(
                Transaction,
                Merchant.name.label("merchant_name"),
                Category.name.label("category_name"),
            )
            .outerjoin(Merchant, Merchant.id == Transaction.merchant_id)
            .outerjoin(Category, Category.id == Transaction.category_id)
            .where(*filters)
            .order_by(order_expr, Transaction.id.desc())
            .offset(offset)
            .limit(per_page)
        )

        result = await db.execute(tx_stmt)
        rows = result.all()

        transactions = [
            _transaction_to_dict(tx, m_name, c_name)
            for tx, m_name, c_name in rows
        ]

        return {
            "transactions": transactions,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_count": total_count,
                "total_pages": total_pages,
            },
        }
    except SQLAlchemyError as e:
        raise DatabaseError("get_transactions_paginated", original=e) from e


async def update_transaction_category(
    db: AsyncSession, txn_id: int, category_id: int | None
) -> Transaction:
    try:
        result = await db.execute(select(Transaction).where(Transaction.id == txn_id))
        txn = result.scalar_one_or_none()
        if not txn:
            raise DatabaseError(f"transaction id={txn_id} not found")
        txn.category_id = category_id
        txn.category_source = "user_override" if category_id is not None else None
        await db.flush()
        return txn
    except SQLAlchemyError as e:
        raise DatabaseError("update_transaction_category", original=e) from e
