import logging
import os
from datetime import date, timedelta
from functools import wraps

from telegram import Update, ForceReply, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from database.db import async_session
from database.operations.category_ops import (
    create_category,
    get_all_categories,
    get_category_by_id,
)
from database.operations.dashboard_ops import get_category_breakdown, get_summary
from database.operations.merchant_ops import (
    categorize_merchant,
    get_uncategorized_merchants,
)
from database.operations.transaction_ops import update_transaction_category

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = int(os.getenv("TELEGRAM_CHAT_ID", "0"))

_app: Application | None = None


def get_bot():
    """Return the bot instance, or None if not configured."""
    if _app is None:
        return None
    return _app.bot


def authorized(func):
    """Silently ignore messages from unauthorized chats."""
    @wraps(func)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if update.effective_chat.id != TELEGRAM_CHAT_ID:
            return
        return await func(update, context)
    return wrapper


# ── Summary helper ──────────────────────────────────────────────────

async def _send_summary(update: Update, start_date: date, end_date: date, title: str):
    async with async_session() as db:
        summary = await get_summary(db, start_date, end_date)
        breakdown = await get_category_breakdown(db, start_date, end_date, direction="debit")

    lines = [
        f"<b>{title}</b>",
        f"{summary['start_date']} → {summary['end_date']}",
        "",
        f"💸 Spent: ₹{summary['total_debited']:,.2f} ({summary['debit_count']} txns)",
        f"💰 Received: ₹{summary['total_credited']:,.2f} ({summary['credit_count']} txns)",
        f"📊 Net: ₹{summary['net']:,.2f}",
    ]

    if breakdown:
        lines.append("")
        lines.append("<b>Spending by category:</b>")
        for row in breakdown:
            if row["total_debited"] <= 0:
                continue
            icon = row["icon"] or "•"
            lines.append(f"  {icon} {row['category_name']}: ₹{row['total_debited']:,.2f}")

    await update.message.reply_text("\n".join(lines), parse_mode="HTML")


# ── Command handlers ────────────────────────────────────────────────

@authorized
async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 <b>AutoTally Bot</b>\n\n"
        "I'll notify you of new transactions and let you categorize merchants inline.\n\n"
        "Commands:\n"
        "/today — Today's summary\n"
        "/yesterday — Yesterday's summary\n"
        "/week — This week\n"
        "/month — This month\n"
        "/year — This year\n"
        "/categories — All categories\n"
        "/uncategorized — Merchants needing review\n"
        "/help — Show this message",
        parse_mode="HTML",
    )


@authorized
async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await cmd_start(update, context)


@authorized
async def cmd_today(update: Update, context: ContextTypes.DEFAULT_TYPE):
    today = date.today()
    await _send_summary(update, today, today, "Today's Summary")


@authorized
async def cmd_yesterday(update: Update, context: ContextTypes.DEFAULT_TYPE):
    yesterday = date.today() - timedelta(days=1)
    await _send_summary(update, yesterday, yesterday, "Yesterday's Summary")


@authorized
async def cmd_week(update: Update, context: ContextTypes.DEFAULT_TYPE):
    today = date.today()
    start = today - timedelta(days=today.weekday())
    await _send_summary(update, start, today, "This Week")


@authorized
async def cmd_month(update: Update, context: ContextTypes.DEFAULT_TYPE):
    today = date.today()
    start = today.replace(day=1)
    await _send_summary(update, start, today, "This Month")


@authorized
async def cmd_year(update: Update, context: ContextTypes.DEFAULT_TYPE):
    today = date.today()
    start = today.replace(month=1, day=1)
    await _send_summary(update, start, today, "This Year")


@authorized
async def cmd_categories(update: Update, context: ContextTypes.DEFAULT_TYPE):
    async with async_session() as db:
        cats = await get_all_categories(db)

    if not cats:
        await update.message.reply_text("No categories found.")
        return

    lines = ["<b>Categories</b>", ""]
    for c in cats:
        icon = c["icon"] or "•"
        lines.append(
            f"{icon} <b>{c['name']}</b> — ₹{c['total_debited']:,.2f} ({c['transaction_count']} txns)"
        )

    await update.message.reply_text("\n".join(lines), parse_mode="HTML")


@authorized
async def cmd_uncategorized(update: Update, context: ContextTypes.DEFAULT_TYPE):
    async with async_session() as db:
        merchants = await get_uncategorized_merchants(db)

    if not merchants:
        await update.message.reply_text("All merchants are categorized! 🎉")
        return

    lines = ["<b>Uncategorized Merchants</b>", ""]
    for m in merchants[:20]:
        lines.append(f"• {m['name']} ({m['transaction_count']} txns)")

    if len(merchants) > 20:
        lines.append(f"\n… and {len(merchants) - 20} more")

    await update.message.reply_text("\n".join(lines), parse_mode="HTML")


# ── Callback: categorize merchant ───────────────────────────────────

