#!/bin/bash
# ============================================================
# FarmStock AI — Overnight Autonomous Build Script (macOS)
# ============================================================
#
# Usage:
#   1. mkdir farmstock-ai && cd farmstock-ai
#   2. Put this script + PRD.md in the folder
#   3. chmod +x build-overnight.sh
#   4. ./build-overnight.sh          (foreground, watch logs)
#      OR
#      nohup ./build-overnight.sh > build-log.txt 2>&1 &   (background, go sleep)
#
# Morning check:
#   tail -100 build-log.txt
#   cat build-results.md
#   ls build-logs/
#   git log --oneline
#
# Prerequisites:
#   - Claude Code CLI installed (npm install -g @anthropic-ai/claude-code)
#   - Node.js 18+  (brew install node)
#   - Python 3.11+ (brew install python)
#   - ANTHROPIC_API_KEY set in env or .env file
#
# Cost estimate: $5-15 USD normal / $25 max with budget cap
# ============================================================

# ── DO NOT use set -e ──
# We want ALL phases to run even if earlier ones fail.
# Each phase is logged independently so you can debug in the morning.

# ── Configuration ──
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_DIR/build-logs"
RESULTS_FILE="$PROJECT_DIR/build-results.md"

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Track results ──
declare -a PHASE_NAMES
declare -a PHASE_RESULTS
TOTAL_PHASES=0
PASSED_PHASES=0
FAILED_PHASES=0
START_TIME=$(date +%s)

# ── Helper functions ──
log_phase() {
    echo ""
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}  [$(date '+%H:%M:%S')] PHASE $1: $2${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
}

log_success() {
    echo -e "${GREEN}  [$(date '+%H:%M:%S')] ✓ $1${NC}"
}

log_error() {
    echo -e "${RED}  [$(date '+%H:%M:%S')] ✗ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}  [$(date '+%H:%M:%S')] $1${NC}"
}

log_dim() {
    echo -e "${CYAN}  [$(date '+%H:%M:%S')] $1${NC}"
}

run_phase() {
    local phase_num=$1
    local phase_name=$2
    local prompt=$3
    local max_turns=${4:-50}
    local log_file="$LOG_DIR/${phase_num}_${phase_name}.txt"

    TOTAL_PHASES=$((TOTAL_PHASES + 1))
    PHASE_NAMES+=("$phase_num: $phase_name")

    log_info "Prompt length: ${#prompt} chars | Max turns: $max_turns"
    log_info "Log file: $log_file"
    echo ""

    local phase_start=$(date +%s)

    if claude -p "$prompt" \
        --allowedTools "Read" "Write" "Edit" "Bash" \
        --max-turns "$max_turns" \
        > "$log_file" 2>&1; then

        local phase_end=$(date +%s)
        local phase_duration=$(( phase_end - phase_start ))
        local phase_min=$(( phase_duration / 60 ))
        local phase_sec=$(( phase_duration % 60 ))

        log_success "$phase_name completed (${phase_min}m ${phase_sec}s)"
        PHASE_RESULTS+=("PASS")
        PASSED_PHASES=$((PASSED_PHASES + 1))
    else
        local exit_code=$?
        local phase_end=$(date +%s)
        local phase_duration=$(( phase_end - phase_start ))
        local phase_min=$(( phase_duration / 60 ))
        local phase_sec=$(( phase_duration % 60 ))

        log_error "$phase_name FAILED (exit $exit_code, ${phase_min}m ${phase_sec}s)"
        log_error "Check log: $log_file"
        PHASE_RESULTS+=("FAIL")
        FAILED_PHASES=$((FAILED_PHASES + 1))
    fi

    # Git commit after every phase
    cd "$PROJECT_DIR"
    git add -A 2>/dev/null
    git commit -m "phase ${phase_num}: ${phase_name} [${PHASE_RESULTS[-1]}]" --allow-empty -q 2>/dev/null
    log_dim "Git committed: phase ${phase_num}"
    echo ""
}

# ============================================================
# PRE-FLIGHT CHECKS
# ============================================================
echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  FarmStock AI — Overnight Autonomous Build${NC}"
echo -e "${BLUE}  Started: $(date)${NC}"
echo -e "${BLUE}  Project: $PROJECT_DIR${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

MISSING=""
if ! command -v claude &> /dev/null; then MISSING="$MISSING claude(npm install -g @anthropic-ai/claude-code)"; fi
if ! command -v node &> /dev/null; then MISSING="$MISSING node(brew install node)"; fi
if ! command -v python3 &> /dev/null; then MISSING="$MISSING python3(brew install python)"; fi
if ! command -v git &> /dev/null; then MISSING="$MISSING git(xcode-select --install)"; fi

