# FarmStock AI

FarmStock AI is an AI-assisted farm supply management platform for dairy and livestock operations. It brings together purchase history, simulated inventory coverage, supplier management, price benchmarking, AI recommendations, and bot-based chat so farmers can see what is running low, understand why it matters, and take action quickly.

## Why It Stands Out

- Predictive restocking instead of basic stock tracking
- Shelf-life-aware inventory logic for durable and perishable farm supplies
- Regional price benchmarking with a privacy threshold
- Supplier-linked ordering workflows with AI-drafted email support
- A public marketing landing page plus a protected operational dashboard
- A global floating AI assistant available throughout the signed-in app

## Core Features

- User registration, login, logout, and JWT-authenticated sessions
- 14-day free trial with Stripe-backed monthly and annual subscription flows
- Multi-farm support with persisted current-farm selection in the frontend
- Public landing page at `/` and `/welcome`
- Inventory coverage dashboard with depletion timing and reorder urgency
- YTD spending metrics and AI alert cards on the dashboard
- Purchase history with modal create, edit, and delete flows
- Supplier-required order entry with inline supplier creation when needed
- Farm profile management for region, type, herd size, land area, and contact details
- Supplier management with product-to-supplier mapping
- Product catalogue with search, category filters, shelf-life zone filters, and supplier filters
- One-click supplier email workflow from the product catalogue
- AI-generated purchase email drafts before sending
- Regional price comparison for products, including min, max, average, percentile, and personal trend history
- Global floating AI chat with markdown responses and persisted local transcript
- FarmStock bot simulation plus Telegram bot support
- SQLite demo data with seeded farms, suppliers, products, orders, alerts, aliases, and inventory snapshots

## Live Access

- Web app: `PASTE_YOUR_DEPLOYED_FRONTEND_URL_HERE`
- Backend API: `PASTE_YOUR_DEPLOYED_BACKEND_URL_HERE`
- Telegram bot: `PASTE_YOUR_TELEGRAM_BOT_LINK_HERE`

## Tech Stack

- Frontend: React 18, Vite 6, React Router 6, TanStack Query 5, Recharts, React Markdown
- Styling: custom CSS split into `global.css`, `layout.css`, `pages.css`, and `landing.css`
- Backend: FastAPI, SQLite, Pydantic v2, `python-jose`, `passlib`
- Scheduling: APScheduler for recurring alert jobs
- Billing: Stripe
- AI providers: Anthropic Claude, OpenAI, Google Gemini, or MiniMax
- Bot support: Telegram Bot API and local FarmStock bot simulation
- Weather data: Open-Meteo

## Project Structure

```text
Farmstock-AI/
├── assets/                         # Static project assets
├── backend/
│   ├── ai/                         # Provider selection, chat, and email drafting logic
│   ├── mailer/                     # SMTP email helpers for supplier orders
│   ├── routers/                    # FastAPI routes (auth, farms, orders, chat, billing, benchmarks)
│   ├── telegram/                   # Telegram bot webhook and poller
│   ├── tests/                      # Backend tests (including price benchmark coverage)
│   ├── whatsapp/                   # FarmStock bot simulation endpoint
│   ├── auth.py                     # JWT helpers and auth dependencies
│   ├── database.py                 # SQLite schema, seed data, and DB helpers
│   ├── main.py                     # FastAPI app setup and router registration
│   ├── models.py                   # Pydantic models
│   └── scheduler.py                # Scheduled weather/alert jobs
├── docs/
│   └── superpowers/                # Plans and specs for major product work
├── frontend/
│   ├── public/                     # Landing page and marketing imagery
│   ├── src/
│   │   ├── api/                    # API client and TanStack Query keys
│   │   ├── components/             # Shared UI, modals, tables, chat, navigation
│   │   ├── context/                # Auth and current-farm providers
│   │   ├── hooks/                  # Form and modal state helpers
│   │   ├── pages/                  # Landing, Dashboard, Orders, Products, Farm Profile, Auth
│   │   ├── styles/                 # Global, layout, page, and landing styles
│   │   └── utils/                  # Formatting helpers
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── LICENSE
├── requirements.txt
└── README.md
```

## Local Setup

### 1. Clone the repository

```bash
git clone <YOUR_REPO_URL>
cd Farmstock-AI
```

### 2. Create a local environment file

```bash
cp .env.example .env
```

### 3. Configure authentication

`JWT_SECRET_KEY` is required. The backend will reject authenticated requests without it.

```env
JWT_SECRET_KEY=change-me-to-a-random-32-char-secret
JWT_EXPIRE_MINUTES=10080
```

Generate a strong secret locally:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Configure AI providers

The backend can auto-select the first configured provider, or you can force one explicitly with `AI_PROVIDER`.

```env
# Optional generic overrides
# AI_PROVIDER=anthropic
# AI_MODEL=...
# AI_MAX_TOKENS=2048

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-6
CLAUDE_MAX_TOKENS=2048

# OpenAI
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini

# Google Gemini
# GEMINI_API_KEY=...
# GOOGLE_API_KEY=...
# GEMINI_MODEL=gemini-2.0-flash

# MiniMax
# MINIMAX_API_KEY=...
# MINIMAX_API_BASE=https://api.minimax.chat/v1
# MINIMAX_MODEL=MiniMax-Text-01
```