@authorized
async def cb_categorize(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    _, merchant_id_str, category_id_str = query.data.split(":")
    merchant_id = int(merchant_id_str)
    category_id = int(category_id_str)

    async with async_session() as db:
        merchant = await categorize_merchant(db, merchant_id, category_id)
        await db.commit()
        merchant_name = merchant.name 

    await query.edit_message_reply_markup(reply_markup=None)
    await query.message.reply_text(
        f"✅ <b>{merchant_name}</b> categorized!",
        parse_mode="HTML",
    )


# ── Callback: create new category flow ──────────────────────────────

@authorized
async def cb_create_new(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    _, merchant_id_str = query.data.split(":")
    merchant_id = int(merchant_id_str)

    msg = await query.message.reply_text(
        "Send the new category name:",
        reply_markup=ForceReply(selective=True),
    )

    # Store mapping: prompt_message_id -> merchant_id
    if "pending_categories" not in context.user_data:
        context.user_data["pending_categories"] = {}
    context.user_data["pending_categories"][msg.message_id] = merchant_id


@authorized
async def handle_new_category_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    reply_to = update.message.reply_to_message
    if not reply_to:
        return

    pending = context.user_data.get("pending_categories", {})
    merchant_id = pending.get(reply_to.message_id)
    if merchant_id is None:
        return

    category_name = update.message.text.strip()
    if not category_name:
        await update.message.reply_text("Category name can't be empty.")
        return

    async with async_session() as db:
        cat = await create_category(db, name=category_name)
        await db.flush()
        merchant = await categorize_merchant(db, merchant_id, cat.id)
        await db.commit()
        merchant_name = merchant.name 

    del pending[reply_to.message_id]

    await update.message.reply_text(
        f"✅ Created <b>{category_name}</b> and categorized <b>{merchant_name}</b>!",
        parse_mode="HTML",
    )


# ── Callback: per-transaction category override ────────────────────

@authorized
async def cb_txn_change(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show category list for per-transaction override."""
    query = update.callback_query
    await query.answer()

    _, txn_id_str = query.data.split(":")
    txn_id = int(txn_id_str)

    async with async_session() as db:
        categories = await get_all_categories(db)

    if not categories:
        await query.message.reply_text("No categories available.")
        return

    from services.telegram.notify import _build_txn_category_keyboard
    keyboard = _build_txn_category_keyboard(txn_id, categories)
    await query.edit_message_reply_markup(reply_markup=keyboard)


@authorized
async def cb_txn_categorize(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Apply per-transaction category override."""
    query = update.callback_query
    await query.answer()

    _, txn_id_str, category_id_str = query.data.split(":")
    txn_id = int(txn_id_str)
    category_id = int(category_id_str)

    async with async_session() as db:
        txn = await update_transaction_category(db, txn_id, category_id)
        cat = await get_category_by_id(db, category_id) if category_id else None
        await db.commit()

    cat_name = cat.name if cat else "None"
    await query.edit_message_reply_markup(reply_markup=None)
    await query.message.reply_text(
        f"✏️ Transaction #{txn_id} overridden to <b>{cat_name}</b>",
        parse_mode="HTML",
    )


# ── Bot lifecycle ───────────────────────────────────────────────────

async def start_bot():
    global _app

    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled")
        return

    if not TELEGRAM_CHAT_ID:
        logger.warning("TELEGRAM_CHAT_ID not set — Telegram bot disabled")
        return

    _app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Commands
    _app.add_handler(CommandHandler("start", cmd_start))
    _app.add_handler(CommandHandler("help", cmd_help))
    _app.add_handler(CommandHandler("today", cmd_today))
    _app.add_handler(CommandHandler("yesterday", cmd_yesterday))
    _app.add_handler(CommandHandler("week", cmd_week))
    _app.add_handler(CommandHandler("month", cmd_month))
    _app.add_handler(CommandHandler("year", cmd_year))
    _app.add_handler(CommandHandler("categories", cmd_categories))
    _app.add_handler(CommandHandler("uncategorized", cmd_uncategorized))

    # Callbacks
    _app.add_handler(CallbackQueryHandler(cb_categorize, pattern=r"^cat:\d+:\d+$"))
    _app.add_handler(CallbackQueryHandler(cb_create_new, pattern=r"^newcat:\d+$"))
    _app.add_handler(CallbackQueryHandler(cb_txn_change, pattern=r"^txchange:\d+$"))
    _app.add_handler(CallbackQueryHandler(cb_txn_categorize, pattern=r"^txcat:\d+:\d+$"))

    # Text reply for new category name
    _app.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND & filters.REPLY, handle_new_category_name)
    )

    await _app.initialize()
    await _app.start()
    await _app.updater.start_polling(allowed_updates=Update.ALL_TYPES)

    logger.info("Telegram bot started (chat_id=%d)", TELEGRAM_CHAT_ID)


async def stop_bot():
    global _app
    if _app is None:
        return

    await _app.updater.stop()
    await _app.stop()
    await _app.shutdown()
    _app = None
    logger.info("Telegram bot stopped")
