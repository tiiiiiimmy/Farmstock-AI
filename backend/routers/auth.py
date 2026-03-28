"""
Auth endpoints: register, login, me.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends

from backend.database import get_db_connection, seed_demo_farm
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
        seed_demo_farm(conn, farm_id, user_id)

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


@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    """
    Stateless logout — JWT cannot be server-side invalidated without a blacklist,
    so this endpoint signals intent and lets the client clear its token.
    """
    return {"detail": "Logged out"}


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
