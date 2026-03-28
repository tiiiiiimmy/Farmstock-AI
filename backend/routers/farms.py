"""
Farm profile and supplier management endpoints.
"""
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from ..database import get_db
from ..models import Farm, FarmUpdate, Supplier, SupplierCreate, SupplierUpdate, SupplierProductsRequest
from ..auth import get_current_user, get_user_farm

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


@router.get("/farms", response_model=list)
def list_farms(current_user: dict = Depends(get_current_user)):
    """List all farms owned by the authenticated user."""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT f.*, (SELECT COUNT(*) FROM orders WHERE farm_id = f.id) as order_count "
            "FROM farms f WHERE f.user_id = ?",
            (current_user["sub"],)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/farm/{farm_id}", response_model=dict)
def get_farm(farm_id: str, farm: dict = Depends(get_user_farm)):
    """Retrieve farm profile with its suppliers."""
    if farm["id"] != farm_id:
        raise HTTPException(status_code=403, detail="Access forbidden")
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
def update_farm(farm_id: str, data: FarmUpdate, farm: dict = Depends(get_user_farm)):
    """Update farm profile fields."""
    if farm["id"] != farm_id:
        raise HTTPException(status_code=403, detail="Access forbidden")
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
def list_suppliers(farm_id: str, farm: dict = Depends(get_user_farm)):
    """List all suppliers for a farm, each with their associated product_ids."""
    if farm["id"] != farm_id:
        raise HTTPException(status_code=403, detail="Access forbidden")
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM suppliers WHERE farm_id = ?", (farm_id,)
        ).fetchall()
        suppliers = [_row_to_supplier(r) for r in rows]

        # Attach product_ids from product_suppliers table
        ps_rows = conn.execute(
            "SELECT supplier_id, product_id FROM product_suppliers WHERE farm_id = ?", (farm_id,)
        ).fetchall()
        product_map: dict[str, list[str]] = {}
        for ps in ps_rows:
            product_map.setdefault(ps["supplier_id"], []).append(ps["product_id"])
        for s in suppliers:
            s["product_ids"] = product_map.get(s["id"], [])

        return suppliers
    finally:
        conn.close()


@router.post("/farm/{farm_id}/suppliers", response_model=Supplier, status_code=201)
def create_supplier(farm_id: str, data: SupplierCreate, farm: dict = Depends(get_user_farm)):
    """Create a new supplier for a farm."""
    if farm["id"] != farm_id:
        raise HTTPException(status_code=403, detail="Access forbidden")
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
def update_supplier(farm_id: str, supplier_id: str, data: SupplierUpdate, farm: dict = Depends(get_user_farm)):
    """Update an existing supplier."""
    if farm["id"] != farm_id:
        raise HTTPException(status_code=403, detail="Access forbidden")
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


@router.put("/farm/{farm_id}/suppliers/{supplier_id}/products", status_code=200)
def set_supplier_products(
    farm_id: str, supplier_id: str, req: SupplierProductsRequest, farm: dict = Depends(get_user_farm)
):
    """Replace the product associations for a supplier (full replace)."""
    if farm["id"] != farm_id:
        raise HTTPException(status_code=403, detail="Access forbidden")
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id FROM suppliers WHERE id = ? AND farm_id = ?", (supplier_id, farm_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Supplier not found")

        now = datetime.utcnow().isoformat()
        conn.execute(
            "DELETE FROM product_suppliers WHERE farm_id = ? AND supplier_id = ?",
            (farm_id, supplier_id),
        )
        for product_id in req.product_ids:
            conn.execute(
                """INSERT OR IGNORE INTO product_suppliers (id, farm_id, supplier_id, product_id, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), farm_id, supplier_id, product_id, now),
            )
        conn.commit()
        return {"product_ids": req.product_ids}
    finally:
        conn.close()


@router.delete("/farm/{farm_id}/suppliers/{supplier_id}", status_code=204)
def delete_supplier(farm_id: str, supplier_id: str, farm: dict = Depends(get_user_farm)):
    """Delete a supplier."""
    if farm["id"] != farm_id:
        raise HTTPException(status_code=403, detail="Access forbidden")
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
