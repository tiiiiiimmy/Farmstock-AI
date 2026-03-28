# FarmStock AI 2.0 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform FarmStock AI from a single-farm hackathon prototype into a production-ready SaaS product with real user authentication, 14-day free trials, Stripe subscription billing, fully functional Telegram bot, and working email delivery.

**Architecture:** Six independent subsystems built on the existing FastAPI + React + SQLite foundation. Auth and multi-farm isolation are prerequisites for billing. Telegram bot, email alerts, and the pluggable LLM chat layer are independent improvements that can be shipped in any order after auth. Docker deployment is deferred to a separate deployment phase.

**Tech Stack:** FastAPI, SQLite, React 18 + Vite + Tailwind, python-jose (JWT), passlib[bcrypt], Stripe SDK, APScheduler, LLM APIs (Anthropic Claude, OpenAI, Google Gemini, MiniMax — selectable via env)

---

## Current State

The base MVP has:
- FastAPI backend with 9 routers, SQLite database, 180+ seeded orders
- React frontend (Dashboard, Orders, FarmProfile, Products, Insights)
- Pluggable LLM chat (`backend/ai/engine.py` — Anthropic, OpenAI, Gemini, MiniMax)
- Telegram webhook + polling support (commands exist but sender is untested)
- SMTP email sending on order placement (untested)
- **No auth** — hardcoded to `farm-001`
- **No payments** — no trial or billing

---

## File Map

### New files to create
- `backend/routers/auth.py` — Registration, login, profile endpoints
- `backend/auth.py` — JWT creation, decoding, dependency injection
- `backend/routers/billing.py` — Stripe checkout, webhooks, subscription status
- `backend/billing.py` — Stripe SDK wrapper functions
- `backend/scheduler.py` — APScheduler proactive alert job
- `frontend/src/pages/Login.jsx` — Login form
- `frontend/src/pages/Register.jsx` — Registration form
- `frontend/src/pages/Pricing.jsx` — Subscription plans + trial CTA
- `frontend/src/context/AuthContext.jsx` — JWT token management
- `frontend/src/components/ProtectedRoute.jsx` — Guard for auth-required routes
- ~~`Dockerfile.backend`~~ — _延后到部署阶段_
- ~~`Dockerfile.frontend`~~ — _延后到部署阶段_
- ~~`docker-compose.yml`~~ — _延后到部署阶段_
- ~~`nginx.conf`~~ — _延后到部署阶段_

### Files to modify
- `backend/database.py` — Add `users` table + `user_id` FK on `farms`, `trial_ends_at`, `stripe_*` columns; migration-safe
- `backend/main.py` — Register auth + billing routers; mount scheduler on startup
- `backend/models.py` — Add `UserCreate`, `UserLogin`, `UserOut`, `SubscriptionStatus` models
- `backend/ai/engine.py` — Pluggable LLM providers (anthropic / openai / gemini / minimax SDKs)
- `backend/mailer/order_email.py` — Add `send_alert_email()` for proactive notifications
- `backend/telegram/sender.py` — Fix actual Telegram Bot API sending
- `backend/telegram/webhook.py` — Link Telegram chat_id to farm via users table; add `/link` command
- `backend/routers/farms.py` — Filter by authenticated user's farms only
- `backend/routers/orders.py` — Guard all queries with farm ownership check
- `backend/routers/predictions.py` — Guard with farm ownership
- `backend/routers/recommendations.py` — Guard with farm ownership
- `backend/routers/alerts.py` — Guard with farm ownership
- `backend/routers/spending.py` — Guard with farm ownership
- `backend/routers/place_order.py` — Guard with farm ownership
- `backend/routers/chat.py` — Guard with farm ownership
- `frontend/src/App.jsx` — Add auth routes, wrap with AuthProvider + ProtectedRoute
- `frontend/src/api/client.js` — Add JWT header injection, auth API calls
- `frontend/src/pages/FarmProfile.jsx` — Show subscription status, trial countdown
- `requirements.txt` — Add python-jose, passlib[bcrypt], stripe, apscheduler

---

## Subsystem 1: User Authentication & Multi-Farm

### Task 1: Install auth dependencies

**Files:**
- Modify: `requirements.txt`

- [ ] **Step 1: Add auth packages to requirements.txt**

Open `requirements.txt` and append:
```
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
stripe==11.4.0
apscheduler==3.10.4
```

- [ ] **Step 2: Install in environment**

```bash
cd /var/www/Farmstock-AI
pip install python-jose[cryptography] passlib[bcrypt] stripe apscheduler
```

Expected: No errors. All packages install successfully.

- [ ] **Step 3: Commit**

```bash
git add requirements.txt
git commit -m "chore: add auth, stripe, scheduler dependencies"
```

---

### Task 2: Database schema migration — users table

**Files:**
- Modify: `backend/database.py`

- [ ] **Step 1: Write a test that verifies users table and foreign key exist**

Create `backend/tests/test_database.py`:
```python
import sqlite3, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

def get_test_db():
    os.environ['DATABASE_PATH'] = ':memory:'
    from backend.database import init_db
    conn = sqlite3.connect(':memory:')
    conn.row_factory = sqlite3.Row
    init_db(conn)
    return conn

def test_users_table_exists():
    conn = get_test_db()
    tables = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()
    names = [r['name'] for r in tables]
    assert 'users' in names

def test_users_table_columns():
    conn = get_test_db()
    cols = conn.execute("PRAGMA table_info(users)").fetchall()
    names = [c['name'] for c in cols]
    assert 'id' in names
    assert 'email' in names
    assert 'hashed_password' in names
    assert 'trial_ends_at' in names
    assert 'stripe_customer_id' in names
    assert 'stripe_subscription_id' in names
    assert 'subscription_status' in names  # active | trialing | expired | cancelled

def test_farms_has_user_id_column():
    conn = get_test_db()
    cols = conn.execute("PRAGMA table_info(farms)").fetchall()
    names = [c['name'] for c in cols]
    assert 'user_id' in names
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd /var/www/Farmstock-AI
python -m pytest backend/tests/test_database.py -v
```

Expected: FAIL — `users` table doesn't exist yet.

- [ ] **Step 3: Add users table and user_id FK to farms in database.py**

In `backend/database.py`, find the `CREATE TABLE IF NOT EXISTS farms` statement. Before it, insert:

```python
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            full_name TEXT,
            trial_ends_at TEXT NOT NULL,
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            subscription_status TEXT NOT NULL DEFAULT 'trialing',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
```

Then add `user_id` column to farms — since the table may already exist in production, use ALTER TABLE with a guard. Replace the farms CREATE TABLE with:

```python
    conn.execute("""
        CREATE TABLE IF NOT EXISTS farms (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            region TEXT,
            farm_type TEXT,
            herd_size INTEGER,
            land_area_ha REAL,
            whatsapp_number TEXT,
            email TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    # Migration: add user_id if upgrading from v1
    existing_cols = [r[1] for r in conn.execute("PRAGMA table_info(farms)").fetchall()]
    if 'user_id' not in existing_cols:
        conn.execute("ALTER TABLE farms ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE")
```

Also add `telegram_chat_id` to the users table for bot linking. Replace the users CREATE TABLE with:

```python
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            full_name TEXT,
            telegram_chat_id TEXT,
            trial_ends_at TEXT NOT NULL,
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            subscription_status TEXT NOT NULL DEFAULT 'trialing',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
```

- [ ] **Step 4: Update init_db signature to accept optional connection (for tests)**

In `backend/database.py`, find the `init_db()` function. Make it accept an optional `conn` parameter:

```python
def init_db(conn=None):
    """Initialize database schema. Pass conn for testing with in-memory DB."""
    close = False
    if conn is None:
        conn = get_db_connection()
        close = True
    # ... rest of init_db using the conn ...
    if close:
        conn.close()
```

- [ ] **Step 5: Run test — verify it passes**

```bash
python -m pytest backend/tests/test_database.py -v
```

Expected: PASS — all 3 tests green.

- [ ] **Step 6: Commit**

```bash
git add backend/database.py backend/tests/test_database.py
git commit -m "feat: add users table with trial/subscription columns, user_id FK on farms"
```

---

### Task 3: JWT auth module

**Files:**
- Create: `backend/auth.py`

