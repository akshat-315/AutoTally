from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Transaction


async def get_transaction_by_sms_id(db: AsyncSession, sms_id: int) -> Transaction | None:
    result = await db.execute(select(Transaction).where(Transaction.sms_id == sms_id))
    return result.scalar_one_or_none()


async def create_transaction(db: AsyncSession, **kwargs) -> Transaction:
    transaction = Transaction(**kwargs)
    db.add(transaction)
    return transaction
