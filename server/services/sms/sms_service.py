import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from database.operations.merchant_ops import get_or_create_merchant
from database.operations.transaction_ops import create_transaction, get_transaction_by_sms_id
from exceptions import DuplicateSMSError, UnmatchedSMSError
from schemas import SmsIngestPayload
from services.sms.sms_parser import parse_sms

logger = logging.getLogger(__name__)


def _parse_received_timestamp(received: str) -> datetime | None:
    try:
        return datetime.strptime(received, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        logger.warning("Could not parse received timestamp: %r", received)
        return None


async def process_single_sms(sms: SmsIngestPayload, db: AsyncSession) -> None:
    existing = await get_transaction_by_sms_id(db, sms.id)
    if existing:
        raise DuplicateSMSError(sms.id)

    parsed = parse_sms(sms.address, sms.body)
    if not parsed:
        raise UnmatchedSMSError(sms.id)

    sms_received_at = _parse_received_timestamp(sms.received)

    # Fall back to SMS received date if transaction_date wasn't parsed
    tx_date = parsed.transaction_date
    if tx_date is None and sms_received_at:
        tx_date = sms_received_at.date()

    merchant_id = None
    category_id = None
    category_source = None
    if parsed.merchant_raw:
        merchant = await get_or_create_merchant(db, parsed.merchant_raw, vpa=parsed.vpa)
        merchant_id = merchant.id
        category_id = merchant.category_id
        if category_id:
            category_source = "confirmed" if merchant.is_confirmed else merchant.source

    await create_transaction(
        db,
        sms_id=sms.id,
        direction=parsed.direction,
        amount=parsed.amount,
        bank=parsed.bank,
        merchant_id=merchant_id,
        merchant_raw=parsed.merchant_raw,
        account_last4=parsed.account_last4,
        vpa=parsed.vpa,
        upi_ref=parsed.upi_ref,
        transaction_date=tx_date,
        category_id=category_id,
        category_source=category_source,
        raw_sms=sms.body,
        sms_sender=sms.address,
        sms_received_at=sms_received_at,
    )
