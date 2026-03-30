# Price Benchmark Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a price comparison dashboard to the Orders page that shows anonymised regional price benchmarks for a selected product, including metric cards, a percentile ranking, and a historical trend chart.

**Architecture:** New `price_benchmark` router on the backend computes aggregates from cross-farm order data scoped to the current farm's region. A new `PriceBenchmarkPanel` component sits at the top of the Orders page grid, driven by supplier + product selectors and a React Query fetch.

**Tech Stack:** FastAPI + SQLite (backend), React + React Query + recharts (frontend), existing CSS class system (no inline styles except runtime-dynamic values).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `backend/routers/price_benchmark.py` | Benchmark computation + GET endpoint |
| Create | `backend/tests/test_price_benchmark.py` | Pure-function tests for benchmark logic |
| Modify | `backend/main.py` | Register new router |
| Modify | `frontend/src/api/client.js` | Add `getPriceBenchmark` method |
| Modify | `frontend/src/api/queryKeys.js` | Add `priceBenchmark` key factory |
| Create | `frontend/src/components/PriceBenchmarkPanel.jsx` | Benchmark panel UI |
| Modify | `frontend/src/styles/pages.css` | CSS classes for benchmark panel |
| Modify | `frontend/src/pages/Orders.jsx` | Render panel at top of page-grid |

---

## Task 1: Backend — benchmark computation logic

**Files:**
- Create: `backend/routers/price_benchmark.py`
- Create: `backend/tests/test_price_benchmark.py`

### Step 1.1: Write the failing tests

Create `backend/tests/test_price_benchmark.py`:

```python
import sqlite3
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))


def get_test_db():
    from backend.database import init_db
    conn = sqlite3.connect(':memory:')
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    init_db(conn)
    return conn


def _seed(conn, farms, orders):
    """Insert farms and orders for testing. farms: list of (id, region). orders: list of (farm_id, product_name, unit_price, date, unit)."""
    import uuid
    now = "2026-01-01T00:00:00"
    for farm_id, region in farms:
        conn.execute(
            "INSERT INTO users (id, email, hashed_password, trial_ends_at, subscription_status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
            (farm_id + "-user", farm_id + "@test.com", "x", now, "active", now, now)
        )
        conn.execute(
            "INSERT INTO farms (id, user_id, name, region, created_at, updated_at) VALUES (?,?,?,?,?,?)",
            (farm_id, farm_id + "-user", farm_id, region, now, now)
        )
    for farm_id, product_name, unit_price, date, unit in orders:
        conn.execute(
            "INSERT INTO orders (id, farm_id, date, product_name, category, quantity, unit, unit_price, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (str(uuid.uuid4()), farm_id, date, product_name, "feed", 100, unit, unit_price, now)
        )
    conn.commit()


def test_compute_benchmark_returns_aggregates():
    from backend.routers.price_benchmark import compute_benchmark
    conn = get_test_db()
    _seed(conn,
        farms=[("farm-a", "Waikato"), ("farm-b", "Waikato"), ("farm-c", "Waikato")],
        orders=[
            ("farm-a", "Mixed Grain", 0.80, "2026-01-01", "kg"),
            ("farm-b", "Mixed Grain", 1.00, "2026-01-01", "kg"),
            ("farm-c", "Mixed Grain", 0.60, "2026-01-01", "kg"),
        ]
    )
    result = compute_benchmark(conn, "farm-a", "Waikato", "Mixed Grain")
    assert result["data_available"] is True
    assert result["farm_count"] == 3
    assert abs(result["regional_avg"] - 0.80) < 0.01
    assert abs(result["regional_min"] - 0.60) < 0.01
    assert abs(result["regional_max"] - 1.00) < 0.01
    assert result["your_latest_price"] == 0.80
    # farm-a pays 0.80; farm-b pays 1.00 (higher), farm-c pays 0.60 (lower)
    # 1 out of 2 other farms pays more → 50th percentile
    assert result["your_percentile"] == 50


def test_compute_benchmark_case_insensitive():
    from backend.routers.price_benchmark import compute_benchmark
    conn = get_test_db()
    _seed(conn,
        farms=[("farm-a", "Waikato"), ("farm-b", "Waikato"), ("farm-c", "Waikato")],
        orders=[
            ("farm-a", "mixed grain", 0.80, "2026-01-01", "kg"),
            ("farm-b", "Mixed Grain", 1.00, "2026-01-01", "kg"),
            ("farm-c", "MIXED GRAIN", 0.60, "2026-01-01", "kg"),
        ]
    )
    result = compute_benchmark(conn, "farm-a", "Waikato", "Mixed Grain")
    assert result["farm_count"] == 3


def test_compute_benchmark_below_threshold_hides_regional_data():
    from backend.routers.price_benchmark import compute_benchmark
    conn = get_test_db()
    _seed(conn,
        farms=[("farm-a", "Southland"), ("farm-b", "Southland")],
        orders=[
            ("farm-a", "Mixed Grain", 0.80, "2026-01-01", "kg"),
            ("farm-b", "Mixed Grain", 1.00, "2026-01-01", "kg"),
        ]
    )
    result = compute_benchmark(conn, "farm-a", "Southland", "Mixed Grain")
    assert result["data_available"] is False
    # trend should still be present for current farm
    assert len(result["trend"]) == 1


def test_compute_benchmark_trend_ordered_by_date():
    from backend.routers.price_benchmark import compute_benchmark
    conn = get_test_db()
    _seed(conn,
        farms=[("farm-a", "Waikato"), ("farm-b", "Waikato"), ("farm-c", "Waikato")],
        orders=[
            ("farm-a", "Mixed Grain", 0.90, "2026-03-01", "kg"),
            ("farm-a", "Mixed Grain", 0.80, "2026-01-01", "kg"),
            ("farm-b", "Mixed Grain", 1.00, "2026-01-01", "kg"),
            ("farm-c", "Mixed Grain", 0.60, "2026-01-01", "kg"),
        ]
    )
    result = compute_benchmark(conn, "farm-a", "Waikato", "Mixed Grain")
    dates = [t["date"] for t in result["trend"]]
    assert dates == sorted(dates)
    assert result["your_latest_price"] == 0.90


def test_compute_benchmark_no_region_returns_unavailable():
    from backend.routers.price_benchmark import compute_benchmark
    conn = get_test_db()
    _seed(conn,
        farms=[("farm-a", None)],
        orders=[("farm-a", "Mixed Grain", 0.80, "2026-01-01", "kg")]
    )
    result = compute_benchmark(conn, "farm-a", None, "Mixed Grain")
    assert result["data_available"] is False
```