If no AI key is provided, chat and draft-generation flows fall back to local demo responses.

### 5. Configure integrations

```env
DATABASE_PATH=backend/farmstock.db

TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_DEFAULT_FARM_ID=farm-001

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FARM_EMAIL=farmer@example.com

OPEN_METEO_URL=https://api.open-meteo.com/v1/forecast

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_ANNUAL_PRICE_ID=price_...
APP_URL=http://localhost:5173
```

Notes:

- Telegram is optional unless you want a real bot connection.
- SMTP is optional unless you want to send real supplier emails.
- Stripe is optional unless you want live billing and checkout flows.

### 6. Install backend dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 7. Install frontend dependencies

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

Backend URL:

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

Frontend URL:

```text
http://localhost:5173
```

The Vite dev server proxies `/api` and `/health` to `http://127.0.0.1:8000`, so no frontend env var is required for local development.

## Main User Flows

### Dashboard

- Inventory depletion predictions and reorder urgency
- AI alert cards surfaced directly on the main dashboard
- Year-to-date spend metric
- Global floating AI assistant available from the shell

### Orders

- Create and edit purchase records through modal forms
- Require a supplier when logging a purchase
- Create a supplier inline from the order flow if one does not exist yet
- Compare your latest price to anonymized regional data

Regional price benchmarking only becomes available when at least 3 distinct farms in the same region have matching order history for a product.

### Products

- Search products by name
- Filter by category, shelf-life zone, and supplier
- Open a one-click ordering modal from the catalogue
- Draft and send supplier emails from the app

### Farm Profile and Suppliers

- Update farm identity and operational details
- View subscription status and remaining trial time
- Create, edit, and delete suppliers
- Link suppliers to supported products

## Bot Usage

### FarmStock bot simulation

This is the fastest way to test bot flows without connecting a real messaging platform.

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

1. Create a bot with `@BotFather`
2. Put the token in `.env` as `TELEGRAM_BOT_TOKEN`
3. Start the backend
4. Start the Telegram poller

```bash
python3 -m backend.telegram.poller
```

Then message your bot with commands such as:

- `/stock`
- `/spend`
- `/alerts`
- `/help`
- `/order Dairy Pellets 1t`

## AI Chat

The authenticated app includes a floating AI assistant that is available across dashboard pages. The chat transcript is stored in `localStorage`, supports markdown responses, and uses backend context from:

- farm profile
- recent orders
- depletion predictions
- purchase recommendations

The `/api/chat` endpoint and chat UI support these providers:

- Anthropic Claude
- OpenAI
- Google Gemini
- MiniMax

If no provider is configured, the application still works in local fallback mode.

## Demo Data

On first startup, the backend seeds demo data for local development, including:

- a demo farm
- suppliers and supplier-product links
- a seeded product catalogue
- 2 to 3 years of order history
- inventory snapshots for prediction views
- alert records
- product aliases for cleaner recommendation matching
- Palm Kernel Extract sample catalogue coverage

Default demo farm ID:

```text
farm-001
```

Newly registered users also receive seeded demo purchase history so AI features have immediate context.

## Deployment Notes

For production deployment, you will usually host:

- the FastAPI backend on a Python host or container platform
- the React frontend as static assets on a CDN or frontend host

If frontend and backend are deployed separately, set:

```env
VITE_API_BASE_URL=PASTE_YOUR_DEPLOYED_BACKEND_URL_HERE
```

Also make sure production configuration includes the correct values for:

- `APP_URL`
- Stripe keys and price IDs
- SMTP credentials
- your chosen AI provider keys
- Telegram settings if bot access is enabled

## Useful Commands

Backend:

```bash
uvicorn backend.main:app --reload
```

Frontend:

```bash
cd frontend
npm run dev
```

Production frontend build:

```bash
cd frontend
npm run build
```

Telegram poller:

```bash
python3 -m backend.telegram.poller
```

Example benchmark test run (if `pytest` is installed):

```bash
python3 -m pytest backend/tests/test_price_benchmark.py
```

## Troubleshooting

### AI chat is returning provider errors

- Check that the matching API key exists in `.env`
- Restart the backend after changing provider settings
- If you set `AI_PROVIDER`, make sure it matches a configured key
- If you want a local-only setup, remove provider settings and use fallback mode

### Supplier email sending fails

- Confirm SMTP credentials are configured
- Check that the selected supplier has an email address, or provide one in the modal
- Restart the backend after updating mail settings

### Price comparison shows no regional data

- The current farm must have a region set
- At least 3 farms in the same region need matching purchase history for that product
- Your own price history can still appear even when regional comparison is hidden

### Frontend shows API 404 or 500 errors

- Make sure the backend is running on `127.0.0.1:8000`
- Restart both backend and frontend after environment changes
- If deployed separately, verify `VITE_API_BASE_URL`

### Telegram bot does not reply

- Confirm `TELEGRAM_BOT_TOKEN` is valid
- Make sure `python3 -m backend.telegram.poller` is running
- Message the correct bot created in `@BotFather`

## License

See [LICENSE](LICENSE).
