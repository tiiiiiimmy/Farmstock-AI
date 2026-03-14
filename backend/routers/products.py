"""
Product catalogue endpoints.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from ..database import get_db
from ..models import Product

router = APIRouter()


def _row_to_product(row) -> dict:
    return dict(row)


@router.get("/products", response_model=list)
def list_products(category: Optional[str] = Query(None)):
    """List all products, optionally filtered by category."""
    conn = get_db()
    try:
        if category:
            rows = conn.execute(
                "SELECT * FROM products WHERE category = ? ORDER BY name", (category,)
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM products ORDER BY category, name").fetchall()
        return [_row_to_product(r) for r in rows]
    finally:
        conn.close()


@router.get("/products/{product_id}", response_model=Product)
def get_product(product_id: str):
    """Get a single product by ID."""
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")
        return Product(**_row_to_product(row))
    finally:
        conn.close()
