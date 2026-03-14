"""
Farm profile and supplier management endpoints.
"""
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models import Farm, FarmUpdate, Supplier, SupplierCreate, SupplierUpdate

router = APIRouter()


def _row_to_farm(row) -> dict:
    d = dict(row)
    return d


def _row_to_supplier(row) -> dict:
    d = dict(row)
    if d.get("categories") and isinstance(d["categories"], str):
        try:
            d["categories"] = json.loads(d["categories"])
        except (json.JSONDecodeError, TypeError):
            d["categories"] = []
    return d


@router.get("/farm/{farm_id}", response_model=dict)
def get_farm(farm_id: str):
    """Retrieve farm profile with its suppliers."""
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Farm not found")
        farm = _row_to_farm(row)

        supplier_rows = conn.execute(
            "SELECT * FROM suppliers WHERE farm_id = ?", (farm_id,)
        ).fetchall()
        farm["suppliers"] = [_row_to_supplier(s) for s in supplier_rows]
        return farm
    finally:
        conn.close()


@router.put("/farm/{farm_id}", response_model=Farm)
def update_farm(farm_id: str, data: FarmUpdate):
    """Update farm profile fields."""
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Farm not found")

        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        if not updates:
            return Farm(**_row_to_farm(row))

        updates["updated_at"] = datetime.utcnow().isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [farm_id]
        conn.execute(f"UPDATE farms SET {set_clause} WHERE id = ?", values)
        conn.commit()

        updated = conn.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
        return Farm(**_row_to_farm(updated))
    finally:
        conn.close()


@router.get("/farm/{farm_id}/suppliers", response_model=list)
def list_suppliers(farm_id: str):
    """List all suppliers for a farm."""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM suppliers WHERE farm_id = ?", (farm_id,)
        ).fetchall()
        return [_row_to_supplier(r) for r in rows]
    finally:
        conn.close()


@router.post("/farm/{farm_id}/suppliers", response_model=Supplier, status_code=201)
def create_supplier(farm_id: str, data: SupplierCreate):
    """Create a new supplier for a farm."""
    conn = get_db()
    try:
        farm = conn.execute("SELECT id FROM farms WHERE id = ?", (farm_id,)).fetchone()
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")

        supplier_id = str(uuid.uuid4())
        categories_json = json.dumps(data.categories) if data.categories else None

        conn.execute("""
            INSERT INTO suppliers (id, farm_id, name, contact_name, contact_email, contact_phone, categories)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (supplier_id, farm_id, data.name, data.contact_name,
              data.contact_email, data.contact_phone, categories_json))
        conn.commit()

        row = conn.execute("SELECT * FROM suppliers WHERE id = ?", (supplier_id,)).fetchone()
        return Supplier(**_row_to_supplier(row))
    finally:
        conn.close()


@router.put("/farm/{farm_id}/suppliers/{supplier_id}", response_model=Supplier)
def update_supplier(farm_id: str, supplier_id: str, data: SupplierUpdate):
    """Update an existing supplier."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM suppliers WHERE id = ? AND farm_id = ?", (supplier_id, farm_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Supplier not found")

        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        if not updates:
            return Supplier(**_row_to_supplier(row))

        if "categories" in updates:
            updates["categories"] = json.dumps(updates["categories"])

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [supplier_id]
        conn.execute(f"UPDATE suppliers SET {set_clause} WHERE id = ?", values)
        conn.commit()

        updated = conn.execute("SELECT * FROM suppliers WHERE id = ?", (supplier_id,)).fetchone()
        return Supplier(**_row_to_supplier(updated))
    finally:
        conn.close()


@router.delete("/farm/{farm_id}/suppliers/{supplier_id}", status_code=204)
def delete_supplier(farm_id: str, supplier_id: str):
    """Delete a supplier."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id FROM suppliers WHERE id = ? AND farm_id = ?", (supplier_id, farm_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Supplier not found")

        conn.execute("DELETE FROM suppliers WHERE id = ?", (supplier_id,))
        conn.commit()
    finally:
        conn.close()
