"""
APScheduler jobs for proactive FarmStock alerts.
Runs as part of the FastAPI process.
"""
import asyncio
import uuid
from datetime import date, datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()


async def _check_low_stock():
    """Daily job: check all linked farms for low stock and alert via Telegram."""
    from backend.database import get_db_connection
    from backend.ai.predictor import ConsumptionPredictor
    from backend.telegram.sender import send_message

    conn = get_db_connection()
    try:
        users = conn.execute(
            "SELECT id, telegram_chat_id FROM users WHERE telegram_chat_id IS NOT NULL"
        ).fetchall()
        predictor = ConsumptionPredictor()

        for user in users:
            # Single farm per user — multi-farm support is a future enhancement
            farm = conn.execute(
                "SELECT * FROM farms WHERE user_id = ? LIMIT 1", (user["id"],)
            ).fetchone()
            if not farm:
                continue

            orders = conn.execute(
                "SELECT * FROM orders WHERE farm_id = ? ORDER BY date DESC",
                (farm["id"],)
            ).fetchall()
            predictions = predictor.predict([dict(o) for o in orders])
            red_items = [p for p in predictions if p.get("urgency") == "red"]

            if red_items:
                lines = ["🔴 *Urgent Stock Alert*\n"]
                for p in red_items[:3]:
                    lines.append(
                        f"• *{p['product_name']}* runs out in ~{p.get('days_until_depletion', '?')} days"
                    )
                lines.append("\nOpen FarmStock to place orders.")
                await send_message(user["telegram_chat_id"], "\n".join(lines))

                # Log alert to DB
                alert_id = str(uuid.uuid4())
                now = datetime.now(timezone.utc).isoformat()
                conn.execute(
                    """INSERT INTO alerts (id, farm_id, type, title, message, status, created_at)
                       VALUES (?, ?, 'low_stock', 'Daily Stock Alert', ?, 'sent', ?)""",
                    (alert_id, farm["id"],
                     f"{len(red_items)} product(s) critically low", now)
                )
        conn.commit()
    finally:
        conn.close()


async def _monthly_summary():
    """First of month: send spending summary to all linked users."""
    from backend.database import get_db_connection
    from backend.telegram.sender import send_message

    conn = get_db_connection()
    now = date.today()
    # Last month
    if now.month == 1:
        year, month = now.year - 1, 12
    else:
        year, month = now.year, now.month - 1
    month_name = date(year, month, 1).strftime("%B %Y")

    try:
        users = conn.execute(
            "SELECT id, telegram_chat_id FROM users WHERE telegram_chat_id IS NOT NULL"
        ).fetchall()
        for user in users:
            # Single farm per user — multi-farm support is a future enhancement
            farm = conn.execute(
                "SELECT * FROM farms WHERE user_id = ? LIMIT 1", (user["id"],)
            ).fetchone()
            if not farm:
                continue
            rows = conn.execute(
                """SELECT category, SUM(total_price) as total FROM orders
                   WHERE farm_id = ? AND strftime('%Y-%m', date) = ?
                   GROUP BY category""",
                (farm["id"], f"{year:04d}-{month:02d}")
            ).fetchall()
            if not rows:
                continue
            grand_total = sum(r["total"] or 0 for r in rows)
            lines = [f"📊 *Monthly Summary — {month_name}*\n",
                     f"Total: *${grand_total:,.0f} NZD*\n"]
            for r in sorted(rows, key=lambda x: -(x["total"] or 0)):
                lines.append(f"• {r['category'].title()}: ${r['total']:,.0f}")
            await send_message(user["telegram_chat_id"], "\n".join(lines))
    finally:
        conn.close()


def start_scheduler():
    scheduler.add_job(_check_low_stock, CronTrigger(hour=7, minute=0), id="low_stock_check")
    scheduler.add_job(_monthly_summary, CronTrigger(day=1, hour=8, minute=0), id="monthly_summary")
    scheduler.start()
    print("[Scheduler] Started: low_stock_check (07:00 daily), monthly_summary (1st of month)")


def stop_scheduler():
    scheduler.shutdown()
