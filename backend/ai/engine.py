"""
Gemini AI integration for FarmStock AI chat and intelligent features.
"""
import os
from typing import List

import httpx

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_MAX_OUTPUT_TOKENS = int(os.environ.get("GEMINI_MAX_OUTPUT_TOKENS", "2048"))
GEMINI_API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

SYSTEM_PROMPT = """You are FarmStock AI, an intelligent farm supply management assistant for New Zealand and Australian dairy farms.

You help farmers:
- Track and predict inventory depletion
- Recommend products based on purchase history and farm profile
- Alert about weather and disease risks requiring immediate action
- Optimize purchasing timing and costs
- Process purchase orders to suppliers

You have access to the farmer's complete purchase history, farm profile, and AI predictions. Always provide specific, actionable advice based on the actual data. When recommending orders, include product name, quantity, and reasoning.

Keep responses concise and practical - farmers are busy people. Use NZD for prices. Reference specific products and dates from their history when relevant."""


async def chat_with_ai(
    message: str,
    farm_context: dict,
    conversation_history: List[dict] = [],
) -> str:
    """Send a message to Gemini with farm context and return the assistant's reply."""
    if not GEMINI_API_KEY:
        return _fallback_chat_response(message, farm_context)

    prompt = _build_prompt(message, farm_context, conversation_history)
    payload = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}],
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": GEMINI_MAX_OUTPUT_TOKENS,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                GEMINI_API_URL,
                params={"key": GEMINI_API_KEY},
                json=payload,
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        if status in (401, 403):
            raise RuntimeError("Gemini API key is invalid or unauthorized") from exc
        raise RuntimeError(f"Gemini API request failed with status {status}") from exc
    except httpx.HTTPError as exc:
        raise RuntimeError("Unable to reach the Gemini API") from exc

    data = response.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise RuntimeError("Gemini returned no response candidates")

    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response")
    return text


async def chat_with_claude(
    message: str,
    farm_context: dict,
    conversation_history: List[dict] = [],
) -> str:
    """Backward-compatible alias for older imports."""
    return await chat_with_ai(message, farm_context, conversation_history)


def _build_prompt(message: str, farm_context: dict, conversation_history: List[dict]) -> str:
    history_lines = []
    for msg in conversation_history[-10:]:
        role = msg.get("role")
        content = msg.get("content")
        if role in ("user", "assistant") and content:
            history_lines.append(f"{role.title()}: {content}")

    history_block = "\n".join(history_lines) if history_lines else "No previous conversation"
    return f"""
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

Conversation History:
{history_block}

Farmer's message:
{message}
""".strip()


def _fallback_chat_response(message: str, farm_context: dict) -> str:
    """Provide a deterministic local response when Gemini isn't configured."""
    lower = message.lower()
    predictions = farm_context.get("predictions", [])
    recommendations = farm_context.get("recommendations", [])
    farm_name = farm_context.get("farm", {}).get("name", "your farm")

    if "spend" in lower or "spent" in lower:
        recent_orders = farm_context.get("recent_orders", [])
        total = sum((order.get("total_price") or 0) for order in recent_orders)
        return (
            f"FarmStock AI local mode: Gemini isn't configured yet, but I can still help. "
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
        "FarmStock AI local mode: Gemini isn't configured yet, but the backend is running. "
        "Ask about stock, orders, or spending once seed data is loaded."
    )


def _format_orders(orders: list) -> str:
    if not orders:
        return "No recent orders"
    lines = []
    for order in orders[:10]:
        unit_price = order.get("unit_price") or 0
        total_price = order.get("total_price") or 0
        lines.append(
            f"- {order.get('date')}: {order.get('product_name')} "
            f"{order.get('quantity')} {order.get('unit')} "
            f"@ NZD {unit_price:.2f}/{order.get('unit')} (NZD {total_price:.2f})"
        )
    return "\n".join(lines)


def _format_predictions(predictions: list) -> str:
    if not predictions:
        return "No predictions available"
    lines = []
    for prediction in predictions[:5]:
        days = prediction.get("days_until_depletion", "unknown")
        urgency = prediction.get("urgency", "unknown")
        lines.append(
            f"- {prediction.get('product_name')}: ~{days} days until depletion ({urgency} urgency)"
        )
    return "\n".join(lines)


def _format_recommendations(recommendations: list) -> str:
    if not recommendations:
        return "No recommendations"
    lines = []
    for recommendation in recommendations[:3]:
        lines.append(
            f"- {recommendation.get('product_name')}: {recommendation.get('reasoning', '')}"
        )
    return "\n".join(lines)
