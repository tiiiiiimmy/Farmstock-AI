"""
Regional price benchmark endpoint.

Returns anonymised cross-farm price aggregates for a named product
within the current farm's region. Only surfaces data when at least
3 distinct farms have matching orders (privacy threshold).
"""
from typing import Optional
from fastapi import APIRouter, Query, Depends
from ..database import get_db
from ..auth import get_user_farm

router = APIRouter()

_MIN_FARMS = 3  # minimum distinct farms before regional data is shown


def compute_benchmark(conn, farm_id: str, farm_region: Optional[str], product_name: str, supplier_id: Optional[str] = None) -> dict:
    """
    Pure computation function — accepts an open DB connection so it can be
    called from tests with an in-memory DB.

    Returns a dict matching the API response schema.
    """
    # --- Current farm's own trend (always returned) ---
    trend_query = """
        SELECT date, unit_price, unit
        FROM orders
        WHERE farm_id = ?
          AND LOWER(product_name) = LOWER(?)
          AND unit_price IS NOT NULL
    """
    trend_params: list = [farm_id, product_name]

    if supplier_id:
        trend_query += " AND supplier_id = ?"
        trend_params.append(supplier_id)

    trend_query += " ORDER BY date ASC"
    trend_rows = conn.execute(trend_query, trend_params).fetchall()
    trend = [{"date": r["date"], "unit_price": r["unit_price"]} for r in trend_rows]

    your_latest_price = trend_rows[-1]["unit_price"] if trend_rows else None
    unit = trend_rows[-1]["unit"] if trend_rows else None

    base = {
        "product_name": product_name,
        "region": farm_region,
        "unit": unit,
        "farm_count": 0,
        "regional_avg": None,
        "regional_min": None,
        "regional_max": None,
        "your_latest_price": your_latest_price,
        "your_percentile": None,
        "trend": trend,
        "data_available": False,
    }

    if not farm_region:
        return base

    # --- Cross-farm regional aggregates ---
    regional_rows = conn.execute("""
        SELECT o.farm_id, o.unit_price, o.date
        FROM orders o
        JOIN farms f ON f.id = o.farm_id
        WHERE LOWER(o.product_name) = LOWER(?)
          AND f.region = ?
          AND o.unit_price IS NOT NULL
        ORDER BY o.farm_id, o.date DESC
    """, (product_name, farm_region)).fetchall()

    if not regional_rows:
        return base

    # Distinct farm count
    farm_ids = {r["farm_id"] for r in regional_rows}
    farm_count = len(farm_ids)

    if farm_count < _MIN_FARMS:
        base["farm_count"] = farm_count
        return base

    # Aggregates across all matching rows
    prices = [r["unit_price"] for r in regional_rows]
    regional_avg = round(sum(prices) / len(prices), 4)
    regional_min = round(min(prices), 4)
    regional_max = round(max(prices), 4)

    # Latest price per farm (for percentile calculation)
    seen: set = set()
    latest_by_farm: dict = {}
    for r in regional_rows:
        fid = r["farm_id"]
        if fid not in seen:
            latest_by_farm[fid] = r["unit_price"]
            seen.add(fid)

    # Percentile: % of OTHER farms whose latest price is higher than yours
    your_percentile = None
    if your_latest_price is not None and farm_count > 1:
        others = [p for fid, p in latest_by_farm.items() if fid != farm_id]
        higher_count = sum(1 for p in others if p > your_latest_price)
        your_percentile = round(higher_count / len(others) * 100) if others else None

    return {
        **base,
        "farm_count": farm_count,
        "regional_avg": regional_avg,
        "regional_min": regional_min,
        "regional_max": regional_max,
        "your_percentile": your_percentile,
        "data_available": True,
    }


@router.get("/price-benchmark")
def get_price_benchmark(
    product_name: str = Query(..., min_length=1, max_length=160),
    supplier_id: Optional[str] = Query(None),
    farm: dict = Depends(get_user_farm),
):
    """Return anonymised regional price benchmark for a product."""
    farm_id = farm["id"]
    farm_region = farm.get("region")
    conn = get_db()
    try:
        return compute_benchmark(conn, farm_id, farm_region, product_name, supplier_id)
    finally:
        conn.close()
