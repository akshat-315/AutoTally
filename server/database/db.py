from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import AsyncGenerator


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "autotaly.db"

DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(DATABASE_URL, connect_args={"check_same_thread": False})

async_session = async_sessionmaker(autoflush=False, bind=engine)

async def get_db() -> AsyncGenerator[AsyncSession]:
    async with async_session() as session:
        yield session
