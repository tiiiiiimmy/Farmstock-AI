"""
WhatsApp message templates for FarmStock AI notifications.
"""
from typing import Optional


def low_stock_alert(product_name: str, days_remaining: int, supplier_name: str) -> str:
    return (
        f"*FarmStock AI - Low Stock Alert*\n\n"
        f"*{product_name}* is estimated to run out in *{days_remaining} days*.\n\n"
        f"Suggested supplier: {supplier_name}\n\n"
        f"Reply *ORDER {product_name}* to place an order, or *HELP* for more options."
    )


def weather_alert(region: str, warning_type: str, advice: str) -> str:
    return (
        f"*FarmStock AI - Weather Alert*\n\n"
        f"MetService has issued a *{warning_type}* warning for *{region}*.\n\n"
        f"{advice}\n\n"
        f"Reply *STOCK* to check current supply predictions, or *HELP* for options."
    )


def price_drop_alert(product_name: str, old_price: float, new_price: float, supplier_name: str) -> str:
    saving_pct = round((old_price - new_price) / old_price * 100, 1)
    return (
        f"*FarmStock AI - Price Drop*\n\n"
        f"*{product_name}* is now NZD {new_price:.2f} at {supplier_name} "
        f"(was NZD {old_price:.2f}, saving {saving_pct}%).\n\n"
        f"Reply *ORDER {product_name}* to place an order now."
    )


def monthly_summary(
    month_label: str,
    total_spend: float,
    by_category: dict,
    yoy_change_pct: Optional[float],
) -> str:
    category_lines = "\n".join(
        f"  • {cat.title()}: NZD {amount:,.0f}"
        for cat, amount in sorted(by_category.items(), key=lambda x: -x[1])
    )
    yoy_str = ""
    if yoy_change_pct is not None:
        direction = "up" if yoy_change_pct >= 0 else "down"
        yoy_str = f"\nYear-on-year: {direction} {abs(yoy_change_pct):.1f}%"

    return (
        f"*FarmStock AI - Monthly Summary: {month_label}*\n\n"
        f"Total spend: NZD {total_spend:,.0f}{yoy_str}\n\n"
        f"By category:\n{category_lines}\n\n"
        f"Reply *PREDICTIONS* for upcoming supply needs, or *HELP* for all options."
    )


def help_message() -> str:
    return (
        "*FarmStock AI - Help*\n\n"
        "Available commands:\n"
        "  *STOCK* — Check supply predictions\n"
        "  *ORDER <product>* — Place a quick order\n"
        "  *SPEND* — View spending summary\n"
        "  *ALERTS* — View current alerts\n"
        "  *HELP* — Show this message\n\n"
        "You can also ask a question in plain English and our AI will assist you."
    )
