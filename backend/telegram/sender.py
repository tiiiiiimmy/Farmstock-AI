"""
Telegram Bot API message sender.
"""
import os
import httpx

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
_TELEGRAM_API_BASE = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}" if TELEGRAM_BOT_TOKEN else None


async def send_message(chat_id, text: str, parse_mode: str = "HTML") -> bool:
    """
    Send a message to a Telegram chat. Returns True on success.
    Falls back to logging if TELEGRAM_BOT_TOKEN is not configured.
    """
    if not TELEGRAM_BOT_TOKEN or not _TELEGRAM_API_BASE:
        print(f"[Telegram] No token configured. Would send to {chat_id}: {text[:100]}")
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{_TELEGRAM_API_BASE}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
            )
            if not resp.is_success:
                print(f"[Telegram] Send failed ({resp.status_code}): {resp.text[:200]}")
                return False
            return True
    except Exception as exc:
        print(f"[Telegram] Exception sending to {chat_id}: {exc}")
        return False


def send_message_sync(chat_id, text: str) -> bool:
    """Synchronous wrapper for use in non-async contexts (e.g. scheduler)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're inside an event loop — schedule as a coroutine
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(asyncio.run, send_message(chat_id, text))
                return future.result(timeout=15)
        else:
            return loop.run_until_complete(send_message(chat_id, text))
    except Exception as exc:
        print(f"[Telegram] send_message_sync error: {exc}")
        return False