### Step 1.2: Run tests to confirm they fail

```bash
cd /var/www/Farmstock-AI && python -m pytest backend/tests/test_price_benchmark.py -v 2>&1 | head -40
```

Expected: `ImportError` or `ModuleNotFoundError` — `price_benchmark` does not exist yet.

### Step 1.3: Implement `backend/routers/price_benchmark.py`

```python
"""
Regional price benchmark endpoint.

Returns anonymised cross-farm price aggregates for a named product
within the current farm's region. Only surfaces data when at least
3 distinct farms have matching orders (privacy threshold).
"""
from typing import Optional
from fastapi import APIRouter, Query, Depends
from ..database import get_db
from ..auth import get_user_farm

router = APIRouter()

_MIN_FARMS = 3  # minimum distinct farms before regional data is shown


def compute_benchmark(conn, farm_id: str, farm_region: Optional[str], product_name: str, supplier_id: Optional[str] = None) -> dict:
    """
    Pure computation function — accepts an open DB connection so it can be
    called from tests with an in-memory DB.

    Returns a dict matching the API response schema.
    """
    # --- Current farm's own trend (always returned) ---
    trend_query = """
        SELECT date, unit_price, unit
        FROM orders
        WHERE farm_id = ?
          AND LOWER(product_name) = LOWER(?)
          AND unit_price IS NOT NULL
    """
    trend_params: list = [farm_id, product_name]

    if supplier_id:
        trend_query += " AND supplier_id = ?"
        trend_params.append(supplier_id)

    trend_query += " ORDER BY date ASC"
    trend_rows = conn.execute(trend_query, trend_params).fetchall()
    trend = [{"date": r["date"], "unit_price": r["unit_price"]} for r in trend_rows]

    your_latest_price = trend_rows[-1]["unit_price"] if trend_rows else None
    unit = trend_rows[-1]["unit"] if trend_rows else None

    base = {
        "product_name": product_name,
        "region": farm_region,
        "unit": unit,
        "farm_count": 0,
        "regional_avg": None,
        "regional_min": None,
        "regional_max": None,
        "your_latest_price": your_latest_price,
        "your_percentile": None,
        "trend": trend,
        "data_available": False,
    }

    if not farm_region:
        return base

    # --- Cross-farm regional aggregates ---
    regional_rows = conn.execute("""
        SELECT o.farm_id, o.unit_price, o.date
        FROM orders o
        JOIN farms f ON f.id = o.farm_id
        WHERE LOWER(o.product_name) = LOWER(?)
          AND f.region = ?
          AND o.unit_price IS NOT NULL
        ORDER BY o.farm_id, o.date DESC
    """, (product_name, farm_region)).fetchall()

    if not regional_rows:
        return base

    # Distinct farm count
    farm_ids = {r["farm_id"] for r in regional_rows}
    farm_count = len(farm_ids)

    if farm_count < _MIN_FARMS:
        base["farm_count"] = farm_count
        return base

    # Aggregates across all matching rows
    prices = [r["unit_price"] for r in regional_rows]
    regional_avg = round(sum(prices) / len(prices), 4)
    regional_min = round(min(prices), 4)
    regional_max = round(max(prices), 4)

    # Latest price per farm (for percentile calculation)
    seen: set = set()
    latest_by_farm: dict = {}
    for r in regional_rows:
        fid = r["farm_id"]
        if fid not in seen:
            latest_by_farm[fid] = r["unit_price"]
            seen.add(fid)

    # Percentile: % of OTHER farms whose latest price is higher than yours
    your_percentile = None
    if your_latest_price is not None and farm_count > 1:
        others = [p for fid, p in latest_by_farm.items() if fid != farm_id]
        higher_count = sum(1 for p in others if p > your_latest_price)
        your_percentile = round(higher_count / len(others) * 100) if others else None

    return {
        **base,
        "farm_count": farm_count,
        "regional_avg": regional_avg,
        "regional_min": regional_min,
        "regional_max": regional_max,
        "your_percentile": your_percentile,
        "data_available": True,
    }


@router.get("/price-benchmark")
def get_price_benchmark(
    product_name: str = Query(..., min_length=1, max_length=160),
    supplier_id: Optional[str] = Query(None),
    farm: dict = Depends(get_user_farm),
):
    """Return anonymised regional price benchmark for a product."""
    farm_id = farm["id"]
    farm_region = farm.get("region")
    conn = get_db()
    try:
        return compute_benchmark(conn, farm_id, farm_region, product_name, supplier_id)
    finally:
        conn.close()
```

