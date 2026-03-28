"""
Telegram webhook handler and message processor.
"""
import os
from fastapi import APIRouter, Request, HTTPException
from backend.telegram.sender import send_message

router = APIRouter()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
DEFAULT_FARM_ID = os.getenv("TELEGRAM_DEFAULT_FARM_ID", "farm-001")


# ── Farm/user resolution ─────────────────────────────────────────────────────

def _get_farm_for_chat(chat_id: int):
    """Look up the farm linked to a Telegram chat_id via the users table."""
    from backend.database import get_db_connection
    conn = get_db_connection()
    try:
        user = conn.execute(
            "SELECT id FROM users WHERE telegram_chat_id = ?", (str(chat_id),)
        ).fetchone()
        if user:
            farm = conn.execute(
                "SELECT * FROM farms WHERE user_id = ? LIMIT 1", (user["id"],)
            ).fetchone()
            return dict(farm) if farm else None
        # Fallback: legacy farm-001 for unlinked chats (demo compatibility)
        farm = conn.execute(
            "SELECT * FROM farms WHERE id = ?", (DEFAULT_FARM_ID,)
        ).fetchone()
        return dict(farm) if farm else None
    finally:
        conn.close()


# ── Command handlers ─────────────────────────────────────────────────────────

async def _handle_link(chat_id: int, text: str) -> str:
    """Handle /link email password — associate a Telegram chat with a user account."""
    parts = text.strip().split()
    # Expect: /link email password  OR  link email password
    if len(parts) >= 3:
        email = parts[1]
        password = parts[2]
    else:
        return (
            "👋 <b>Welcome to FarmStock AI!</b>\n\n"
            "To link your account, send:\n"
            "<code>/link your@email.com yourpassword</code>"
        )

    from backend.database import get_db_connection
    from backend.auth import verify_password
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT id, hashed_password, full_name FROM users WHERE email = ?",
            (email.lower(),),
        ).fetchone()
        if not row or not verify_password(password, row["hashed_password"]):
            return "❌ Invalid email or password. Please try again."
        conn.execute(
            "UPDATE users SET telegram_chat_id = ? WHERE id = ?",
            (str(chat_id), row["id"]),
        )
        conn.commit()
        name = row["full_name"] or "Farmer"
        return (
            f"✅ <b>Linked successfully!</b>\n\n"
            f"Welcome, {name}! Your FarmStock account is now connected.\n\n"
            f"Try: <code>STOCK</code> · <code>SPEND</code> · <code>ALERTS</code> · <code>HELP</code>"
        )
    finally:
        conn.close()


async def _handle_stock(farm_id: str) -> str:
    """Return urgent stock predictions for the farm."""
    from backend.database import get_db_connection
    from backend.ai.predictor import get_all_predictions
    conn = get_db_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM orders WHERE farm_id = ? ORDER BY date DESC",
            (farm_id,),
        ).fetchall()
        orders = [dict(r) for r in rows]
    finally:
        conn.close()

    predictions = get_all_predictions(orders)
    urgent = [p for p in predictions if p.get("urgency") in ("red", "amber")]
    if not urgent:
        return "✅ <b>All stock levels healthy</b>\n\nNo urgent reorders needed this week."

    lines = ["🌾 <b>Stock Status</b>\n"]
    for p in urgent[:5]:
        icon = "🔴" if p["urgency"] == "red" else "🟡"
        days = p.get("days_until_depletion", "?")
        product = p.get("product_name", "Unknown")
        reorder = p.get("recommended_order_date", "ASAP")
        lines.append(f"{icon} <b>{product}</b> — {days} days left")
        lines.append(f"   Reorder by: {reorder}")
    lines.append("\n<i>Open FarmStock to place orders.</i>")
    return "\n".join(lines)


