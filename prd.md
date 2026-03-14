# FarmStock AI — Product Requirements Document

**Version 2.0 | March 2026 | Hackathon Edition**

AI-Powered Farm Supply Management via WhatsApp + Web Dashboard
For New Zealand & Australia Small-Medium Farms

---

## 1. Executive Summary

FarmStock AI is a dual-channel AI assistant that helps NZ/AU small-medium farm operators manage agricultural supply purchasing. By analysing purchase history data, the system predicts inventory depletion, recommends products, alerts users to weather/disease risks, and enables one-click ordering — through WhatsApp conversations and a companion React web dashboard.

**Two interfaces, one brain:**
- **WhatsApp bot** — primary mobile touchpoint: quick queries, proactive alerts, order confirmations on the go
- **React web dashboard** — rich data experience: real-time inventory visualisation, purchase history CRUD, farm profile editing, spending analytics, one-click ordering

Both share a single **SQLite database** and the same **AI engine (Claude API)**.

### Key value propositions

| Dimension | Value |
|-----------|-------|
| Zero friction | No app download — WhatsApp for mobile, web browser for desktop |
| Predictive | AI predicts when each product will run out |
| Proactive | Bot pushes alerts for weather, disease, price drops |
| Actionable | One reply (WhatsApp) or one click (web) to confirm order; AI sends email to supplier |
| Cost-aware | Shelf-life rules prevent wasteful over-stocking |
| Dual-channel | WhatsApp for quick actions; web dashboard for data management and analytics |

---

## 2. Problem Statement

### 2.1 Market gap

No AI-powered automated ordering service for agricultural supplies exists in the NZ/AU market. Farmers manually track inventory, call or visit stores to reorder, and miss optimal pricing windows or run out of critical supplies at the worst time.

### 2.2 Target user pain points

- Time wasted on manual stock tracking and reordering trips
- Emergency orders at premium prices when supplies run out unexpectedly
- No visibility into spending patterns or cost-saving opportunities
- Missed seasonal price drops on items that could be safely stockpiled
- Inability to respond quickly when weather or disease events require immediate purchasing action

### 2.3 Target users

Small to medium farm operators in NZ/AU:
- Dairy farms (300–1,500 head)
- Sheep and beef cattle stations
- Mixed livestock operations

Typical suppliers: Farmlands, PGG Wrightson, local cooperatives, direct-from-manufacturer.

---

## 3. Product Overview

### 3.1 Core concept

Dual-channel product with WhatsApp as primary mobile interface and React web dashboard as management/analytics interface. Both share a single SQLite database and AI engine.

### 3.2 Channel strategy

| Channel | Primary use cases | Strengths |
|---------|-------------------|-----------|
| WhatsApp | Quick queries, receive alerts, confirm orders, spending summaries on the go | Zero install, always in pocket, proactive push notifications, works in low-signal areas |
| Web dashboard | View real-time analytics, manage purchase history, edit farm profile, browse products, one-click ordering | Rich data visualisation, bulk data editing, charts and trends, full product catalogue browsing |

### 3.3 Interaction model

- **Reactive (user asks):** Farmer asks a question via WhatsApp ("When should I reorder drench?") or browses the web dashboard for data-driven answers.
- **Proactive (AI pushes):** AI monitors conditions and sends alerts via WhatsApp: low stock warnings, weather/disease pre-alerts, price drop notifications, monthly spending summaries. Web dashboard shows these as a notification feed.

### 3.4 Order execution

Orders can be placed through either channel. In WhatsApp, user replies to confirm. On web dashboard, user clicks a one-click order button. In both cases, the AI generates a formatted purchase order email to the supplier's sales rep, with confirmation copy to the farmer.

---

## 4. Functional Architecture

### 4.1 System layers

| Layer | Components | Description |
|-------|-----------|-------------|
| Data input | Order history, farm profile, external data (weather, prices) | Purchase records are core data source. Farm profile improves predictions. Weather API and price feeds are enhancement layers. |
| AI engine | Consumption predictor, product recommender, price optimiser, chat AI | Four AI modules. Claude API powers conversational layer, calling other modules as tools. |
| User experience | WhatsApp bot, web dashboard (React), proactive alerts, smart cart | WhatsApp for mobile-first interactions and push alerts. Web dashboard for data management, analytics, and one-click ordering. |
| Order execution | Email sender, supplier directory, order tracking | Sends formatted purchase order emails to suppliers and tracks order status. |