if [ -n "$MISSING" ]; then
    log_error "Missing tools:$MISSING"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/PRD.md" ]; then
    log_error "PRD.md not found! Place it at: $PROJECT_DIR/PRD.md"
    exit 1
fi

log_success "Prerequisites OK"
log_dim "Claude: $(which claude)"
log_dim "Node:   $(node --version)"
log_dim "Python: $(python3 --version)"

mkdir -p "$LOG_DIR"

# ── Git init ──
cd "$PROJECT_DIR"
if [ ! -d .git ]; then
    git init -q
    cat > .gitignore << 'GITIGNORE'
node_modules/
__pycache__/
*.pyc
.env
*.db
build-logs/
.DS_Store
dist/
GITIGNORE
    git add -A
    git commit -m "initial: PRD.md + build script" -q
    log_success "Git repo initialized"
else
    log_dim "Git repo already exists"
fi

# ── Keep macOS awake ──
caffeinate -i -w $$ &
CAFFEINATE_PID=$!
log_success "macOS sleep disabled (caffeinate PID: $CAFFEINATE_PID)"

echo ""
log_info "Starting 7-phase autonomous build..."
log_info "Estimated time: 2-4 hours"
log_info "You can safely close the terminal if using nohup"
echo ""


# ============================================================
# PHASE 1: Project scaffold + database + seed data
# ============================================================
log_phase "1/7" "Database schema + seed data"

run_phase "01" "database" \
"You are building a project called FarmStock AI. Read PRD.md thoroughly first — it is the single source of truth.

YOUR TASK FOR THIS PHASE: Set up the project scaffold, SQLite database, and seed data.

STEP 1 — Create directory structure:
  backend/
  backend/routers/
  backend/ai/
  backend/whatsapp/
  backend/email/
  frontend/    (empty for now, will be built in a later phase)

STEP 2 — Create backend/database.py:
  - Use Python's built-in sqlite3 module
  - Create all 6 tables exactly as defined in PRD.md section 9.2:
    farms, suppliers, orders, products, alerts, placed_orders
  - Include an init_db() function that creates tables if they don't exist
  - Include helper functions: get_db_connection(), execute_query()
  - Database file path: backend/farmstock.db

STEP 3 — Create backend/models.py:
  - Pydantic BaseModel classes for all entities
  - Include both input models (for POST/PUT) and response models
  - Use Optional[] for nullable fields

STEP 4 — Create requirements.txt:
  fastapi
  uvicorn[standard]
  anthropic
  python-dotenv
  httpx
  pydantic

STEP 5 — Create backend/seed_data.py:
  - Generate realistic data for ONE NZ dairy farm:
    - Farm: 'Greenfield Dairy', Canterbury region, 480 cows, 320 hectares
    - 3 suppliers: Farmlands Ashburton, PGG Wrightson Ashburton, Canterbury Vet Services
  - Product catalogue: at least 20 products across all 5 categories with correct shelf_life_days and shelf_life_zone from PRD section 5.1
  - Purchase history: 2.5 years (Jul 2023 — Mar 2026), ~150-200 orders
    - Seasonal patterns: more feed in NZ winter (Jun-Aug), fertiliser in spring (Sep-Nov)
    - Realistic NZ prices in NZD
    - Varied quantities that make sense for a 480-cow dairy farm
  - Run init_db() then insert all seed data
  - Print summary of what was inserted

STEP 6 — Run and verify:
  cd backend && python3 seed_data.py
  Verify the database file exists and has data.

DO NOT create the FastAPI app yet — that is the next phase." \
60


# ============================================================
# PHASE 2: FastAPI backend with all REST endpoints
# ============================================================
log_phase "2/7" "FastAPI backend + REST endpoints"

run_phase "02" "backend_api" \
"You are building FarmStock AI. Read PRD.md — focus on sections 8.3 (API endpoints) and 10.2 (project structure).

The database and models already exist in backend/database.py and backend/models.py. The database is seeded at backend/farmstock.db. Read these files first to understand the schema.

YOUR TASK: Build the complete FastAPI backend.

STEP 1 — Create backend/main.py:
  - FastAPI app instance
  - CORS middleware allowing origins: http://localhost:5173, http://127.0.0.1:5173
  - Include all routers with prefix /api
  - On startup, call init_db()
  - GET /api/health returns {status: 'ok', timestamp: ...}

