from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from schemas import SmsIngestPayload, IngestResponse
from database.db import get_db
from services.sms_service import process_sms_batch

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

    return await process_sms_batch(payload, db)