### 4.2 AI engine — four core modules

#### Module 1: Consumption predictor (P0)

Analyses order history to predict when each product will run out.

- Calculates average purchase interval per product
- Detects seasonal patterns (winter feed increase, spring fertiliser)
- Adjusts burn rate by herd size and farm type
- Applies shelf-life rules to cap maximum recommended stock levels
- **Output:** "Your Ivomec Plus drench will run out in approximately 28 days. Recommend ordering by April 1st."

#### Module 2: Product recommender (P0)

Suggests products based on what similar farms purchase.

- Co-purchase pattern mining ("Farmers who buy A also buy B")
- Similar-farm collaborative filtering (same herd size, region, farm type)
- Category bundle logic ("You bought drench but haven't bought mineral lick blocks this season")
- **Output:** Top 3–5 product suggestions with reasoning.

#### Module 3: Price optimiser (P1)

Tracks pricing trends and advises on optimal purchase timing.

- Historical price tracking per product per supplier
- Bulk discount detection
- Seasonal price pattern forecasting
- **Output:** "Farmlands has Superphosphate at $395/t, down 10% from last month. Granular fertiliser stores indefinitely. Recommend buying now."

#### Module 4: Conversational AI (P0)

Natural language interface powered by Claude API.

- User's farm profile and order history injected as context
- Intent classification: query | order | comparison | report
- Calls modules 1–3 as tools to generate data-driven responses
- Compliant with WhatsApp Business policy (purpose-driven business tasks, not open-ended chat)

---

## 5. Shelf-Life Intelligence

A critical differentiator: the AI understands product shelf life and prevents wasteful over-stocking.

### 5.1 Shelf-life classification

| Category | Short (days–months) | Medium (months–2 years) | Long / indefinite |
|----------|---------------------|-------------------------|-------------------|
| Veterinary | Vaccines (6–18 mo, cold chain), injectable antibiotics (1–2 yr) | Oral drench (2–3 yr), pour-on parasiticides (2–3 yr) | — |
| Animal feed | Fresh silage (1–2 days), textured feed (30–90 days) | Feed pellets (3–6 mo), hay (6–12 mo) | Whole grain (years if dry), mineral blocks (years) |
| Fertiliser | Organic liquid (1–2 yr), microbial inoculants (~2 yr) | Herbicide-mixed (1–2 yr), organic dry (1–2 yr) | Granular synthetic (indefinite if dry), liquid synthetic (8–10 yr) |
| Equipment | — | — | Fencing, ear tags, tools (indefinite) |

### 5.2 AI stocking rules

1. **Green zone** (long shelf life): AI may suggest bulk buying when prices are favourable.
2. **Yellow zone** (medium shelf life): AI recommends purchasing no more than 2–3 months' supply.
3. **Red zone** (short shelf life): AI enforces just-in-time purchasing; never suggests stockpiling.

**Rule:** Max recommended stock = shelf life × 0.67 safety factor. E.g., feed pellets (6 mo shelf life) → AI caps at 4 months' supply.

---

## 6. Proactive Alert System

The AI monitors conditions and pushes relevant alerts via WhatsApp. Web dashboard shows alerts as a notification feed.

### 6.1 Alert types

| Alert type | Trigger | Example message |
|-----------|---------|-----------------|
| Low stock warning | Predicted depletion within 7–14 days | "Your drench stock is estimated to run out in 8 days. Shall I prepare an order?" |
| Weather pre-alert | MetService API forecasts extreme weather | "Cold snap forecast next week. Feed consumption may increase 30–40%. Your current stock lasts ~18 days instead of 28." |
| Disease/pest alert | MPI or regional authority advisory | "Facial eczema risk is HIGH in your region. Recommend ordering zinc oxide supplement." |
| Price drop | Tracked product price decreases >5% | "Superphosphate dropped 10% at PGG Wrightson. Lowest in 6 months. Safe to bulk buy." |
| Monthly summary | 1st of each month | "January spending: $4,820. Feed +12% vs last year. Top saving opportunity: lock in hay contract." |

### 6.2 Alert delivery rules

- Maximum 1 push notification per day (unless urgent weather/disease alert)
- User can mute alerts or adjust frequency by replying "mute" or "settings"
- All alerts include actionable buttons: order, remind later, dismiss

