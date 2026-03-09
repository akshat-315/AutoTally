from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Transaction, Merchant


async def get_transaction_by_sms_id(db: AsyncSession, sms_id: int) -> Transaction | None:
    result = await db.execute(select(Transaction).where(Transaction.sms_id == sms_id))
    return result.scalar_one_or_none()


async def get_or_create_merchant(db: AsyncSession, raw_name: str) -> Merchant:
    normalized = raw_name.strip().upper()
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


async def create_transaction(db: AsyncSession, **kwargs) -> Transaction:
    transaction = Transaction(**kwargs)
    db.add(transaction)
    return transaction