### Step 1.4: Run tests — all should pass

```bash
cd /var/www/Farmstock-AI && python -m pytest backend/tests/test_price_benchmark.py -v
```

Expected output:
```
PASSED backend/tests/test_price_benchmark.py::test_compute_benchmark_returns_aggregates
PASSED backend/tests/test_price_benchmark.py::test_compute_benchmark_case_insensitive
PASSED backend/tests/test_price_benchmark.py::test_compute_benchmark_below_threshold_hides_regional_data
PASSED backend/tests/test_price_benchmark.py::test_compute_benchmark_trend_ordered_by_date
PASSED backend/tests/test_price_benchmark.py::test_compute_benchmark_no_region_returns_unavailable
5 passed
```

### Step 1.5: Register router in `backend/main.py`

In `backend/main.py`, add the import on line 15 (after the existing router imports):

```python
from .routers import farms, orders, products, predictions, recommendations, alerts, place_order, spending, chat
from .routers import auth as auth_router_module
from .routers import billing as billing_router_module
from .routers import price_benchmark as price_benchmark_router
```

Then add the `include_router` call after the `spending` router line:

```python
app.include_router(spending.router, prefix="/api")
app.include_router(price_benchmark_router.router, prefix="/api")
```

### Step 1.6: Run full backend test suite to confirm no regressions

```bash
cd /var/www/Farmstock-AI && python -m pytest backend/tests/ -v
```

Expected: all tests pass.

### Step 1.7: Commit

```bash
git add backend/routers/price_benchmark.py backend/tests/test_price_benchmark.py backend/main.py
git commit -m "$(cat <<'EOF'
feat: Add price benchmark endpoint

GET /api/price-benchmark returns anonymised regional unit-price
aggregates (avg/min/max/percentile) for a named product. Regional
data is suppressed when fewer than 3 farms have matching orders.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Frontend API wiring

**Files:**
- Modify: `frontend/src/api/client.js`
- Modify: `frontend/src/api/queryKeys.js`

### Step 2.1: Add `getPriceBenchmark` to `frontend/src/api/client.js`

Inside the `api` object (after the `getSpending` line), add:

```js
getPriceBenchmark: (productName, supplierId) => {
  const params = new URLSearchParams({ product_name: productName });
  if (supplierId) params.append("supplier_id", supplierId);
  return request(`/api/price-benchmark?${params.toString()}`);
},
```

### Step 2.2: Add query key to `frontend/src/api/queryKeys.js`

Inside the `queryKeys` object (after the `suppliers` line), add:

```js
priceBenchmark: (productName, supplierId) => ["price-benchmark", productName, supplierId ?? null],
```

### Step 2.3: Commit

```bash
git add frontend/src/api/client.js frontend/src/api/queryKeys.js
git commit -m "$(cat <<'EOF'
feat: Add getPriceBenchmark API method and query key

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: CSS classes for benchmark panel

