import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Merchant
from exceptions import DatabaseError

logger = logging.getLogger(__name__)


async def get_or_create_merchant(db: AsyncSession, raw_name: str) -> Merchant:
    normalized = raw_name.strip().upper()
    try:
        result = await db.execute(select(Merchant).where(Merchant.name == normalized))
        merchant = result.scalar_one_or_none()

        if merchant:
            merchant.last_seen = datetime.now(timezone.utc)
            return merchant

        merchant = Merchant(
            name=normalized,
            first_seen=datetime.now(timezone.utc),
            last_seen=datetime.now(timezone.utc),
        )
        db.add(merchant)
        await db.flush()
        return merchant

    except IntegrityError as e:
        # Race condition: another request created the merchant between SELECT and INSERT
        logger.warning("IntegrityError creating merchant %r, re-fetching: %s", normalized, e)
        await db.rollback()
        result = await db.execute(select(Merchant).where(Merchant.name == normalized))
        merchant = result.scalar_one_or_none()
        if merchant:
            return merchant
        raise DatabaseError("get_or_create_merchant", original=e) from e

    except SQLAlchemyError as e:
        logger.error("Database error in get_or_create_merchant for %r: %s", normalized, e)
        raise DatabaseError("get_or_create_merchant", original=e) from e