- [ ] **Step 1: Write tests for auth module**

Create `backend/tests/test_auth.py`:
```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.auth import create_access_token, decode_token, hash_password, verify_password

def test_password_hash_and_verify():
    hashed = hash_password("hunter2")
    assert verify_password("hunter2", hashed)
    assert not verify_password("wrong", hashed)

def test_create_and_decode_token():
    token = create_access_token({"sub": "user-123", "email": "a@b.com"})
    payload = decode_token(token)
    assert payload["sub"] == "user-123"
    assert payload["email"] == "a@b.com"

def test_expired_token_raises():
    from backend.auth import create_access_token, decode_token
    from datetime import timedelta
    token = create_access_token({"sub": "x"}, expires_delta=timedelta(seconds=-1))
    try:
        decode_token(token)
        assert False, "Should have raised"
    except Exception:
        pass
```

- [ ] **Step 2: Run test — verify it fails**

```bash
python -m pytest backend/tests/test_auth.py -v
```

Expected: FAIL — `backend.auth` module doesn't exist.

- [ ] **Step 3: Create backend/auth.py**

```python
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production-use-random-32-chars")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


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


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    """FastAPI dependency — returns decoded JWT payload."""
    return decode_token(credentials.credentials)
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
python -m pytest backend/tests/test_auth.py -v
```

Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/auth.py backend/tests/test_auth.py
git commit -m "feat: JWT auth module with bcrypt password hashing"
```

---

### Task 4: Auth API endpoints (register, login, me)

**Files:**
- Create: `backend/routers/auth.py`
- Modify: `backend/models.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Add user Pydantic models to models.py**

At the end of `backend/models.py` append:

```python
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    subscription_status: str
    trial_ends_at: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
```

Also add `from pydantic import EmailStr` to the imports at the top of models.py.

- [ ] **Step 2: Create backend/routers/auth.py**

```python
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from backend.database import get_db_connection
from backend.auth import hash_password, verify_password, create_access_token, get_current_user
from backend.models import UserCreate, UserLogin, TokenResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

TRIAL_DAYS = 14


def _make_user_out(row: dict) -> UserOut:
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
        now = datetime.now(timezone.utc).isoformat()
        trial_ends = (datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)).isoformat()

        conn.execute(
            """INSERT INTO users (id, email, hashed_password, full_name, trial_ends_at,
               subscription_status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'trialing', ?, ?)""",
            (user_id, body.email.lower(), hash_password(body.password),
             body.full_name, trial_ends, now, now),
        )

        # Create a default farm for the new user
        farm_id = str(uuid.uuid4())
        conn.execute(
            """INSERT INTO farms (id, user_id, name, region, farm_type, herd_size,
               land_area_ha, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (farm_id, user_id, f"{body.full_name}'s Farm",
             "Canterbury", "dairy", 500, 200.0, now, now),
        )
        conn.commit()

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
```

- [ ] **Step 3: Register auth router in main.py**

In `backend/main.py`, add after existing router imports:

```python
from backend.routers.auth import router as auth_router
```

And after the existing `app.include_router(...)` calls:

```python
app.include_router(auth_router)
```

- [ ] **Step 4: Start the server and manually test register**

```bash
cd /var/www/Farmstock-AI
uvicorn backend.main:app --reload --port 8000 &
sleep 2
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@test.com","password":"testpass123","full_name":"John Smith"}' | python3 -m json.tool
```

Expected: JSON with `access_token` and `user` object with `subscription_status: "trialing"`.

- [ ] **Step 5: Test login**

```bash
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@test.com","password":"testpass123"}' | python3 -m json.tool
```

Expected: JSON with `access_token`.

- [ ] **Step 6: Kill the test server and commit**

```bash
pkill -f "uvicorn backend.main" 2>/dev/null || true
git add backend/routers/auth.py backend/models.py backend/main.py
git commit -m "feat: user registration and login endpoints with JWT tokens"
```

---

### Task 5: Protect existing API routes with auth dependency

**Files:**
- Modify: `backend/routers/farms.py`
- Modify: `backend/routers/orders.py`
- Modify: `backend/routers/predictions.py`
- Modify: `backend/routers/recommendations.py`
- Modify: `backend/routers/alerts.py`
- Modify: `backend/routers/spending.py`
- Modify: `backend/routers/place_order.py`
- Modify: `backend/routers/chat.py`

**Strategy:** Replace hardcoded `farm_id` lookups with a dependency that resolves the authenticated user's farm. All routers get a `get_user_farm()` dependency that returns the farm owned by the current user.

- [ ] **Step 1: Add get_user_farm dependency helper in auth.py**

Append to `backend/auth.py`:

```python
from backend.database import get_db_connection

def get_user_farm(current_user: dict = Depends(get_current_user)) -> dict:
    """Returns the authenticated user's primary farm. Raises 404 if none."""
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
```

- [ ] **Step 2: Update farms.py to use auth**

In `backend/routers/farms.py`, replace the existing import block and route decorators:

```python
from fastapi import APIRouter, HTTPException, Depends
from backend.database import get_db_connection
from backend.models import FarmUpdate, SupplierCreate, SupplierUpdate
from backend.auth import get_user_farm, get_current_user

router = APIRouter(prefix="/api", tags=["farms"])

@router.get("/farm/{farm_id}")
def get_farm(farm_id: str, farm: dict = Depends(get_user_farm)):
    if farm["id"] != farm_id:
        raise HTTPException(status_code=403, detail="Access denied")
    conn = get_db_connection()
    try:
        row = conn.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
        suppliers = conn.execute(
            "SELECT * FROM suppliers WHERE farm_id = ?", (farm_id,)
        ).fetchall()
        result = dict(row)
        result["suppliers"] = [dict(s) for s in suppliers]
        return result
    finally:
        conn.close()

@router.put("/farm/{farm_id}")
def update_farm(farm_id: str, body: FarmUpdate, farm: dict = Depends(get_user_farm)):
    if farm["id"] != farm_id:
        raise HTTPException(status_code=403, detail="Access denied")
    # ... keep the rest of the existing update logic unchanged ...
```

Repeat the same pattern for all other farms.py endpoints — add `farm: dict = Depends(get_user_farm)` to each endpoint and check `farm["id"] != farm_id`.

- [ ] **Step 3: Update orders.py to use auth**

In `backend/routers/orders.py`, add dependency to GET/POST/PUT/DELETE:

```python
from backend.auth import get_user_farm

@router.get("/orders")
def get_orders(farm_id: str = None, ..., farm: dict = Depends(get_user_farm)):
    # Use farm["id"] instead of farm_id parameter
    actual_farm_id = farm["id"]
    # ... rest of query unchanged, but replace farm_id with actual_farm_id ...
```

For POST /orders, validate that the order's farm_id matches the user's farm:
```python
@router.post("/orders", status_code=201)
def create_order(body: OrderCreate, farm: dict = Depends(get_user_farm)):
    if body.farm_id and body.farm_id != farm["id"]:
        raise HTTPException(status_code=403, detail="Cannot create order for another farm")
    # ... proceed with farm["id"] ...
```

- [ ] **Step 4: Update remaining routers (predictions, recommendations, alerts, spending, place_order, chat)**

Each router follows the same pattern. Add to their imports:
```python
from backend.auth import get_user_farm
```

Add `farm: dict = Depends(get_user_farm)` to each endpoint function signature, and use `farm["id"]` instead of the query-param `farm_id`.

For example in `predictions.py`:
```python
@router.get("/predictions")
def get_predictions(farm: dict = Depends(get_user_farm)):
    farm_id = farm["id"]
    # ... rest unchanged ...
```

- [ ] **Step 5: Add a `/api/farms` endpoint to list user's farms (for future multi-farm)**

Append to `backend/routers/farms.py`:

```python
@router.get("/farms")
def list_farms(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        rows = conn.execute(
            "SELECT f.*, (SELECT COUNT(*) FROM orders WHERE farm_id = f.id) as order_count "
            "FROM farms f WHERE f.user_id = ?",
            (current_user["sub"],)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
```

- [ ] **Step 6: Start server and test protected endpoints**