**Files:**
- Modify: `frontend/src/styles/pages.css`

### Step 3.1: Append CSS to `frontend/src/styles/pages.css`

Add at the end of the file:

```css
/* ─── Price Benchmark Panel ────────────────────────────────── */

.benchmark-controls {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.benchmark-controls select {
  flex: 1 1 180px;
  min-width: 0;
}

.benchmark-no-data {
  color: var(--ink-2);
  font-size: 0.85rem;
  padding: 0.5rem 0;
}

.benchmark-percentile-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.benchmark-percentile-label {
  font-size: 0.85rem;
  color: var(--ink-2);
  white-space: nowrap;
}

.benchmark-bar-track {
  flex: 1 1 120px;
  height: 8px;
  background: var(--surface-2);
  border-radius: 99px;
  overflow: hidden;
  min-width: 80px;
}

.benchmark-bar-fill {
  height: 100%;
  background: var(--brand-mid);
  border-radius: 99px;
  transition: width 0.4s ease;
}

.benchmark-chart-wrap {
  overflow-x: auto;
}

.benchmark-your-price {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
}
```

### Step 3.2: Commit

```bash
git add frontend/src/styles/pages.css
git commit -m "$(cat <<'EOF'
feat: Add CSS classes for price benchmark panel

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: PriceBenchmarkPanel component

**Files:**
- Create: `frontend/src/components/PriceBenchmarkPanel.jsx`

### Step 4.1: Create the component

```jsx
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import MetricCard from "./MetricCard";
import { formatCurrencyNzd } from "../utils/formatters";

function BenchmarkTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, unit_price } = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{date}</strong>
      <p>Unit price: {formatCurrencyNzd(unit_price)}</p>
    </div>
  );
}

