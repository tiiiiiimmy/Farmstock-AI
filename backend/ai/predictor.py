"""
Consumption predictor: estimates when farm supplies will run out based on order history.
"""
import math
from datetime import datetime, timedelta
from typing import List, Optional


def _infer_seasonal_months(dates: List[datetime]) -> Optional[List[int]]:
    """Infer seasonal purchasing months when a product is only bought in a narrow window."""
    if len(dates) < 4:
        return None

    distinct_months = sorted({date.month for date in dates})
    if len(distinct_months) > 6:
        return None

    counts = {}
    for date in dates:
        counts[date.month] = counts.get(date.month, 0) + 1

    threshold = max(1, math.floor(len(dates) * 0.08))
    active_months = [month for month in distinct_months if counts.get(month, 0) >= threshold]
    return active_months or None


def _next_active_season_start(today: datetime, active_months: List[int]) -> datetime:
    """Return the next expected seasonal purchase window start."""
    for offset in (0, 1):
        year = today.year + offset
        for month in active_months:
            start = datetime(year, month, 1)
            if start >= today:
                return start
    return datetime(today.year + 1, active_months[0], 1)


def _urgency_from_days(days_until: Optional[int]) -> str:
    if days_until is None:
        return "green"
    if days_until < 7:
        return "red"
    if days_until <= 21:
        return "amber"
    return "green"


def analyze_product_consumption(orders: List[dict], product_name: str) -> dict:
    """
    Analyze purchase intervals for a single product and predict depletion date.

    Returns a dict with prediction data, or None if insufficient history.
    """
    # Filter and sort orders for this product
    product_orders = sorted(
        [o for o in orders if o.get("product_name") == product_name],
        key=lambda o: o["date"],
    )

    if len(product_orders) < 2:
        # Single order: use typical interval based on category as fallback
        if len(product_orders) == 1:
            last = product_orders[0]
            return {
                "product_name": product_name,
                "category": last.get("category", "unknown"),
                "last_order_date": last["date"],
                "avg_days_between_orders": None,
                "estimated_depletion_date": None,
                "days_until_depletion": None,
                "urgency": "green",
                "recommended_order_date": None,
                "order_count": 1,
            }
        return None

    # Calculate intervals between consecutive orders
    dates = [datetime.strptime(o["date"], "%Y-%m-%d") for o in product_orders]
    intervals = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]

    # Weight recent intervals more heavily (last 3 intervals have 2x weight)
    if len(intervals) > 3:
        recent = intervals[-3:]
        older = intervals[:-3]
        weighted_intervals = older + recent + recent  # double-weight recent
        avg_interval = sum(weighted_intervals) / len(weighted_intervals)
    else:
        avg_interval = sum(intervals) / len(intervals)

    avg_interval = max(7, int(avg_interval))  # minimum 7 days

    last_order_date = dates[-1]
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    seasonal_months = _infer_seasonal_months(dates)

    if seasonal_months and today.month not in seasonal_months:
        estimated_depletion = _next_active_season_start(today, seasonal_months)
        days_until = (estimated_depletion - today).days
        recommended_order_date = estimated_depletion - timedelta(days=7)
    else:
        estimated_depletion = last_order_date + timedelta(days=avg_interval)
        days_until = (estimated_depletion - today).days
        recommended_order_date = estimated_depletion - timedelta(days=7)

    urgency = _urgency_from_days(days_until)

    return {
        "product_name": product_name,
        "category": product_orders[-1].get("category", "unknown"),
        "last_order_date": last_order_date.strftime("%Y-%m-%d"),
        "avg_days_between_orders": avg_interval,
        "estimated_depletion_date": estimated_depletion.strftime("%Y-%m-%d"),
        "days_until_depletion": days_until,
        "urgency": urgency,
        "recommended_order_date": recommended_order_date.strftime("%Y-%m-%d"),
        "order_count": len(product_orders),
        "seasonal_months": seasonal_months,
    }


def get_all_predictions(orders: List[dict]) -> List[dict]:
    """
    Run consumption analysis across all products found in order history.

    Returns predictions sorted by urgency (red first, then amber, then green).
    """
    # Collect distinct product names
    product_names = list({o["product_name"] for o in orders})

    predictions = []
    for name in product_names:
        result = analyze_product_consumption(orders, name)
        if result and result.get("avg_days_between_orders") is not None:
            predictions.append(result)

    # Sort by days_until_depletion ascending (most urgent first)
    predictions.sort(key=lambda p: p.get("days_until_depletion", 9999))
    return predictions
