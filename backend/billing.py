"""
Stripe SDK wrapper for subscription billing.
"""
import os
import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

PRICE_IDS = {
    "monthly": os.getenv("STRIPE_MONTHLY_PRICE_ID"),
    "annual": os.getenv("STRIPE_ANNUAL_PRICE_ID"),
}
APP_URL = os.getenv("APP_URL", "http://localhost:5173")


def get_or_create_customer(user_id: str, email: str, name: str) -> str:
    """Returns Stripe customer_id, creating one if it doesn't exist yet."""
    from backend.database import get_db_connection
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT stripe_customer_id FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        if row and row["stripe_customer_id"]:
            return row["stripe_customer_id"]
        customer = stripe.Customer.create(
            email=email, name=name, metadata={"user_id": user_id}
        )
        conn.execute(
            "UPDATE users SET stripe_customer_id = ? WHERE id = ?",
            (customer.id, user_id)
        )
        conn.commit()
        return customer.id
    finally:
        conn.close()


def create_checkout_session(user_id: str, email: str, name: str, plan: str) -> str:
    """Creates a Stripe Checkout session and returns the redirect URL."""
    price_id = PRICE_IDS.get(plan)
    if not price_id:
        raise ValueError(f"Unknown plan: {plan}")
    customer_id = get_or_create_customer(user_id, email, name)
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{APP_URL}/?subscribed=true",
        cancel_url=f"{APP_URL}/pricing",
        metadata={"user_id": user_id},
    )
    return session.url


def handle_webhook(payload: bytes, sig_header: str):
    """
    Process a Stripe webhook event and update subscription status in DB.
    Returns the event type string on success, None if signature is invalid.
    """
    from backend.database import get_db_connection
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
    except (stripe.error.SignatureVerificationError, ValueError):
        return None

    conn = get_db_connection()
    try:
        if event.type in (
            "customer.subscription.created",
            "customer.subscription.updated",
        ):
            sub = event.data.object
            status = "active" if sub.status in ("active", "trialing") else "cancelled"
            conn.execute(
                """UPDATE users SET stripe_subscription_id = ?, subscription_status = ?,
                   updated_at = datetime('now') WHERE stripe_customer_id = ?""",
                (sub.id, status, sub.customer),
            )
            conn.commit()
        elif event.type == "customer.subscription.deleted":
            sub = event.data.object
            conn.execute(
                """UPDATE users SET subscription_status = 'cancelled',
                   updated_at = datetime('now') WHERE stripe_customer_id = ?""",
                (sub.customer,),
            )
            conn.commit()
        return event.type
    finally:
        conn.close()
