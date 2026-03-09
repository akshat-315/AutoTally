class AutoTallyError(Exception):
    """Base exception for all AutoTally errors."""
    def __init__(self, detail: str = "", status_code: int = 422):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class UnmatchedSMSError(AutoTallyError):
    """SMS does not match any known bank pattern."""

    def __init__(self, sms_id: int):
        self.sms_id = sms_id
        super().__init__(f"sms_id={sms_id}: no matching bank pattern")


class SMSParseError(AutoTallyError):
    """SMS body could not be parsed."""

    def __init__(self, sms_id: int, detail: str = "could not parse SMS body"):
        self.sms_id = sms_id
        self.detail = detail
        super().__init__(f"sms_id={sms_id}: {detail}")


class DateParseError(AutoTallyError):
    """Date string is malformed."""

    def __init__(self, date_str: str):
        self.date_str = date_str
        super().__init__(f"could not parse date: {date_str!r}")


class DuplicateSMSError(AutoTallyError):
    """SMS has already been processed."""

    def __init__(self, sms_id: int):
        self.sms_id = sms_id
        super().__init__(f"sms_id={sms_id}: already processed")


class DatabaseError(AutoTallyError):
    """Wraps SQLAlchemy errors so upper layers don't import sqlalchemy.exc."""

    status_code: int = 500

    def __init__(self, operation: str, *, original: Exception | None = None):
        self.operation = operation
        self.original = original
        detail = f"database error during {operation}"
        if original:
            detail += f": {original}"
        super().__init__(detail)


class StartupError(AutoTallyError):
    """Application failed to start."""
