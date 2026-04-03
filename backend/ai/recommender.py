"""
Product recommender: generates top purchase recommendations based on predictions,
purchase history, and seasonal context.
"""
from datetime import datetime
from typing import List


# Category-based default reorder lead time in days
CATEGORY_LEAD_DAYS = {
    "feed": 7,
    "fertiliser": 14,
    "veterinary": 10,
    "chemical": 10,
    "equipment": 14,
}

# Southern-hemisphere seasonal context (NZ dairy calendar)
SEASON_CONTEXT = {
    (9, 10, 11): "spring",   # Sep-Nov
    (12, 1, 2): "summer",    # Dec-Feb
    (3, 4, 5): "autumn",     # Mar-May
    (6, 7, 8): "winter",     # Jun-Aug
}


def _current_season() -> str:
    month = datetime.utcnow().month
    for months, season in SEASON_CONTEXT.items():
        if month in months:
            return season
    return "unknown"


def _months_since_last_order(orders: List[dict], product_name: str) -> float:
    """Return months elapsed since the most recent order for a given product."""
    product_orders = [o for o in orders if o.get("product_name") == product_name]
    if not product_orders:
        return 9999.0
    last_date_str = max(o["date"] for o in product_orders)
    last_date = datetime.strptime(last_date_str, "%Y-%m-%d")
    delta = (datetime.utcnow() - last_date).days / 30.0
    return round(delta, 1)


def get_recommendations(
    farm: dict,
    orders: List[dict],
    predictions: List[dict],
    products: List[dict],
) -> List[dict]:
    """
    Return top 5 purchase recommendations with reasoning.

    Priority:
    1. Predictions with red urgency (< 7 days).
    2. Predictions with amber urgency (7-21 days).
    3. Products not ordered in the last 60 days that are seasonally relevant.
    4. Products with high average spend that haven't been ordered recently.
    """
    season = _current_season()
    month = datetime.utcnow().month
    recommendations = []

    # Track which products have already been recommended
    recommended_names: set = set()

    # --- Priority 1 & 2: predictions by urgency ---
    for pred in sorted(predictions, key=lambda p: p.get("days_until_depletion", 9999)):
        if pred.get("urgency") not in ("red", "amber"):
            continue
        name = pred["product_name"]
        if name in recommended_names:
            continue

        days = pred.get("days_until_depletion", 0)
        urgency = pred["urgency"]
        avg_interval = pred.get("avg_days_between_orders", 30)
        lead_days = CATEGORY_LEAD_DAYS.get(pred.get("category", "feed"), 10)

        if urgency == "red":
            reasoning = (
                f"Estimated stock depletion in {days} days based on {pred.get('order_count', 0)}-order history "
                f"(avg reorder interval: {avg_interval} days). Order immediately to avoid running out."
            )
        else:
            reasoning = (
                f"Estimated stock depletion in {days} days. "
                f"Recommended order date: {pred.get('recommended_order_date', 'soon')} "
                f"(includes {lead_days}-day delivery buffer)."
            )

        recommendations.append({
            "product_name": name,
            "category": pred.get("category"),
            "urgency": urgency,
            "days_until_depletion": days,
            "recommended_order_date": pred.get("recommended_order_date"),
            "reasoning": reasoning,
            "priority": 1 if urgency == "red" else 2,
        })
        recommended_names.add(name)

        if len(recommendations) >= 5:
            break

    # --- Priority 3: seasonally relevant products not ordered recently ---
    if len(recommendations) < 5:
        seasonal_hints = {
            "spring": ["Superphosphate Fertiliser", "Nitrogen Fertiliser Urea", "Ryegrass Seed 25kg", "Cattle Vaccine 50mL"],
            "summer": ["Roundup Ready 20L", "Herbicide 10L", "Detergent 20L"],
            "autumn": ["Magnesium Oxide 25kg", "Bloat Oil 20L", "Zinc Oxide Supplement 25kg", "Palm Kernel Extract"],
            "winter": ["Dairy Pellets 1t", "Hay Bales", "Feed Pellets Premium 500kg", "Calf Milk Replacer 20kg", "Palm Kernel Extract"],
        }
        for product_name in seasonal_hints.get(season, []):
            if product_name in recommended_names:
                continue
            months_since = _months_since_last_order(orders, product_name)
            if months_since >= 2.0:
                recommendations.append({
                    "product_name": product_name,
                    "category": None,
                    "urgency": "green",
                    "days_until_depletion": None,
                    "recommended_order_date": None,
                    "reasoning": (
                        f"Seasonally relevant for {season} on NZ dairy farms. "
                        f"Last ordered {months_since:.1f} months ago."
                    ),
                    "priority": 3,
                })
                recommended_names.add(product_name)
            if len(recommendations) >= 5:
                break

    # --- Priority 4: high-spend products not recently ordered ---
    if len(recommendations) < 5:
        # Aggregate spend per product
        spend_by_product: dict = {}
        for o in orders:
            name = o.get("product_name", "")
            spend_by_product[name] = spend_by_product.get(name, 0) + (o.get("total_price") or 0)

        # Sort by total spend descending
        high_spend = sorted(spend_by_product.items(), key=lambda x: -x[1])
        for name, total_spend in high_spend:
            if name in recommended_names:
                continue
            months_since = _months_since_last_order(orders, name)
            if months_since >= 3.0:
                recommendations.append({
                    "product_name": name,
                    "category": None,
                    "urgency": "green",
                    "days_until_depletion": None,
                    "recommended_order_date": None,
                    "reasoning": (
                        f"High-spend product (NZD {total_spend:,.0f} historically). "
                        f"Not ordered in {months_since:.1f} months — may be due for review."
                    ),
                    "priority": 4,
                })
                recommended_names.add(name)
            if len(recommendations) >= 5:
                break

    return recommendations[:5]
