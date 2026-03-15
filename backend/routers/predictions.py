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
        order_rows = conn.execute(
            "SELECT * FROM orders WHERE farm_id = ? ORDER BY date",
            (farm_id,),
        ).fetchall()
        product_rows = conn.execute(
            "SELECT * FROM products ORDER BY category, name"
        ).fetchall()
        snapshot_rows = conn.execute("""
            SELECT inventory_snapshots.*, products.name AS product_name, products.category,
                   products.shelf_life_days, products.shelf_life_zone, products.typical_unit
            FROM inventory_snapshots
            JOIN products ON products.id = inventory_snapshots.product_id
            WHERE inventory_snapshots.farm_id = ?
        """, (farm_id,)).fetchall()
        orders = [dict(r) for r in order_rows]
        products = {row["name"]: dict(row) for row in product_rows}
        snapshots = {row["product_name"]: dict(row) for row in snapshot_rows}
    finally:
        conn.close()

    predictions = get_all_predictions(orders)
    enriched = []
    for prediction in predictions:
        product = products.get(prediction["product_name"], {})
        snapshot = snapshots.get(prediction["product_name"], {})

        if snapshot:
            inventory_gap_pct = round(
                snapshot["current_stock_pct"] - snapshot["reorder_threshold_pct"],
                1,
            )
            stock_status = "green"
            if inventory_gap_pct <= 0:
                stock_status = "red"
            elif inventory_gap_pct <= 8:
                stock_status = "amber"

            prediction.update({
                "current_quantity": snapshot["current_quantity"],
                "current_stock_pct": snapshot["current_stock_pct"],
                "estimated_daily_usage": snapshot["estimated_daily_usage"],
                "lead_time_days": snapshot["lead_time_days"],
                "lead_time_consumption_pct": snapshot["lead_time_consumption_pct"],
                "reorder_threshold_pct": snapshot["reorder_threshold_pct"],
                "inventory_gap_pct": inventory_gap_pct,
                "reorder_now": inventory_gap_pct <= 0,
                "stock_status": stock_status,
                "expiry_date": snapshot["expiry_date"],
                "typical_unit": snapshot["typical_unit"],
                "shelf_life_zone": snapshot["shelf_life_zone"],
            })
            if prediction["urgency"] == "green" and stock_status != "green":
                prediction["urgency"] = stock_status
        else:
            prediction.update({
                "current_quantity": None,
                "current_stock_pct": None,
                "estimated_daily_usage": None,
                "lead_time_days": None,
                "lead_time_consumption_pct": None,
                "reorder_threshold_pct": None,
                "inventory_gap_pct": None,
                "reorder_now": False,
                "stock_status": prediction["urgency"],
                "expiry_date": None,
                "typical_unit": product.get("typical_unit"),
                "shelf_life_zone": product.get("shelf_life_zone"),
            })

        enriched.append(prediction)

    enriched.sort(
        key=lambda item: (
            0 if item.get("reorder_now") else 1,
            item.get("inventory_gap_pct", 999),
            item.get("days_until_depletion", 9999),
        )
    )
    return enriched