STEP 2 — Create each router file in backend/routers/:

  farms.py:
    GET  /api/farm/{farm_id}  — return farm profile with suppliers
    PUT  /api/farm/{farm_id}  — update farm profile fields

  orders.py:
    GET    /api/orders?farm_id=...&category=...&date_from=...&date_to=...&limit=50&offset=0
    POST   /api/orders         — create new order, return created record
    PUT    /api/orders/{id}    — update order fields
    DELETE /api/orders/{id}    — delete order

  products.py:
    GET /api/products?category=...  — list products with shelf-life metadata

  predictions.py:
    GET /api/predictions?farm_id=...
    — For each product the farm has ordered:
      1. Query all orders of that product, sorted by date
      2. Calculate average_interval_days between consecutive orders
      3. days_since_last_order = today - last_order_date
      4. estimated_days_remaining = average_interval_days - days_since_last_order
      5. Return: product_name, category, last_order_date, average_interval_days, estimated_days_remaining, urgency (red < 7 / amber 7-21 / green > 21), recommended_order_date

  recommendations.py:
    GET /api/recommendations?farm_id=...
    — Products in red zone → 'Order urgently'
    — Products in amber zone → 'Order soon'
    — Categories not ordered in 90+ days → 'You may need to restock'
    — Return list of {product_name, reason, urgency, suggested_quantity, estimated_price}

  spending.py:
    GET /api/spending?farm_id=...&period=month|quarter|year
    — Aggregate spending by category
    — Include YoY comparison
    — Return {period, total, by_category: [{category, amount, pct, yoy_change}]}

  alerts.py:
    GET  /api/alerts?farm_id=...
    POST /api/trigger-alert/low-stock?farm_id=...
    POST /api/trigger-alert/weather?farm_id=...
    POST /api/trigger-alert/price-drop?farm_id=...

  place_order.py:
    POST /api/place-order
    — Creates placed_order record, generates reference number FS-2026-XXXX
    — Returns {reference_number, status, total_price}

  chat.py:
    POST /api/chat  — accepts {farm_id, message}
    — Placeholder for now: return {response: 'AI will be connected in phase 3', actions: []}

STEP 3 — Add empty __init__.py in backend/ and backend/routers/.

STEP 4 — Test:
  cd backend
  pip3 install -r requirements.txt --break-system-packages 2>/dev/null || pip3 install -r requirements.txt
  python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
  sleep 3
  curl -s http://localhost:8000/api/health
  curl -s 'http://localhost:8000/api/predictions?farm_id=farm_001' | python3 -m json.tool | head -30
  kill %1 2>/dev/null

Fix any errors before finishing." \
80


# ============================================================
# PHASE 3: AI engine — Claude API integration
# ============================================================
log_phase "3/7" "AI engine + Claude API"

run_phase "03" "ai_engine" \
"You are building FarmStock AI. Read PRD.md sections 4.2 and 7.

Read existing code: backend/database.py, backend/models.py, backend/routers/predictions.py, backend/routers/recommendations.py.

YOUR TASK: Build the AI engine powered by Claude API.

STEP 1 — Create backend/ai/__init__.py (empty).

STEP 2 — Create backend/ai/predictor.py:
  - Function: get_predictions(farm_id) -> list[dict]
  - Same logic as predictions router, returns structured data
  - Seasonal adjustment: if current month Jun/Jul/Aug, multiply feed consumption by 1.35

STEP 3 — Create backend/ai/recommender.py:
  - Function: get_recommendations(farm_id) -> list[dict]
  - Shelf-life aware logic:
    Green zone: 'Safe to bulk buy'
    Yellow zone: 'Max 2-3 months supply'
    Red zone: 'Just-in-time only'

STEP 4 — Create backend/ai/engine.py:
  - Uses anthropic SDK
  - Loads ANTHROPIC_API_KEY from env or .env
  - Function: process_chat(farm_id, user_message) -> {response: str, actions: list}
  - System prompt includes: farm profile, top 5 urgent predictions, shelf-life rules
  - Model: claude-sonnet-4-20250514
  - If no API key: return {response: 'AI chat requires ANTHROPIC_API_KEY in .env file', actions: []}

STEP 5 — Update backend/routers/chat.py to call process_chat().

STEP 6 — Create .env.example with ANTHROPIC_API_KEY placeholder." \
60


# ============================================================
# PHASE 4: React frontend — scaffold + dashboard + orders
# ============================================================
log_phase "4/7" "React frontend — setup + dashboard + orders"

run_phase "04" "frontend_core" \
"You are building FarmStock AI. Read PRD.md section 8 carefully.

YOUR TASK: Create the React frontend with the two most important pages.

STEP 1 — Scaffold React project:
  cd frontend
  npm create vite@latest . -- --template react
  npm install
  npm install react-router-dom @tanstack/react-query recharts
  npm install -D tailwindcss @tailwindcss/vite