```bash
uvicorn backend.main:app --reload --port 8000 &
sleep 2
# Should return 403 without token
curl -s http://localhost:8000/api/predictions | python3 -m json.tool
# Get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@test.com","password":"testpass123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
# Should work with token
curl -s http://localhost:8000/api/predictions \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
pkill -f "uvicorn backend.main" 2>/dev/null || true
```

Expected: First call returns 401/403. Second call returns predictions JSON.

- [ ] **Step 7: Commit**

```bash
git add backend/routers/ backend/auth.py
git commit -m "feat: protect all API routes with JWT authentication"
```

---

### Task 6: React auth context and login/register pages

**Files:**
- Create: `frontend/src/context/AuthContext.jsx`
- Create: `frontend/src/pages/Login.jsx`
- Create: `frontend/src/pages/Register.jsx`
- Create: `frontend/src/components/ProtectedRoute.jsx`
- Modify: `frontend/src/api/client.js`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create AuthContext**

Create `frontend/src/context/AuthContext.jsx`:

```jsx
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('farmstock_token'))
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('farmstock_user')
    return u ? JSON.parse(u) : null
  })

  const login = (tokenValue, userData) => {
    localStorage.setItem('farmstock_token', tokenValue)
    localStorage.setItem('farmstock_user', JSON.stringify(userData))
    setToken(tokenValue)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('farmstock_token')
    localStorage.removeItem('farmstock_user')
    setToken(null)
    setUser(null)
  }

  const isTrialing = user?.subscription_status === 'trialing'
  const isActive = user?.subscription_status === 'active' || isTrialing
  const trialDaysLeft = user?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(user.trial_ends_at) - new Date()) / 86400000))
    : 0

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isActive, isTrialing, trialDaysLeft }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

- [ ] **Step 2: Update API client to inject JWT**

In `frontend/src/api/client.js`, replace the `request` function to include auth:

```js
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('farmstock_token')
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('farmstock_token')
    localStorage.removeItem('farmstock_user')
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.status === 204 ? null : res.json()
}

// Auth endpoints
export const authApi = {
  register: (data) => request('POST', '/api/auth/register', data),
  login: (data) => request('POST', '/api/auth/login', data),
  me: () => request('GET', '/api/auth/me'),
}

// Keep all existing exports (getFarm, updateFarm, getOrders, etc.) but remove hardcoded farm_id
export const getFarms = () => request('GET', '/api/farms')
export const getFarm = (farmId) => request('GET', `/api/farm/${farmId}`)
export const updateFarm = (farmId, data) => request('PUT', `/api/farm/${farmId}`, data)
export const getOrders = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return request('GET', `/api/orders${q ? '?' + q : ''}`)
}
export const createOrder = (data) => request('POST', '/api/orders', data)
export const updateOrder = (id, data) => request('PUT', `/api/orders/${id}`, data)
export const deleteOrder = (id) => request('DELETE', `/api/orders/${id}`)
export const getProducts = (category = null) =>
  request('GET', `/api/products${category ? '?category=' + category : ''}`)
export const getPredictions = () => request('GET', '/api/predictions')
export const getRecommendations = () => request('GET', '/api/recommendations')
export const getAlerts = (status = null) =>
  request('GET', `/api/alerts${status ? '?status=' + status : ''}`)
export const updateAlert = (id, data) => request('PUT', `/api/alerts/${id}`, data)
export const getSpending = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return request('GET', `/api/spending${q ? '?' + q : ''}`)
}
export const placeOrder = (data) => request('POST', '/api/place-order', data)
export const sendChat = (data) => request('POST', '/api/chat', data)
export const getSubscriptionStatus = () => request('GET', '/api/billing/status')
export const createCheckoutSession = (plan) =>
  request('POST', '/api/billing/checkout', { plan })
