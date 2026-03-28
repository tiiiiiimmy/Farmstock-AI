import os

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

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


def _normalize_provider(raw: str | None) -> str | None:
    if not raw:
        return None
    r = raw.strip().lower()
    aliases = {
        "anthropic": "anthropic",
        "claude": "anthropic",
        "openai": "openai",
        "gpt": "openai",
        "gemini": "gemini",
        "google": "gemini",
        "minimax": "minimax",
        "mini-max": "minimax",
    }
    return aliases.get(r, r if r in ("anthropic", "openai", "gemini", "minimax") else None)


def _resolve_provider() -> str | None:
    explicit = _normalize_provider(os.getenv("AI_PROVIDER"))
    if explicit:
        return explicit
    if os.getenv("ANTHROPIC_API_KEY"):
        return "anthropic"
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        return "gemini"
    if os.getenv("MINIMAX_API_KEY"):
        return "minimax"
    return None


def _max_output_tokens() -> int:
    for key in ("AI_MAX_TOKENS", "CLAUDE_MAX_TOKENS"):
        v = os.getenv(key)
        if v:
            return int(v)
    return 2048


def _model_for(provider: str) -> str:
    if provider == "anthropic":
        return os.getenv("CLAUDE_MODEL") or os.getenv("AI_MODEL") or "claude-sonnet-4-6"
    if provider == "openai":
        return os.getenv("OPENAI_MODEL") or os.getenv("AI_MODEL") or "gpt-4o-mini"
    if provider == "gemini":
        return os.getenv("GEMINI_MODEL") or os.getenv("AI_MODEL") or "gemini-2.0-flash"
    if provider == "minimax":
        return os.getenv("MINIMAX_MODEL") or os.getenv("AI_MODEL") or "MiniMax-Text-01"
    return "gpt-4o-mini"


_anthropic_client = None
_openai_client = None
_minimax_client = None


def _get_anthropic():
    global _anthropic_client
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key or Anthropic is None:
        return None
    if _anthropic_client is None:
        _anthropic_client = Anthropic(api_key=key)
    return _anthropic_client


def _get_openai():
    global _openai_client
    key = os.getenv("OPENAI_API_KEY")
    if not key or OpenAI is None:
        return None
    if _openai_client is None:
        _openai_client = OpenAI(api_key=key)
    return _openai_client


def _get_minimax():
    global _minimax_client
    key = os.getenv("MINIMAX_API_KEY")
    if not key or OpenAI is None:
        return None
    if _minimax_client is None:
        base = os.getenv("MINIMAX_API_BASE", "https://api.minimax.chat/v1").rstrip("/")
        _minimax_client = OpenAI(api_key=key, base_url=f"{base}/")
    return _minimax_client


def _gemini_api_key() -> str | None:
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


def _build_farm_context(
    farm_profile: dict,
    recent_orders: list,
    predictions: list,
    recommendations: list,
) -> str:
    context_parts = [
        f"**Farm:** {farm_profile.get('name', 'Unknown')} — {farm_profile.get('farm_type', '')} farm in {farm_profile.get('region', '')}",
        f"Herd size: {farm_profile.get('herd_size', 'unknown')} head | Area: {farm_profile.get('land_area_ha', 'unknown')} ha",
    ]
    if predictions:
        urgent = [p for p in predictions if p.get("urgency") in ("red", "amber")][:5]
        if urgent:
            pred_lines = [
                f"- {p['product_name']}: ~{p.get('days_until_depletion', '?')} days left [{p['urgency'].upper()}]"
                for p in urgent
            ]
            context_parts.append("\n**Urgent stock status:**\n" + "\n".join(pred_lines))
    if recommendations:
        rec_lines = [f"- {r['product_name']}: {r.get('reasoning', '')}" for r in recommendations[:3]]
        context_parts.append("\n**Top recommendations:**\n" + "\n".join(rec_lines))
    if recent_orders:
        order_lines = [
            f"- {o['date']}: {o['product_name']} {o['quantity']} {o['unit']} @ ${o.get('unit_price', 0):.2f}"
            for o in recent_orders[:8]
        ]
        context_parts.append("\n**Recent orders:**\n" + "\n".join(order_lines))
    return "\n".join(context_parts)


