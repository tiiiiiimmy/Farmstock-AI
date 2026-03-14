"""
AI-powered purchase recommendation endpoints.
"""
from fastapi import APIRouter, Query
from ..database import get_db
from ..ai.predictor import get_all_predictions
from ..ai.recommender import get_recommendations

router = APIRouter()


@router.get("/recommendations")
def get_purchase_recommendations(farm_id: str = Query(..., description="Farm ID")):
    """
    Get top 5 AI-generated purchase recommendations for a farm.

    Combines depletion predictions, seasonal context, and spend history
    to surface the most actionable reorder suggestions.
    """
    conn = get_db()
    try:
        farm_row = conn.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
        farm = dict(farm_row) if farm_row else {}

        order_rows = conn.execute(
            "SELECT * FROM orders WHERE farm_id = ? ORDER BY date", (farm_id,)
        ).fetchall()
        orders = [dict(r) for r in order_rows]

        product_rows = conn.execute("SELECT * FROM products").fetchall()
        products = [dict(r) for r in product_rows]
    finally:
        conn.close()

    predictions = get_all_predictions(orders)
    recs = get_recommendations(farm, orders, predictions, products)
    return recs
