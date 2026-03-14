"""
WhatsApp webhook router.

Handles incoming WhatsApp messages and a simulation endpoint for demo use.
Supports basic command intents: STOCK, ORDER, SPEND, ALERTS, HELP.
"""
import os
from fastapi import APIRouter, Query, Request, HTTPException
from pydantic import BaseModel
from ..database import get_db
from ..ai.predictor import get_all_predictions
from .sender import send_message
from .templates import help_message, monthly_summary

router = APIRouter()


class SimulateMessage(BaseModel):
    phone_number: str
    message: str
    farm_id: str = "farm-001"


def _resolve_farm_by_phone(conn, phone: str):
    """Look up farm by whatsapp_number."""
    row = conn.execute(
        "SELECT * FROM farms WHERE whatsapp_number = ?", (phone,)
    ).fetchone()
    return dict(row) if row else None


def _handle_stock(farm_id: str, phone: str, conn) -> str:
    """Return top urgent predictions as a WhatsApp reply."""
    rows = conn.execute(
        "SELECT * FROM orders WHERE farm_id = ? ORDER BY date", (farm_id,)
    ).fetchall()
    orders = [dict(r) for r in rows]
    predictions = get_all_predictions(orders)

    urgent = [p for p in predictions if p.get("urgency") in ("red", "amber")][:5]
    if not urgent:
        return (
            "*FarmStock AI - Stock Status*\n\n"
            "All tracked supplies are well-stocked. No urgent reorders needed.\n\n"
            "Reply *HELP* for more options."
        )

    lines = []
    for p in urgent:
        days = p.get("days_until_depletion", "?")
        urgency = p.get("urgency", "")
        icon = "🔴" if urgency == "red" else "🟡"
        lines.append(f"{icon} *{p['product_name']}* — {days} days remaining")

    return (
        "*FarmStock AI - Urgent Stock Alerts*\n\n"
        + "\n".join(lines)
        + "\n\nReply *ORDER <product>* to place an order, or *HELP* for options."
    )


def _handle_spend(farm_id: str, conn) -> str:
    """Return a brief spending summary for the current month."""
    from datetime import datetime
    from collections import defaultdict

    today = datetime.utcnow().date()
    start = str(today.replace(day=1))
    rows = conn.execute(
        "SELECT category, total_price FROM orders WHERE farm_id = ? AND date >= ?",
        (farm_id, start),
    ).fetchall()

    by_cat: dict = defaultdict(float)
    total = 0.0
    for r in rows:
        by_cat[r["category"]] += r["total_price"] or 0
        total += r["total_price"] or 0

    month_label = today.strftime("%B %Y")
    return monthly_summary(month_label, total, dict(by_cat), None)


def _handle_alerts_cmd(farm_id: str, conn) -> str:
    """Return pending alerts as a WhatsApp reply."""
    rows = conn.execute(
        "SELECT * FROM alerts WHERE farm_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 5",
        (farm_id,),
    ).fetchall()

    if not rows:
        return (
            "*FarmStock AI - Alerts*\n\n"
            "No pending alerts at this time.\n\n"
            "Reply *HELP* for options."
        )

    lines = [f"• *{r['title']}*: {r['message'][:80]}..." for r in rows]
    return "*FarmStock AI - Pending Alerts*\n\n" + "\n".join(lines)


def _process_message(message: str, farm_id: str, phone: str, conn) -> str:
    """Parse incoming command and dispatch to the appropriate handler."""
    cmd = message.strip().upper()

    if cmd == "STOCK" or cmd == "PREDICTIONS":
        return _handle_stock(farm_id, phone, conn)
    elif cmd == "SPEND" or cmd == "SPENDING":
        return _handle_spend(farm_id, conn)
    elif cmd == "ALERTS":
        return _handle_alerts_cmd(farm_id, conn)
    elif cmd == "HELP":
        return help_message()
    elif cmd.startswith("ORDER "):
        product = message[6:].strip()
        return (
            f"*FarmStock AI - Quick Order*\n\n"
            f"To order *{product}*, please log in to the FarmStock AI app to confirm "
            f"quantity and supplier, or contact your supplier directly.\n\n"
            f"Reply *HELP* for more options."
        )
    else:
        return (
            f"*FarmStock AI*\n\n"
            f"Thanks for your message. For a full response, please use the FarmStock AI app.\n\n"
            f"Reply *HELP* to see available commands."
        )


@router.get("/whatsapp/webhook")
def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    """WhatsApp webhook verification challenge (GET)."""
    expected_token = os.environ.get("WHATSAPP_VERIFY_TOKEN", "farmstock_verify_token")
    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/whatsapp/webhook")
async def receive_webhook(request: Request):
    """Receive and process incoming WhatsApp messages."""
    body = await request.json()

    # WhatsApp Cloud API payload structure
    try:
        entry = body.get("entry", [])[0]
        change = entry.get("changes", [])[0]
        value = change.get("value", {})
        messages = value.get("messages", [])
        if not messages:
            return {"status": "ok"}

        msg = messages[0]
        phone = msg.get("from", "")
        text = msg.get("text", {}).get("body", "")
    except (IndexError, KeyError, AttributeError):
        return {"status": "ok"}

    conn = get_db()
    try:
        farm = _resolve_farm_by_phone(conn, phone)
        if not farm:
            send_message(phone, "*FarmStock AI*\n\nPhone number not registered. Please contact support.")
            return {"status": "ok"}

        reply = _process_message(text, farm["id"], phone, conn)
        send_message(phone, reply)
    finally:
        conn.close()

    return {"status": "ok"}


@router.post("/whatsapp/simulate")
def simulate_message(req: SimulateMessage):
    """
    Simulate an incoming WhatsApp message (for demo and testing).

    Processes the message as if it came from the given phone number.
    """
    conn = get_db()
    try:
        farm_row = conn.execute("SELECT * FROM farms WHERE id = ?", (req.farm_id,)).fetchone()
        if not farm_row:
            raise HTTPException(status_code=404, detail="Farm not found")
        farm = dict(farm_row)

        reply = _process_message(req.message, req.farm_id, req.phone_number, conn)
    finally:
        conn.close()

    # Log to console (demo mode)
    print(f"[whatsapp-sim] From {req.phone_number}: {req.message}")
    print(f"[whatsapp-sim] Reply: {reply}")

    return {
        "from": req.phone_number,
        "message": req.message,
        "reply": reply,
        "farm_id": req.farm_id,
        "farm_name": farm.get("name"),
    }