---

## 7. Key Conversation Scenarios (WhatsApp)

### Scenario 1: Stock status inquiry

**User:** "My drench is running low, when should I reorder?"

**Bot:** Analyses purchase history, calculates depletion timeline, recommends order date with delivery buffer. Offers quick-reply buttons: [Order now] [Show alternatives] [Remind me later].

### Scenario 2: Weather-triggered proactive alert

**Bot pushes:** "Weather alert for Canterbury: cold snap next week (lows -3°C). Feed consumption typically increases 30–40%. Your feed stock will last ~18 days instead of 28. Farmlands has dairy pellets at $485/t (5% below last month). [Order 1.5t] [Order 1t] [Skip]"

### Scenario 3: Price drop notification

**Bot pushes:** "Deal alert: Ravensdown Super at $395/t (was $440, down 10%). You typically buy 5t in April. Granular fertiliser stores indefinitely. Buying now saves ~$225. [Order 5t] [Order 3t] [Track price]"

### Scenario 4: Order confirmation via email

**User:** "Yes, order 5t at this price"

**Bot:** Generates order summary (product, quantity, price, supplier, delivery estimate). On confirmation, sends purchase order email to supplier's sales rep, CCs farmer, provides order reference number.

### Scenario 5: Spending report

**User:** "How much did I spend on feed this summer?"

**Bot:** Returns breakdown by category with year-over-year comparison and actionable savings tips. Offers to email full report.

---

## 8. Web Dashboard (React)

### 8.1 Dashboard pages

#### Home / overview
- **Metric cards:** total inventory items, items low in stock, estimated next order date, monthly spending total
- **Inventory health timeline:** horizontal bar chart showing estimated days remaining per product, colour-coded by urgency (red < 7 days, amber 7–21 days, green > 21 days)
- **Recent AI alerts feed:** scrollable list of proactive alerts (weather warnings, low stock, price drops)
- **Quick action buttons:** "Order suggested items", "Ask AI" (opens chat panel)

#### Purchase history
- **Sortable, filterable table** of all historical orders (date, product, category, quantity, price, supplier)
- **Inline editing:** click any row to edit quantity, price, date, or supplier. Saves directly to SQLite
- **Add new order:** form to manually log a purchase made outside the system
- **Bulk import:** CSV upload to onboard existing purchase records
- **Spending analytics:** charts showing spending by category over time, YoY comparison, cost-per-head trends

#### Farm profile
- **Editable profile form:** farm name, region, farm type (dairy/beef/sheep/mixed), herd size, land area
- **Supplier directory:** add, edit, remove preferred suppliers with contact name, email, phone, product categories
- **WhatsApp connection status:** linked status and last message timestamp
- **Notification preferences:** configure alert types and frequency caps

#### Product catalogue and ordering
- **Browsable catalogue** with search and category filters
- **Product cards:** current estimated stock level, days until depletion, shelf life zone (red/yellow/green), last purchase date and price
- **One-click order:** select product → choose quantity → choose supplier → review summary → confirm → email sent
- **Order history tab:** track status (pending, confirmed, delivered)

#### AI insights panel
- **Embedded chat interface:** same AI as WhatsApp, in a web chat widget
- **Recommendation cards:** "Suggested orders this month" with reasoning
- **Spending optimisation tips:** personalised suggestions from purchase pattern analysis

### 8.2 Technical specifications

| Component | Specification |
|-----------|--------------|
| Frontend framework | React 18+ with functional components and hooks |
| UI library | Tailwind CSS for styling, Recharts for data visualisation |
| State management | React Query (TanStack Query) for server state, useState for local UI |
| Routing | React Router v6 |
| API communication | REST API calls to FastAPI backend (JSON over HTTP) |
| Build tool | Vite |
| Responsive design | Mobile-friendly; primary target is desktop/tablet for farm office use |

