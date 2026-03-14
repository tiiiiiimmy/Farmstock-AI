"""
Spending analytics endpoints: totals by category, monthly breakdown, YoY comparison.
"""
from datetime import datetime
from typing import Optional
from collections import defaultdict
from fastapi import APIRouter, Query
from ..database import get_db

router = APIRouter()


def _parse_year_month(date_str: str):
    """Extract (year, month) tuple from a YYYY-MM-DD string."""
    parts = date_str.split("-")
    return int(parts[0]), int(parts[1])


def _period_filter_dates(period: str):
    """Return (start_date, end_date) strings for the requested period (relative to today)."""
    today = datetime.utcnow().date()
    if period == "month":
        start = today.replace(day=1)
        return str(start), str(today)
    elif period == "quarter":
        # Current calendar quarter
        q_start_month = ((today.month - 1) // 3) * 3 + 1
        start = today.replace(month=q_start_month, day=1)
        return str(start), str(today)
    elif period == "year":
        start = today.replace(month=1, day=1)
        return str(start), str(today)
    # Default: all time
    return None, None


@router.get("/spending")
def get_spending(
    farm_id: str = Query(..., description="Farm ID"),
    period: Optional[str] = Query(None, description="month | quarter | year (omit for all-time)"),
    category: Optional[str] = Query(None, description="Filter by category"),
):
    """
    Return spending analytics:
    - total_spend: overall total
    - by_category: {category: total}
    - monthly_breakdown: [{year, month, total, by_category}]
    - yoy_comparison: current year vs prior year totals
    """
    conn = get_db()
    try:
        start_date, end_date = _period_filter_dates(period) if period else (None, None)

        query = "SELECT * FROM orders WHERE farm_id = ?"
        params: list = [farm_id]

        if start_date:
            query += " AND date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND date <= ?"
            params.append(end_date)
        if category:
            query += " AND category = ?"
            params.append(category)

        query += " ORDER BY date"
        rows = conn.execute(query, params).fetchall()
        orders = [dict(r) for r in rows]
    finally:
        conn.close()

    total_spend = 0.0
    by_category: dict = defaultdict(float)
    monthly: dict = defaultdict(lambda: defaultdict(float))  # (year,month) -> category -> total

    for o in orders:
        price = o.get("total_price") or 0.0
        cat = o.get("category", "other")
        total_spend += price
        by_category[cat] += price

        try:
            year, month = _parse_year_month(o["date"])
            monthly[(year, month)][cat] += price
            monthly[(year, month)]["__total__"] += price
        except (KeyError, ValueError, IndexError):
            pass

    # Build sorted monthly breakdown
    monthly_breakdown = []
    for (year, month) in sorted(monthly.keys()):
        entry = {
            "year": year,
            "month": month,
            "month_label": datetime(year, month, 1).strftime("%b %Y"),
            "total": round(monthly[(year, month)]["__total__"], 2),
            "by_category": {
                k: round(v, 2)
                for k, v in monthly[(year, month)].items()
                if k != "__total__"
            },
        }
        monthly_breakdown.append(entry)

    # YoY comparison: current calendar year vs prior year
    current_year = datetime.utcnow().year
    prior_year = current_year - 1
    yoy_current = sum(
        monthly[(y, m)].get("__total__", 0.0)
        for (y, m) in monthly
        if y == current_year
    )
    yoy_prior = sum(
        monthly[(y, m)].get("__total__", 0.0)
        for (y, m) in monthly
        if y == prior_year
    )
    yoy_change_pct = (
        round((yoy_current - yoy_prior) / yoy_prior * 100, 1) if yoy_prior else None
    )

    return {
        "farm_id": farm_id,
        "period": period or "all_time",
        "category_filter": category,
        "total_spend": round(total_spend, 2),
        "by_category": {k: round(v, 2) for k, v in by_category.items()},
        "monthly_breakdown": monthly_breakdown,
        "yoy_comparison": {
            "current_year": current_year,
            "current_year_total": round(yoy_current, 2),
            "prior_year": prior_year,
            "prior_year_total": round(yoy_prior, 2),
            "change_pct": yoy_change_pct,
        },
    }
