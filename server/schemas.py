from pydantic import BaseModel, Field
from typing import List


class SmsIngestPayload(BaseModel):
    id: int = Field(alias="_id")
    address: str
    received: str
    body: str

    model_config = {"populate_by_name": True}


class IngestResponse(BaseModel):
    message: str
    processed: int
    ignored: int
    skipped: int
    failed: int
    errors: List[str]
