import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_db
from database.operations.merchant_ops import get_or_create_merchant
from database.operations.transaction_ops import create_transaction, get_transaction_by_sms_id
from exceptions import AutoTallyError, DatabaseError, DuplicateSMSError
from schemas import IngestResponse, SmsIngestPayload
from services.sms_parser import parse_sms
from services.sms_processor import parse_received_timestamp

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/sms", tags=["sms"])


async def process_single_sms(sms: SmsIngestPayload, db: AsyncSession) -> None:
    """Process a single SMS. Raises DuplicateSMSError, AutoTallyError, or DatabaseError."""
    existing = await get_transaction_by_sms_id(db, sms.id)
    if existing:
        raise DuplicateSMSError(sms.id)

    parsed = parse_sms(sms.address, sms.body)
    if not parsed:
        raise AutoTallyError(f"sms_id={sms.id}: could not parse SMS body")

    sms_received_at = parse_received_timestamp(sms.received)

    merchant_id = None
    category_id = None
    if parsed.merchant_raw:
        merchant = await get_or_create_merchant(db, parsed.merchant_raw)
        merchant_id = merchant.id
        category_id = merchant.category_id

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
        transaction_date=parsed.transaction_date,
        category_id=category_id,
        raw_sms=sms.body,
        sms_sender=sms.address,
        sms_received_at=sms_received_at,
    )


@router.post("/ingest", response_model=IngestResponse)
async def ingest_sms(
    payload: List[SmsIngestPayload],
    db: AsyncSession = Depends(get_db),
):
    if not payload:
        return IngestResponse(
            message="No SMS data provided",
            processed=0,
            skipped=0,
            failed=0,
            errors=[],
        )

    processed = 0
    skipped = 0
    failed = 0
    errors: list[str] = []

    for sms in payload:
        try:
            await process_single_sms(sms, db)
            processed += 1
        except DuplicateSMSError:
            skipped += 1
        except DatabaseError as e:
            logger.error("Database error processing sms_id=%s: %s", sms.id, e)
            failed += 1
            errors.append(f"sms_id={sms.id}: {e}")
        except AutoTallyError as e:
            logger.warning("Failed to process sms_id=%s: %s", sms.id, e)
            failed += 1
            errors.append(str(e))

    try:
        await db.commit()
    except Exception as e:
        logger.critical("Batch commit failed: %s. Rolling back.", e)
        await db.rollback()
        raise DatabaseError("batch_commit", original=e) from e

    return IngestResponse(
        message=f"Ingested {processed} SMS, skipped {skipped}, failed {failed}",
        processed=processed,
        skipped=skipped,
        failed=failed,
        errors=errors,
    )
