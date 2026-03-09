from pydantic import BaseModel

class SmsIngestPaylod(BaseModel):
    address: str
    received: str
    body: str

class SmsDbFormat(BaseModel):
    transaction_type: str
    amount: float