# FarmStock AI

FarmStock AI is an AI-powered farm supply management platform for dairy and livestock operations. It combines purchase history, simulated inventory coverage, predictive restocking logic, web analytics, and bot-based chat into one system so farmers can see what is running low, why it matters, and what to order next.

## Why It Is Different

- Predictive restocking, not just stock tracking: the app estimates depletion timing and highlights when delivery lead-time creates a real supply gap.
- Shelf-life-aware inventory logic: products with expiry risk are treated differently from durable supplies.
- Dual experience: a data-rich web dashboard plus a FarmStock bot workflow for quick command-based interaction.
- Action-oriented insights: the system turns historical purchasing data into reorder thresholds, urgency signals, and suggested next actions.

## Core Features

- Inventory coverage dashboard with reorder thresholds and delivery-gap burn analysis
- Historical purchase log with create, edit, and delete flows
- Farm profile management for region, herd size, land area, and contact details
- Product catalogue with one-click ordering flow
- Spending analytics and AI recommendations
- AI chat assistant powered by Gemini
- Bot integration support:
  FarmStock bot simulation
  Telegram bot support for simpler real-world testing
- SQLite-backed demo dataset with seeded orders, alerts, products, and inventory snapshots

## Live Access

- Web app: `PASTE_YOUR_DEPLOYED_FRONTEND_URL_HERE`
- Backend API: `PASTE_YOUR_DEPLOYED_BACKEND_URL_HERE`
- Telegram bot: `PASTE_YOUR_TELEGRAM_BOT_LINK_HERE`

## Tech Stack

- Frontend: React 18, Vite, TanStack Query, Recharts
- Backend: FastAPI, SQLite, Pydantic
- AI: Gemini API
- Bot support: Telegram Bot API, local FarmStock bot simulation

## Project Structure

```text
Farmstock-AI/
├── backend/
│   ├── ai/
│   ├── email/
│   ├── routers/
│   ├── telegram/
│   ├── whatsapp/
│   ├── database.py
│   ├── main.py
│   └── models.py
├── frontend/
│   ├── src/
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

Edit `.env` and fill in the values you want to use. At minimum, for AI chat:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MAX_OUTPUT_TOKENS=2048

TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_DEFAULT_FARM_ID=farm-001

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

DATABASE_PATH=backend/farmstock.db
```

Notes:

- `GEMINI_API_KEY` is required for real AI responses.
- `GEMINI_MAX_OUTPUT_TOKENS` controls how long AI replies can be.
- If `GEMINI_API_KEY` is missing, chat falls back to local demo logic.
- `TELEGRAM_BOT_TOKEN` is only needed if you want to connect the Telegram bot.
- SMTP credentials are optional unless you want real order emails.

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

The web chat and backend `/api/chat` endpoint use Gemini.

If Gemini is configured correctly, the assistant will answer with live AI responses informed by:

- farm profile
- recent orders
- depletion predictions
- recommendations

If Gemini is not configured, the app still works in local fallback mode.

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
