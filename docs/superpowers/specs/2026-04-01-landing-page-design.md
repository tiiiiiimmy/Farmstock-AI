# Landing Page Design Spec
**Date:** 2026-04-01
**Project:** FarmStock AI
**Status:** Approved

---

## Overview

A marketing landing page added as a new route (`/`) in the existing React app. Purpose: introduce FarmStock AI to NZ/AU farm operators, communicate value, and convert visitors into trial users via email signup.

**Trial flow:** User enters email → receives 1-hour demo account (pre-populated with farm data) → auto-converts to 14-day free trial → continues as free user.

**Language:** English
**Visual style:** Bento Grid / Organic Green — inspired by SaveWorld/GreenWorld references. Bold sans-serif headlines, pill-shaped tags, asymmetric card grids, floating decorative stat badges, scrolling marquee strip. Reuses existing CSS variables (`--brand: #145C33`, `--bg: #F4F6F3`, `--surface`, etc.).

---

## Route & File Structure

```
frontend/src/pages/Landing.jsx          # Main landing page component
frontend/src/styles/landing.css         # Landing-specific styles (no Tailwind)
```

Route added to `frontend/src/App.jsx`: `/` renders `<Landing />` (public, no auth required). Authenticated users visiting `/` are redirected to `/dashboard`.

---

## Sections

### 1. Navbar

Fixed top, white background, thin bottom border.

- **Left:** FarmStock AI logo (leaf/wheat SVG icon + wordmark in `--brand`)
- **Center:** Three nav links — Features · How it Works · Pricing (smooth-scroll anchors)
- **Right:** `Sign In` ghost button + `Start Free Trial` filled brand button

### 2. Hero — Bento Grid

Two-column layout (45% / 55%).

**Left column:**
- Pill tag: "AI-Powered Farm Supply Management" (brand-light background)
- H1 (two lines): `Never run out of / critical supplies again.`
- Subheading: explains AI predictions, Telegram alerts, one-click ordering
- Email input + `Try free for 1 hour →` button (inline row)
- Fine print: `No credit card needed · 14-day free trial after`
- Avatar stack + `Trusted by 500+ NZ & AU farms`

**Right column — Bento card grid (asymmetric):**

| Card | Description |
|------|-------------|
| Large top card | Telegram message mock: "Your Ivomec drench runs out in 8 days. Order now? [Yes] [Later]" — Telegram-style bubble UI (dark blue gradient) |
| Mid-left card | Inventory health mini bar chart (red/amber/green bars, 3 products) |
| Bottom-right badge | Deep green background: "Saved $2,400 this season" |
| Floating pill card | "Price drop! Superphosphate ↓10% at Farmlands" |

### 3. Marquee Strip

Full-width, `--brand` dark green background, white text, infinite horizontal scroll:

`AI-Powered Predictions · Telegram Alerts · One-Click Ordering · Price Monitoring · Shelf-Life Intelligence · Zero App Download ·`

### 4. Pain / Problem

Light background (`--bg`), three cards side by side.

| Icon | Title | Body |
|------|-------|------|
| 🚨 | Running out at the worst time | Emergency orders cost 20–30% more. Manual tracking misses the warning signs. |
| 📋 | Hours lost on stock-taking | Farmers spend 4+ hours a week tracking supplies across spreadsheets and memory. |
| 💸 | Missing price windows | Seasonal price drops come and go while you're busy with the animals. |

### 5. Features — Bento Grid

Anchor id: `#features`. Asymmetric 2-large + 2-small grid.

| Card | Background | Title | Body |
|------|-----------|-------|------|
| Large 1 | `--brand` dark green, white text | AI Depletion Predictions | Knows your burn rate, herd size and season. Tells you exactly when to reorder. |
| Large 2 | `--brand-light` soft green | Telegram Alerts | Push notifications the moment stock runs low, prices drop, or weather threatens feed demand. |
| Small 3 | `--surface` white | One-Click Ordering | AI drafts and sends the purchase order email to your supplier automatically. |
| Small 4 | `--surface-2` | Price Benchmarking | See how your unit prices compare to regional averages and catch savings opportunities. |

### 6. How It Works

Anchor id: `#how-it-works`. Three steps in a horizontal row, large step numbers, connected by a dashed line.

1. **Enter your email** — Get instant access to a demo farm account loaded with real-looking NZ dairy farm data.
2. **Explore your data** — See AI predictions, Telegram alerts, spending charts, and one-click ordering in action.
3. **Go live in minutes** — Import your own orders and let AI take over your supply management.

### 7. Social Proof / Stats

Four metric cards in a horizontal row, white surface, bold large numbers:

| Metric | Label |
|--------|-------|
| `$2,000+` | avg annual savings per farm |
| `50%` | fewer emergency orders |
| `4 hrs` | saved per week |
| `14 days` | free to try everything |

### 8. Final CTA

Full-width section, `--brand` dark green background, white text.

- Headline: `"Your supplies, always under control."`
- Email input + `Start your free trial →` button
- Fine print: `1-hour demo with real farm data · No card needed`

---

## Trial Flow (Frontend Behaviour)

1. User submits email in Hero or Final CTA.
2. POST to `/api/trial/start` with `{ email }`.
3. Backend creates a trial account seeded with demo farm data, returns a session token valid for 1 hour.
4. Frontend stores token, redirects user to `/dashboard`.
5. A `TrialBanner` (already exists in the codebase) shows remaining time and upgrade prompt.
6. After 1 hour: session auto-expires → user prompted to continue with 14-day free trial (no data re-entry needed).

---

## Styling Rules

- Reuse all existing CSS custom properties from `global.css` — no new color values.
- No inline `style` props except for truly dynamic values (e.g., animation progress).
- All landing-specific classes go in `landing.css`, prefixed `.lp-` to avoid collisions.
- Font: existing `"Sora"` stack from `global.css`.
- Responsive: mobile-first. Hero stacks to single column below 768px. Bento cards stack vertically on mobile.
- Marquee uses CSS `@keyframes` animation, no JS library.

---

## Out of Scope

- Backend `/api/trial/start` endpoint implementation (separate task)
- Pricing page content (existing `/pricing` route)
- Animations beyond CSS transitions and marquee
- i18n / Chinese language version