```

- [ ] **Step 3: Create Login page**

Create `frontend/src/pages/Login.jsx`:

```jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login({ email, password })
      login(data.access_token, data.user)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-green-800 mb-2">FarmStock AI</h1>
        <p className="text-gray-500 mb-6">Sign in to your account</p>
        {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-green-700 text-white py-2 rounded-lg font-medium hover:bg-green-800 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-green-700 font-medium hover:underline">
            Start free 14-day trial
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create Register page**

Create `frontend/src/pages/Register.jsx`:

```jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError('')
    setLoading(true)
    try {
      const data = await authApi.register(form)
      login(data.access_token, data.user)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-green-800 mb-2">Start Your Free Trial</h1>
        <p className="text-gray-500 mb-6">14 days free — no credit card required</p>
        {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input type="text" value={form.full_name} onChange={set('full_name')} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={set('email')} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={form.password} onChange={set('password')} required minLength={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-green-700 text-white py-2 rounded-lg font-medium hover:bg-green-800 disabled:opacity-50">
            {loading ? 'Creating account...' : 'Start free trial'}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-green-700 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create ProtectedRoute component**

Create `frontend/src/components/ProtectedRoute.jsx`:

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}
```

- [ ] **Step 6: Update App.jsx to use AuthProvider and protected routes**

In `frontend/src/App.jsx`, wrap the app with `AuthProvider` and add login/register routes:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import FarmProfile from './pages/FarmProfile'
import Products from './pages/Products'
import Insights from './pages/Insights'
import Login from './pages/Login'
import Register from './pages/Register'
import Pricing from './pages/Pricing'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/profile" element={<FarmProfile />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/insights" element={<Insights />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 7: Add trial countdown banner to Layout.jsx**

In `frontend/src/components/Layout.jsx`, import `useAuth` and add a banner above the main content:

```jsx
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

// Inside the Layout component, before the main content area:
const { user, isTrialing, trialDaysLeft, logout } = useAuth()

// Add this above the main content:
{isTrialing && trialDaysLeft <= 7 && (
  <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center justify-between">
    <span>
      ⏳ Your free trial ends in <strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</strong>.
    </span>
    <Link to="/pricing" className="text-green-700 font-medium hover:underline ml-4">
      Upgrade now →
    </Link>
  </div>
)}
```

Also add a logout button in the sidebar/header:
```jsx
<button onClick={logout} className="text-sm text-gray-500 hover:text-red-600">
  Sign out
</button>
```

- [ ] **Step 8: Start frontend dev server and test auth flow**

```bash
cd /var/www/Farmstock-AI/frontend
npm run dev &
```

Open browser at `http://localhost:5173`. Verify:
- Redirected to `/login` immediately
- Register creates account and redirects to dashboard
- Trial banner shows when trialDaysLeft <= 7
- Logout clears session and redirects to login

- [ ] **Step 9: Commit**

```bash
git add frontend/src/
git commit -m "feat: React auth flow with login, register, protected routes, trial banner"
```

---

## Subsystem 2: Stripe Subscription & 14-Day Trial

### Task 7: Stripe backend billing endpoints

**Files:**
- Create: `backend/billing.py`
- Create: `backend/routers/billing.py`
- Modify: `backend/main.py`
- Modify: `.env.example`

- [ ] **Step 1: Add Stripe env vars to .env.example**

Append to `.env.example`:
```
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_ANNUAL_PRICE_ID=price_...
APP_URL=http://localhost:5173
```

Set these up in your actual `.env` file using real Stripe test keys from https://dashboard.stripe.com/test/apikeys.

- [ ] **Step 2: Create backend/billing.py**

```python
import os
import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

PRICE_IDS = {
    "monthly": os.getenv("STRIPE_MONTHLY_PRICE_ID"),
    "annual": os.getenv("STRIPE_ANNUAL_PRICE_ID"),
}
APP_URL = os.getenv("APP_URL", "http://localhost:5173")


def get_or_create_customer(user_id: str, email: str, name: str) -> str:
    """Returns Stripe customer_id. Creates if not exists."""
    from backend.database import get_db_connection
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT stripe_customer_id FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        if row and row["stripe_customer_id"]:
            return row["stripe_customer_id"]
        customer = stripe.Customer.create(email=email, name=name, metadata={"user_id": user_id})
        conn.execute(
            "UPDATE users SET stripe_customer_id = ? WHERE id = ?",
            (customer.id, user_id)
        )
        conn.commit()
        return customer.id
    finally:
        conn.close()


def create_checkout_session(user_id: str, email: str, name: str, plan: str) -> str:
    """Returns Stripe checkout URL."""
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
    """Process Stripe webhook events and update subscription status."""
    from backend.database import get_db_connection
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
    except (stripe.error.SignatureVerificationError, ValueError):
        return None

    conn = get_db_connection()
    try:
        if event.type in ("customer.subscription.created", "customer.subscription.updated"):
            sub = event.data.object
            status = "active" if sub.status in ("active", "trialing") else "cancelled"
            conn.execute(
                """UPDATE users SET stripe_subscription_id = ?, subscription_status = ?,
                   updated_at = datetime('now') WHERE stripe_customer_id = ?""",
                (sub.id, status, sub.customer)
            )
            conn.commit()
        elif event.type == "customer.subscription.deleted":
            sub = event.data.object
            conn.execute(
                """UPDATE users SET subscription_status = 'cancelled', updated_at = datetime('now')
                   WHERE stripe_customer_id = ?""",
                (sub.customer,)
            )
            conn.commit()
        return event.type
    finally:
        conn.close()
```

- [ ] **Step 3: Create backend/routers/billing.py**

```python
import os
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from backend.auth import get_current_user
from backend.database import get_db_connection
from backend import billing

router = APIRouter(prefix="/api/billing", tags=["billing"])


class CheckoutRequest(BaseModel):
    plan: str  # "monthly" | "annual"


@router.get("/status")
def get_subscription_status(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT subscription_status, trial_ends_at, stripe_subscription_id FROM users WHERE id = ?",
            (current_user["sub"],)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        from datetime import datetime, timezone
        trial_ends = datetime.fromisoformat(row["trial_ends_at"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        days_left = max(0, (trial_ends - now).days)

        # Auto-expire trial if needed
        status = row["subscription_status"]
        if status == "trialing" and now > trial_ends:
            status = "expired"
            conn.execute(
                "UPDATE users SET subscription_status = 'expired' WHERE id = ?",
                (current_user["sub"],)
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
def create_checkout(body: CheckoutRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT email, full_name FROM users WHERE id = ?", (current_user["sub"],)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        if not os.getenv("STRIPE_SECRET_KEY"):
            raise HTTPException(status_code=503, detail="Stripe not configured")
        url = billing.create_checkout_session(
            current_user["sub"], row["email"], row["full_name"] or "", body.plan
        )
        return {"checkout_url": url}
    finally:
        conn.close()


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    event_type = billing.handle_webhook(payload, sig)
    if event_type is None:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    return {"received": event_type}
```

- [ ] **Step 4: Register billing router in main.py**

```python
from backend.routers.billing import router as billing_router
app.include_router(billing_router)
```

- [ ] **Step 5: Add subscription guard middleware for expired accounts**

In `backend/auth.py`, add an `require_active_subscription` dependency:

```python
def require_active_subscription(current_user: dict = Depends(get_current_user)) -> dict:
    """Raises 402 if trial has expired and no active subscription."""
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT subscription_status, trial_ends_at FROM users WHERE id = ?",
            (current_user["sub"],)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        from datetime import datetime, timezone
        status = row["subscription_status"]
        if status == "trialing":
            trial_ends = datetime.fromisoformat(row["trial_ends_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > trial_ends:
                raise HTTPException(
                    status_code=402,
                    detail="Trial expired. Please subscribe to continue.",
                    headers={"X-Subscribe-Url": "/pricing"},
                )
        elif status not in ("active",):
            raise HTTPException(
                status_code=402,
                detail="Subscription required.",
                headers={"X-Subscribe-Url": "/pricing"},
            )
        return current_user
    finally:
        conn.close()
```

Apply `require_active_subscription` (instead of `get_current_user`) to data-sensitive endpoints like `/api/predictions`, `/api/recommendations`, `/api/place-order`.

- [ ] **Step 6: Commit**

```bash
git add backend/billing.py backend/routers/billing.py backend/main.py backend/auth.py .env.example
git commit -m "feat: Stripe subscription billing with checkout, webhooks, and trial expiry guard"
```

---

### Task 8: Pricing page (React)

**Files:**
- Create: `frontend/src/pages/Pricing.jsx`

- [ ] **Step 1: Create Pricing.jsx**

```jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createCheckoutSession } from '../api/client'
import { useAuth } from '../context/AuthContext'

const plans = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$49',
    period: '/month NZD',
    features: [
      'Unlimited inventory predictions',
      'AI chat assistant (Claude)',
      'Telegram bot alerts',
      'Email order sending',
      'Spending analytics',
      'One farm profile',
    ],
  },
  {
    id: 'annual',
    name: 'Annual',
    price: '$490',
    period: '/year NZD',
    badge: 'Save $98',
    features: [
      'Everything in Monthly',
      '2 months free',
      'Priority support',
    ],
  },
]

export default function Pricing() {
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')
  const { token, trialDaysLeft, isTrialing } = useAuth()
  const navigate = useNavigate()

  const handleSubscribe = async (planId) => {
    if (!token) { navigate('/register'); return }
    setLoading(planId)
    setError('')
    try {
      const { checkout_url } = await createCheckoutSession(planId)
      window.location.href = checkout_url
    } catch (err) {
      setError(err.message || 'Failed to start checkout')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-green-50 py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-green-900 mb-2">Simple, transparent pricing</h1>
        {isTrialing && (
          <p className="text-amber-700 mb-8">
            You have <strong>{trialDaysLeft} days</strong> left in your free trial.
          </p>
        )}
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-xl shadow p-8 text-left relative">
              {plan.badge && (
                <span className="absolute top-4 right-4 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
              <div className="mt-2 mb-4">
                <span className="text-4xl font-bold text-green-800">{plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id}
                className="w-full bg-green-700 text-white py-2 rounded-lg font-medium hover:bg-green-800 disabled:opacity-50"
              >
                {loading === plan.id ? 'Loading...' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>
        {token && (
          <p className="mt-6 text-sm text-gray-500">
            <Link to="/" className="text-green-700 hover:underline">← Back to dashboard</Link>
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add /pricing link to trial banner and Layout nav**

In `frontend/src/components/Layout.jsx`, add a "Upgrade" link in the sidebar:

```jsx
<Link to="/pricing" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-green-700 hover:bg-green-100">
  ⭐ Upgrade Plan
</Link>
```

- [ ] **Step 3: Handle 402 responses in API client**

In `frontend/src/api/client.js`, update the error handler in `request()`:

```js
if (res.status === 402) {
  window.location.href = '/pricing'
  throw new Error('Subscription required')
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Pricing.jsx frontend/src/components/Layout.jsx frontend/src/api/client.js
git commit -m "feat: pricing page with monthly/annual Stripe checkout plans"
```

---

## Subsystem 3: Telegram Bot — Full Functionality

### Task 9: Fix Telegram sender and implement bot commands

**Files:**
- Modify: `backend/telegram/sender.py`
- Modify: `backend/telegram/webhook.py`

- [ ] **Step 1: Read current telegram/sender.py**

Read `backend/telegram/sender.py` to understand current state before modifying.

- [ ] **Step 2: Rewrite telegram/sender.py with reliable sending**

Replace the contents of `backend/telegram/sender.py`:

```python
import os
import httpx

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_API_BASE = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


async def send_message(chat_id: str | int, text: str, parse_mode: str = "Markdown") -> bool:
    """Send a message via Telegram Bot API. Returns True on success."""
    if not TELEGRAM_BOT_TOKEN:
        print(f"[Telegram] No token configured. Would send to {chat_id}: {text[:80]}")
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{TELEGRAM_API_BASE}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
            )
            if not resp.is_success:
                print(f"[Telegram] Send failed: {resp.status_code} {resp.text}")
                return False
            return True
    except Exception as e:
        print(f"[Telegram] Exception sending message: {e}")
        return False


async def send_message_sync(chat_id: str | int, text: str) -> bool:
    """Synchronous wrapper for use in non-async contexts."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, send_message(chat_id, text))
                return future.result(timeout=15)
        else:
            return loop.run_until_complete(send_message(chat_id, text))
    except Exception as e:
        print(f"[Telegram] send_message_sync error: {e}")
        return False
```

- [ ] **Step 3: Enhance webhook.py to link Telegram users to farm accounts**

In `backend/telegram/webhook.py`, update the message handler to:
1. Look up farm by `telegram_chat_id` stored in the `users` table
2. Support a `/link <email> <password>` command to associate a Telegram chat with a farm

Read the current file first, then append this to the command processing logic:

```python
# In _process_message(), add before the existing command handling:
if normalized == "start" or normalized.startswith("link "):
    return await _handle_link_command(chat_id, text)

async def _handle_link_command(chat_id: int, text: str) -> str:
    """Link a Telegram chat to a FarmStock account."""
    parts = text.strip().split()
    # /link email password
    if len(parts) == 3 and parts[0].lower() in ("/link", "link"):
        email, password = parts[1], parts[2]
        from backend.database import get_db_connection
        from backend.auth import verify_password
        conn = get_db_connection()
        try:
            row = conn.execute(
                "SELECT id, hashed_password, full_name FROM users WHERE email = ?",
                (email.lower(),)
            ).fetchone()
            if not row or not verify_password(password, row["hashed_password"]):
                return "❌ Invalid email or password. Try again."
            conn.execute(
                "UPDATE users SET telegram_chat_id = ? WHERE id = ?",
                (str(chat_id), row["id"])
            )
            conn.commit()
            return f"✅ Linked! Welcome {row['full_name']}. Your farm data is now connected.\n\nTry: STOCK, SPEND, ALERTS, HELP"
        finally:
            conn.close()
    return "👋 Welcome to FarmStock AI!\n\nTo link your account, send:\n`/link your@email.com yourpassword`"
```

Also update the farm lookup in the existing webhook to use `telegram_chat_id`:

```python
def _get_farm_for_chat(chat_id: int) -> dict | None:
    """Look up farm by linked Telegram chat_id."""
    from backend.database import get_db_connection
    conn = get_db_connection()
    try:
        user = conn.execute(
            "SELECT id FROM users WHERE telegram_chat_id = ?", (str(chat_id),)
        ).fetchone()
        if not user:
            return None
        farm = conn.execute(
            "SELECT * FROM farms WHERE user_id = ? LIMIT 1", (user["id"],)
        ).fetchone()
        return dict(farm) if farm else None
    finally:
        conn.close()
```

- [ ] **Step 4: Implement richer Telegram responses with formatting**

In `backend/telegram/webhook.py`, update the `_process_message()` responses to use Telegram markdown:

Replace the STOCK command handler with:
```python
if normalized in ("stock", "predictions"):
    from backend.ai.predictor import ConsumptionPredictor
    predictor = ConsumptionPredictor()
    farm_id = farm["id"]
    from backend.database import get_db_connection
    conn = get_db_connection()
    try:
        orders = conn.execute(
            "SELECT * FROM orders WHERE farm_id = ? ORDER BY date DESC",
            (farm_id,)
        ).fetchall()
        predictions = predictor.predict([dict(o) for o in orders])
    finally:
        conn.close()
    urgent = [p for p in predictions if p.get("urgency") in ("red", "amber")]
    if not urgent:
        return "✅ *All stock levels healthy!* No reorders needed this week."
    lines = ["🌾 *Stock Status*\n"]
    for p in urgent[:5]:
        icon = "🔴" if p["urgency"] == "red" else "🟡"
        days = p.get("days_until_depletion", "?")
        lines.append(f"{icon} *{p['product_name']}* — {days} days left")
        lines.append(f"   Order by: {p.get('recommended_order_date', 'ASAP')}")
    lines.append("\nReply *ORDER* to place an order via the web app.")
    return "\n".join(lines)
```

- [ ] **Step 5: Test Telegram bot locally**

```bash
# Set TELEGRAM_BOT_TOKEN in .env, then run the poller
cd /var/www/Farmstock-AI
python -m backend.telegram.poller &
```

Send `/start` to your bot. Verify it responds. Then `/link email@test.com testpass123`. Verify link confirmation. Then `STOCK` — verify predictions response.

- [ ] **Step 6: Commit**

```bash
git add backend/telegram/
git commit -m "feat: Telegram bot with account linking, rich formatted responses, reliable sending"
```

---

### Task 10: Proactive Telegram alerts with APScheduler

**Files:**
- Create: `backend/scheduler.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Create backend/scheduler.py**

```python
"""
APScheduler jobs for proactive FarmStock alerts.
Runs as part of the FastAPI process.
"""
import asyncio
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()


async def _check_low_stock():
    """Daily job: check all linked farms for low stock and alert via Telegram."""
    from backend.database import get_db_connection
    from backend.ai.predictor import ConsumptionPredictor
    from backend.telegram.sender import send_message

    conn = get_db_connection()
    try:
        users = conn.execute(
            "SELECT id, telegram_chat_id FROM users WHERE telegram_chat_id IS NOT NULL"
        ).fetchall()
        predictor = ConsumptionPredictor()

        for user in users:
            farm = conn.execute(
                "SELECT * FROM farms WHERE user_id = ? LIMIT 1", (user["id"],)
            ).fetchone()
            if not farm:
                continue

            orders = conn.execute(
                "SELECT * FROM orders WHERE farm_id = ? ORDER BY date DESC",
                (farm["id"],)
            ).fetchall()
            predictions = predictor.predict([dict(o) for o in orders])
            red_items = [p for p in predictions if p.get("urgency") == "red"]

            if red_items:
                lines = ["🔴 *Urgent Stock Alert*\n"]
                for p in red_items[:3]:
                    lines.append(
                        f"• *{p['product_name']}* runs out in ~{p.get('days_until_depletion', '?')} days"
                    )
                lines.append("\nOpen FarmStock to place orders.")
                await send_message(user["telegram_chat_id"], "\n".join(lines))

                # Log alert to DB
                alert_id = __import__('uuid').uuid4().hex
                now = datetime.now(timezone.utc).isoformat()
                conn.execute(
                    """INSERT INTO alerts (id, farm_id, type, title, message, status, created_at)
                       VALUES (?, ?, 'low_stock', 'Daily Stock Alert', ?, 'sent', ?)""",
                    (alert_id, farm["id"],
                     f"{len(red_items)} product(s) critically low", now)
                )
        conn.commit()
    finally:
        conn.close()


async def _monthly_summary():
    """First of month: send spending summary to all linked users."""
    from backend.database import get_db_connection
    from backend.telegram.sender import send_message
    from datetime import date

    conn = get_db_connection()
    now = date.today()
    # Last month
    if now.month == 1:
        year, month = now.year - 1, 12
    else:
        year, month = now.year, now.month - 1
    month_name = date(year, month, 1).strftime("%B %Y")

    try:
        users = conn.execute(
            "SELECT id, telegram_chat_id FROM users WHERE telegram_chat_id IS NOT NULL"
        ).fetchall()
        for user in users:
            farm = conn.execute(
                "SELECT * FROM farms WHERE user_id = ? LIMIT 1", (user["id"],)
            ).fetchone()
            if not farm:
                continue
            rows = conn.execute(
                """SELECT category, SUM(total_price) as total FROM orders
                   WHERE farm_id = ? AND strftime('%Y-%m', date) = ?
                   GROUP BY category""",
                (farm["id"], f"{year:04d}-{month:02d}")
            ).fetchall()
            if not rows:
                continue
            grand_total = sum(r["total"] or 0 for r in rows)
            lines = [f"📊 *Monthly Summary — {month_name}*\n",
                     f"Total: *${grand_total:,.0f} NZD*\n"]
            for r in sorted(rows, key=lambda x: -(x["total"] or 0)):
                lines.append(f"• {r['category'].title()}: ${r['total']:,.0f}")
            await send_message(user["telegram_chat_id"], "\n".join(lines))
    finally:
        conn.close()


def start_scheduler():
    scheduler.add_job(_check_low_stock, CronTrigger(hour=7, minute=0), id="low_stock_check")
    scheduler.add_job(_monthly_summary, CronTrigger(day=1, hour=8, minute=0), id="monthly_summary")
    scheduler.start()
    print("[Scheduler] Started: low_stock_check (07:00 daily), monthly_summary (1st of month)")


def stop_scheduler():
    scheduler.shutdown()
```

- [ ] **Step 2: Start scheduler in main.py**

In `backend/main.py`, add startup/shutdown events:

```python
from backend.scheduler import start_scheduler, stop_scheduler

@app.on_event("startup")
async def startup_event():
    from backend.database import init_db
    init_db()
    start_scheduler()

@app.on_event("shutdown")
async def shutdown_event():
    stop_scheduler()
```

Remove any existing `init_db()` call in startup (to avoid double-init).

- [ ] **Step 3: Add a manual trigger endpoint for demo purposes**

In `backend/routers/alerts.py`, add:

```python
@router.post("/trigger-alert/{alert_type}")
async def trigger_alert(alert_type: str, farm: dict = Depends(get_user_farm)):
    """Manually trigger an alert for demo/testing purposes."""
    if alert_type == "low_stock":
        from backend.scheduler import _check_low_stock
        await _check_low_stock()
        return {"triggered": "low_stock"}
    elif alert_type == "monthly_summary":
        from backend.scheduler import _monthly_summary
        await _monthly_summary()
        return {"triggered": "monthly_summary"}
    raise HTTPException(status_code=400, detail=f"Unknown alert type: {alert_type}")
```

- [ ] **Step 4: Test the scheduler**

```bash
uvicorn backend.main:app --reload --port 8000 &
sleep 3
# Manually trigger a low stock alert
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@test.com","password":"testpass123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
curl -s -X POST http://localhost:8000/api/trigger-alert/low_stock \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
pkill -f "uvicorn backend.main" 2>/dev/null || true
```

Expected: `{"triggered": "low_stock"}`. If Telegram is configured, the bot should send a message.

- [ ] **Step 5: Commit**

```bash
git add backend/scheduler.py backend/main.py backend/routers/alerts.py
git commit -m "feat: APScheduler proactive alerts — daily low stock check and monthly summary via Telegram"
```

---

## Subsystem 4: Email Integration

### Task 11: Fix and test order email sending

**Files:**
- Modify: `backend/mailer/order_email.py`
- Modify: `.env.example`

- [ ] **Step 1: Read current order_email.py**

Read `backend/mailer/order_email.py` to understand the current implementation.

- [ ] **Step 2: Rewrite order_email.py with robust config and HTML template**

Replace `backend/mailer/order_email.py` with:

```python
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")


def _is_configured() -> bool:
    return bool(SMTP_USER and SMTP_PASSWORD)


def send_order_email(order_data: dict, supplier: dict, farm: dict) -> bool:
    """Send a purchase order email to the supplier with a CC to the farm."""
    if not _is_configured():
        print(f"[Email] SMTP not configured. Would send order to {supplier.get('contact_email', 'unknown')}")
        print(f"[Email] Order: {order_data.get('reference_number')} — ${order_data.get('total_price', 0):.2f} NZD")
        return False

    try:
        items = order_data.get("items", [])
        items_html = "".join(
            f"<tr><td style='padding:8px;border-bottom:1px solid #eee'>{i.get('product_name','')}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #eee'>{i.get('quantity','')} {i.get('unit','')}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #eee'>${i.get('unit_price',0):.2f}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #eee'>${i.get('total_price', i.get('quantity',0)*i.get('unit_price',0)):.2f}</td></tr>"
            for i in items
        )
        ref = order_data.get("reference_number", "N/A")
        total = order_data.get("total_price", 0)
        farm_name = farm.get("name", "Unknown Farm")
        farm_email = farm.get("email", SMTP_USER)
        supplier_name = supplier.get("name", "Supplier")
        supplier_email = supplier.get("contact_email")
        contact_name = supplier.get("contact_name", "Sales Team")
        date_str = datetime.now().strftime("%d %B %Y")

        html = f"""
        <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#2d6a4f;color:white;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">FarmStock AI — Purchase Order</h2>
          <p style="margin:4px 0 0;opacity:0.8">Reference: {ref}</p>
        </div>
        <div style="padding:20px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px">
          <p>Dear {contact_name},</p>
          <p>Please find below a purchase order from <strong>{farm_name}</strong> dated {date_str}.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead>
              <tr style="background:#f0fdf4">
                <th style="padding:8px;text-align:left">Product</th>
                <th style="padding:8px;text-align:left">Quantity</th>
                <th style="padding:8px;text-align:left">Unit Price</th>
                <th style="padding:8px;text-align:left">Total</th>
              </tr>
            </thead>
            <tbody>{items_html}</tbody>
            <tfoot>
              <tr style="background:#f0fdf4;font-weight:bold">
                <td colspan="3" style="padding:8px;text-align:right">Order Total:</td>
                <td style="padding:8px">${total:.2f} NZD</td>
              </tr>
            </tfoot>
          </table>
          <p>Please confirm this order by replying to this email. A confirmation will be sent to {farm_email}.</p>
          <p style="color:#666;font-size:12px;margin-top:24px">Generated by FarmStock AI — AI-Powered Farm Supply Management</p>
        </div>
        </body></html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Purchase Order {ref} — {farm_name}"
        msg["From"] = f"FarmStock AI <{SMTP_USER}>"
        if supplier_email:
            msg["To"] = supplier_email
        else:
            msg["To"] = SMTP_USER  # fallback: send to sender for testing
        msg["Cc"] = farm_email
        msg["Reply-To"] = farm_email
        msg.attach(MIMEText(html, "html"))

        recipients = [r for r in [supplier_email, farm_email] if r]
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, recipients, msg.as_string())

        print(f"[Email] Order {ref} sent to {supplier_email} (CC: {farm_email})")
        return True

    except Exception as e:
        print(f"[Email] Failed to send order email: {e}")
        return False


def send_alert_email(to_email: str, subject: str, body: str) -> bool:
    """Send a plain-text alert email to the farmer."""
    if not _is_configured():
        print(f"[Email] Would send alert to {to_email}: {subject}")
        return False
    try:
        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"] = f"FarmStock AI <{SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(body, "plain"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, [to_email], msg.as_string())
        return True
    except Exception as e:
        print(f"[Email] Failed to send alert email: {e}")
        return False
```

- [ ] **Step 3: Update .env.example with clearer email instructions**

In `.env.example`, update the SMTP section:

```
# Email (Gmail SMTP)
# For Gmail: enable 2FA and create an App Password at myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-farmstock-sender@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx
# The farmer's email receives CC of every purchase order
FARM_EMAIL=farmer@example.com
```

- [ ] **Step 4: Test email sending via the API**

```bash
uvicorn backend.main:app --reload --port 8000 &
sleep 2
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@test.com","password":"testpass123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Get farm info to find farm_id and supplier_id
curl -s http://localhost:8000/api/farms -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Replace FARM_ID and SUPPLIER_ID with values from above
curl -s -X POST http://localhost:8000/api/place-order \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"farm_id":"FARM_ID","supplier_id":"SUPPLIER_ID","items":[{"product_name":"Test Drench","quantity":5,"unit":"L","unit_price":45.00}]}' \
  | python3 -m json.tool

pkill -f "uvicorn backend.main" 2>/dev/null || true
```

Expected: Order placed successfully. If SMTP configured, email arrives in inbox.

- [ ] **Step 5: Commit**

```bash
git add backend/mailer/order_email.py .env.example
git commit -m "feat: robust SMTP email with HTML order template and alert email support"
```

---

## Subsystem 5: Pluggable LLM (Anthropic / OpenAI / Gemini / MiniMax)

### Task 12: Multi-vendor chat backend

**Files:**
- Modify: `backend/ai/engine.py`
- Modify: `requirements.txt`
- Modify: `.env.example`

`engine.py` routes chat to one provider via **`AI_PROVIDER`** (`anthropic` | `openai` | `gemini` | `minimax`). If `AI_PROVIDER` is unset, the first available key wins in order: Anthropic → OpenAI → Gemini (`GEMINI_API_KEY` or `GOOGLE_API_KEY`) → MiniMax.

- [ ] **Step 1: Install Python dependencies**

```bash
pip install -r requirements.txt
python3 -c "import anthropic, openai, google.generativeai; print('ok')"
```

- [ ] **Step 2: Configure `.env`**

See `.env.example`: set the API key for your chosen vendor and optional `AI_PROVIDER`, `AI_MODEL`, `AI_MAX_TOKENS`, and provider-specific model variables (`CLAUDE_MODEL`, `OPENAI_MODEL`, `GEMINI_MODEL`, `MINIMAX_MODEL`, `MINIMAX_API_BASE`).

- [ ] **Step 3: Test chat**

```bash
uvicorn backend.main:app --reload --port 8000 &
sleep 2
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@test.com","password":"testpass123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
curl -s -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"When should I reorder drench?","conversation_history":[]}' \
  | python3 -m json.tool
pkill -f "uvicorn backend.main" 2>/dev/null || true
```

Expected: JSON reply from the configured LLM (or the local rule-based fallback if no key / API error).

- [ ] **Step 4: Commit**

```bash
git add backend/ai/engine.py requirements.txt .env.example
git commit -m "feat: pluggable LLM providers (anthropic, openai, gemini, minimax)"
```

---

## ~~Subsystem 6: Production Deployment~~ _(延后 — 本地开发完成后执行)_

> **跳过此 Subsystem。** 本地优化阶段不需要 Docker。待所有功能完成后，单独执行部署打包。

### Task 13: Docker containerization _(SKIP — 部署阶段再执行)_

**Files:**
- Create: `Dockerfile.backend`
- Create: `Dockerfile.frontend`
- Create: `docker-compose.yml`
- Create: `nginx.conf`
- Create: `.env.production.example`

- [ ] **Step 1: Create Dockerfile.backend**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./backend/

# Create data directory for SQLite
RUN mkdir -p /data
ENV DATABASE_PATH=/data/farmstock.db

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```

- [ ] **Step 2: Create Dockerfile.frontend**

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
# Build with production API URL
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 3: Create nginx.conf**

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # React SPA — all non-file routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to FastAPI backend
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Proxy Telegram webhook
    location /telegram/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
    }

    gzip on;
    gzip_types text/plain application/javascript application/json text/css;
}
```

- [ ] **Step 4: Create docker-compose.yml**

```yaml
version: '3.9'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    env_file: .env
    volumes:
      - farmstock_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        VITE_API_BASE_URL: ""  # Empty = same origin (nginx proxies /api/)
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  farmstock_data:
```

- [ ] **Step 5: Create .env.production.example**

```
# === FarmStock AI Production Environment ===

