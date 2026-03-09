import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def parse_received_timestamp(received: str) -> datetime | None:
    try:
        return datetime.strptime(received, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        logger.warning("Could not parse received timestamp: %r", received)
        return None
