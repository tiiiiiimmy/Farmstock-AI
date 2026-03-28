import os
from anthropic import Anthropic

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
MAX_TOKENS = int(os.getenv("CLAUDE_MAX_TOKENS", "2048"))

_client = None

def _get_client() -> Anthropic:
    global _client
    if _client is None:
        if not ANTHROPIC_API_KEY:
            return None
        _client = Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client

SYSTEM_PROMPT = """You are FarmStock AI — a specialist farm supply management assistant for New Zealand and Australian dairy, sheep, and beef farms.

You help farmers with:
- Predicting when supplies will run out (drench, feed, fertiliser, chemicals)
- Recommending products to reorder based on their purchase history and farm profile
- Analysing spending patterns and identifying savings opportunities
- Understanding seasonal patterns (NZ: spring fertiliser Sept-Nov, winter feed May-Aug)
- Alert farmers to weather risks and disease outbreaks relevant to their region
- Facilitating purchase orders to their preferred suppliers

Key NZ/AU context:
- Currency: NZD. Use $ symbol.
- Common suppliers: Farmlands, PGG Wrightson (NZ); Elders, Nutrien Ag Solutions (AU)
- Regions: Canterbury, Waikato, Southland, Hawke's Bay, Manawatu, Otago, Marlborough
- Common products: Ivomec/drench, superphosphate/urea, palm kernel extract, ryegrass seed, mineral lick blocks

Tone: Practical, direct, and knowledgeable. You speak like a trusted farm advisor, not a corporate chatbot.
Format: Use markdown for lists and emphasis. Keep responses concise — farmers are busy.
Always be data-driven: reference the specific numbers from the farmer's history when available."""


def generate_response(
    message: str,
    farm_profile: dict,
    recent_orders: list,
    predictions: list,
    recommendations: list,
    conversation_history: list,
) -> str:
    """Generate a response from Claude API with full farm context."""
    client = _get_client()
    if client is None:
        return _fallback_response(message, farm_profile, predictions, recommendations)

    # Build context block
    context_parts = [f"**Farm:** {farm_profile.get('name', 'Unknown')} — {farm_profile.get('farm_type', '')} farm in {farm_profile.get('region', '')}",
                     f"Herd size: {farm_profile.get('herd_size', 'unknown')} head | Area: {farm_profile.get('land_area_ha', 'unknown')} ha"]

    if predictions:
        urgent = [p for p in predictions if p.get('urgency') in ('red', 'amber')][:5]
        if urgent:
            pred_lines = [f"- {p['product_name']}: ~{p.get('days_until_depletion', '?')} days left [{p['urgency'].upper()}]"
                          for p in urgent]
            context_parts.append("\n**Urgent stock status:**\n" + "\n".join(pred_lines))

    if recommendations:
        rec_lines = [f"- {r['product_name']}: {r.get('reasoning', '')}"
                     for r in recommendations[:3]]
        context_parts.append("\n**Top recommendations:**\n" + "\n".join(rec_lines))

    if recent_orders:
        order_lines = [f"- {o['date']}: {o['product_name']} {o['quantity']} {o['unit']} @ ${o.get('unit_price', 0):.2f}"
                       for o in recent_orders[:8]]
        context_parts.append("\n**Recent orders:**\n" + "\n".join(order_lines))

    farm_context = "\n".join(context_parts)

    # Build message history for Claude
    messages = []
    for h in conversation_history[-10:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": message})

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT + f"\n\n---\n**Current farm context:**\n{farm_context}",
            messages=messages,
        )
        return response.content[0].text
    except Exception as e:
        print(f"[Claude] API error: {e}")
        return _fallback_response(message, farm_profile, predictions, recommendations)


def _fallback_response(message: str, farm_profile: dict, predictions: list, recommendations: list) -> str:
    """Local fallback when Claude API is unavailable."""
    msg_lower = message.lower()
    farm_name = farm_profile.get("name", "your farm")

    if any(w in msg_lower for w in ["stock", "drench", "run out", "low", "reorder"]):
        urgent = [p for p in predictions if p.get("urgency") in ("red", "amber")]
        if urgent:
            items = ", ".join(p["product_name"] for p in urgent[:3])
            return f"Based on {farm_name}'s purchase history, these items need attention: **{items}**. Check the Dashboard for full details."
        return "All stock levels look healthy based on recent orders."

    if any(w in msg_lower for w in ["spend", "cost", "money", "budget"]):
        return f"I can see {farm_name}'s purchase history. For detailed spending analytics, check the Insights page or ask me a specific question like 'How much did I spend on feed this winter?'"

    if any(w in msg_lower for w in ["recommend", "suggest", "buy", "order"]):
        if recommendations:
            top = recommendations[0]
            return f"Top recommendation: **{top['product_name']}** — {top.get('reasoning', 'based on your purchase patterns')}."
        return "No urgent recommendations right now. All supplies appear well-stocked."

    return f"I'm FarmStock AI, your farm supply assistant. I can help with stock predictions, order recommendations, and spending analysis for {farm_name}. What would you like to know?"
