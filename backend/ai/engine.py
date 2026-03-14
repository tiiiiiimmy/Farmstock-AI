"""
Claude AI integration for FarmStock AI chat and intelligent features.
"""
import os
from typing import List

try:
    import anthropic
except ModuleNotFoundError:  # pragma: no cover - optional local dev dependency
    anthropic = None

client = None
if anthropic and os.environ.get("ANTHROPIC_API_KEY"):
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are FarmStock AI, an intelligent farm supply management assistant for New Zealand and Australian dairy farms.

You help farmers:
- Track and predict inventory depletion
- Recommend products based on purchase history and farm profile
- Alert about weather and disease risks requiring immediate action
- Optimize purchasing timing and costs
- Process purchase orders to suppliers

You have access to the farmer's complete purchase history, farm profile, and AI predictions. Always provide specific, actionable advice based on the actual data. When recommending orders, include product name, quantity, and reasoning.

Keep responses concise and practical - farmers are busy people. Use NZD for prices. Reference specific products and dates from their history when relevant."""


async def chat_with_claude(
    message: str,
    farm_context: dict,
    conversation_history: List[dict] = [],
) -> str:
    """Send a message to Claude with farm context and return the assistant's reply."""
    if client is None:
        return _fallback_chat_response(message, farm_context)

    context_str = f"""
Farm Profile:
- Name: {farm_context.get('farm', {}).get('name', 'Unknown')}
- Region: {farm_context.get('farm', {}).get('region', 'Unknown')}
- Type: {farm_context.get('farm', {}).get('farm_type', 'Unknown')}
- Herd size: {farm_context.get('farm', {}).get('herd_size', 'Unknown')} head
- Land area: {farm_context.get('farm', {}).get('land_area_ha', 'Unknown')} ha

Recent Orders (last 10):
{_format_orders(farm_context.get('recent_orders', []))}

Current Predictions:
{_format_predictions(farm_context.get('predictions', []))}

Recommendations:
{_format_recommendations(farm_context.get('recommendations', []))}
"""

    messages = []
    for msg in conversation_history[-10:]:  # Keep last 10 turns for context
        if msg.get("role") in ("user", "assistant") and msg.get("content"):
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({
        "role": "user",
        "content": f"{context_str}\n\nFarmer's message: {message}",
    })

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=messages,
    )

    return response.content[0].text


def _fallback_chat_response(message: str, farm_context: dict) -> str:
    """Provide a deterministic local response when Anthropic isn't configured."""
    lower = message.lower()
    predictions = farm_context.get("predictions", [])
    recommendations = farm_context.get("recommendations", [])
    farm_name = farm_context.get("farm", {}).get("name", "your farm")

    if "spend" in lower or "spent" in lower:
        recent_orders = farm_context.get("recent_orders", [])
        total = sum((order.get("total_price") or 0) for order in recent_orders)
        return (
            f"FarmStock AI local mode: I can't reach Claude right now, but I can still help. "
            f"Across the {len(recent_orders)} most recent orders for {farm_name}, spend totals "
            f"NZD {total:,.2f}."
        )

    if predictions:
        top = predictions[0]
        return (
            f"FarmStock AI local mode: the most urgent item is {top['product_name']}, "
            f"with about {top['days_until_depletion']} days remaining. "
            f"Recommended reorder date: {top['recommended_order_date']}."
        )

    if recommendations:
        top = recommendations[0]
        return (
            f"FarmStock AI local mode: consider {top['product_name']}. "
            f"{top.get('reasoning', 'It is one of the top recommendations right now.')}"
        )

    return (
        "FarmStock AI local mode: Claude isn't configured yet, but the backend is running. "
        "Ask about stock, orders, or spending once seed data is loaded."
    )


def _format_orders(orders: list) -> str:
    if not orders:
        return "No recent orders"
    lines = []
    for o in orders[:10]:
        unit_price = o.get("unit_price") or 0
        total_price = o.get("total_price") or 0
        lines.append(
            f"- {o.get('date')}: {o.get('product_name')} "
            f"{o.get('quantity')} {o.get('unit')} "
            f"@ ${unit_price:.2f}/{o.get('unit')} (${total_price:.2f})"
        )
    return "\n".join(lines)


def _format_predictions(predictions: list) -> str:
    if not predictions:
        return "No predictions available"
    lines = []
    for p in predictions[:5]:
        days = p.get("days_until_depletion", "unknown")
        urgency = p.get("urgency", "unknown")
        lines.append(
            f"- {p.get('product_name')}: ~{days} days until depletion ({urgency} urgency)"
        )
    return "\n".join(lines)


def _format_recommendations(recs: list) -> str:
    if not recs:
        return "No recommendations"
    lines = []
    for r in recs[:3]:
        lines.append(f"- {r.get('product_name')}: {r.get('reasoning', '')}")
    return "\n".join(lines)
