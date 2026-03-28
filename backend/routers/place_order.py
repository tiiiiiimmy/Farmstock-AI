"""
Order placement endpoints: send purchase order emails and record in placed_orders.
"""
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from ..database import get_db
from ..models import PlaceOrderRequest
from ..auth import get_user_farm
from ..mailer.order_email import send_order_email

router = APIRouter()


def _generate_reference(conn) -> str:
    """Generate a sequential reference number in the format FS-YYYY-NNNN."""
    year = datetime.utcnow().year
    prefix = f"FS-{year}-"
    row = conn.execute(
        "SELECT reference_number FROM placed_orders WHERE reference_number LIKE ? ORDER BY reference_number DESC LIMIT 1",
        (f"{prefix}%",),
    ).fetchone()
    if row:
        try:
            last_num = int(row["reference_number"].split("-")[-1])
        except (ValueError, IndexError):
            last_num = 0
    else:
        last_num = 0
    return f"{prefix}{last_num + 1:04d}"


@router.post("/place-order", status_code=201)
def place_order(req: PlaceOrderRequest, farm: dict = Depends(get_user_farm)):
    """
    Place a purchase order: send email to supplier and record in placed_orders table.
    """
    data_farm_id = farm["id"]
    conn = get_db()
    try:
        farm_row = conn.execute("SELECT * FROM farms WHERE id = ?", (data_farm_id,)).fetchone()
        if not farm_row:
            raise HTTPException(status_code=404, detail="Farm not found")
        farm_data = dict(farm_row)

        supplier_row = conn.execute(
            "SELECT * FROM suppliers WHERE id = ? AND farm_id = ?",
            (req.supplier_id, data_farm_id),
        ).fetchone()
        if not supplier_row:
            raise HTTPException(status_code=404, detail="Supplier not found")
        supplier = dict(supplier_row)
        if supplier.get("categories") and isinstance(supplier["categories"], str):
            supplier["categories"] = json.loads(supplier["categories"])

        if not req.items:
            raise HTTPException(status_code=400, detail="Order must contain at least one item")

        # Calculate total
        total_price = sum(
            (item.get("quantity", 0) * (item.get("unit_price") or 0))
            for item in req.items
        )

        reference = _generate_reference(conn)
        now = datetime.utcnow().isoformat()
        order_id = str(uuid.uuid4())

        order_data = {
            "reference_number": reference,
            "items": req.items,
            "total_price": round(total_price, 2),
        }

        # Attempt to send email
        email_sent = send_order_email(order_data, supplier, farm_data)
        email_sent_at = now if email_sent else None

        conn.execute("""
            INSERT INTO placed_orders
                (id, farm_id, supplier_id, reference_number, items, total_price,
                 status, email_sent_at, channel, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            order_id, data_farm_id, req.supplier_id, reference,
            json.dumps(req.items), round(total_price, 2),
            "sent", email_sent_at, "email", now,
        ))
        conn.commit()

        return {
            "id": order_id,
            "reference_number": reference,
            "farm_id": data_farm_id,
            "supplier_id": req.supplier_id,
            "supplier_name": supplier.get("name"),
            "items": req.items,
            "total_price": round(total_price, 2),
            "email_sent": email_sent,
            "email_sent_at": email_sent_at,
            "status": "sent",
            "created_at": now,
        }
    finally:
        conn.close()


@router.get("/placed-orders")
def list_placed_orders(farm: dict = Depends(get_user_farm)):
    """List all placed orders for a farm, most recent first."""
    farm_id = farm["id"]
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM placed_orders WHERE farm_id = ? ORDER BY created_at DESC",
            (farm_id,),
        ).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            if d.get("items") and isinstance(d["items"], str):
                try:
                    d["items"] = json.loads(d["items"])
                except json.JSONDecodeError:
                    d["items"] = []
            results.append(d)
        return results
    finally:
        conn.close()
