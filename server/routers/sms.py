from fastapi import APIRouter, Depends
from typing import List
from fastapi.responses import JSONResponse

from schemas import SmsIngestPaylod
from server.database.db import get_db

router = APIRouter(prefix="/api/v1/sms", tags=["sms"])

router.post("/ingest", tags=["ingest"])
async def ingest_sms(
        payload: List[SmsIngestPaylod],
        AsyncSession = Depends(get_db)
):
    """
    Ingest SMS data coming from the user's device via Termux
    """
    if not payload:
        return JSONResponse(
            content={"message": "No SMS data provided"}, status_code=400
        )
    
    # Assuming the SmsIngestPaylod is in this format:
    # {
    #     "address": "JX-HDFCBK-S",
    #     "received": "2026-03-06 20:09:57",
    #     "body": "Credit Alert!\nRs.71.00 credited to HDFC Bank A/c XX4273 on 06-03-26 from VPA eraparmar00@okhdfcbank (UPI 119609013791)\n",
    # }

    # Convert the received payload into appropriate format to store in the database


    # Save the data to the database

    return JSONResponse(content={"message": "SMS data ingested successfully"}, status_code=200)

    