### 8.3 API endpoints (shared by WhatsApp bot and web dashboard)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/farm/{id}` | Retrieve farm profile |
| PUT | `/api/farm/{id}` | Update farm profile |
| GET | `/api/orders` | List purchase history (filters, pagination) |
| POST | `/api/orders` | Create new order record |
| PUT | `/api/orders/{id}` | Edit existing order |
| DELETE | `/api/orders/{id}` | Delete order record |
| GET | `/api/products` | List product catalogue with shelf-life metadata |
| GET | `/api/predictions` | Get depletion predictions for all tracked products |
| GET | `/api/recommendations` | Get AI-generated purchase recommendations |
| POST | `/api/place-order` | Send purchase order email to supplier |
| GET | `/api/spending` | Spending analytics (by category, time period) |
| GET | `/api/alerts` | List recent AI alerts |
| POST | `/api/chat` | Send message to AI chat (web chat widget) |

---

## 9. Data Model

### 9.1 Database

SQLite — single file, zero configuration, shared by WhatsApp bot and React dashboard. For production scaling beyond ~10,000 users, migrate to PostgreSQL with minimal schema changes.

### 9.2 Schema

#### `farms` table

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Unique identifier (UUID) |
| name | TEXT NOT NULL | Farm name |
| region | TEXT | Geographic region (e.g., Canterbury, Waikato) |
| farm_type | TEXT | dairy \| beef \| sheep \| mixed |
| herd_size | INTEGER | Number of livestock |
| land_area_ha | REAL | Land area in hectares |
| whatsapp_number | TEXT | Farmer's WhatsApp number |
| email | TEXT | Farmer's email for order confirmations |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

#### `suppliers` table

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| farm_id | TEXT FK → farms.id | Which farm this supplier belongs to |
| name | TEXT NOT NULL | Supplier name (e.g., Farmlands Ashburton) |
| contact_name | TEXT | Sales rep name |
| contact_email | TEXT | Email for purchase orders |
| contact_phone | TEXT | Phone number |
| categories | TEXT | JSON array of product categories they supply |

#### `orders` table (purchase history)

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| farm_id | TEXT FK → farms.id | Which farm |
| date | TEXT NOT NULL | Purchase date (ISO) |
| product_name | TEXT NOT NULL | Product name |
| category | TEXT NOT NULL | feed \| fertiliser \| veterinary \| chemical \| equipment |
| quantity | REAL NOT NULL | Amount purchased |
| unit | TEXT NOT NULL | kg \| L \| tonnes \| units |
| unit_price | REAL | Price per unit (NZD) |
| total_price | REAL | Total cost |
| supplier_id | TEXT FK → suppliers.id | Which supplier |
| notes | TEXT | Optional notes |
| created_at | TEXT | ISO timestamp |

#### `products` table (catalogue with shelf-life metadata)

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | Product name |
| category | TEXT NOT NULL | feed \| fertiliser \| veterinary \| chemical \| equipment |
| shelf_life_days | INTEGER | Shelf life in days (-1 = indefinite) |
| shelf_life_zone | TEXT | red \| yellow \| green |
| storage_requirements | TEXT | e.g., "dry, below 25°C" or "cold chain 2–7°C" |
| max_stock_factor | REAL | 0.5 for red, 0.67 for yellow, 1.0 for green |
| typical_unit | TEXT | kg \| L \| tonnes \| units |
| description | TEXT | Product description |

#### `alerts` table

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| farm_id | TEXT FK → farms.id | Which farm |
| type | TEXT NOT NULL | low_stock \| weather \| disease \| price_drop \| monthly_summary |
| title | TEXT NOT NULL | Alert headline |
| message | TEXT NOT NULL | Full alert message |
| product_id | TEXT FK → products.id | Related product (nullable) |
| status | TEXT | pending \| sent \| dismissed \| actioned |
| created_at | TEXT | ISO timestamp |

#### `placed_orders` table (orders sent to suppliers)

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| farm_id | TEXT FK → farms.id | Which farm |
| supplier_id | TEXT FK → suppliers.id | Which supplier |
| reference_number | TEXT | e.g., FS-2026-0315 |
| items | TEXT | JSON array of {product_name, quantity, unit, unit_price} |
| total_price | REAL | Order total |
| status | TEXT | pending \| email_sent \| confirmed \| delivered |
| email_sent_at | TEXT | When the order email was sent |
| channel | TEXT | whatsapp \| web | Where the order was placed from |
| created_at | TEXT | ISO timestamp |

---

## 10. Technical Architecture

### 10.1 Tech stack