# Security — generate with: python3 -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=your-random-32-char-secret-here

# LLM — set AI_PROVIDER if multiple keys exist; see .env.example
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-6

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_DEFAULT_FARM_ID=farm-001

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_ANNUAL_PRICE_ID=price_...
APP_URL=https://your-domain.com

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@your-domain.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Database
DATABASE_PATH=/data/farmstock.db
```

- [ ] **Step 6: Test Docker build**

```bash
cd /var/www/Farmstock-AI

# Build backend image
docker build -f Dockerfile.backend -t farmstock-backend .

# Build frontend image
docker build -f Dockerfile.frontend -t farmstock-frontend \
  --build-arg VITE_API_BASE_URL="" .
```

Expected: Both images build without errors.

- [ ] **Step 7: Test docker-compose startup**

```bash
# Create a .env file from production example (fill in real values first)
cp .env.production.example .env
# Edit .env with your actual keys

docker-compose up -d
sleep 5
docker-compose ps
curl -s http://localhost/api/health | python3 -m json.tool
```

Expected: Both containers running, `/api/health` returns `{"status": "ok"}`.

- [ ] **Step 8: Set up Telegram webhook for production**

Once deployed to a domain with HTTPS (e.g. farmstock.yourdomain.com), register the webhook:

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=https://farmstock.yourdomain.com/api/telegram/webhook"
```

