import logging

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Transaction
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
