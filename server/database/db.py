import logging

from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from pathlib import Path
from typing import AsyncGenerator

from database.models import Base

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "autotally.db"

DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(DATABASE_URL, connect_args={"check_same_thread": False})

async_session = async_sessionmaker(autoflush=False, bind=engine)


# New columns to add to existing tables (lightweight migration)
_MIGRATIONS = [
    ("merchants", "vpa", "TEXT"),
    ("merchants", "display_name", "TEXT"),
    ("merchants", "primary_merchant_id", "INTEGER REFERENCES merchants(id)"),
]


_INDICES = [
    ("ix_transactions_date", "transactions", "transaction_date"),
    ("ix_transactions_direction_date", "transactions", "direction, transaction_date"),
    ("ix_transactions_category_date", "transactions", "category_id, transaction_date"),
    ("ix_transactions_merchant_date", "transactions", "merchant_id, transaction_date"),
]


async def _run_migrations(conn):
    """Add new columns to existing tables if they don't exist."""
    def _get_columns(connection, table_name):
        insp = inspect(connection)
        return {col["name"] for col in insp.get_columns(table_name)}

    for table, column, col_type in _MIGRATIONS:
        existing = await conn.run_sync(_get_columns, table)
        if column not in existing:
            await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
            logger.info("Migration: added column %s.%s", table, column)

    for idx_name, table, columns in _INDICES:
        await conn.execute(text(
            f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({columns})"
        ))
    logger.info("Migration: ensured %d indices exist", len(_INDICES))


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _run_migrations(conn)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
