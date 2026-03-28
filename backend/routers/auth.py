"""
Auth endpoints: register, login, me.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends

from backend.database import get_db_connection
from backend.auth import hash_password, verify_password, create_access_token, get_current_user
from backend.models import UserCreate, UserLogin, TokenResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

TRIAL_DAYS = 14


def _make_user_out(row) -> UserOut:
    return UserOut(
        id=row["id"],
        email=row["email"],
        full_name=row["full_name"],
        subscription_status=row["subscription_status"],
        trial_ends_at=row["trial_ends_at"],
        created_at=row["created_at"],
    )


def _seed_demo_orders(conn, farm_id: str):
    """Seed 6 months of demo purchase history so AI has data immediately."""
    import random
    from datetime import date
    today = date.today()

    demo_products = [
        ("Ivomec Plus Drench 2.5L", "veterinary", 2, "units", 89.50, 45),
        ("Dairy Pellets 20kg", "feed", 50, "units", 18.50, 14),
        ("Superphosphate", "fertiliser", 5, "tonnes", 395.00, 90),
        ("Palm Kernel Extract", "feed", 2, "tonnes", 320.00, 30),
        ("Zinc Oxide Supplement", "veterinary", 10, "units", 24.00, 60),
        ("Ryegrass Seed 20kg", "fertiliser", 20, "units", 45.00, 180),
    ]

    for product_name, category, qty, unit, unit_price, freq in demo_products:
        num_orders = max(1, 180 // freq)
        for i in range(num_orders):
            days_ago = i * freq + random.randint(-5, 5)
            if days_ago < 0:
                days_ago = 0
            order_date = (today - timedelta(days=days_ago)).isoformat()
            variation = random.uniform(0.9, 1.1)
            order_qty = round(qty * variation, 1)
            order_price = round(unit_price * variation, 2)
            conn.execute(
                """INSERT INTO orders (id, farm_id, date, product_name, category,
                   quantity, unit, unit_price, total_price, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
                (str(uuid.uuid4()), farm_id, order_date, product_name, category,
                 order_qty, unit, order_price, round(order_qty * order_price, 2))
            )
    conn.commit()


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: UserCreate):
    conn = get_db_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?", (body.email.lower(),)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")

        user_id = str(uuid.uuid4())
        farm_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        trial_ends = (datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)).isoformat()

        conn.execute(
            """INSERT INTO users (id, email, hashed_password, full_name, trial_ends_at,
               subscription_status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'trialing', ?, ?)""",
            (user_id, body.email.lower(), hash_password(body.password),
             body.full_name, trial_ends, now, now),
        )

        conn.execute(
            """INSERT INTO farms (id, user_id, name, region, farm_type, herd_size,
               land_area_ha, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (farm_id, user_id, f"{body.full_name}'s Farm",
             "Canterbury", "dairy", 500, 200.0, now, now),
        )
        conn.commit()

        # Seed demo purchase history so AI has data immediately
        _seed_demo_orders(conn, farm_id)

        user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        token = create_access_token({"sub": user_id, "email": body.email.lower()})
        return TokenResponse(access_token=token, user=_make_user_out(user_row))
    finally:
        conn.close()


@router.post("/login", response_model=TokenResponse)
def login(body: UserLogin):
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?", (body.email.lower(),)
        ).fetchone()
        if not row or not verify_password(body.password, row["hashed_password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_access_token({"sub": row["id"], "email": row["email"]})
        return TokenResponse(access_token=token, user=_make_user_out(row))
    finally:
        conn.close()


@router.get("/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT * FROM users WHERE id = ?", (current_user["sub"],)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return _make_user_out(row)
    finally:
        conn.close()
