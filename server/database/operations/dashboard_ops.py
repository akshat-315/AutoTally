import logging
import math
from datetime import date
from typing import Optional

from sqlalchemy import select, func, case, and_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Transaction, Merchant, Category
from exceptions import DatabaseError

logger = logging.getLogger(__name__)


def resolve_date_range(
    start_date: Optional[date], end_date: Optional[date]
) -> tuple[date, date]:
    today = date.today()
    return (start_date or today.replace(day=1), end_date or today)


def _date_filter(start: date, end: date):
    return and_(
        Transaction.transaction_date >= start,
        Transaction.transaction_date <= end,
    )


async def get_summary(
    db: AsyncSession,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> dict:
    start, end = resolve_date_range(start_date, end_date)
    try:
        stmt = select(
            func.coalesce(
                func.sum(case((Transaction.direction == "debit", Transaction.amount), else_=0)), 0
            ).label("total_debited"),
            func.coalesce(
                func.sum(case((Transaction.direction == "credit", Transaction.amount), else_=0)), 0
            ).label("total_credited"),
            func.count(Transaction.id).label("transaction_count"),
            func.coalesce(
                func.sum(case((Transaction.direction == "debit", 1), else_=0)), 0
            ).label("debit_count"),
            func.coalesce(
                func.sum(case((Transaction.direction == "credit", 1), else_=0)), 0
            ).label("credit_count"),
        ).where(_date_filter(start, end))

        result = await db.execute(stmt)
        row = result.one()

        total_debited = round(float(row.total_debited), 2)
        total_credited = round(float(row.total_credited), 2)

        return {
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "total_debited": total_debited,
            "total_credited": total_credited,
            "net": round(total_credited - total_debited, 2),
            "transaction_count": row.transaction_count,
            "debit_count": row.debit_count,
            "credit_count": row.credit_count,
        }
    except SQLAlchemyError as e:
        raise DatabaseError("get_summary", original=e) from e


async def get_category_breakdown(
    db: AsyncSession,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    direction: Optional[str] = None,
) -> list[dict]:
    start, end = resolve_date_range(start_date, end_date)
    try:
        filters = [_date_filter(start, end)]
        if direction:
            filters.append(Transaction.direction == direction)

        stmt = (
            select(
                Transaction.category_id,
                func.coalesce(Category.name, "Uncategorized").label("category_name"),
                Category.icon.label("icon"),
                func.coalesce(
                    func.sum(case((Transaction.direction == "debit", Transaction.amount), else_=0)), 0
                ).label("total_debited"),
                func.coalesce(
                    func.sum(case((Transaction.direction == "credit", Transaction.amount), else_=0)), 0
                ).label("total_credited"),
                func.count(Transaction.id).label("transaction_count"),
            )
            .outerjoin(Category, Category.id == Transaction.category_id)
            .where(*filters)
            .group_by(Transaction.category_id)
            .order_by(func.sum(case((Transaction.direction == "debit", Transaction.amount), else_=0)).desc())
        )

        result = await db.execute(stmt)
        rows = result.all()

        return [
            {
                "category_id": row.category_id,
                "category_name": row.category_name,
                "icon": row.icon,
                "total_debited": round(float(row.total_debited), 2),
                "total_credited": round(float(row.total_credited), 2),
                "transaction_count": row.transaction_count,
            }
            for row in rows
        ]
    except SQLAlchemyError as e:
        raise DatabaseError("get_category_breakdown", original=e) from e


async def get_merchant_breakdown(
    db: AsyncSession,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    direction: Optional[str] = None,
    limit: int = 20,
) -> list[dict]:
    start, end = resolve_date_range(start_date, end_date)
    try:
        filters = [_date_filter(start, end)]
        if direction:
            filters.append(Transaction.direction == direction)

        stmt = (
            select(
                Transaction.merchant_id,
                func.sum(Transaction.amount).label("total_amount"),
                func.count(Transaction.id).label("transaction_count"),
            )
            .where(*filters, Transaction.merchant_id.isnot(None))
            .group_by(Transaction.merchant_id)
            .order_by(func.sum(Transaction.amount).desc())
            .limit(limit)
        )

        result = await db.execute(stmt)
        rows = result.all()

        merchant_ids = [row.merchant_id for row in rows]
        if not merchant_ids:
            return []

        info_stmt = (
            select(Merchant, Category.name.label("category_name"))
            .outerjoin(Category, Category.id == Merchant.category_id)
            .where(Merchant.id.in_(merchant_ids))
        )
        info_result = await db.execute(info_stmt)
        info_map = {m.id: (m, cat_name) for m, cat_name in info_result.all()}

        output = []
        for row in rows:
            m, cat_name = info_map.get(row.merchant_id, (None, None))
            output.append({
                "merchant_id": row.merchant_id,
                "merchant_name": m.name if m else "Unknown",
                "category_name": cat_name,
                "total_amount": round(float(row.total_amount), 2),
                "transaction_count": row.transaction_count,
            })
        return output
    except SQLAlchemyError as e:
        raise DatabaseError("get_merchant_breakdown", original=e) from e


async def get_time_series(
    db: AsyncSession,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = "daily",
) -> list[dict]:
    start, end = resolve_date_range(start_date, end_date)
    try:
        if granularity == "weekly":
            period_expr = func.strftime("%Y-W%W", Transaction.transaction_date)
        elif granularity == "monthly":
            period_expr = func.strftime("%Y-%m", Transaction.transaction_date)
        else:  # daily
            period_expr = func.strftime("%Y-%m-%d", Transaction.transaction_date)

        stmt = (
            select(
                period_expr.label("period"),
                func.coalesce(
                    func.sum(case((Transaction.direction == "debit", Transaction.amount), else_=0)), 0
                ).label("total_debited"),
                func.coalesce(
                    func.sum(case((Transaction.direction == "credit", Transaction.amount), else_=0)), 0
                ).label("total_credited"),
                func.count(Transaction.id).label("transaction_count"),
            )
            .where(_date_filter(start, end))
            .group_by(period_expr)
            .order_by(period_expr)
        )

        result = await db.execute(stmt)
        rows = result.all()

        return [
            {
                "period": row.period,
                "total_debited": round(float(row.total_debited), 2),
                "total_credited": round(float(row.total_credited), 2),
                "transaction_count": row.transaction_count,
            }
            for row in rows
        ]
    except SQLAlchemyError as e:
        raise DatabaseError("get_time_series", original=e) from e


async def get_category_detail(
    db: AsyncSession,
    category_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    start, end = resolve_date_range(start_date, end_date)
    try:
        cat_result = await db.execute(
            select(Category).where(Category.id == category_id)
        )
        category = cat_result.scalar_one_or_none()
        if not category:
            raise DatabaseError(f"category_id={category_id} not found")

        date_cond = _date_filter(start, end)
        cat_cond = Transaction.category_id == category_id

        totals_stmt = select(
            func.coalesce(
                func.sum(case((Transaction.direction == "debit", Transaction.amount), else_=0)), 0
            ).label("total_debited"),
            func.coalesce(
                func.sum(case((Transaction.direction == "credit", Transaction.amount), else_=0)), 0
            ).label("total_credited"),
            func.count(Transaction.id).label("transaction_count"),
        ).where(date_cond, cat_cond)

        totals = (await db.execute(totals_stmt)).one()

        total_count = totals.transaction_count
        total_pages = max(1, math.ceil(total_count / per_page))
        offset = (page - 1) * per_page

        tx_stmt = (
            select(
                Transaction,
                Merchant.name.label("merchant_name"),
                Category.name.label("category_name"),
            )
            .outerjoin(Merchant, Merchant.id == Transaction.merchant_id)
            .outerjoin(Category, Category.id == Transaction.category_id)
            .where(date_cond, cat_cond)
            .order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
            .offset(offset)
            .limit(per_page)
        )

        tx_result = await db.execute(tx_stmt)
        tx_rows = tx_result.all()

        transactions = [
            _transaction_to_dict(tx, m_name, c_name)
            for tx, m_name, c_name in tx_rows
        ]

        return {
            "category_id": category.id,
            "category_name": category.name,
            "icon": category.icon,
            "total_debited": round(float(totals.total_debited), 2),
            "total_credited": round(float(totals.total_credited), 2),
            "transaction_count": total_count,
            "transactions": transactions,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_count": total_count,
                "total_pages": total_pages,
            },
        }
    except DatabaseError:
        raise
    except SQLAlchemyError as e:
        raise DatabaseError("get_category_detail", original=e) from e


async def get_merchant_detail(
    db: AsyncSession,
    merchant_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    start, end = resolve_date_range(start_date, end_date)
    try:
        m_result = await db.execute(
            select(Merchant).where(Merchant.id == merchant_id)
        )
        merchant = m_result.scalar_one_or_none()
        if not merchant:
            raise DatabaseError(f"merchant_id={merchant_id} not found")

        # Category name
        cat_name = None
        if merchant.category_id:
            c_result = await db.execute(
                select(Category.name).where(Category.id == merchant.category_id)
            )
            cat_row = c_result.one_or_none()
            cat_name = cat_row[0] if cat_row else None

        date_cond = _date_filter(start, end)
        merchant_cond = Transaction.merchant_id == merchant_id

        totals_stmt = select(
            func.coalesce(
                func.sum(case((Transaction.direction == "debit", Transaction.amount), else_=0)), 0
            ).label("total_debited"),
            func.coalesce(
                func.sum(case((Transaction.direction == "credit", Transaction.amount), else_=0)), 0
            ).label("total_credited"),
            func.count(Transaction.id).label("transaction_count"),
        ).where(date_cond, merchant_cond)

        totals = (await db.execute(totals_stmt)).one()

        total_count = totals.transaction_count
        total_pages = max(1, math.ceil(total_count / per_page))
        offset = (page - 1) * per_page

        tx_stmt = (
            select(
                Transaction,
                Merchant.name.label("merchant_name"),
                Category.name.label("category_name"),
            )
            .outerjoin(Merchant, Merchant.id == Transaction.merchant_id)
            .outerjoin(Category, Category.id == Transaction.category_id)
            .where(date_cond, merchant_cond)
            .order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
            .offset(offset)
            .limit(per_page)
        )

        tx_result = await db.execute(tx_stmt)
        tx_rows = tx_result.all()

        transactions = [
            _transaction_to_dict(tx, m_name, c_name)
            for tx, m_name, c_name in tx_rows
        ]

        return {
            "merchant_id": merchant.id,
            "merchant_name": merchant.name,
            "vpa": merchant.vpa,
            "category_id": merchant.category_id,
            "category_name": cat_name,
            "total_debited": round(float(totals.total_debited), 2),
            "total_credited": round(float(totals.total_credited), 2),
            "transaction_count": total_count,
            "transactions": transactions,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_count": total_count,
                "total_pages": total_pages,
            },
        }
    except DatabaseError:
        raise
    except SQLAlchemyError as e:
        raise DatabaseError("get_merchant_detail", original=e) from e


def _transaction_to_dict(tx: Transaction, merchant_name, category_name) -> dict:
    return {
        "id": tx.id,
        "direction": tx.direction,
        "amount": round(float(tx.amount), 2),
        "bank": tx.bank,
        "merchant_id": tx.merchant_id,
        "merchant_name": merchant_name,
        "category_id": tx.category_id,
        "category_name": category_name,
        "category_source": tx.category_source,
        "merchant_raw": tx.merchant_raw,
        "account_last4": tx.account_last4,
        "vpa": tx.vpa,
        "upi_ref": tx.upi_ref,
        "transaction_date": tx.transaction_date.isoformat(),
        "sms_received_at": tx.sms_received_at.isoformat() if tx.sms_received_at else None,
    }