export default function PriceBenchmarkPanel({ orders = [], suppliers = [] }) {
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");

  // Derive product list for the selected supplier from the passed-in orders
  const productOptions = useMemo(() => {
    const filtered = selectedSupplierId
      ? orders.filter((o) => o.supplier_id === selectedSupplierId)
      : orders;
    const seen = new Set();
    const result = [];
    for (const o of filtered) {
      const key = o.product_name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(o.product_name);
      }
    }
    return result.sort();
  }, [orders, selectedSupplierId]);

  const benchmarkQuery = useQuery({
    queryKey: queryKeys.priceBenchmark(selectedProduct, selectedSupplierId || null),
    queryFn: () => api.getPriceBenchmark(selectedProduct, selectedSupplierId || null),
    enabled: Boolean(selectedProduct),
  });

  const data = benchmarkQuery.data;

  function handleSupplierChange(e) {
    setSelectedSupplierId(e.target.value);
    setSelectedProduct("");
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Price Comparison</h3>
      </div>

      <div className="benchmark-controls">
        <select value={selectedSupplierId} onChange={handleSupplierChange}>
          <option value="">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          disabled={productOptions.length === 0}
        >
          <option value="">Select a product…</option>
          {productOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {!selectedProduct && (
        <p className="benchmark-no-data">
          Select a supplier and product to see regional price comparison.
        </p>
      )}

      {benchmarkQuery.isLoading && (
        <p className="benchmark-no-data">Loading benchmark data…</p>
      )}

      {data && (
        <>
          <section className="metrics-grid">
            <MetricCard
              label="Regional avg"
              value={data.data_available ? formatCurrencyNzd(data.regional_avg) : "—"}
              hint={data.unit ? `per ${data.unit}` : undefined}
            />
            <MetricCard
              label="Regional min"
              value={data.data_available ? formatCurrencyNzd(data.regional_min) : "—"}
              tone={data.data_available ? "neutral" : "neutral"}
            />
            <MetricCard
              label="Regional max"
              value={data.data_available ? formatCurrencyNzd(data.regional_max) : "—"}
            />
            <MetricCard
              label="Farms in region"
              value={data.data_available ? data.farm_count : "—"}
              hint={data.data_available ? undefined : "Need 3+ farms"}
            />
          </section>

          {!data.data_available && (
            <p className="benchmark-no-data">
              Not enough regional data yet — regional comparison requires at least 3 farms
              in your region with orders for this product.
            </p>
          )}

          {data.data_available && data.your_percentile !== null && (
            <div className="benchmark-percentile-row">
              <span className="benchmark-your-price">
                Your latest: {formatCurrencyNzd(data.your_latest_price)}/{data.unit}
              </span>
              <div className="benchmark-bar-track">
                <div
                  className="benchmark-bar-fill"
                  style={{ width: `${data.your_percentile}%` }}
                />
              </div>
              <span className="benchmark-percentile-label">
                You&apos;re cheaper than {data.your_percentile}% of farms in your region
              </span>
            </div>
          )}

          {data.trend.length > 0 && (
            <div className="benchmark-chart-wrap">
              <LineChart width={680} height={220} data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(73, 86, 80, 0.15)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `$${v}`}
                  width={52}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<BenchmarkTooltip />} />
                {data.data_available && (
                  <ReferenceLine
                    y={data.regional_avg}
                    stroke="var(--ink-3)"
                    strokeDasharray="5 4"
                    label={{ value: "Region avg", fontSize: 11, fill: "var(--ink-3)" }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="unit_price"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--brand)" }}
                  name="Your unit price"
                />
              </LineChart>
            </div>
          )}
        </>
      )}
    </section>
  );
}
```

> **Note on the one inline style:** `style={{ width: \`${data.your_percentile}%\` }}` on the bar fill is a genuine runtime-dynamic value — it cannot be expressed as a static CSS class. All other styling uses CSS classes.

### Step 4.2: Commit

```bash
git add frontend/src/components/PriceBenchmarkPanel.jsx
git commit -m "$(cat <<'EOF'
feat: Add PriceBenchmarkPanel component

Shows regional price metric cards, percentile bar, and historical
trend chart for a user-selected supplier + product combination.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Wire panel into Orders page

**Files:**
- Modify: `frontend/src/pages/Orders.jsx`

### Step 5.1: Add import and render `PriceBenchmarkPanel`

At the top of `frontend/src/pages/Orders.jsx`, add the import after the existing imports:

```js
import PriceBenchmarkPanel from "../components/PriceBenchmarkPanel";
```

In the `return` block, add `PriceBenchmarkPanel` as the first child of `<div className="page-grid">`:

```jsx
return (
  <>
    <div className="page-grid">
      <PriceBenchmarkPanel
        orders={ordersQuery.data || []}
        suppliers={suppliers}
      />
      <OrderTable
        orders={ordersQuery.data || []}
        editingOrderId={editingOrderId}
        suppliersById={suppliersById}
        onCreate={handleOpenCreate}
        onEdit={handleStartEdit}
        onDelete={handleRequestDelete}
      />
    </div>
    {/* ... rest unchanged ... */}
  </>
);
```

### Step 5.2: Verify the app builds without errors

```bash
cd /var/www/Farmstock-AI/frontend && npm run build 2>&1 | tail -20
```

Expected: build completes with no errors (warnings about bundle size are fine).

### Step 5.3: Commit

```bash
git add frontend/src/pages/Orders.jsx
git commit -m "$(cat <<'EOF'
feat: Render PriceBenchmarkPanel at top of Orders page

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Supplier selector → product selector flow
- ✅ Case-insensitive product name matching
- ✅ Regional avg / min / max metric cards
- ✅ Farm count metric card
- ✅ Percentile ranking ("cheaper than X% of farms")
- ✅ Price trend line chart with regional avg reference line
- ✅ Privacy: suppress regional data when farm_count < 3
- ✅ No farm identity exposed — aggregates only
- ✅ Panel sits above OrderTable in Orders page
- ✅ Inline styles only for runtime-dynamic bar fill width

**Placeholder scan:** None found — all code blocks are complete.

**Type consistency:**
- `compute_benchmark` defined in Task 1, called in tests (Task 1) and in the router (Task 1) ✅
- `getPriceBenchmark(productName, supplierId)` defined in Task 2, called in Task 4 ✅
- `queryKeys.priceBenchmark(productName, supplierId)` defined in Task 2, called in Task 4 ✅
- `PriceBenchmarkPanel` created in Task 4, imported and used in Task 5 ✅
- CSS classes defined in Task 3, used in Task 4 ✅
