from datetime import datetime


def parse_received_timestamp(received: str) -> datetime | None:
    try:
        return datetime.strptime(received, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None
