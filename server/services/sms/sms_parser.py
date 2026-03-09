import logging
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

from exceptions import DateParseError
from services.sms.template_loader import load_templates

logger = logging.getLogger(__name__)


@dataclass
class ParsedSMS:
    direction: str  # 'credit' or 'debit'
    amount: float
    bank: str
    account_last4: Optional[str] = None
    merchant_raw: Optional[str] = None
    vpa: Optional[str] = None
    upi_ref: Optional[str] = None
    transaction_date: Optional[date] = None


BANK_SENDER_MAP = load_templates()


def _identify_bank(sender: str) -> list | None:
    sender_upper = sender.upper()
    for key, patterns in BANK_SENDER_MAP.items():
        if key in sender_upper:
            return patterns
    return None


def _parse_date(date_str: str) -> date:
    """Parse date strings in common Indian bank SMS formats."""
    stripped = date_str.strip()
    for fmt in ("%d-%m-%y", "%d/%m/%y", "%d-%b-%y", "%d-%b-%Y", "%d %b %Y"):
        try:
            return datetime.strptime(stripped, fmt).date()
        except ValueError:
            continue
    raise DateParseError(date_str)


def parse_sms(sender: str, body: str) -> ParsedSMS | None:
    patterns = _identify_bank(sender)
    if not patterns:
        return None

    for pattern_def in patterns:
        match = pattern_def["template"].search(body)
        if match:
            groups = match.groupdict()

            amount_str = groups.get("amount", "0")
            amount = float(amount_str.replace(",", ""))

            tx_date = None
            if "date" in groups:
                try:
                    tx_date = _parse_date(groups["date"])
                except DateParseError:
                    logger.warning(
                        "Could not parse date %r from sender=%s, continuing with tx_date=None",
                        groups["date"],
                        sender,
                    )

            vpa = groups.get("vpa")
            merchant_raw = groups.get("merchant") or vpa

            return ParsedSMS(
                direction=pattern_def["direction"],
                amount=amount,
                bank=pattern_def["bank"],
                account_last4=groups.get("last4"),
                merchant_raw=merchant_raw,
                vpa=vpa,
                upi_ref=groups.get("upi_ref"),
                transaction_date=tx_date,
            )

    return None
