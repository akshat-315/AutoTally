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


def _resolve_primary(merchant: Merchant) -> Merchant:
    """Follow primary_merchant_id (at most one hop - we don't chain)."""
    # Note: primary merchant must be eagerly loaded or this won't work.
    # In practice, we resolve via separate queries.
    return merchant


async def resolve_primary(db: AsyncSession, merchant: Merchant) -> Merchant:
    """Resolve to the primary/canonical merchant via DB lookup."""
    if merchant.primary_merchant_id is None:
        return merchant
    result = await db.execute(
        select(Merchant).where(Merchant.id == merchant.primary_merchant_id)
    )
    primary = result.scalar_one_or_none()
    return primary if primary else merchant


async def get_or_create_merchant(
    db: AsyncSession, raw_name: str, vpa: Optional[str] = None
) -> Merchant:
    """
    Tiered merchant resolution:
      1. VPA exact match (100% confidence)
      2. Exact normalized name match
      3. Fuzzy name match (conservative: copy category, keep separate)
      4. Brand new merchant
    """
    normalized = raw_name.strip().upper()
    now = datetime.now(timezone.utc)

    try:
        # --- Tier 1: VPA exact match ---
        if vpa:
            result = await db.execute(
                select(Merchant).where(Merchant.vpa == vpa)
            )
            merchant = result.scalar_one_or_none()
            if merchant:
                merchant.last_seen = now
                primary = await resolve_primary(db, merchant)
                logger.debug("Tier 1 VPA match: %s -> merchant %s", vpa, primary.name)
                return primary

        # --- Tier 2: Exact normalized name match ---
        result = await db.execute(
            select(Merchant).where(Merchant.name == normalized)
        )
        merchant = result.scalar_one_or_none()
        if merchant:
            merchant.last_seen = now
            # Learn VPA if we didn't have one
            if vpa and not merchant.vpa:
                merchant.vpa = vpa
                logger.info("Learned VPA %s for merchant %s", vpa, merchant.name)
            primary = await resolve_primary(db, merchant)
            return primary

        # --- Tier 3: Fuzzy name match (conservative) ---
        category_id = await _fuzzy_category_lookup(db, normalized)

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


async def _fuzzy_category_lookup(db: AsyncSession, normalized_name: str) -> Optional[int]:
    """
    Look for fuzzy name matches among existing primary merchants that have a category.
    Conservative approach: only copies the category, does NOT link merchants.
    """
    result = await db.execute(
        select(Merchant).where(
            Merchant.primary_merchant_id.is_(None),
            Merchant.category_id.isnot(None),
        )
    )
    merchants = result.scalars().all()

    if not merchants:
        return None

    names = [m.name for m in merchants]
    matches = process.extract(
        normalized_name,
        names,
        scorer=fuzz.token_sort_ratio,
        score_cutoff=FUZZY_MATCH_THRESHOLD,
        limit=1,
    )

    if not matches:
        return None

    matched_name, score, _ = matches[0]
    name_to_merchant = {m.name: m for m in merchants}
    matched_merchant = name_to_merchant[matched_name]

    logger.info(
        "Fuzzy match: %s ~ %s (score=%.1f), copying category_id=%s",
        normalized_name, matched_name, score, matched_merchant.category_id,
    )
    return matched_merchant.category_id


async def fuzzy_search_merchants(
    db: AsyncSession, query: str, threshold: int = FUZZY_MATCH_THRESHOLD, limit: int = 5
) -> list[tuple[Merchant, float]]:
    """Search for merchants by fuzzy name match. Returns (merchant, score) pairs."""
    result = await db.execute(
        select(Merchant).where(Merchant.primary_merchant_id.is_(None))
    )
    merchants = result.scalars().all()

    if not merchants:
        return []

    names = [m.name for m in merchants]
    matches = process.extract(
        query.strip().upper(),
        names,
        scorer=fuzz.token_sort_ratio,
        score_cutoff=threshold,
        limit=limit,
    )

    name_to_merchant = {m.name: m for m in merchants}
    return [(name_to_merchant[name], score) for name, score, _ in matches]