async def _handle_spend(farm_id: str) -> str:
    """Return current month's spending summary."""
    from backend.database import get_db_connection
    from datetime import date
    conn = get_db_connection()
    try:
        month = date.today().strftime("%Y-%m")
        rows = conn.execute(
            """SELECT category, SUM(total_price) as total FROM orders
               WHERE farm_id = ? AND strftime('%Y-%m', date) = ?
               GROUP BY category ORDER BY total DESC""",
            (farm_id, month),
        ).fetchall()
    finally:
        conn.close()

    if not rows:
        return f"📊 <b>Spending — {date.today().strftime('%B %Y')}</b>\n\nNo orders recorded this month yet."

    grand = sum(r["total"] or 0 for r in rows)
    lines = [f"📊 <b>Spending — {date.today().strftime('%B %Y')}</b>\n",
             f"Total: <b>${grand:,.0f} NZD</b>\n"]
    for r in rows:
        lines.append(f"• {r['category'].title()}: ${r['total']:,.0f}")
    return "\n".join(lines)


async def _handle_alerts(farm_id: str) -> str:
    """Return the 5 most recent pending alerts."""
    from backend.database import get_db_connection
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """SELECT title, message FROM alerts
               WHERE farm_id = ? AND status = 'pending'
               ORDER BY created_at DESC LIMIT 5""",
            (farm_id,),
        ).fetchall()
    finally:
        conn.close()

    if not rows:
        return "🔔 <b>No pending alerts</b>\n\nEverything looks good!"
    lines = ["🔔 <b>Active Alerts</b>\n"]
    for r in rows:
        lines.append(f"• <b>{r['title']}</b>\n  {r['message'][:100]}")
    return "\n".join(lines)


def _handle_help() -> str:
    return (
        "🌾 <b>FarmStock AI</b>\n\n"
        "Available commands:\n"
        "<code>STOCK</code> — Check inventory levels\n"
        "<code>SPEND</code> — This month's spending\n"
        "<code>ALERTS</code> — Active alerts\n"
        "<code>HELP</code> — Show this menu\n\n"
        "<i>Tip: Link your account with</i> <code>/link email password</code>"
    )


async def _process_message(chat_id: int, text: str) -> str:
    """Route a message to the appropriate handler and return a response string."""
    raw = text.strip()
    # Normalise: strip leading slash, remove bot mention (@BotName), lowercase
    normalised = raw.lstrip("/").split("@")[0].strip().lower()

    if normalised in ("start", "help"):
        return _handle_help()

    if normalised.startswith("link"):
        return await _handle_link(chat_id, raw)

    farm = _get_farm_for_chat(chat_id)
    if not farm:
        return "⚠️ No farm linked. Send <code>/link email password</code> to connect your account."

    farm_id = farm["id"]

    if normalised in ("stock", "predictions", "inventory"):
        return await _handle_stock(farm_id)
    if normalised in ("spend", "spending"):
        return await _handle_spend(farm_id)
    if normalised in ("alerts", "notifications"):
        return await _handle_alerts(farm_id)

    # Unknown command — show help
    return _handle_help()


# ── Poller compatibility shim ─────────────────────────────────────────────────

async def process_telegram_update(update: dict, farm_id_override=None):
    """Process a raw Telegram update dict (used by the long-polling runner)."""
    message = update.get("message") or update.get("edited_message") or {}
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    text = (message.get("text") or "").strip()

    if not chat_id or not text:
        return {"status": "ignored"}

    response_text = await _process_message(chat_id, text)
    await send_message(chat_id, response_text)
    return {"status": "ok", "chat_id": chat_id, "message": text, "reply": response_text}


# ── FastAPI routes ────────────────────────────────────────────────────────────

@router.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    """Receive webhook updates from Telegram Bot API."""
    if not TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=503, detail="Telegram bot not configured")
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    message = data.get("message") or data.get("edited_message")
    if not message:
        return {"ok": True}

    chat_id = message.get("chat", {}).get("id")
    text = message.get("text", "").strip()
    if not chat_id or not text:
        return {"ok": True}

    response_text = await _process_message(chat_id, text)
    await send_message(chat_id, response_text)
    return {"ok": True}


@router.post("/telegram/simulate")
async def simulate_message(request: Request):
    """Simulate a Telegram message for demo/testing (no Telegram token required)."""
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    chat_id = data.get("chat_id", 12345)
    text = data.get("text", "HELP")
    response_text = await _process_message(chat_id, text)
    return {"response": response_text, "chat_id": chat_id}
