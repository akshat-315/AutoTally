from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from schemas import SmsIngestPayload, IngestResponse
from services.sms_parser import parse_sms
from database.operations.sms_operations import (
    get_transaction_by_sms_id,
    get_or_create_merchant,
    create_transaction,
)


async def process_sms_batch(
    payloads: list[SmsIngestPayload], db: AsyncSession
) -> IngestResponse:
    processed = 0
    skipped = 0
    failed = 0
    errors: list[str] = []

    for sms in payloads:
        try:
            # Dedup check
            existing = await get_transaction_by_sms_id(db, sms.id)
            if existing:
                skipped += 1
                continue

            # Parse
            parsed = parse_sms(sms.address, sms.body)
            if not parsed:
                failed += 1
                errors.append(f"sms_id={sms.id}: could not parse SMS body")
                continue

            # Merchant lookup
            merchant_id = None
            category_id = None
            if parsed.merchant_raw:
                merchant = await get_or_create_merchant(db, parsed.merchant_raw)
                merchant_id = merchant.id
                category_id = merchant.category_id

            # Parse received timestamp
            sms_received_at = None
            try:
                sms_received_at = datetime.strptime(sms.received, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                pass

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