STEP 2 — Configure:
  - vite.config.js: add tailwindcss plugin AND proxy /api to http://localhost:8000
  - src/index.css: replace with: @import 'tailwindcss';
  - Delete App.css and default boilerplate content

STEP 3 — Create src/api/client.js:
  Export async functions for all API calls using fetch() with /api prefix.

STEP 4 — Create src/components/Layout.jsx:
  - Sidebar nav: Dashboard, Purchase History, Farm Profile, Products, AI Insights
  - Green/earth colour theme (use Tailwind: green-700, green-50, amber accents)
  - Top bar with 'FarmStock AI' title

STEP 5 — Create src/pages/Dashboard.jsx:
  - 4 metric cards (grid): tracked products, red zone items, next order date, monthly spending
  - Inventory health bar chart (Recharts): days remaining per product, colour by urgency
  - Recent alerts list
  - Use @tanstack/react-query useQuery hooks

STEP 6 — Create src/pages/Orders.jsx:
  - Filterable table of all orders
  - Add/edit/delete with modal or inline forms
  - All CRUD via API client

STEP 7 — Set up App.jsx with QueryClientProvider + BrowserRouter + Layout.
  Default farm_id = 'farm_001'.

STEP 8 — Test: npm run build (must succeed with no errors)." \
100


# ============================================================
# PHASE 5: React frontend — remaining pages
# ============================================================
log_phase "5/7" "React frontend — profile, products, insights"

run_phase "05" "frontend_pages" \
"You are building FarmStock AI. Read PRD.md section 8.

Read existing frontend code in frontend/src/ first. Match the patterns exactly.

YOUR TASK: Build the remaining 3 pages.

STEP 1 — Create src/pages/FarmProfile.jsx:
  - Editable form: farm name, region dropdown, type dropdown, herd size, land area, email
  - Save button calls PUT /api/farm/farm_001
  - Supplier directory: display supplier cards (read-only for MVP)

STEP 2 — Create src/pages/Products.jsx:
  - Product cards grid with search + category filter
  - Each card: name, category badge, shelf-life zone badge (coloured), days remaining, last price
  - Click card → order modal: quantity, supplier dropdown, total estimate, confirm button
  - Shelf-life warning in modal for yellow/red zone items
  - POST /api/place-order on confirm

STEP 3 — Create src/pages/Insights.jsx:
  - Spending chart: Recharts BarChart by category over time
  - AI recommendation cards from /api/recommendations
  - Chat widget: input + message bubbles, calls POST /api/chat

STEP 4 — Test: npm run build (must succeed)." \
100


# ============================================================
# PHASE 6: WhatsApp bot message handling
# ============================================================
log_phase "6/7" "WhatsApp bot layer"

run_phase "06" "whatsapp" \
"You are building FarmStock AI. Read PRD.md sections 7 and 10.3.

Read existing: backend/ai/engine.py, backend/main.py, backend/routers/.

YOUR TASK: Build WhatsApp bot message handling.

STEP 1 — Create backend/whatsapp/__init__.py (empty).

STEP 2 — Create backend/whatsapp/templates.py:
  Template functions returning formatted WhatsApp messages:
  - format_stock_status(predictions) — use *bold* markers for WhatsApp
  - format_weather_alert(alert_data)
  - format_price_drop(product, old_price, new_price, savings)
  - format_order_confirmation(order)
  - format_spending_report(spending_data)

STEP 3 — Create backend/whatsapp/sender.py:
  - send_message(phone, msg) → print to stdout + save to alert DB
  - send_alert(farm_id, alert_type) → generate from templates

STEP 4 — Create backend/whatsapp/webhook.py (FastAPI router):
  POST /api/whatsapp/webhook — accepts {from_number, message}, calls AI engine, returns reply
  GET  /api/whatsapp/webhook — returns 200 OK

STEP 5 — Update alert trigger endpoints to use templates and return formatted messages.

STEP 6 — Register webhook router in main.py.

STEP 7 — Test:
  curl -X POST localhost:8000/api/whatsapp/webhook -H 'Content-Type: application/json' -d '{\"from_number\":\"+6421000000\",\"message\":\"When should I reorder drench?\"}'
  curl -X POST 'localhost:8000/api/trigger-alert/weather?farm_id=farm_001'" \
60


# ============================================================
# PHASE 7: Email + integration + README
# ============================================================
log_phase "7/7" "Email + integration + README"

run_phase "07" "integration" \
"You are building FarmStock AI. Read PRD.md. Read ALL existing code in backend/ and frontend/src/.

