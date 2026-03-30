# Price Benchmark Dashboard — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Placement:** Orders page, above order table

---

## Overview

A price comparison dashboard that lets farmers see how their product purchase prices compare to anonymised regional averages. Triggered by selecting a supplier, then a product. Displayed as a persistent panel at the top of the Orders page.

---

## User Flow

1. User opens the Orders page.
2. A `PriceBenchmarkPanel` is visible at the top, with a supplier dropdown and a product dropdown.
3. User selects a supplier (populated from existing `/suppliers` API).
4. Product dropdown populates with distinct product names the current farm has purchased from that supplier (derived from order history, case-insensitive deduplicated).
5. User selects a product. They may also manually change the product name or category filter.
6. Frontend calls `GET /price-benchmark?product_name=<name>&supplier_id=<id>`.
7. Dashboard renders with four metric cards, a percentile ranking bar, and a price trend line chart.

---

## Backend

### New file: `backend/routers/price_benchmark.py`

**Endpoint:** `GET /price-benchmark`

**Auth:** JWT via `get_user_farm` dependency (same pattern as all other routers).

**Query parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product_name` | string | yes | Product to benchmark (matched case-insensitively) |
| `supplier_id` | string | no | Optional supplier filter for the current farm's trend data |

**Logic:**
1. Resolve current farm from JWT. Read its `region` field.
2. If `region` is null or empty, return `data_available: false` with only the current farm's trend.
3. Query all orders across all farms in the same region where `LOWER(product_name) = LOWER(:product_name)` and `unit_price IS NOT NULL`.
4. Compute `farm_count` (distinct `farm_id` values).
5. If `farm_count < 3`, set `data_available: false` (privacy threshold).
6. Compute `regional_avg`, `regional_min`, `regional_max` from all matching rows.
7. Compute `your_latest_price`: the most recent `unit_price` for the current farm for this product.
8. Compute `your_percentile`: percentage of regional farms whose latest price for this product is higher than the current farm's latest price (i.e. how cheap the user is relative to peers).
9. Build `trend`: list of `{date, unit_price}` for the current farm only, ordered by date ascending. If `supplier_id` is provided, further filter the current farm's trend to that supplier.
10. Derive `unit` from the most recent order for this product on the current farm.

**Response:**
```json
{
  "product_name": "Mixed Grain",
  "region": "Waikato",
  "unit": "kg",
  "farm_count": 7,
  "regional_avg": 0.85,
  "regional_min": 0.62,
  "regional_max": 1.10,
  "your_latest_price": 0.78,
  "your_percentile": 68,
  "trend": [
    {"date": "2025-01-15", "unit_price": 0.80},
    {"date": "2025-06-03", "unit_price": 0.78}
  ],
  "data_available": true
}
```

**Registration:** Import and mount in `backend/main.py` with prefix `/api`.

---

## Frontend

### New component: `frontend/src/components/PriceBenchmarkPanel.jsx`

**Responsibilities:**
- Render supplier and product dropdowns.
- Derive product list from current farm's orders filtered by selected supplier.
- Call `getPriceBenchmark` query when both supplier and product are selected.
- Render four metric cards, percentile bar, and trend chart.
- When `data_available` is false, show only the trend chart with an explanatory message ("Not enough regional data yet").

**Layout (top to bottom):**
1. Panel header: "Price Comparison" + supplier/product controls
2. Four `MetricCard`s: Regional Avg · Regional Min · Regional Max · Farms in Region
3. Percentile row: current price + "You're cheaper than X% of farms in your region"
4. Trend line chart: current farm's historical unit_price over time, with a dashed reference line at `regional_avg`

**Styling:** All layout and presentation via CSS classes in the global stylesheet. Inline styles only for runtime-calculated dynamic values (e.g. percentile bar fill width).

**Chart:** Uses `recharts` (already a project dependency via `InventoryChart`). `LineChart` with a `ReferenceLine` at `regional_avg`.

### API client: `frontend/src/api/client.js`

Add:
```js
getPriceBenchmark: (params) => apiGet('/price-benchmark', params)
```

### Query keys: `frontend/src/api/queryKeys.js`

Add:
```js
priceBenchmark: (productName, supplierId) =>
  ['price-benchmark', productName, supplierId]
```

### Orders page: `frontend/src/pages/Orders.jsx`

Render `<PriceBenchmarkPanel orders={ordersQuery.data} suppliers={suppliers} />` as the first child inside `<div className="page-grid">`, above `<OrderTable>`.

Pass the already-fetched `orders` and `suppliers` so the panel can derive the product dropdown without an extra fetch.

---

## Privacy Rules

- Regional data is only shown when at least 3 distinct farms have data for the product. Otherwise `data_available: false`.
- The API never returns individual farm identifiers, names, or supplier names from other farms.
- Trend data is always scoped to the current farm only.

---

## Out of Scope

- Opt-in/opt-out mechanism for data sharing (all farms contribute implicitly; anonymisation is the protection).
- Fuzzy/semantic product name matching.
- Cross-region comparisons.
- Mobile-specific layout changes beyond responsive CSS.
