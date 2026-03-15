"""
Telegram message sender via the Bot API.
"""
import html
import os
import re

import httpx


_BOLD_PATTERN = re.compile(r"\*(.+?)\*")


def _to_telegram_html(message: str) -> str:
    """Convert the app's simple WhatsApp-style formatting to Telegram HTML."""
    escaped = html.escape(message or "")
    return _BOLD_PATTERN.sub(r"<b>\1</b>", escaped)


def send_message(chat_id: str, message: str) -> bool:
    """
    Send a Telegram message to a chat ID.

    Returns True on success. In demo mode with no token configured, logs to stdout.
    """
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        print(f"[telegram] -> {chat_id}:\n{message}\n")
        return True

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": _to_telegram_html(message),
        "parse_mode": "HTML",
    }

    try:
        response = httpx.post(url, json=payload, timeout=15)
        response.raise_for_status()
        return True
    except Exception as exc:
        print(f"[telegram] Failed to send message to {chat_id}: {exc}")
        return False