YOUR TASK: Email ordering, README, integration testing, bug fixes.

STEP 1 — Create backend/email/__init__.py (empty).

STEP 2 — Create backend/email/order_email.py:
  - generate_order_email(placed_order, farm, supplier) → {subject, html_body}
  - Professional HTML template with order table, totals, delivery info
  - save_email_to_file(subject, html, ref) → save to backend/sent_emails/{ref}.html
  - send_email(to, subject, html) → SMTP if configured, else save to file

STEP 3 — Update place_order.py to generate and save email on order.

STEP 4 — Create README.md with quick start, demo commands, env vars.

STEP 5 — Integration testing:
  cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
  sleep 3
  curl -s localhost:8000/api/health
  curl -s 'localhost:8000/api/predictions?farm_id=farm_001'
  curl -s 'localhost:8000/api/recommendations?farm_id=farm_001'
  curl -s -X POST 'localhost:8000/api/trigger-alert/low-stock?farm_id=farm_001'
  cd ../frontend && npm run build
  kill %1 2>/dev/null
  Fix any bugs found.

STEP 6 — Create build-results.md summarizing what works, what needs config, known issues." \
60


# ============================================================
# BUILD COMPLETE
# ============================================================
END_TIME=$(date +%s)
TOTAL_DURATION=$(( END_TIME - START_TIME ))
TOTAL_HOURS=$(( TOTAL_DURATION / 3600 ))
TOTAL_MIN=$(( (TOTAL_DURATION % 3600) / 60 ))

echo ""
echo -e "${BLUE}============================================================${NC}"
if [ $FAILED_PHASES -eq 0 ]; then
    echo -e "${GREEN}  BUILD COMPLETE — ALL PHASES PASSED${NC}"
else
    echo -e "${YELLOW}  BUILD COMPLETE — $PASSED_PHASES/$TOTAL_PHASES phases passed${NC}"
fi
echo -e "${BLUE}  Duration: ${TOTAL_HOURS}h ${TOTAL_MIN}m${NC}"
echo -e "${BLUE}  Finished: $(date)${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

echo "  Phase Results:"
for i in "${!PHASE_NAMES[@]}"; do
    if [ "${PHASE_RESULTS[$i]}" = "PASS" ]; then
        echo -e "    ${GREEN}✓ ${PHASE_NAMES[$i]}${NC}"
    else
        echo -e "    ${RED}✗ ${PHASE_NAMES[$i]}${NC}"
    fi
done

echo ""
echo "  Logs:     $LOG_DIR/"
echo "  Results:  build-results.md"
echo "  Git log:  git log --oneline"
echo ""
echo "  Quick start:"
echo "    cd $PROJECT_DIR"
echo "    echo 'ANTHROPIC_API_KEY=your_key' > .env"
echo "    cd backend && python3 -m uvicorn main:app --reload --port 8000"
echo "    cd ../frontend && npm install && npm run dev"
echo "    open http://localhost:5173"
echo ""

# Write fallback summary
cat > "$RESULTS_FILE.summary" << SUMMARY
# FarmStock AI — Build Summary
Generated: $(date)
Duration: ${TOTAL_HOURS}h ${TOTAL_MIN}m
Phases: $PASSED_PHASES passed / $FAILED_PHASES failed / $TOTAL_PHASES total

## Phase Results
$(for i in "${!PHASE_NAMES[@]}"; do echo "- [${PHASE_RESULTS[$i]}] ${PHASE_NAMES[$i]}"; done)

## Next Steps
1. Create .env with ANTHROPIC_API_KEY
2. cd backend && python3 -m uvicorn main:app --reload --port 8000
3. cd frontend && npm install && npm run dev
4. Open http://localhost:5173
5. Test key flows, fix any issues
6. Configure WhatsApp connection manually

## Recovery Commands
- View phase logs: cat build-logs/01_database.txt
- Git history: git log --oneline
- Revert broken phase: git revert HEAD
- Re-run single phase: copy the prompt from this script and run claude -p "..." --allowedTools "Read" "Write" "Edit" "Bash"
SUMMARY

# Final git commit
cd "$PROJECT_DIR"
git add -A 2>/dev/null
git commit -m "build complete: $PASSED_PHASES/$TOTAL_PHASES phases passed" --allow-empty -q 2>/dev/null

# macOS notification
osascript -e "display notification \"$PASSED_PHASES/$TOTAL_PHASES phases passed in ${TOTAL_HOURS}h ${TOTAL_MIN}m\" with title \"FarmStock AI Build\" sound name \"Glass\"" 2>/dev/null

echo -e "${GREEN}  Done! Good morning :)${NC}"
echo ""
