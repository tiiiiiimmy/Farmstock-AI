# Products Page — Category & Filter Design

**Date:** 2026-03-29
**Status:** Approved

---

## Overview

Enhance the Products page with a multi-dimensional filter bar: category tags (multi-select), shelf life zone badges (multi-select), and a supplier dropdown. All filtering happens client-side. Active selections are shown as removable chips with a live product count.

---

## Requirements

1. Category tags bar (multi-select): Feed / Fertiliser / Veterinary / Chemical / Equipment
2. Shelf life zone filter (multi-select): Green / Amber / Red — reuses existing pill styles
3. Supplier dropdown: farm's supplier list from existing `suppliersQuery`; filters to products linked via `supplier.product_ids`
4. Active filter chips: appear below the filter bar only when filters are active; each chip removes its filter; "Clear all" resets everything
5. Matched product count displayed next to "Clear all"
6. Existing search bar retained; all filters compose (AND logic)

---

## Component Architecture

### `Products.jsx` (modified)

State additions:
- `selectedCategories: Set<string>` — selected category slugs
- `selectedZones: Set<string>` — selected shelf life zones
- `selectedSupplierId: string | ""` — selected supplier id

Filter logic (via `useMemo`):
```
filtered = products
  .filter(name matches deferredSearch)
  .filter(category in selectedCategories, if any)
  .filter(shelf_life_zone in selectedZones, if any)
  .filter(id in supplier.product_ids, if supplier selected)
```

### New sub-components (inline in Products.jsx, no new files)

- **FilterBar** — renders row 1 (search + supplier select) and row 2 (category tags + zone tags)
- **ActiveChips** — renders chip list + count + clear all; only mounts when at least one filter is active

---

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│ [ Search products...              ] [ Supplier ▾       ] │  ← row 1
│ [All][Feed][Fertiliser][Vet][Chem][Equip]  [●G][●A][●R] │  ← row 2
│ Feed ×  Amber ×  Agri Supplies ×   [Clear all]  12 prods │  ← chips (conditional)
└─────────────────────────────────────────────────────────┘
[ product card ] [ product card ] [ product card ] ...
```

- Row 1: flex, search grows, supplier select fixed ~180px
- Row 2: category tags left-aligned, zone tags right-aligned (or separated by flex gap)
- "All" tag deselects all categories (acts as reset for categories)
- Selected tag: filled background using existing `pill-*` color or brand bg + border
- Chips row: flex wrap, `gap: 0.5rem`

---

## Styling

No new CSS classes needed for filter logic. Additions:

- `.filter-bar` — flex column, gap 0.6rem, margin-bottom 1rem
- `.filter-row` — flex, align-items center, gap 0.5rem, flex-wrap wrap
- `.tag-btn` — pill-shaped toggle button (border, rounded, sm padding); `.tag-btn.active` fills bg
- `.chip` — small removable tag (border, × button inside); reuses existing pill token radius
- `.filter-count` — muted small text for product count

Zone tags reuse `.pill-green`, `.pill-amber`, `.pill-red` directly.

---

## Data Flow

- `suppliersQuery` already loaded in `Products.jsx` — no new API calls
- Supplier filter: `const linked = suppliers.find(s => s.id === selectedSupplierId)?.product_ids ?? []` then `linked.includes(product.id)`
- All filter state is local (`useState`), no URL sync needed
- `useMemo` on filtered products depends on: `productsQuery.data`, `deferredSearch`, `selectedCategories`, `selectedZones`, `selectedSupplierId`, `suppliers`

---

## Edge Cases

- No suppliers linked to any product: supplier dropdown still shows, but selecting one returns 0 results (shown as "No products match")
- Empty state: show a message "No products match your filters" + "Clear filters" link
- Supplier has no `product_ids`: treated as empty array (already handled by backend response)
