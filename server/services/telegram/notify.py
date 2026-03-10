import logging

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from database.db import async_session
from database.operations.category_ops import get_all_categories
from services.telegram.bot import get_bot, TELEGRAM_CHAT_ID

logger = logging.getLogger(__name__)


def _format_amount(amount: float) -> str:
    return f"₹{amount:,.2f}"


async def send_transaction_notifications(transactions: list[dict]) -> None:
    """Send Telegram notifications for processed transactions. Never raises."""
    try:
        bot = get_bot()
        if bot is None:
            return

        # Fetch categories once for all transactions
        categories = []
        has_uncategorized = any(not tx.get("category_id") for tx in transactions)
        if has_uncategorized:
            async with async_session() as db:
                categories = await get_all_categories(db)

        for tx in transactions:
            await _send_single(bot, tx, categories)

    except Exception:
        logger.exception("Failed to send Telegram notifications")


async def _send_single(bot, tx: dict, categories: list[dict]) -> None:
    direction = tx.get("direction", "debit")
    icon = "⬇️" if direction == "debit" else "⬆️"
    verb = "spent" if direction == "debit" else "received"

    lines = [
        f"{icon} <b>{_format_amount(tx['amount'])} {verb}</b>",
        f"Merchant: {tx.get('merchant_name', 'Unknown')}",
        f"Bank: {tx.get('bank', 'Unknown')}",
    ]

    if tx.get("category_name"):
        lines.append(f"Category: {tx['category_name']}")
        await bot.send_message(
            chat_id=TELEGRAM_CHAT_ID,
            text="\n".join(lines),
            parse_mode="HTML",
        )
    else:
        lines.append("Category: <i>Uncategorized</i>")
        keyboard = _build_category_keyboard(tx.get("merchant_id"), categories)
        await bot.send_message(
            chat_id=TELEGRAM_CHAT_ID,
            text="\n".join(lines),
            parse_mode="HTML",
            reply_markup=keyboard,
        )


def _build_category_keyboard(merchant_id: int | None, categories: list[dict]) -> InlineKeyboardMarkup | None:
    if not merchant_id:
        return None

    buttons = []
    for cat in categories:
        icon = cat["icon"] or ""
        label = f"{icon} {cat['name']}".strip()
        buttons.append(
            InlineKeyboardButton(label, callback_data=f"cat:{merchant_id}:{cat['id']}")
        )

    # 2 buttons per row
    rows = [buttons[i:i + 2] for i in range(0, len(buttons), 2)]
    rows.append([InlineKeyboardButton("➕ Create New", callback_data=f"newcat:{merchant_id}")])

    return InlineKeyboardMarkup(rows)
