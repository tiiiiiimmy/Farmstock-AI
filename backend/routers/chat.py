"""
AI chat endpoint: routes farmer messages to Claude with full farm context.
"""
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models import ChatMessage
from ..ai.engine import chat_with_claude
from ..ai.predictor import get_all_predictions
from ..ai.recommender import get_recommendations

router = APIRouter()


@router.post("/chat")
async def chat(msg: ChatMessage):
    """
    Send a message to the FarmStock AI assistant.

    Fetches farm context (profile, recent orders, predictions, recommendations)
    and forwards everything to Claude to generate a contextual response.
    """
    conn = get_db()
    try:
        farm_row = conn.execute(
            "SELECT * FROM farms WHERE id = ?", (msg.farm_id,)
        ).fetchone()
        if not farm_row:
            raise HTTPException(status_code=404, detail="Farm not found")
        farm = dict(farm_row)

        order_rows = conn.execute(
            "SELECT * FROM orders WHERE farm_id = ? ORDER BY date DESC LIMIT 50",
            (msg.farm_id,),
        ).fetchall()
        all_orders_rows = conn.execute(
            "SELECT * FROM orders WHERE farm_id = ? ORDER BY date",
            (msg.farm_id,),
        ).fetchall()
        recent_orders = [dict(r) for r in order_rows]
        all_orders = [dict(r) for r in all_orders_rows]

        product_rows = conn.execute("SELECT * FROM products").fetchall()
        products = [dict(r) for r in product_rows]
    finally:
        conn.close()

    predictions = get_all_predictions(all_orders)
    recommendations = get_recommendations(farm, all_orders, predictions, products)

    farm_context = {
        "farm": farm,
        "recent_orders": recent_orders,
        "predictions": predictions,
        "recommendations": recommendations,
    }

    response_text = await chat_with_claude(
        message=msg.message,
        farm_context=farm_context,
        conversation_history=msg.conversation_history or [],
    )

    return {
        "response": response_text,
        "farm_id": msg.farm_id,
    }
