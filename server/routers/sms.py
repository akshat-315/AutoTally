import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_db
from exceptions import AutoTallyError, DatabaseError, DuplicateSMSError
from schemas import IngestResponse, SmsIngestPayload
from services.sms.sms_service import process_single_sms

logger = logging.getLogger(__name__)

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
    
    if errors:
        logger.info(
            "Ingest completed with errors: %d processed, %d skipped, %d failed. Errors: %s",
            processed,
            skipped,
            failed,
            errors,
        )
        raise AutoTallyError(
            f"Ingest completed with errors: {processed} processed, {skipped} skipped, {failed} failed. Errors: {errors}",
            status_code=422
        )

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
