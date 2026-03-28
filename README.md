# FarmStock AI

FarmStock AI is an AI-powered farm supply management platform for dairy and livestock operations. It combines purchase history, simulated inventory coverage, predictive restocking logic, web analytics, and bot-based chat into one system so farmers can see what is running low, why it matters, and what to order next.

## Why It Is Different

- Predictive restocking, not just stock tracking: the app estimates depletion timing and highlights when delivery lead-time creates a real supply gap.
- Shelf-life-aware inventory logic: products with expiry risk are treated differently from durable supplies.
- Dual experience: a data-rich web dashboard plus a FarmStock bot workflow for quick command-based interaction.
- Action-oriented insights: the system turns historical purchasing data into reorder thresholds, urgency signals, and suggested next actions.

## Core Features

- User registration, login, and JWT-authenticated sessions
- 14-day free trial with Stripe subscription billing (monthly and annual plans)
- Multi-farm isolation — each user only sees their own farms
- Inventory coverage dashboard with reorder thresholds and delivery-gap burn analysis
- Historical purchase log with create, edit, and delete flows
- Farm profile management for region, herd size, land area, and contact details
- Product catalogue with one-click ordering flow
- Spending analytics and AI recommendations
- AI chat assistant — pluggable LLM backend (Claude, OpenAI, Gemini, MiniMax)
- Daily weather alerts via APScheduler (cold snaps, heavy rain, high winds)
- Bot integration: FarmStock bot simulation + Telegram bot
- SQLite-backed demo dataset with seeded orders, alerts, products, and inventory snapshots

## Live Access

- Web app: `PASTE_YOUR_DEPLOYED_FRONTEND_URL_HERE`
- Backend API: `PASTE_YOUR_DEPLOYED_BACKEND_URL_HERE`
- Telegram bot: `PASTE_YOUR_TELEGRAM_BOT_LINK_HERE`

## Tech Stack

- Frontend: React 18, Vite, TanStack Query, Recharts, Tailwind CSS
- Backend: FastAPI, SQLite, Pydantic, python-jose (JWT), passlib (bcrypt)
- Billing: Stripe SDK
- Scheduling: APScheduler (daily weather alerts, proactive notifications)
- AI: Pluggable — Anthropic Claude, OpenAI, Google Gemini, or MiniMax (auto-selected by available key)
- Bot support: Telegram Bot API, local FarmStock bot simulation
- Weather: Open-Meteo (free, no key required)

## Project Structure

```text
Farmstock-AI/
├── backend/
│   ├── ai/                  # Pluggable LLM engine (Claude, OpenAI, Gemini, MiniMax)
│   ├── email/               # SMTP order confirmation and alert emails
│   ├── routers/             # FastAPI route handlers (auth, billing, farms, orders, …)
│   ├── telegram/            # Telegram bot webhook + polling
│   ├── whatsapp/            # FarmStock bot simulation endpoint
│   ├── auth.py              # JWT creation, decoding, dependency injection
│   ├── billing.py           # Stripe SDK wrapper
│   ├── database.py          # SQLite schema + seed data
│   ├── main.py              # App entry point, router registration, scheduler startup
│   ├── models.py            # Pydantic models
│   └── scheduler.py         # APScheduler jobs (daily weather alerts)
├── frontend/
│   ├── src/
│   │   ├── context/         # AuthContext (JWT token management)
│   │   ├── components/      # ProtectedRoute and shared UI
│   │   └── pages/           # Login, Register, Pricing, Dashboard, …
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── requirements.txt
└── README.md
```

## Local Setup

### 1. Clone and enter the project

```bash
git clone <YOUR_REPO_URL>
cd Farmstock-AI
```

### 2. Create and configure `.env`

```bash
cp .env.example .env
```

Edit `.env` and fill in the values you want to use.

#### Required — JWT secret (auth will not start without this)

```env
JWT_SECRET_KEY=change-me-to-a-random-32-char-secret
JWT_EXPIRE_MINUTES=10080
```

Generate a strong secret:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

#### AI chat — pick one provider (or set `AI_PROVIDER` explicitly)

The backend auto-selects the first key it finds. Set whichever you have:

```env
# Anthropic Claude (recommended)
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-6
CLAUDE_MAX_TOKENS=2048

# Google Gemini
# GEMINI_API_KEY=...
# GEMINI_MODEL=gemini-2.0-flash

# OpenAI
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini

# MiniMax
# MINIMAX_API_KEY=...
# MINIMAX_API_BASE=https://api.minimax.chat/v1
# MINIMAX_MODEL=MiniMax-Text-01

# Force a specific provider (optional)
# AI_PROVIDER=anthropic
```

