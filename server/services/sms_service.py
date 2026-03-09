from typing import List
from schemas import SmsIngestPaylod, SmsDbFormat

def sms_payload_to_db_format(payload: List[SmsIngestPaylod]):
    """
    Convert the received payload into appropriate format to store in the database
    """
    