def _build_messages(message: str, conversation_history: list) -> list[dict]:
    messages = []
    for h in conversation_history[-10:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})
    return messages


def _call_anthropic(system: str, messages: list[dict], model: str, max_tokens: int) -> str:
    client = _get_anthropic()
    if not client:
        raise RuntimeError("Anthropic client unavailable")
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    )
    return response.content[0].text


def _call_openai_compatible(client, system: str, messages: list[dict], model: str, max_tokens: int) -> str:
    openai_messages = [{"role": "system", "content": system}]
    openai_messages.extend(messages)
    response = client.chat.completions.create(
        model=model,
        messages=openai_messages,
        max_tokens=max_tokens,
    )
    choice = response.choices[0].message
    text = getattr(choice, "content", None) or ""
    return text if isinstance(text, str) else ""


def _call_openai(system: str, messages: list[dict], model: str, max_tokens: int) -> str:
    client = _get_openai()
    if not client:
        raise RuntimeError("OpenAI client unavailable")
    return _call_openai_compatible(client, system, messages, model, max_tokens)


def _call_minimax(system: str, messages: list[dict], model: str, max_tokens: int) -> str:
    client = _get_minimax()
    if not client:
        raise RuntimeError("MiniMax client unavailable")
    return _call_openai_compatible(client, system, messages, model, max_tokens)


def _call_gemini(system: str, messages: list[dict], model: str, max_tokens: int) -> str:
    if genai is None:
        raise RuntimeError("google-generativeai not installed")
    key = _gemini_api_key()
    if not key:
        raise RuntimeError("No Gemini API key")
    genai.configure(api_key=key)
    gen_model = genai.GenerativeModel(model_name=model, system_instruction=system)
    history = []
    for m in messages[:-1]:
        role = "user" if m["role"] == "user" else "model"
        history.append({"role": role, "parts": [m["content"]]})
    chat = gen_model.start_chat(history=history)
    last = messages[-1]["content"] if messages else ""
    resp = chat.send_message(last, generation_config={"max_output_tokens": max_tokens})
    return (resp.text or "").strip()


def _invoke_llm(provider: str, system: str, messages: list[dict]) -> str:
    model = _model_for(provider)
    max_tokens = _max_output_tokens()
    if provider == "anthropic":
        return _call_anthropic(system, messages, model, max_tokens)
    if provider == "openai":
        return _call_openai(system, messages, model, max_tokens)
    if provider == "gemini":
        return _call_gemini(system, messages, model, max_tokens)
    if provider == "minimax":
        return _call_minimax(system, messages, model, max_tokens)
    raise ValueError(f"Unknown AI provider: {provider}")


def generate_response(
    message: str,
    farm_profile: dict,
    recent_orders: list,
    predictions: list,
    recommendations: list,
    conversation_history: list,
) -> str:
    """Generate a response using the configured LLM provider with full farm context."""
    provider = _resolve_provider()
    if provider is None:
        return _fallback_response(message, farm_profile, predictions, recommendations)

    farm_context = _build_farm_context(farm_profile, recent_orders, predictions, recommendations)
    system = SYSTEM_PROMPT + f"\n\n---\n**Current farm context:**\n{farm_context}"
    messages = _build_messages(message, conversation_history)

    try:
        return _invoke_llm(provider, system, messages)
    except Exception as e:
        print(f"[LLM provider={provider}] API error: {e}")
        return _fallback_response(message, farm_profile, predictions, recommendations)


def _fallback_response(message: str, farm_profile: dict, predictions: list, recommendations: list) -> str:
    """Local fallback when no API key or the LLM call fails."""
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


async def chat_with_ai(message: str, farm_context: dict, conversation_history: list) -> str:
    """Async wrapper for chat.py compatibility — maps farm_context dict to generate_response args."""
    return generate_response(
        message=message,
        farm_profile=farm_context.get("farm", {}),
        recent_orders=farm_context.get("recent_orders", []),
        predictions=farm_context.get("predictions", []),
        recommendations=farm_context.get("recommendations", []),
        conversation_history=conversation_history,
    )