Expected: `{"ok":true,"result":true,"description":"Webhook was set"}`

- [ ] **Step 9: Commit**

```bash
git add Dockerfile.backend Dockerfile.frontend docker-compose.yml nginx.conf .env.production.example
git commit -m "feat: Docker + nginx production deployment config"
```

---

## Subsystem 7: UX Polish

### Task 14: Demo seed data for new registered users

**Files:**
- Modify: `backend/routers/auth.py`
- Modify: `backend/database.py`

**Goal:** When a new user registers, seed their farm with 6 months of realistic demo orders so the AI has data to work with immediately.

- [ ] **Step 1: Extract seed_demo_orders function in database.py**

In `backend/database.py`, add a new function after `init_db()`:

```python
def seed_demo_farm(conn, farm_id: str, user_id: str):
    """Seed 6 months of demo purchase history for a newly registered farm."""
    import uuid, random
    from datetime import date, timedelta

    today = date.today()
    demo_orders = [
        # (product_name, category, qty, unit, unit_price, days_ago_min, days_ago_max, frequency_days)
        ("Ivomec Plus Drench 2.5L", "veterinary", 2, "units", 89.50, 0, 180, 45),
        ("Dairy Pellets 20kg", "feed", 50, "units", 18.50, 0, 180, 14),
        ("Superphosphate", "fertiliser", 5, "tonnes", 395.00, 30, 150, 90),
        ("Palm Kernel Extract", "feed", 2, "tonnes", 320.00, 0, 120, 30),
        ("Zinc Oxide Supplement", "veterinary", 10, "units", 24.00, 0, 90, 60),
        ("Ryegrass Seed 20kg", "fertiliser", 20, "units", 45.00, 60, 150, 180),
    ]

    for product_name, category, qty, unit, unit_price, min_ago, max_ago, freq in demo_orders:
        # Generate 2-4 orders per product over the period
        num_orders = max_ago // freq
        for i in range(max(1, num_orders)):
            days_ago = min_ago + (i * freq) + random.randint(-5, 5)
            if days_ago < 0:
                continue
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
```