| Component | Technology |
|-----------|-----------|
| Messaging channel | WhatsApp (personal bot connection for demo) |
| Backend | Python (FastAPI) with REST API endpoints |
| Frontend | React 18 + Vite + Tailwind CSS + Recharts |
| Database | SQLite (single file, shared by WhatsApp bot and web dashboard) |
| AI / LLM | Claude API (Sonnet) for conversation + intent classification |
| Email sending | SendGrid API or SMTP for purchase order emails |
| Weather data | Open-Meteo free API |
| Hosting | Local dev; ngrok tunnel for WhatsApp webhook; Vite dev server for React |

### 10.2 Project structure

```
farmstock-ai/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py           # SQLite connection + schema init
│   ├── models.py             # Pydantic models
│   ├── routers/
│   │   ├── farms.py          # Farm profile CRUD
│   │   ├── orders.py         # Purchase history CRUD
│   │   ├── products.py       # Product catalogue
│   │   ├── predictions.py    # Depletion predictions
│   │   ├── recommendations.py # AI recommendations
│   │   ├── alerts.py         # Alert management
│   │   ├── place_order.py    # Email order sending
│   │   ├── spending.py       # Spending analytics
│   │   └── chat.py           # AI chat endpoint
│   ├── ai/
│   │   ├── engine.py         # Claude API integration
│   │   ├── predictor.py      # Consumption predictor module
│   │   ├── recommender.py    # Product recommender module
│   │   └── price_optimizer.py # Price optimizer module
│   ├── whatsapp/
│   │   ├── webhook.py        # WhatsApp message handler
│   │   ├── sender.py         # Send WhatsApp messages
│   │   └── templates.py      # Message templates
│   ├── email/
│   │   └── order_email.py    # Purchase order email generator
│   ├── seed_data.py          # Generate mock data
│   └── farmstock.db          # SQLite database file
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── api/
│   │   │   └── client.js     # API client (fetch wrapper)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx  # Home overview
│   │   │   ├── Orders.jsx     # Purchase history CRUD
│   │   │   ├── FarmProfile.jsx # Farm profile editor
│   │   │   ├── Products.jsx   # Product catalogue + ordering
│   │   │   └── Insights.jsx   # AI insights + chat
│   │   └── components/
│   │       ├── MetricCard.jsx
│   │       ├── InventoryChart.jsx
│   │       ├── AlertFeed.jsx
│   │       ├── OrderTable.jsx
│   │       ├── OrderForm.jsx
│   │       ├── ProductCard.jsx
│   │       ├── ChatWidget.jsx
│   │       ├── SpendingChart.jsx
│   │       └── Layout.jsx     # Sidebar nav + header
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── PRD.md
└── README.md
```

### 10.3 Message flow (WhatsApp)

1. Farmer sends WhatsApp message to FarmStock AI number.
2. WhatsApp webhook forwards message to FastAPI backend.
3. Backend queries SQLite for farmer's profile and order history.
4. Claude API receives message + context, classifies intent, calls AI modules.
5. Response sent back to farmer via WhatsApp with action buttons.
6. If user confirms order: backend generates email and sends via SendGrid to supplier.
7. Order logged to SQLite database (feeds back into prediction model; visible on web dashboard).

### 10.4 Web dashboard flow

1. Farmer opens web dashboard in browser.
2. React frontend fetches data from FastAPI REST endpoints.
3. Farmer views analytics, edits purchase history, or updates farm profile.
4. Changes persisted to SQLite via PUT/POST API calls.
5. One-click order: farmer selects product, confirms quantity, backend sends email to supplier.
6. WhatsApp bot and web dashboard always reflect the same data (shared SQLite).

### 10.5 Proactive push mechanism (demo)

- Scheduled timer (cron-like) checks depletion predictions daily
- Manual trigger endpoint (`POST /api/trigger-alert/{type}`) for live demo
- Simulated weather and disease events hardcoded for demo scenario

---

## 11. Hackathon Scope & Timeline (24 hours)

### 11.1 MVP features

