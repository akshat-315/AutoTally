from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

from services.template_engine import compile_template


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


# HDFC Bank SMS templates
HDFC_PATTERNS = [
    # Credit via UPI with VPA
    {
        "template": compile_template(
            "Rs.{amount} credited to HDFC Bank A/c XX{last4} on {date} from VPA {vpa} (UPI {upi_ref})"
        ),
        "direction": "credit",
        "bank": "HDFC",
    },
    # Debit via UPI with VPA
    {
        "template": compile_template(
            "Rs.{amount} debited from HDFC Bank A/c XX{last4} on {date} to VPA {vpa} (UPI {upi_ref})"
        ),
        "direction": "debit",
        "bank": "HDFC",
    },
    # Credit via UPI with merchant name (no VPA)
    {
        "template": compile_template(
            "Rs.{amount} credited to HDFC Bank A/c XX{last4} on {date} by {merchant} (UPI {upi_ref})"
        ),
        "direction": "credit",
        "bank": "HDFC",
    },
    # Debit via UPI with merchant name (no VPA)
    {
        "template": compile_template(
            "Rs.{amount} debited from HDFC Bank A/c XX{last4} on {date} to {merchant} (UPI {upi_ref})"
        ),
        "direction": "debit",
        "bank": "HDFC",
    },
]

BANK_SENDER_MAP = {
    "HDFCBK": HDFC_PATTERNS,
}


def _identify_bank(sender: str) -> list | None:
    sender_upper = sender.upper()
    for key, patterns in BANK_SENDER_MAP.items():
        if key in sender_upper:
            return patterns
    return None


def _parse_date(date_str: str) -> date:
    """Parse date strings like '06-03-26' (DD-MM-YY)."""
    return datetime.strptime(date_str.strip(), "%d-%m-%y").date()


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
                except ValueError:
                    pass

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