- [ ] **Step 2: Call seed_demo_farm in the register endpoint**

In `backend/routers/auth.py`, after creating the farm and committing, add:

```python
from backend.database import seed_demo_farm
# After conn.commit() in the register endpoint:
seed_demo_farm(conn, farm_id, user_id)
```

- [ ] **Step 3: Test new user registration gets demo data**

```bash
uvicorn backend.main:app --reload --port 8000 &
sleep 2
# Register a fresh user
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newfarmer@test.com","password":"testpass123","full_name":"Jane Farmer"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['access_token'][:30]+'...')"
# Get predictions — should have data immediately
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"newfarmer@test.com","password":"testpass123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
curl -s http://localhost:8000/api/predictions \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
pkill -f "uvicorn backend.main" 2>/dev/null || true
```

Expected: Predictions show stock data immediately after registration (no empty state).

- [ ] **Step 4: Commit**

```bash
git add backend/database.py backend/routers/auth.py
git commit -m "feat: seed demo purchase history for new registrations (immediate AI value)"
```

---

### Task 15: FarmProfile page — show subscription status

**Files:**
- Modify: `frontend/src/pages/FarmProfile.jsx`

- [ ] **Step 1: Add subscription status section to FarmProfile.jsx**

In `frontend/src/pages/FarmProfile.jsx`, add a subscription status card. Import and use:

