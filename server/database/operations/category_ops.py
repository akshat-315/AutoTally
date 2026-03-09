import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Category
from exceptions import DatabaseError

logger = logging.getLogger(__name__)


async def get_all_categories(db: AsyncSession) -> list[Category]:
    result = await db.execute(select(Category).order_by(Category.name))
    return list(result.scalars().all())


async def get_category_by_id(db: AsyncSession, category_id: int) -> Optional[Category]:
    result = await db.execute(select(Category).where(Category.id == category_id))
    return result.scalar_one_or_none()


async def create_category(
    db: AsyncSession,
    name: str,
    icon: Optional[str] = None,
    description: Optional[str] = None,
) -> Category:
    try:
        category = Category(name=name, icon=icon, description=description)
        db.add(category)
        await db.flush()
        return category
    except IntegrityError as e:
        raise DatabaseError(f"Category '{name}' already exists") from e
    except SQLAlchemyError as e:
        raise DatabaseError("create_category", original=e) from e


async def update_category(
    db: AsyncSession,
    category_id: int,
    name: Optional[str] = None,
    icon: Optional[str] = None,
    description: Optional[str] = None,
) -> Category:
    category = await get_category_by_id(db, category_id)
    if not category:
        raise DatabaseError(f"category_id={category_id} not found")

    if name is not None:
        category.name = name
    if icon is not None:
        category.icon = icon
    if description is not None:
        category.description = description

    await db.flush()
    return category


async def delete_category(db: AsyncSession, category_id: int) -> None:
    category = await get_category_by_id(db, category_id)
    if not category:
        raise DatabaseError(f"category_id={category_id} not found")
    await db.delete(category)
    await db.flush()
