import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_db
from exceptions import AutoTallyError, DatabaseError, DuplicateSMSError, UnmatchedSMSError
from schemas import IngestResponse, SmsIngestPayload
from services.sms.sms_service import process_single_sms

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/sms", tags=["sms"])

SMS_LOGS_DIR = Path(__file__).resolve().parent.parent / "logs" / "sms_logs"


def _sms_to_dict(sms: SmsIngestPayload) -> dict:
    return {"id": sms.id, "address": sms.address, "received": sms.received, "body": sms.body}


def _save_sms_logs(
    processed_list: list[dict],
    ignored_list: list[dict],
    skipped_list: list[dict],
    failed_list: list[dict],
) -> None:
    SMS_LOGS_DIR.mkdir(exist_ok=True)
    date_str = datetime.now().strftime("%Y%m%d")
    cutoff = datetime.now().timestamp() - 30 * 24 * 3600

    for stale in SMS_LOGS_DIR.glob("*.json"):
        if stale.stat().st_mtime < cutoff:
            stale.unlink()

    for name, data in [
        ("processed", processed_list),
        ("ignored", ignored_list),
        ("skipped", skipped_list),
        ("failed", failed_list),
    ]:
        if not data:
            continue
        filepath = SMS_LOGS_DIR / f"{name}_{date_str}.json"
        existing: list[dict] = []
        if filepath.exists():
            with open(filepath) as f:
                existing = json.load(f)
        with open(filepath, "w") as f:
            json.dump(data + existing, f, indent=2, ensure_ascii=False)


@router.post("/ingest", response_model=IngestResponse)
async def ingest_sms(
    payload: List[SmsIngestPayload],
    db: AsyncSession = Depends(get_db),
):
    if not payload:
        return IngestResponse(
            message="No SMS data provided",
            processed=0,
            ignored=0,
            skipped=0,
            failed=0,
            errors=[],
        )

    processed = 0
    ignored = 0
    skipped = 0
    failed = 0
    errors: list[str] = []

    processed_list: list[dict] = []
    ignored_list: list[dict] = []
    skipped_list: list[dict] = []
    failed_list: list[dict] = []
    notification_data: list[dict] = []

    for sms in payload:
        try:
            tx_info = await process_single_sms(sms, db)
            processed += 1
            processed_list.append(_sms_to_dict(sms))
            notification_data.append(tx_info)
        except UnmatchedSMSError:
            ignored += 1
            ignored_list.append(_sms_to_dict(sms))
        except DuplicateSMSError:
            skipped += 1
            skipped_list.append(_sms_to_dict(sms))
        except DatabaseError as e:
            logger.error("Database error processing sms_id=%s: %s", sms.id, e)
            failed += 1
            errors.append(f"sms_id={sms.id}: {e}")
            failed_list.append({**_sms_to_dict(sms), "error": str(e)})
        except AutoTallyError as e:
            logger.warning("Failed to process sms_id=%s: %s", sms.id, e)
            failed += 1
            errors.append(f"sms_id={sms.id}: {e}")
            failed_list.append({**_sms_to_dict(sms), "error": str(e)})

    _save_sms_logs(processed_list, ignored_list, skipped_list, failed_list)

    if failed > 0:
        logger.info(
            "Ingest completed with errors: %d processed, %d ignored, %d skipped, %d failed. Errors: %s",
            processed,
            ignored,
            skipped,
            failed,
            errors,
        )
        raise AutoTallyError(
            f"Ingest completed with errors: {processed} processed, {ignored} ignored, {skipped} skipped, {failed} failed. Errors: {errors}",
            status_code=422,
        )

    try:
        await db.commit()
    except Exception as e:
        logger.critical("Batch commit failed: %s. Rolling back.", e)
        await db.rollback()
        raise DatabaseError("batch_commit", original=e) from e

    # Send Telegram notifications after successful commit
    if notification_data:
        from services.telegram.notify import send_transaction_notifications
        await send_transaction_notifications(notification_data)

    return IngestResponse(
        message=f"Ingested {processed} SMS, ignored {ignored}, skipped {skipped}, failed {failed}",
        processed=processed,
        ignored=ignored,
        skipped=skipped,
        failed=failed,
        errors=errors,
    )
