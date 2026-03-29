# Products Page Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-select category tags, shelf life zone filter, supplier dropdown, and active filter chips to the Products page — all client-side, no backend changes.

**Architecture:** All filter state lives in `Products.jsx` as local `useState`. A `useMemo` combines search + category + zone + supplier into one filtered list. The supplier filter resolves product membership via the existing `supplier.product_ids` array already returned by `/api/farm/:id/suppliers`.

**Tech Stack:** React 18 (useMemo, useDeferredValue, useState), TanStack Query (existing), CSS custom properties (existing design tokens)

---

## Files

| File | Action |
|------|--------|
| `frontend/src/styles/pages.css` | Add `.filter-bar`, `.filter-row`, `.tag-btn`, `.chip`, `.filter-count`, `.btn-ghost` |
| `frontend/src/pages/Products.jsx` | Add constants, filter state, useMemo logic, toggle helpers, new JSX |

---

## Task 1: Add CSS for filter components

**Files:**
- Modify: `frontend/src/styles/pages.css` — append after the `/* ─── Product grid ─── */` block (around line 207)

- [ ] **Step 1: Append filter styles to pages.css**

Add the following block immediately after the `.product-grid` rule (line ~207 in `pages.css`):

```css
/* ─── Products filter bar ─────────────────────────────────── */

.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag-btn {
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 500;
  background: var(--surface);
  color: var(--ink-2);
  border: 1px solid var(--border-strong);
  cursor: pointer;
  transition: background var(--t), color var(--t), border-color var(--t);
  white-space: nowrap;
}

.tag-btn:hover {
  background: var(--surface-2);
  color: var(--ink);
}

.tag-btn.active {
  background: var(--brand-light);
  color: var(--brand);
  border-color: rgba(20, 92, 51, 0.35);
}

/* Zone tag base colours (always visible, border signals selection) */
.tag-btn.zone-green {
  background: var(--green-soft);
  color: var(--green);
  border-color: transparent;
}

.tag-btn.zone-amber {
  background: var(--amber-soft);
  color: var(--amber);
  border-color: transparent;
}

.tag-btn.zone-red {
  background: var(--red-soft);
  color: var(--red);
  border-color: transparent;
}

.tag-btn.zone-green.active  { border-color: var(--green); }
.tag-btn.zone-amber.active  { border-color: var(--amber); }
.tag-btn.zone-red.active    { border-color: var(--red); }

/* Active filter chips */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.35rem 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 500;
  background: var(--surface-2);
  color: var(--ink);
  border: 1px solid var(--border-strong);
}

.chip button {
  background: transparent;
  color: var(--ink-2);
  padding: 0;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  font-size: 0.85rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.chip button:hover {
  background: var(--border-strong);
  color: var(--ink);
}

.filter-count {
  font-size: 0.78rem;
  color: var(--ink-3);
  margin-left: auto;
  white-space: nowrap;
}

.btn-ghost {
  background: transparent;
  color: var(--ink-2);
  font-size: 0.78rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: var(--r-sm);
  border: none;
}

.btn-ghost:hover {
  background: var(--surface-2);
  color: var(--ink);
}

/* ─── Supplier select (filter row, fixed width) ─────────────── */
.supplier-select {
  width: 180px;
  flex-shrink: 0;
  padding: 0.5rem 0.85rem;
  font-size: 0.82rem;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/styles/pages.css
git commit -m "feat: add filter bar CSS — tag-btn, chip, btn-ghost, supplier-select"
```

---

## Task 2: Update Products.jsx — constants, state, and filter logic

**Files:**
- Modify: `frontend/src/pages/Products.jsx`

- [ ] **Step 1: Replace the top of Products.jsx with updated imports and constants**

Replace lines 1–2 (the import line) with:

```jsx
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import OrderEmailModal from "../components/OrderEmailModal";

const CATEGORIES = ["feed", "fertiliser", "veterinary", "chemical", "equipment"];
const ZONES = ["green", "amber", "red"];
```

