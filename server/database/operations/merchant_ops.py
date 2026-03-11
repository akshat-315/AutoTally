import logging
from datetime import datetime, timezone
from typing import Optional

from rapidfuzz import process, fuzz
from sqlalchemy import select, func, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Merchant, Transaction, Category
from exceptions import DatabaseError

logger = logging.getLogger(__name__)

FUZZY_MATCH_THRESHOLD = 85
AUTO_CONFIRM_THRESHOLD = 3

# Module-level cache: list of (name, category_id) for confirmed merchants
_confirmed_cache: list[tuple[str, int]] = []
_cache_loaded = False


async def _refresh_cache(db: AsyncSession) -> None:
    """Refresh the in-memory confirmed merchant cache."""
    global _confirmed_cache, _cache_loaded
    result = await db.execute(
        select(Merchant.name, Merchant.category_id).where(
            Merchant.category_id.isnot(None),
            Merchant.is_confirmed == True,
        )
    )
    _confirmed_cache = [(row[0], row[1]) for row in result.all()]
    _cache_loaded = True
    logger.debug("Refreshed confirmed merchant cache: %d entries", len(_confirmed_cache))


def _fuzzy_category_from_cache(normalized_name: str) -> Optional[int]:
    """Look up category from the confirmed merchant cache using fuzzy matching."""
    if not _confirmed_cache:
        return None

    names = [name for name, _ in _confirmed_cache]
    matches = process.extract(
        normalized_name,
        names,
        scorer=fuzz.token_sort_ratio,
        score_cutoff=FUZZY_MATCH_THRESHOLD,
        limit=1,
    )

    if not matches:
        return None

    matched_name, score, idx = matches[0]
    category_id = _confirmed_cache[idx][1]
    logger.info(
        "Cache fuzzy match: %s ~ %s (score=%.1f), category_id=%s",
        normalized_name, matched_name, score, category_id,
    )
    return category_id


async def get_or_create_merchant(
    db: AsyncSession, raw_name: str, vpa: Optional[str] = None
) -> Merchant:
    """
    Tiered merchant resolution:
      1. VPA exact match
      2. Exact normalized name match
      3. Fuzzy name match from cache (copies category only)
      4. Brand new merchant
    """
    global _cache_loaded
    normalized = raw_name.strip().upper()
    now = datetime.now(timezone.utc)

    if not _cache_loaded:
        await _refresh_cache(db)

    try:
        # --- Tier 1: VPA exact match ---
        if vpa:
            result = await db.execute(
                select(Merchant).where(Merchant.vpa == vpa)
            )
            merchant = result.scalar_one_or_none()
            if merchant:
                merchant.last_seen = now
                logger.debug("Tier 1 VPA match: %s -> merchant %s", vpa, merchant.name)
                return merchant

        # --- Tier 2: Exact normalized name match ---
        result = await db.execute(
            select(Merchant).where(Merchant.name == normalized)
        )
        merchant = result.scalar_one_or_none()
        if merchant:
            merchant.last_seen = now
            if vpa and not merchant.vpa:
                merchant.vpa = vpa
                logger.info("Learned VPA %s for merchant %s", vpa, merchant.name)
            return merchant

        # --- Tier 3: Fuzzy category from cache ---
        category_id = _fuzzy_category_from_cache(normalized)

        # --- Tier 4: Create new merchant ---
        merchant = Merchant(
            name=normalized,
            vpa=vpa,
            category_id=category_id,
            source="fuzzy" if category_id else "pending",
            first_seen=now,
            last_seen=now,
        )
        db.add(merchant)
        await db.flush()

        if category_id:
            logger.info(
                "Fuzzy matched new merchant %s, auto-assigned category_id=%d",
                normalized, category_id,
            )
        else:
            logger.info("Created new merchant: %s", normalized)

        return merchant

    except IntegrityError as e:
        logger.warning("IntegrityError creating merchant %r, re-fetching: %s", normalized, e)
        await db.rollback()
        result = await db.execute(select(Merchant).where(Merchant.name == normalized))
        merchant = result.scalar_one_or_none()
        if merchant:
            return merchant
        raise DatabaseError("get_or_create_merchant", original=e) from e

    except SQLAlchemyError as e:
        logger.error("Database error in get_or_create_merchant for %r: %s", normalized, e)
        raise DatabaseError("get_or_create_merchant", original=e) from e


async def categorize_merchant(
    db: AsyncSession, merchant_id: int, category_id: int
) -> Merchant:
    """Set category on a merchant, mark confirmed, backfill transactions, and update cache."""
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise DatabaseError(f"merchant_id={merchant_id} not found")

    # Verify category exists
    cat_result = await db.execute(select(Category).where(Category.id == category_id))
    if not cat_result.scalar_one_or_none():
        raise DatabaseError(f"category_id={category_id} not found")

    merchant.category_id = category_id
    merchant.times_confirmed += 1
    merchant.source = "user"

    # Auto-confirm after threshold
    if merchant.times_confirmed >= AUTO_CONFIRM_THRESHOLD:
        merchant.is_confirmed = True

    # Backfill transactions for this merchant (skip manual per-transaction overrides)
    await db.execute(
        update(Transaction)
        .where(
            Transaction.merchant_id == merchant_id,
            Transaction.category_source != "user_override",
        )
        .values(category_id=category_id, category_source="user")
    )

    # Also update uncategorized transactions from other merchants with matching category
    await db.flush()

    # Refresh cache if merchant just got confirmed
    if merchant.is_confirmed:
        await _refresh_cache(db)

    logger.info(
        "Categorized merchant %s (id=%d) -> category_id=%d (confirmed=%s)",
        merchant.name, merchant_id, category_id, merchant.is_confirmed,
    )
    return merchant


async def get_uncategorized_merchants(db: AsyncSession) -> list[dict]:
    """Get merchants without a category, ordered by transaction count."""
    stmt = (
        select(
            Merchant,
            func.count(Transaction.id).label("transaction_count"),
        )
        .outerjoin(Transaction, Transaction.merchant_id == Merchant.id)
        .where(Merchant.category_id.is_(None))
        .group_by(Merchant.id)
        .order_by(func.count(Transaction.id).desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "id": merchant.id,
            "name": merchant.name,
            "vpa": merchant.vpa,
            "first_seen": merchant.first_seen.isoformat() if merchant.first_seen else None,
            "last_seen": merchant.last_seen.isoformat() if merchant.last_seen else None,
            "transaction_count": tx_count,
        }
        for merchant, tx_count in rows
    ]


async def get_all_merchants(db: AsyncSession) -> list[dict]:
    """Get all merchants with their category and transaction count."""
    stmt = (
        select(
            Merchant,
            func.count(Transaction.id).label("transaction_count"),
            Category.name.label("category_name"),
        )
        .outerjoin(Transaction, Transaction.merchant_id == Merchant.id)
        .outerjoin(Category, Category.id == Merchant.category_id)
        .group_by(Merchant.id)
        .order_by(func.count(Transaction.id).desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "id": merchant.id,
            "name": merchant.name,
            "display_name": merchant.display_name,
            "vpa": merchant.vpa,
            "category_id": merchant.category_id,
            "category_name": category_name,
            "is_confirmed": merchant.is_confirmed,
            "source": merchant.source,
            "first_seen": merchant.first_seen.isoformat() if merchant.first_seen else None,
            "last_seen": merchant.last_seen.isoformat() if merchant.last_seen else None,
            "transaction_count": tx_count,
        }
        for merchant, tx_count, category_name in rows
    ]
