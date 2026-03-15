"""
Simple Telegram long-polling runner for local development.

Usage:
    python3 -m backend.telegram.poller
"""
import asyncio
import os

import httpx

from .webhook import process_telegram_update


async def poll_telegram():
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")

    url = f"https://api.telegram.org/bot{token}/getUpdates"
    offset = None
    print("[telegram] Poller started")

    async with httpx.AsyncClient(timeout=35) as client:
        while True:
            params = {
                "timeout": 25,
                "allowed_updates": ["message"],
            }
            if offset is not None:
                params["offset"] = offset

            response = await client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()
            for update in payload.get("result", []):
                offset = update["update_id"] + 1
                try:
                    result = await process_telegram_update(update)
                    if result.get("status") == "ok":
                        print(
                            f"[telegram] {result['chat_id']} -> {result['message']} | "
                            f"reply sent"
                        )
                except Exception as exc:
                    print(f"[telegram] Failed to process update: {exc}")


if __name__ == "__main__":
    asyncio.run(poll_telegram())