| Priority | Feature | Time | Deliverable |
|----------|---------|------|-------------|
| P0 | SQLite schema + seed data: 2–3 years of NZ dairy farm orders | 0–2h | Database file |
| P0 | FastAPI backend with REST endpoints + WhatsApp webhook | 2–5h | Running API |
| P0 | Consumption predictor + conversational AI (Claude API) | 5–9h | AI modules |
| P0 | WhatsApp bot: query, order confirm, spending report | 9–12h | Working bot |
| P0 | React dashboard: home overview + purchase history table with CRUD | 12–16h | Web UI |
| P0 | React dashboard: farm profile editor + one-click ordering | 16–18h | Web UI |
| P0 | Proactive alert demo (weather + low stock push via WhatsApp) | 18–20h | Push alerts |
| P0 | Email order generation (SendGrid) | 20–21h | Real emails |
| P1 | React dashboard: spending charts + AI insights panel | 21–23h | Charts |
| — | Polish demo flow, prepare 3-minute pitch | 23–24h | Presentation |

### 11.2 Demo story arc (3-minute pitch)

1. **Morning (WhatsApp):** Farmer sees low-stock alert for drench. Replies "order" → email sent to supplier.
2. **Mid-morning (Web):** Opens dashboard, reviews inventory health chart, edits last month's hay purchase with wrong quantity.
3. **Midday (WhatsApp):** Bot pushes weather alert — cold snap coming. Suggests ordering extra feed pellets.
4. **Afternoon (Web):** Browses product catalogue, one-click orders mineral lick blocks. Views spending chart.
5. **Evening (WhatsApp):** Asks "how much did I spend on feed this summer?" → gets breakdown with savings tips.

### 11.3 Out of scope (future roadmap)

- Real supplier API integration (Farmlands, PGG Wrightson)
- IoT sensor data integration (feed silo, water tank levels)
- Multi-user / farm team collaboration with role-based access
- Payment processing within WhatsApp or web dashboard
- Telegram and SMS channel support
- Native mobile app (React Native)
- Multi-farm portfolio management

---

## 12. Success Metrics

### 12.1 Hackathon demo success

- All 5 WhatsApp conversation scenarios work end-to-end
- Web dashboard loads with real-time data from SQLite
- Purchase history CRUD works on web dashboard
- Farm profile editable on web; changes reflect in WhatsApp bot context
- One-click ordering works from both WhatsApp and web
- At least 1 proactive push alert fires during demo
- A real purchase order email is sent and received
- Shelf-life rules visibly influence a recommendation

### 12.2 Production success metrics (future)

| Metric | Target (6 months) | Measurement |
|--------|-------------------|-------------|
| User adoption | 500 active farm users | Monthly active WhatsApp conversations |
| Order conversion rate | >40% of recommendations | Orders confirmed / recommendations sent |
| Cost savings per farm | >$2,000/year | Optimised purchasing vs historical spending |
| Emergency order reduction | >50% decrease | Rush/premium orders vs total orders |
| User satisfaction (NPS) | >60 | Post-interaction survey |

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| WhatsApp Business API policy changes | May restrict AI messaging | Bot performs specific business tasks (ordering, alerts), fully compliant with 2026 policy |
| Inaccurate predictions with limited data | Bad recommendations erode trust | Transparent confidence levels; AI explains reasoning |
| Supplier email orders not processed | Orders lost | Confirmation tracking; follow-up reminder if no response in 24h |
| Over-stocking perishable items | Financial waste | Shelf-life rules are hard-coded safety rails |
| Low internet connectivity on farms | Messages fail | WhatsApp handles offline queueing; web dashboard works on cached data |

---

## 14. Appendix

### 14.1 Competitive landscape

No direct competitor offers AI-driven automated ordering of farm supplies via messaging in NZ/AU. Adjacent products:

- **Farmlands FarmlandsPRO** — online ordering portal (no AI, no prediction)
- **AgriWebb** — livestock management software (no supply ordering)
- **AgriEID (NZ)** — farm software with AI chatbot (livestock management, not supply ordering)
- **AgriERP** — enterprise farm ERP with AI inventory alerts (too complex/expensive for small farms)

**FarmStock AI's unique position:** the only product combining purchase prediction + messaging-native UX + web dashboard + supplier email integration at a price point accessible to small-medium farms.

### 14.2 NZ/AU farm supply ecosystem

- **Farmlands (NZ)** — largest rural cooperative, full range of farm supplies
- **PGG Wrightson (NZ)** — major supplier of ag chemicals, fertiliser, livestock supplies
- **Elders (AU)** — Australia's leading agribusiness
- **Nutrien Ag Solutions (AU)** — fertiliser and crop protection
- Local cooperatives and direct manufacturer channels
