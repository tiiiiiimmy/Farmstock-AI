import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production-use-random-32-chars")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 7 days

bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """FastAPI dependency — validates Bearer token and returns decoded payload."""
    return decode_token(credentials.credentials)


def get_user_farm(current_user: dict = Depends(get_current_user)) -> dict:
    """FastAPI dependency — returns the authenticated user's primary farm."""
    from backend.database import get_db_connection
    conn = get_db_connection()
    try:
        farm = conn.execute(
            "SELECT * FROM farms WHERE user_id = ? ORDER BY created_at LIMIT 1",
            (current_user["sub"],)
        ).fetchone()
        if not farm:
            raise HTTPException(status_code=404, detail="No farm found for this user")
        return dict(farm)
    finally:
        conn.close()


def require_active_subscription(current_user: dict = Depends(get_current_user)) -> dict:
    """
    FastAPI dependency — raises 402 if the user's trial has expired and
    they have no active subscription.
    """
    from backend.database import get_db_connection
    from datetime import datetime, timezone
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT subscription_status, trial_ends_at FROM users WHERE id = ?",
            (current_user["sub"],),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        status = row["subscription_status"]
        if status == "trialing":
            trial_ends = datetime.fromisoformat(row["trial_ends_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > trial_ends:
                raise HTTPException(
                    status_code=402,
                    detail="Free trial has expired. Please subscribe to continue.",
                    headers={"X-Subscribe-Url": "/pricing"},
                )
        elif status not in ("active",):
            raise HTTPException(
                status_code=402,
                detail="An active subscription is required.",
                headers={"X-Subscribe-Url": "/pricing"},
            )
        return current_user
    finally:
        conn.close()
