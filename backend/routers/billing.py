"""
Billing endpoints: subscription status, Stripe checkout, webhook handler.
"""
import os
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from backend.auth import get_current_user
from backend.database import get_db_connection
from backend import billing as billing_lib

router = APIRouter(prefix="/api/billing", tags=["billing"])


class CheckoutRequest(BaseModel):
    plan: str  # "monthly" | "annual"


@router.get("/status")
def get_subscription_status(current_user: dict = Depends(get_current_user)):
    """Return current user's subscription status and trial information."""
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT subscription_status, trial_ends_at, stripe_subscription_id FROM users WHERE id = ?",
            (current_user["sub"],),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        trial_ends = datetime.fromisoformat(row["trial_ends_at"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        days_left = max(0, (trial_ends - now).days)

        status = row["subscription_status"]
        # Auto-expire trial if the date has passed
        if status == "trialing" and now > trial_ends:
            status = "expired"
            conn.execute(
                "UPDATE users SET subscription_status = 'expired' WHERE id = ?",
                (current_user["sub"],),
            )
            conn.commit()

        return {
            "status": status,
            "trial_ends_at": row["trial_ends_at"],
            "trial_days_left": days_left,
            "has_subscription": bool(row["stripe_subscription_id"]),
            "monthly_price_nzd": 49,
            "annual_price_nzd": 490,
        }
    finally:
        conn.close()


@router.post("/checkout")
def create_checkout(
    body: CheckoutRequest, current_user: dict = Depends(get_current_user)
):
    """Create a Stripe Checkout session and return the redirect URL."""
    if not os.getenv("STRIPE_SECRET_KEY"):
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT email, full_name FROM users WHERE id = ?", (current_user["sub"],)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        try:
            url = billing_lib.create_checkout_session(
                current_user["sub"], row["email"], row["full_name"] or "", body.plan
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        return {"checkout_url": url}
    finally:
        conn.close()


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Receive and process Stripe webhook events."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    event_type = billing_lib.handle_webhook(payload, sig)
    if event_type is None:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    return {"received": event_type}
