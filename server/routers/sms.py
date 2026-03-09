from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from schemas import SmsIngestPayload, IngestResponse
from database.db import get_db
from services.sms_parser import parse_sms
from services.sms_processor import parse_received_timestamp
from database.operations.transaction_ops import get_transaction_by_sms_id, create_transaction
from database.operations.merchant_ops import get_or_create_merchant

router = APIRouter(prefix="/api/v1/sms", tags=["sms"])


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
            # --- DB: dedup check ---
            existing = await get_transaction_by_sms_id(db, sms.id)
            if existing:
                skipped += 1
                continue

            # --- Service: parse SMS ---
            parsed = parse_sms(sms.address, sms.body)
            if not parsed:
                failed += 1
                errors.append(f"sms_id={sms.id}: could not parse SMS body")
                continue

            # --- Service: parse timestamp ---
            sms_received_at = parse_received_timestamp(sms.received)

            # --- DB: merchant lookup/create ---
            merchant_id = None
            category_id = None
            if parsed.merchant_raw:
                merchant = await get_or_create_merchant(db, parsed.merchant_raw)
                merchant_id = merchant.id
                category_id = merchant.category_id

            # --- DB: create transaction ---
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
            processed += 1

        except Exception as e:
            failed += 1
            errors.append(f"sms_id={sms.id}: {str(e)}")

    await db.commit()

    return IngestResponse(
        message=f"Ingested {processed} SMS, skipped {skipped}, failed {failed}",
        processed=processed,
        skipped=skipped,
        failed=failed,
        errors=errors,
    )
