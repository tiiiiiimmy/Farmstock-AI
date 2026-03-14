"""
Purchase order CRUD endpoints.
"""
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from ..database import get_db
from ..models import Order, OrderCreate, OrderUpdate

router = APIRouter()


def _row_to_order(row) -> dict:
    return dict(row)


@router.get("/orders", response_model=list)
def list_orders(
    farm_id: str = Query(..., description="Farm ID"),
    category: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """List orders with optional filters."""
    conn = get_db()
    try:
        query = "SELECT * FROM orders WHERE farm_id = ?"
        params: list = [farm_id]

        if category:
            query += " AND category = ?"
            params.append(category)
        if start_date:
            query += " AND date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND date <= ?"
            params.append(end_date)

        query += " ORDER BY date DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = conn.execute(query, params).fetchall()
        return [_row_to_order(r) for r in rows]
    finally:
        conn.close()


@router.post("/orders", response_model=Order, status_code=201)
def create_order(data: OrderCreate, farm_id: str = Query(...)):
    """Create a new order for a farm."""
    conn = get_db()
    try:
        farm = conn.execute("SELECT id FROM farms WHERE id = ?", (farm_id,)).fetchone()
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")

        order_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        conn.execute("""
            INSERT INTO orders (id, farm_id, date, product_name, category, quantity,
                unit, unit_price, total_price, supplier_id, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (order_id, farm_id, data.date, data.product_name, data.category,
              data.quantity, data.unit, data.unit_price, data.total_price,
              data.supplier_id, data.notes, now))
        conn.commit()

        row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        return Order(**_row_to_order(row))
    finally:
        conn.close()


@router.put("/orders/{order_id}", response_model=Order)
def update_order(order_id: str, data: OrderUpdate):
    """Update an existing order."""
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Order not found")

        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        if not updates:
            return Order(**_row_to_order(row))

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [order_id]
        conn.execute(f"UPDATE orders SET {set_clause} WHERE id = ?", values)
        conn.commit()

        updated = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        return Order(**_row_to_order(updated))
    finally:
        conn.close()


@router.delete("/orders/{order_id}", status_code=204)
def delete_order(order_id: str):
    """Delete an order."""
    conn = get_db()
    try:
        row = conn.execute("SELECT id FROM orders WHERE id = ?", (order_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Order not found")

        conn.execute("DELETE FROM orders WHERE id = ?", (order_id,))
        conn.commit()
    finally:
        conn.close()