- [ ] **Step 2: Add filter state inside the component, after `const queryClient = useQueryClient();`**

Insert these three lines after `const queryClient = useQueryClient();` (currently line 11):

```jsx
const [selectedCategories, setSelectedCategories] = useState(new Set());
const [selectedZones, setSelectedZones] = useState(new Set());
const [selectedSupplierId, setSelectedSupplierId] = useState("");
```

- [ ] **Step 3: Replace the existing `products` filter with a useMemo**

Remove the existing lines:
```jsx
const products = (productsQuery.data || []).filter((product) =>
  product.name.toLowerCase().includes(deferredSearch.toLowerCase())
);
```

Replace with:
```jsx
const products = useMemo(() => {
  const all = productsQuery.data || [];
  const linkedIds = selectedSupplierId
    ? new Set(suppliers.find((s) => s.id === selectedSupplierId)?.product_ids ?? [])
    : null;

  return all.filter((p) => {
    if (!p.name.toLowerCase().includes(deferredSearch.toLowerCase())) return false;
    if (selectedCategories.size > 0 && !selectedCategories.has(p.category)) return false;
    if (selectedZones.size > 0 && !selectedZones.has(p.shelf_life_zone)) return false;
    if (linkedIds && !linkedIds.has(p.id)) return false;
    return true;
  });
}, [productsQuery.data, deferredSearch, selectedCategories, selectedZones, selectedSupplierId, suppliersQuery.data]);
```

Note: `suppliers` is already declared on the line right before, so the memo can reference it.

- [ ] **Step 4: Add toggle helpers and derived state after the `suppliers` declaration**

After `const suppliers = suppliersQuery.data || [];`, add:

```jsx
function toggleCategory(cat) {
  setSelectedCategories((prev) => {
    const next = new Set(prev);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    return next;
  });
}

function toggleZone(zone) {
  setSelectedZones((prev) => {
    const next = new Set(prev);
    next.has(zone) ? next.delete(zone) : next.add(zone);
    return next;
  });
}

function clearAll() {
  setSelectedCategories(new Set());
  setSelectedZones(new Set());
  setSelectedSupplierId("");
}

const hasFilters =
  selectedCategories.size > 0 || selectedZones.size > 0 || selectedSupplierId !== "";

const activeChips = [
  ...Array.from(selectedCategories).map((c) => ({
    key: `cat-${c}`,
    label: c.charAt(0).toUpperCase() + c.slice(1),
    onRemove: () => toggleCategory(c),
  })),
  ...Array.from(selectedZones).map((z) => ({
    key: `zone-${z}`,
    label: z.charAt(0).toUpperCase() + z.slice(1),
    onRemove: () => toggleZone(z),
  })),
  ...(selectedSupplierId
    ? [
        {
          key: `sup-${selectedSupplierId}`,
          label:
            suppliers.find((s) => s.id === selectedSupplierId)?.name ??
            selectedSupplierId,
          onRemove: () => setSelectedSupplierId(""),
        },
      ]
    : []),
];
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Products.jsx
git commit -m "feat: add filter state, useMemo logic, and toggle helpers to Products"
```

---

## Task 3: Update Products.jsx — filter bar JSX + chips + empty state

**Files:**
- Modify: `frontend/src/pages/Products.jsx`

- [ ] **Step 1: Replace the entire JSX return with the following**

Replace everything from `return (` to the end of the file with:

