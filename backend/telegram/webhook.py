"""
Telegram webhook and simulation endpoints.

For the easiest local setup, use the long-polling runner in `backend.telegram.poller`
instead of exposing a public webhook.
"""
import os
from typing import Optional, Tuple

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..database import get_db
from ..whatsapp.webhook import _process_message
from .sender import send_message

router = APIRouter()


class SimulateTelegramMessage(BaseModel):
    chat_id: str
    message: str
    farm_id: str = "farm-001"
    username: Optional[str] = None


def _default_farm_id() -> str:
    return os.environ.get("TELEGRAM_DEFAULT_FARM_ID", "farm-001")


def _normalize_telegram_text(text: str) -> str:
    text = (text or "").strip()
    if not text.startswith("/"):
        return text

    parts = text.split(maxsplit=1)
    command = parts[0][1:]
    if "@" in command:
        command = command.split("@", 1)[0]
    remainder = parts[1] if len(parts) > 1 else ""

    if command.lower() == "start":
        return "HELP"
    return f"{command} {remainder}".strip()


def _extract_message_fields(update: dict) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    message = update.get("message") or update.get("edited_message") or {}
    chat = message.get("chat") or {}
    from_user = message.get("from") or {}
    chat_id = str(chat.get("id")) if chat.get("id") is not None else None
    text = message.get("text")
    username = from_user.get("username") or from_user.get("first_name")
    return chat_id, text, username


async def process_telegram_update(update: dict, farm_id_override: Optional[str] = None):
    """Process a Telegram update dict and send a reply if applicable."""
    chat_id, text, username = _extract_message_fields(update)
    if not chat_id or not text:
        return {"status": "ignored"}

    normalized = _normalize_telegram_text(text)
    farm_id = farm_id_override or _default_farm_id()

    conn = get_db()
    try:
        farm = conn.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
        if not farm:
            raise HTTPException(status_code=404, detail="Default farm not found")
        reply = _process_message(normalized, farm_id, username or chat_id, conn)
    finally:
        conn.close()

    send_message(chat_id, reply)
    return {
        "status": "ok",
        "chat_id": chat_id,
        "message": text,
        "normalized_message": normalized,
        "reply": reply,
        "farm_id": farm_id,
    }


@router.post("/telegram/webhook")
async def receive_telegram_webhook(request: Request):
    """Receive Telegram webhook updates."""
    body = await request.json()
    return await process_telegram_update(body)


@router.post("/telegram/simulate")
def simulate_telegram_message(req: SimulateTelegramMessage):
    """Simulate a Telegram message locally for demo/testing."""
    update = {
        "message": {
            "chat": {"id": req.chat_id},
            "from": {"username": req.username or "demo_user"},
            "text": req.message,
        }
    }

    # Run the same code path as the real webhook.
    import asyncio

    return asyncio.run(process_telegram_update(update, farm_id_override=req.farm_id))
