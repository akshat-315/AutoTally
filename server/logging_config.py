import logging
import sys


def setup_logging() -> None:
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.addHandler(handler)

    # Quiet SQLAlchemy's noisy query logging
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