```jsx
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSubscriptionStatus } from '../api/client'

// Inside the component:
const { user } = useAuth()
const { data: subStatus } = useQuery({
  queryKey: ['subscription'],
  queryFn: getSubscriptionStatus,
})

// Add this card to the page JSX:
<div className="bg-white rounded-xl shadow p-6 mb-6">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h2>
  {subStatus ? (
    <div className="flex items-center justify-between">
      <div>
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          subStatus.status === 'active' ? 'bg-green-100 text-green-800' :
          subStatus.status === 'trialing' ? 'bg-amber-100 text-amber-800' :
          'bg-red-100 text-red-800'
        }`}>
          {subStatus.status === 'trialing'
            ? `Free Trial — ${subStatus.trial_days_left} days left`
            : subStatus.status === 'active' ? 'Active Subscription'
            : 'Trial Expired'}
        </span>
        {subStatus.status === 'active' && (
          <p className="text-sm text-gray-500 mt-1">Subscription active ✓</p>
        )}
      </div>
      {subStatus.status !== 'active' && (
        <Link to="/pricing"
          className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800">
          Upgrade →
        </Link>
      )}
    </div>
  ) : (
    <p className="text-gray-500 text-sm">Loading...</p>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/FarmProfile.jsx
git commit -m "feat: show subscription status and trial countdown in FarmProfile"
```

---

## Subsystem 8: Weather Integration

### Task 16: Open-Meteo weather alerts

**Files:**
- Create: `backend/weather.py`
- Modify: `backend/scheduler.py`

- [ ] **Step 1: Create backend/weather.py**

```python
"""
Open-Meteo API integration for weather-based farm alerts.
Free API, no key required.
"""
import httpx
from typing import Optional

# NZ region coordinates (approximate farm centroids)
REGION_COORDS = {
    "Canterbury": (-43.5, 172.0),
    "Waikato": (-37.8, 175.3),
    "Southland": (-45.9, 168.4),
    "Hawke's Bay": (-39.5, 176.9),
    "Otago": (-45.2, 169.3),
    "Manawatu": (-40.3, 175.6),
    "Marlborough": (-41.5, 173.9),
    "Bay of Plenty": (-38.1, 176.2),
    "Northland": (-35.7, 174.3),
    "Wellington": (-41.3, 174.8),
}
DEFAULT_COORDS = (-43.5, 172.0)  # Canterbury


async def get_forecast(region: str) -> Optional[dict]:
    """Fetch 7-day weather forecast for a NZ region."""
    lat, lon = REGION_COORDS.get(region, DEFAULT_COORDS)
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,windspeed_10m_max"
        f"&forecast_days=7&timezone=Pacific%2FAuckland"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            if resp.is_success:
                return resp.json()
    except Exception as e:
        print(f"[Weather] Failed to fetch forecast for {region}: {e}")
    return None


def _analyse_forecast(forecast: dict) -> list[dict]:
    """Returns list of weather alerts from a 7-day forecast."""
    alerts = []
    if not forecast or "daily" not in forecast:
        return alerts

    daily = forecast["daily"]
    for i, day in enumerate(daily.get("time", [])):
        temp_min = daily["temperature_2m_min"][i]
        temp_max = daily["temperature_2m_max"][i]
        rain = daily["precipitation_sum"][i] or 0
        wind = daily["windspeed_10m_max"][i] or 0

        if temp_min is not None and temp_min < -2:
            alerts.append({
                "date": day, "type": "cold_snap",
                "message": f"Cold snap forecast {day}: minimum {temp_min:.0f}°C. Feed consumption may increase 30-40%.",
                "severity": "high" if temp_min < -5 else "medium",
            })
        if rain > 50:
            alerts.append({
                "date": day, "type": "heavy_rain",
                "message": f"Heavy rain forecast {day}: {rain:.0f}mm. Postpone fertiliser application.",
                "severity": "medium",
            })
        if wind > 80:
            alerts.append({
                "date": day, "type": "high_wind",
                "message": f"High winds forecast {day}: {wind:.0f}km/h. Secure storage covers.",
                "severity": "medium",
            })

    return alerts


async def get_farm_weather_alerts(region: str) -> list[dict]:
    """Returns actionable weather alerts for a farm's region."""
    forecast = await get_forecast(region)
    return _analyse_forecast(forecast)
```

- [ ] **Step 2: Add weather check to scheduler**

In `backend/scheduler.py`, add a new job after `_check_low_stock`:

```python
async def _check_weather():
    """Daily job: check weather for linked farms and alert if hazardous conditions."""
    from backend.database import get_db_connection
    from backend.telegram.sender import send_message
    from backend.weather import get_farm_weather_alerts

    conn = get_db_connection()
    try:
        users = conn.execute(
            "SELECT id, telegram_chat_id FROM users WHERE telegram_chat_id IS NOT NULL"
        ).fetchall()
        for user in users:
            farm = conn.execute(
                "SELECT * FROM farms WHERE user_id = ? LIMIT 1", (user["id"],)
            ).fetchone()
            if not farm or not farm["region"]:
                continue
            alerts = await get_farm_weather_alerts(farm["region"])
            high_alerts = [a for a in alerts if a["severity"] == "high"]
            if high_alerts:
                lines = [f"⛈️ *Weather Alert — {farm['region']}*\n"]
                for a in high_alerts[:2]:
                    lines.append(f"• {a['message']}")
                await send_message(user["telegram_chat_id"], "\n".join(lines))
    finally:
        conn.close()
```

Register the job in `start_scheduler()`:

```python
scheduler.add_job(_check_weather, CronTrigger(hour=6, minute=30), id="weather_check")
```

- [ ] **Step 3: Test weather API**

```bash
python3 -c "
import asyncio
from backend.weather import get_farm_weather_alerts
alerts = asyncio.run(get_farm_weather_alerts('Canterbury'))
print(f'Got {len(alerts)} weather alerts')
for a in alerts:
    print(f'  [{a[\"severity\"]}] {a[\"message\"]}')
"
```

Expected: Either 0 alerts (clear weather) or a list of weather warnings.

- [ ] **Step 4: Commit**

```bash
git add backend/weather.py backend/scheduler.py
git commit -m "feat: Open-Meteo weather integration with daily cold snap and heavy rain alerts via Telegram"
```

---

## Final: Integration Smoke Test

### Task 17: End-to-end smoke test

- [ ] **Step 1: Start the full stack locally**

```bash
cd /var/www/Farmstock-AI
# Terminal 1: backend
uvicorn backend.main:app --reload --port 8000 &
# Terminal 2: frontend
cd frontend && npm run dev &
sleep 3
curl -s http://localhost:8000/health
```

Expected: Backend returns `{"status": "ok"}`. Frontend serves on `http://localhost:5173`.

- [ ] **Step 2: Run registration and core flow**

```bash
# Register
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoketest@test.com","password":"testpass123","full_name":"Smoke Tester"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "Got token: ${TOKEN:0:20}..."

# Check predictions
curl -s http://localhost:8000/api/predictions -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# Check recommendations
curl -s http://localhost:8000/api/recommendations -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# Test chat
curl -s -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What should I reorder this week?","conversation_history":[]}' \
  | python3 -m json.tool

# Verify trial status
curl -s http://localhost:8000/api/billing/status -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: All endpoints return valid data. Chat returns a meaningful AI response.

- [ ] **Step 3: Open web dashboard**

Open `http://localhost:5173` in a browser. Verify:
- Redirected to `/login`
- Register creates account and shows dashboard with demo data
- Trial banner shows in Layout
- Predictions chart shows inventory levels
- Chat widget responds

- [ ] **Step 4: Final commit and tag**

```bash
git add -A
git commit -m "chore: final integration checks — FarmStock AI v2.0"
git tag v2.0.0
```

---

## Environment Checklist Before Launch

Before going live, set these values in `.env`:

| Variable | Where to get it |
|----------|----------------|
| `JWT_SECRET_KEY` | `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `AI_PROVIDER` | Optional: `anthropic`, `openai`, `gemini`, `minimax` — forces vendor when multiple keys exist |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `OPENAI_API_KEY` | platform.openai.com |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | aistudio.google.com/apikey |
| `MINIMAX_API_KEY` (+ optional `MINIMAX_API_BASE`) | MiniMax developer console |
| `TELEGRAM_BOT_TOKEN` | @BotFather on Telegram — `/newbot` |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com/test/apikeys (use live keys for production) |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Webhooks → add endpoint → reveal secret |
| `STRIPE_MONTHLY_PRICE_ID` | Create a recurring price in Stripe dashboard ($49 NZD/month) |
| `STRIPE_ANNUAL_PRICE_ID` | Create a recurring price in Stripe dashboard ($490 NZD/year) |
| `SMTP_USER` + `SMTP_PASSWORD` | Gmail account + App Password (myaccount.google.com/apppasswords) |

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered by |
|-------------|-----------|
| Real user auth + multi-farm | Tasks 1–6 |
| 14-day free trial | Tasks 7–8 (UserOut.trial_ends_at, trialing status) |
| Paid subscription (Stripe) | Tasks 7–8 |
| Telegram bot fully functional | Tasks 9–10 |
| Email order sending | Task 11 |
| Pluggable LLM chat | Task 12 |
| Production deployment | ~~Task 13~~ — _延后到部署阶段_ |
| Demo data for new users | Task 14 |
| Subscription status in UI | Tasks 8, 15 |
| Weather alerts | Task 16 |
| Proactive alerts scheduler | Task 10 |

**Gaps identified and resolved:** None. All 2.0 requirements addressed.

**Type/name consistency:** `UserOut`, `UserCreate`, `UserLogin`, `TokenResponse` defined in Task 4 and used consistently. `get_user_farm` dependency defined in Task 5 and used in Tasks 5+. `send_message` (async) defined in Task 9 and used in Tasks 10, 16.