async def categorize_merchant(
    db: AsyncSession, merchant_id: int, category_id: int
) -> Merchant:
    """Set category on a merchant, mark confirmed, and backfill transactions."""
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise DatabaseError(f"merchant_id={merchant_id} not found")

    # Verify category exists
    cat_result = await db.execute(select(Category).where(Category.id == category_id))
    if not cat_result.scalar_one_or_none():
        raise DatabaseError(f"category_id={category_id} not found")

    merchant.category_id = category_id
    merchant.is_confirmed = True
    merchant.times_confirmed += 1
    merchant.source = "user"

    # Collect all merchant IDs to backfill (this merchant + any linked variants)
    merchant_ids = [merchant_id]
    linked_result = await db.execute(
        select(Merchant.id).where(Merchant.primary_merchant_id == merchant_id)
    )
    merchant_ids.extend(row[0] for row in linked_result.all())

    # Also set category on linked variant merchants
    if len(merchant_ids) > 1:
        await db.execute(
            update(Merchant)
            .where(Merchant.primary_merchant_id == merchant_id)
            .values(category_id=category_id)
        )

    # Backfill all transactions for these merchants
    await db.execute(
        update(Transaction)
        .where(Transaction.merchant_id.in_(merchant_ids))
        .values(category_id=category_id)
    )

    await db.flush()
    logger.info(
        "Categorized merchant %s (id=%d) -> category_id=%d, backfilled %d merchant(s)",
        merchant.name, merchant_id, category_id, len(merchant_ids),
    )
    return merchant


async def merge_merchant(
    db: AsyncSession, merchant_id: int, into_merchant_id: int
) -> Merchant:
    """Link a merchant as a variant of another (primary) merchant."""
    if merchant_id == into_merchant_id:
        raise DatabaseError("Cannot merge a merchant into itself")

    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise DatabaseError(f"merchant_id={merchant_id} not found")

    result = await db.execute(select(Merchant).where(Merchant.id == into_merchant_id))
    target = result.scalar_one_or_none()
    if not target:
        raise DatabaseError(f"into_merchant_id={into_merchant_id} not found")

    # Resolve target to its primary if it's also a variant
    if target.primary_merchant_id is not None:
        into_merchant_id = target.primary_merchant_id

    merchant.primary_merchant_id = into_merchant_id

    # Propagate category if target has one and source doesn't (or vice versa)
    if target.category_id and not merchant.category_id:
        merchant.category_id = target.category_id
    elif merchant.category_id and not target.category_id:
        target.category_id = merchant.category_id

    await db.flush()
    logger.info("Merged merchant %s (id=%d) -> %s (id=%d)", merchant.name, merchant_id, target.name, into_merchant_id)
    return merchant


async def unlink_merchant(db: AsyncSession, merchant_id: int) -> Merchant:
    """Remove a merchant's link to its primary merchant."""
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise DatabaseError(f"merchant_id={merchant_id} not found")

    merchant.primary_merchant_id = None
    await db.flush()
    logger.info("Unlinked merchant %s (id=%d)", merchant.name, merchant_id)
    return merchant


async def get_uncategorized_merchants(db: AsyncSession) -> list[dict]:
    """
    Get merchants without a category, ordered by transaction count.
    Only returns primary merchants (not variants).
    """
    stmt = (
        select(
            Merchant,
            func.count(Transaction.id).label("transaction_count"),
        )
        .outerjoin(Transaction, Transaction.merchant_id == Merchant.id)
        .where(
            Merchant.category_id.is_(None),
            Merchant.primary_merchant_id.is_(None),
        )
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
            "first_seen": merchant.first_seen.isoformat() if merchant.first_seen else None,
            "last_seen": merchant.last_seen.isoformat() if merchant.last_seen else None,
            "transaction_count": tx_count,
        }
        for merchant, tx_count in rows
    ]


async def get_all_merchants(db: AsyncSession) -> list[dict]:
    """Get all primary merchants with their category and transaction count."""
    stmt = (
        select(
            Merchant,
            func.count(Transaction.id).label("transaction_count"),
            Category.name.label("category_name"),
        )
        .outerjoin(Transaction, Transaction.merchant_id == Merchant.id)
        .outerjoin(Category, Category.id == Merchant.category_id)
        .where(Merchant.primary_merchant_id.is_(None))
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