If no AI key is provided, the app falls back to local demo responses.

#### Other settings

```env
DATABASE_PATH=backend/farmstock.db

TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_DEFAULT_FARM_ID=farm-001

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FARM_EMAIL=farmer@example.com

# Stripe (only needed for billing/subscriptions)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_ANNUAL_PRICE_ID=price_...
APP_URL=http://localhost:5173
```

Notes:

- `JWT_SECRET_KEY` is **required**. The backend will reject all auth requests without it.
- `TELEGRAM_BOT_TOKEN` is only needed if you want to connect the Telegram bot.
- SMTP credentials are optional unless you want real order confirmation emails.
- Stripe keys are optional unless you want real subscription billing.

### 3. Install backend dependencies

```bash
python3 -m pip install --break-system-packages -r requirements.txt
```

If you prefer a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 4. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

## Running Locally

### Start the backend

From the project root:

```bash
uvicorn backend.main:app --reload
```

Backend will run at:

```text
http://127.0.0.1:8000
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

### Start the frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

Frontend will run at:

```text
http://localhost:5173
```

## How to Access the App Locally

- Open `http://localhost:5173`
- The frontend will call the backend API automatically
- Seed data is created automatically on backend startup

## Bot Usage

### FarmStock bot simulation

This is the fastest way to test bot flows without connecting a real messaging platform.

Start the backend, then send a simulated message:

```bash
curl -X POST http://127.0.0.1:8000/api/whatsapp/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+64211234567",
    "message": "STOCK",
    "farm_id": "farm-001"
  }'
```

Useful commands:

- `STOCK`
- `SPEND`
- `ALERTS`
- `HELP`
- `ORDER Dairy Pellets 1t`

### Telegram bot

If you want a real chat channel without using Meta:

1. Create a bot with `@BotFather`
2. Put the token in `.env` as `TELEGRAM_BOT_TOKEN`
3. Start the backend
4. Start the Telegram poller:

```bash
python3 -m backend.telegram.poller
```

Then message your bot in Telegram with commands like:

- `/stock`
- `/spend`
- `/alerts`
- `/help`
- `/order Dairy Pellets 1t`

## AI Chat

The web chat and the `/api/chat` endpoint support four AI providers: **Anthropic Claude**, **OpenAI**, **Google Gemini**, and **MiniMax**.

The backend auto-selects a provider based on which API key is present in `.env`. You can also pin one with `AI_PROVIDER=anthropic|openai|gemini|minimax`.

When configured, the assistant answers with live AI responses informed by:

- farm profile
- recent orders
- depletion predictions
- recommendations

If no AI key is provided, the app still works in local fallback mode.

## Default Demo Data

On first startup, the backend seeds:

- 1 demo farm
- 2 suppliers
- 25 products
- 2 to 3 years of order history
- 25 simulated inventory snapshots
- alert records for demo scenarios

Default farm ID:

```text
farm-001
```

## Deployment Notes

For production deployment, you will typically host:

- FastAPI backend on a Python host or container platform
- React frontend as static assets on a CDN or frontend host

Suggested deployment setup:

- Frontend URL: `PASTE_YOUR_DEPLOYED_FRONTEND_URL_HERE`
- Backend URL: `PASTE_YOUR_DEPLOYED_BACKEND_URL_HERE`
- Set frontend environment so API calls point to your deployed backend
- Provide `.env` values for Gemini, Telegram, SMTP, and database path in your host platform

If you deploy frontend and backend separately, set:

```env
VITE_API_BASE_URL=PASTE_YOUR_DEPLOYED_BACKEND_URL_HERE
```

## Useful Commands

Backend:

```bash
uvicorn backend.main:app --reload
```

Frontend:

```bash
cd frontend && npm run dev
```

Production frontend build:

```bash
cd frontend && npm run build
```

Telegram poller:

```bash
python3 -m backend.telegram.poller
```

## Troubleshooting

### `/api/chat` returns Gemini errors

- Check `GEMINI_API_KEY` in `.env`
- Restart the backend after changing `.env`
- Make sure the key is a Gemini key, not an Anthropic or OpenAI key

### Frontend shows API 404 or 500

- Make sure backend is running on `127.0.0.1:8000`
- Restart both backend and frontend after environment changes

### Telegram bot does not reply

- Confirm `TELEGRAM_BOT_TOKEN` is valid
- Make sure `python3 -m backend.telegram.poller` is running
- Message the correct bot created in `@BotFather`

## License

See [LICENSE](/Users/ss/Desktop/farmstockai/Farmstock-AI/LICENSE).
