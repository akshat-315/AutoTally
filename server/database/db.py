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