```jsx
  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-header">
          <h3>Catalogue + One-Click Ordering</h3>
        </div>

        {/* ── Filter bar ─────────────────────────────────────── */}
        <div className="filter-bar">

          {/* Row 1: search + supplier dropdown */}
          <div className="filter-row">
            <input
              className="search"
              style={{ flex: 1 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
            />
            <select
              className="supplier-select"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
            >
              <option value="">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: category tags + zone tags */}
          <div className="filter-row">
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", flex: 1 }}>
              <button
                type="button"
                className={`tag-btn${selectedCategories.size === 0 ? " active" : ""}`}
                onClick={() => setSelectedCategories(new Set())}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`tag-btn${selectedCategories.has(cat) ? " active" : ""}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {ZONES.map((zone) => (
                <button
                  key={zone}
                  type="button"
                  className={`tag-btn zone-${zone}${selectedZones.has(zone) ? " active" : ""}`}
                  onClick={() => toggleZone(zone)}
                >
                  {zone.charAt(0).toUpperCase() + zone.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Active filter chips — only visible when something is selected */}
          {hasFilters && (
            <div className="filter-row">
              {activeChips.map((chip) => (
                <span key={chip.key} className="chip">
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`Remove ${chip.label} filter`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <button type="button" className="btn-ghost" onClick={clearAll}>
                Clear all
              </button>
              <span className="filter-count">{products.length} products</span>
            </div>
          )}
        </div>

        {/* ── Product grid or empty state ────────────────────── */}
        {products.length === 0 ? (
          <div
            className="muted"
            style={{ padding: "2rem 0", textAlign: "center", fontSize: "0.875rem" }}
          >
            No products match your filters.{" "}
            {hasFilters && (
              <button type="button" className="btn-ghost" onClick={clearAll}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <article key={product.id} className="product-card">
                <div className="alert-meta">
                  <span className={`pill pill-${product.shelf_life_zone}`}>
                    {product.shelf_life_zone}
                  </span>
                  <span>{product.category}</span>
                </div>
                <h4>{product.name}</h4>
                <p>{product.description}</p>
                <p className="muted">Storage: {product.storage_requirements}</p>
                <button type="button" onClick={() => setOrderProduct(product)}>
                  Order now
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {orderProduct && (
        <OrderEmailModal
          product={orderProduct}
          suppliers={suppliers}
          farmId={farmId}
          farmName={farmName}
          onClose={() => setOrderProduct(null)}
          onSupplierCreated={() =>
            queryClient.invalidateQueries({ queryKey: queryKeys.suppliers(farmId) })
          }
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Start the dev server and verify in the browser**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` → navigate to Products. Confirm:
- Row 1: search box + "All suppliers" dropdown
- Row 2: `[All][Feed][Fertiliser][Veterinary][Chemical][Equipment]` tags + `[Green][Amber][Red]` zone tags on the right
- Clicking a category tag highlights it and filters the grid
- Multiple categories can be selected simultaneously; "All" deselects all
- Zone tags are color-coded (green/amber/red tint) and get a border when active
- Selecting a supplier narrows the grid to products linked to that supplier
- Active chips appear below row 2 with × buttons and a product count
- "Clear all" and "Clear filters" both reset everything
- Empty state message shows when no products match

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Products.jsx
git commit -m "feat: add filter bar, chips, and empty state to Products page"
```

---

## Self-Review

**Spec coverage:**
- ✅ Category tags (multi-select): CATEGORIES constant + toggleCategory
- ✅ "All" tag resets categories: `setSelectedCategories(new Set())`
- ✅ Shelf life zone filter (multi-select): ZONES constant + toggleZone
- ✅ Zone tags use existing pill color tokens
- ✅ Supplier dropdown: maps suppliersQuery data, filters via product_ids
- ✅ Active chips: derived from selectedCategories + selectedZones + selectedSupplierId
- ✅ Chip × removal: each chip has onRemove
- ✅ "Clear all": clearAll() resets all three states
- ✅ Product count: `{products.length} products` in chips row
- ✅ Empty state: shown when products.length === 0
- ✅ AND logic: all four predicates applied in sequence in useMemo
- ✅ No backend changes required

**Placeholder scan:** No TBDs, all code is complete.

**Type consistency:** `toggleCategory` / `toggleZone` / `clearAll` defined in Task 2 and used in Task 3. `activeChips` uses `chip.key`, `chip.label`, `chip.onRemove` — all three fields set in Task 2 and consumed in Task 3. `CATEGORIES` / `ZONES` constants defined in Task 2 import block, used in Task 3 JSX.
