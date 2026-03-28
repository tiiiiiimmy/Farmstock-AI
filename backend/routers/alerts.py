"""
Alert management endpoints.
"""
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from ..database import get_db
from ..models import Alert
from ..auth import get_user_farm

router = APIRouter()

# Alert templates for demo trigger
ALERT_TEMPLATES = {
    "low_stock": {
        "type": "low_stock",
        "title": "Low Stock Alert",
        "message": "One or more products are estimated to run out within 7 days. Check predictions for details.",
    },
    "weather": {
        "type": "weather",
        "title": "Adverse Weather Warning",
        "message": "MetService has issued a heavy rain warning for your region. Consider stocking additional feed as pasture access may be limited.",
    },
    "disease": {
        "type": "disease",
        "title": "Disease Risk Alert",
        "message": "Elevated facial eczema spore counts detected in your area. Ensure zinc oxide supplement stocks are adequate.",
    },
    "price_drop": {
        "type": "price_drop",
        "title": "Price Drop Opportunity",
        "message": "Superphosphate fertiliser is currently 8% below average price. Consider forward purchasing for spring application.",
    },
    "monthly_summary": {
        "type": "monthly_summary",
        "title": "Monthly Spending Summary",
        "message": "Your monthly supply spending summary is ready. Review your category breakdown and year-on-year trends.",
    },
}


def _row_to_alert(row) -> dict:
    return dict(row)


@router.get("/alerts", response_model=list)
def list_alerts(
    farm: dict = Depends(get_user_farm),
    status: Optional[str] = Query(None, description="Filter by status: pending, sent, dismissed, actioned"),
):
    """List alerts for a farm, optionally filtered by status."""
    farm_id = farm["id"]
    conn = get_db()
    try:
        if status:
            rows = conn.execute(
                "SELECT * FROM alerts WHERE farm_id = ? AND status = ? ORDER BY created_at DESC",
                (farm_id, status),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM alerts WHERE farm_id = ? ORDER BY created_at DESC",
                (farm_id,),
            ).fetchall()
        return [_row_to_alert(r) for r in rows]
    finally:
        conn.close()


@router.put("/alerts/{alert_id}", response_model=Alert)
def update_alert(alert_id: str, status: str = Query(..., description="New status"), farm: dict = Depends(get_user_farm)):
    """Update an alert's status (pending, sent, dismissed, actioned)."""
    valid_statuses = {"pending", "sent", "dismissed", "actioned"}
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
        )

    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM alerts WHERE id = ? AND farm_id = ?", (alert_id, farm["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Alert not found")

        conn.execute("UPDATE alerts SET status = ? WHERE id = ?", (status, alert_id))
        conn.commit()

        updated = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        return Alert(**_row_to_alert(updated))
    finally:
        conn.close()


@router.post("/trigger-alert/{alert_type}", response_model=Alert, status_code=201)
def trigger_alert(
    alert_type: str,
    farm: dict = Depends(get_user_farm),
):
    """Manually trigger an alert of a given type (for demo purposes)."""
    farm_id = farm["id"]
    if alert_type not in ALERT_TEMPLATES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown alert type. Valid types: {', '.join(ALERT_TEMPLATES.keys())}",
        )

    conn = get_db()
    try:
        farm = conn.execute("SELECT id FROM farms WHERE id = ?", (farm_id,)).fetchone()
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")

        template = ALERT_TEMPLATES[alert_type]
        alert_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        conn.execute("""
            INSERT INTO alerts (id, farm_id, type, title, message, product_id, status, created_at)
            VALUES (?, ?, ?, ?, ?, NULL, 'pending', ?)
        """, (alert_id, farm_id, template["type"], template["title"], template["message"], now))
        conn.commit()

        row = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        return Alert(**_row_to_alert(row))
    finally:
        conn.close()
