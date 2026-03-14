"""
Price trend analysis for farm supply products.
"""
from typing import List, Optional


def analyze_price_trends(orders: List[dict], product_name: str) -> dict:
    """
    Analyze price history for a product and identify trends.

    Returns avg_price, min_price, max_price, trend direction,
    and a suggested bulk discount threshold.
    """
    product_orders = sorted(
        [o for o in orders if o.get("product_name") == product_name and o.get("unit_price")],
        key=lambda o: o["date"],
    )

    if not product_orders:
        return {
            "product_name": product_name,
            "order_count": 0,
            "avg_price": None,
            "min_price": None,
            "max_price": None,
            "trend": "unknown",
            "bulk_discount_threshold": None,
            "price_history": [],
        }

    prices = [o["unit_price"] for o in product_orders]
    quantities = [o.get("quantity", 1) for o in product_orders]

    avg_price = round(sum(prices) / len(prices), 2)
    min_price = round(min(prices), 2)
    max_price = round(max(prices), 2)

    # Trend: compare first half vs second half average
    mid = max(1, len(prices) // 2)
    first_half_avg = sum(prices[:mid]) / mid
    second_half_avg = sum(prices[mid:]) / max(1, len(prices) - mid)

    change_pct = (second_half_avg - first_half_avg) / first_half_avg * 100 if first_half_avg else 0
    if change_pct > 3:
        trend = "up"
    elif change_pct < -3:
        trend = "down"
    else:
        trend = "stable"

    # Bulk discount threshold: median quantity * 1.5
    sorted_qty = sorted(quantities)
    median_qty = sorted_qty[len(sorted_qty) // 2]
    bulk_threshold = round(median_qty * 1.5, 2)

    price_history = [
        {"date": o["date"], "unit_price": o["unit_price"], "quantity": o.get("quantity")}
        for o in product_orders
    ]

    return {
        "product_name": product_name,
        "order_count": len(product_orders),
        "avg_price": avg_price,
        "min_price": min_price,
        "max_price": max_price,
        "trend": trend,
        "trend_change_pct": round(change_pct, 1),
        "bulk_discount_threshold": bulk_threshold,
        "price_history": price_history,
    }
