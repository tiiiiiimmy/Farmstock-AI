"""
Supply depletion prediction endpoints.
"""
from fastapi import APIRouter, Query
from ..database import get_db
from ..ai.predictor import get_all_predictions

router = APIRouter()


@router.get("/predictions")
def get_predictions(farm_id: str = Query(..., description="Farm ID")):
    """
    Get depletion predictions for all tracked products on a farm.

    Analyzes order history to estimate when each product will run out,
    assigns urgency (red/amber/green), and provides recommended reorder dates.
    """
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM orders WHERE farm_id = ? ORDER BY date",
            (farm_id,),
        ).fetchall()
        orders = [dict(r) for r in rows]
    finally:
        conn.close()

    predictions = get_all_predictions(orders)
    return predictions
