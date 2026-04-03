# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/` marketing landing page to the existing React app that converts visitors into trial users via email signup.

**Architecture:** A public route at `/` renders `<Landing />` without auth. The page uses 8 sections (Navbar → Hero Bento → Marquee → Pain → Features → How it Works → Stats → Final CTA). Email form POSTs to `/api/trial/start`; on failure (backend not yet implemented) falls back to `/register?email=...`. Authenticated users hitting `/` are redirected to `/dashboard`.

**Tech Stack:** React 18, React Router v6, existing CSS custom properties (`global.css`), no new npm dependencies.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `frontend/src/styles/landing.css` | All `.lp-*` classes; no collision with app styles |
| Create | `frontend/src/pages/Landing.jsx` | Full landing page component (8 sections) |
| Modify | `frontend/src/api/client.js` | Add `authApi.startTrial` |
| Modify | `frontend/src/App.jsx` | Register public `/` route before ProtectedRoute |

---

## Task 1: Create landing.css

**Files:**
- Create: `frontend/src/styles/landing.css`

- [ ] **Step 1: Create the CSS file with all landing styles**

Create `frontend/src/styles/landing.css` with the following content:

```css
/* ═══════════════════════════════════════════════════════════
   LANDING PAGE  —  all classes prefixed .lp-
   Uses only existing CSS custom properties from global.css
   ═══════════════════════════════════════════════════════════ */

/* ── Root ── */
.lp-root {
  min-height: 100vh;
  background: var(--bg);
}

/* ── Navbar ── */
.lp-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0 2rem;
  height: 64px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}

.lp-nav-logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  font-weight: 700;
  font-size: 1rem;
  color: var(--ink);
  flex-shrink: 0;
}

.lp-nav-links {
  display: flex;
  gap: 1.5rem;
  flex: 1;
  justify-content: center;
}

.lp-nav-link {
  text-decoration: none;
  color: var(--ink-2);
  font-size: 0.875rem;
  font-weight: 500;
  transition: color var(--t);
}

.lp-nav-link:hover {
  color: var(--ink);
}

.lp-nav-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.lp-nav-ghost {
  text-decoration: none;
  color: var(--ink-2);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  transition: background var(--t), color var(--t);
}

.lp-nav-ghost:hover {
  background: var(--surface-2);
  color: var(--ink);
}

.lp-nav-primary {
  text-decoration: none;
  color: #fff;
  background: var(--brand);
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  transition: background var(--t);
}

.lp-nav-primary:hover {
  background: var(--brand-hover);
}

/* ── Hero ── */
.lp-hero {
  display: grid;
  grid-template-columns: 45fr 55fr;
  gap: 3rem;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 5rem 2rem 4rem;
}

.lp-hero-left {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.lp-tag-pill {
  display: inline-block;
  padding: 0.3rem 0.85rem;
  background: var(--brand-light);
  color: var(--brand);
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  width: fit-content;
}

.lp-hero-heading {
  font-size: clamp(2rem, 4.5vw, 3.2rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.04em;
  color: var(--ink);
  margin: 0;
}

.lp-hero-heading em {
  font-style: normal;
  color: var(--brand);
  background: var(--brand-light);
  padding: 0 0.15em;
  border-radius: 6px;
}

.lp-hero-sub {
  font-size: 1rem;
  color: var(--ink-2);
  line-height: 1.65;
  margin: 0;
  max-width: 460px;
}

/* ── Email form (used in Hero + Final CTA) ── */
.lp-email-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.lp-email-input {
  flex: 1;
  min-width: 200px;
  padding: 0.7rem 1rem;
  border: 1.5px solid var(--border-strong);
  border-radius: 999px;
  font-size: 0.9rem;
  background: var(--surface);
  color: var(--ink);
  outline: none;
  transition: border-color var(--t);
}

.lp-email-input:focus {
  border-color: var(--brand);
}

.lp-email-input::placeholder {
  color: var(--ink-3);
}

.lp-cta-btn {
  padding: 0.7rem 1.4rem;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--t);
  white-space: nowrap;
}

.lp-cta-btn:hover:not(:disabled) {
  background: var(--brand-hover);
}

.lp-cta-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.lp-form-error {
  width: 100%;
  font-size: 0.8rem;
  color: var(--red);
  margin: 0;
  padding-left: 0.5rem;
}

.lp-fine-print {
  font-size: 0.78rem;
  color: var(--ink-3);
  margin: 0;
}

.lp-avatar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.lp-avatars {
  display: flex;
}

.lp-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--brand-light);
  border: 2px solid var(--surface);
  margin-left: -8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.lp-avatars .lp-avatar:first-child {
  margin-left: 0;
}

.lp-avatar-text {
  font-size: 0.8rem;
  color: var(--ink-2);
  font-weight: 500;
}

/* ── Bento Grid (Hero right column) ── */
.lp-bento {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.lp-bento-card {
  border-radius: var(--r-xl);
  padding: 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

/* Telegram mock — spans both columns */
.lp-bento-tg {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lp-tg-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.lp-tg-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #2aabee, #229ed9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.lp-tg-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--ink);
  margin: 0;
}

.lp-tg-sub {
  font-size: 0.75rem;
  color: var(--ink-3);
  margin: 0;
}

.lp-tg-bubble {
  background: #eff8ff;
  border-radius: 4px 16px 16px 16px;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: var(--ink);
  line-height: 1.5;
  border-left: 3px solid #2aabee;
}

.lp-tg-actions {
  display: flex;
  gap: 0.5rem;
}

.lp-tg-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  border: none;
  cursor: default;
}

.lp-tg-btn-yes {
  background: var(--brand);
  color: #fff;
}

.lp-tg-btn-no {
  background: var(--surface-2);
  color: var(--ink-2);
}

/* Mini chart card */
.lp-bento-chart {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lp-bento-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ink-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0;
}

.lp-mini-bars {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lp-mini-bar-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.lp-mini-bar-label {
  width: 60px;
  color: var(--ink-2);
  flex-shrink: 0;
}

.lp-mini-bar-track {
  flex: 1;
  height: 7px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow: hidden;
}

.lp-mini-bar-fill {
  height: 100%;
  border-radius: 999px;
}

.lp-mini-bar-pct {
  width: 28px;
  text-align: right;
  color: var(--ink-3);
  flex-shrink: 0;
}

/* Savings badge — dark green card */
.lp-bento-badge {
  background: var(--brand);
  border-color: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.25rem;
  min-height: 90px;
}

.lp-badge-num {
  font-size: 1.65rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.04em;
  line-height: 1;
}

.lp-badge-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
}

/* Price-drop pill — spans both columns */
.lp-bento-pill {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--amber-soft);
  border-color: rgba(184, 109, 10, 0.15);
  padding: 0.9rem 1.1rem;
  font-size: 0.85rem;
  color: var(--ink);
}

.lp-pill-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

/* ── Marquee ── */
.lp-marquee {
  background: var(--brand);
  overflow: hidden;
  padding: 0.85rem 0;
  white-space: nowrap;
}

.lp-marquee-track {
  display: inline-flex;
  animation: lp-scroll 30s linear infinite;
}

.lp-marquee-inner {
  display: inline-block;
  padding-right: 2rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.02em;
}

@keyframes lp-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* ── Shared section styles ── */
.lp-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 5rem 2rem;
}

.lp-section-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--brand);
  margin-bottom: 0.75rem;
}

.lp-section-heading {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--ink);
  margin: 0 0 2.5rem;
  max-width: 600px;
}

/* ── Pain section ── */
.lp-pain-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.lp-pain-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  padding: 1.75rem 1.5rem;
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--t);
}

.lp-pain-card:hover {
  box-shadow: var(--shadow-md);
}

.lp-pain-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.75rem;
}

.lp-pain-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 0.5rem;
}

.lp-pain-body {
  font-size: 0.875rem;
  color: var(--ink-2);
  margin: 0;
  line-height: 1.6;
}

/* ── Features section ── */
.lp-features-wrap {
  background: var(--surface-2);
  padding: 5rem 0;
}

.lp-features-header {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem 2.5rem;
}

.lp-features-bento {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.lp-feature-card {
  border-radius: var(--r-xl);
  padding: 2rem 1.75rem;
  border: 1px solid var(--border);
  transition: box-shadow var(--t);
}

.lp-feature-card:hover {
  box-shadow: var(--shadow-md);
}

.lp-feature-dark {
  background: var(--brand);
  border-color: transparent;
}

.lp-feature-light {
  background: var(--brand-light);
  border-color: rgba(20, 92, 51, 0.1);
}

.lp-feature-white {
  background: var(--surface);
}

.lp-feature-muted {
  background: var(--surface-2);
  border-color: var(--border-strong);
}

.lp-feature-icon {
  font-size: 1.75rem;
  display: block;
  margin-bottom: 1rem;
}

.lp-feature-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 0.6rem;
  color: var(--ink);
}

.lp-feature-dark .lp-feature-title {
  color: #fff;
}

.lp-feature-body {
  font-size: 0.875rem;
  color: var(--ink-2);
  margin: 0;
  line-height: 1.6;
}

.lp-feature-dark .lp-feature-body {
  color: rgba(255, 255, 255, 0.8);
}

/* ── How it Works ── */
.lp-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  position: relative;
}

.lp-steps::before {
  content: "";
  position: absolute;
  top: 26px;
  left: calc(16.67% + 1rem);
  right: calc(16.67% + 1rem);
  height: 0;
  border-top: 2px dashed var(--border-strong);
}

.lp-step {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
}

.lp-step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  flex-shrink: 0;
}

.lp-step-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}

.lp-step-body {
  font-size: 0.875rem;
  color: var(--ink-2);
  margin: 0;
  line-height: 1.6;
}

/* ── Stats ── */
.lp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 2rem;
}

.lp-stat {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  padding: 1.75rem 1.5rem;
  box-shadow: var(--shadow-sm);
}

.lp-stat-num {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--brand);
  line-height: 1;
}

.lp-stat-label {
  font-size: 0.825rem;
  color: var(--ink-2);
  font-weight: 500;
}

/* ── Final CTA ── */
.lp-final-cta {
  background: var(--brand);
  padding: 5rem 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.lp-cta-heading {
  font-size: clamp(1.75rem, 3.5vw, 2.75rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #fff;
  margin: 0;
}

.lp-final-cta .lp-email-row {
  max-width: 480px;
  width: 100%;
}

.lp-final-cta .lp-email-input {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.lp-final-cta .lp-email-input::placeholder {
  color: rgba(255, 255, 255, 0.55);
}

.lp-final-cta .lp-cta-btn {
  background: #fff;
  color: var(--brand);
}

.lp-final-cta .lp-cta-btn:hover:not(:disabled) {
  background: var(--brand-light);
}

.lp-cta-fine {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
}

/* ── Footer ── */
.lp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  font-size: 0.8rem;
  color: var(--ink-3);
  border-top: 1px solid var(--border);
}

.lp-footer-links {
  display: flex;
  gap: 1.5rem;
}

.lp-footer-links a {
  color: var(--ink-3);
  text-decoration: none;
  transition: color var(--t);
}

.lp-footer-links a:hover {
  color: var(--ink);
}

/* ═══════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════ */

@media (max-width: 768px) {
  .lp-nav-links {
    display: none;
  }

  .lp-hero {
    grid-template-columns: 1fr;
    padding: 3rem 1.25rem 2rem;
    gap: 2rem;
  }

  .lp-pain-cards {
    grid-template-columns: 1fr;
  }

  .lp-features-bento {
    grid-template-columns: 1fr;
    padding: 0 1.25rem;
  }

  .lp-features-header {
    padding: 0 1.25rem 2rem;
  }

  .lp-steps {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .lp-steps::before {
    display: none;
  }

  .lp-stats {
    grid-template-columns: repeat(2, 1fr);
    padding: 3rem 1.25rem;
  }

  .lp-section {
    padding: 3.5rem 1.25rem;
  }

  .lp-final-cta {
    padding: 3.5rem 1.25rem;
  }

  .lp-footer {
    flex-direction: column;
    gap: 0.75rem;
    text-align: center;
  }
}
```

- [ ] **Step 2: Verify no duplicate selectors in the file**

Open `frontend/src/styles/landing.css` and confirm there are no duplicate class names. Specifically confirm:
- `.lp-features-wrap` appears once (not confused with a `.lp-features` block)
- `.lp-final-cta .lp-email-input` and `.lp-final-cta .lp-cta-btn` are context selectors, not duplicates of the base rules

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/landing.css
git commit -m "style: add landing page CSS (lp- prefix)"
```

---

## Task 2: Add `startTrial` to the API client

**Files:**
- Modify: `frontend/src/api/client.js`

- [ ] **Step 1: Add `startTrial` to `authApi`**

Open `frontend/src/api/client.js`. The `authApi` object currently ends at line 82 with `logout`. Add `startTrial` as the last entry:

```js
export const authApi = {
  register: (data) => request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => request("/api/auth/me"),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  startTrial: (data) => request("/api/trial/start", { method: "POST", body: JSON.stringify(data) }),
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/client.js
git commit -m "feat: add startTrial to authApi client"
```

---

## Task 3: Create Landing.jsx

**Files:**
- Create: `frontend/src/pages/Landing.jsx`

- [ ] **Step 1: Create the Landing component**

Create `frontend/src/pages/Landing.jsx` with the following content:

```jsx
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/client";
import "../styles/landing.css";

const PAIN_POINTS = [
  {
    icon: "🚨",
    title: "Running out at the worst time",
    body: "Emergency orders cost 20–30% more. Manual tracking misses the warning signs.",
  },
  {
    icon: "📋",
    title: "Hours lost on stock-taking",
    body: "Farmers spend 4+ hours a week tracking supplies across spreadsheets and memory.",
  },
  {
    icon: "💸",
    title: "Missing price windows",
    body: "Seasonal price drops come and go while you're busy with the animals.",
  },
];

const FEATURES = [
  {
    icon: "🧠",
    title: "AI Depletion Predictions",
    body: "Knows your burn rate, herd size and season. Tells you exactly when to reorder — not too early, never too late.",
    variant: "lp-feature-dark",
  },
  {
    icon: "✈️",
    title: "Telegram Alerts",
    body: "Push notifications the moment stock runs low, prices drop, or weather threatens feed demand. Reply to order.",
    variant: "lp-feature-light",
  },
  {
    icon: "🛒",
    title: "One-Click Ordering",
    body: "AI drafts and sends the purchase order email to your supplier automatically.",
    variant: "lp-feature-white",
  },
  {
    icon: "📊",
    title: "Price Benchmarking",
    body: "See how your unit prices compare to regional averages and catch savings opportunities.",
    variant: "lp-feature-muted",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Enter your email",
    body: "Get instant access to a demo farm account loaded with real NZ dairy farm data.",
  },
  {
    n: "02",
    title: "Explore your data",
    body: "See AI predictions, Telegram alerts, spending charts, and one-click ordering in action.",
  },
  {
    n: "03",
    title: "Go live in minutes",
    body: "Import your own orders and let AI take over your supply management.",
  },
];

const STATS = [
  { num: "$2,000+", label: "avg annual savings per farm" },
  { num: "50%", label: "fewer emergency orders" },
  { num: "4 hrs", label: "saved per week" },
  { num: "14 days", label: "free to try everything" },
];

const INVENTORY_BARS = [
  { label: "Drench", pct: 22, color: "var(--red)" },
  { label: "Feed", pct: 60, color: "var(--amber)" },
  { label: "Fertiliser", pct: 85, color: "var(--brand)" },
];

function EmailForm({ onSubmit, loading, error }) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(email);
  };

  return (
    <form className="lp-email-row" onSubmit={handleSubmit}>
      <input
        type="email"
        className="lp-email-input"
        placeholder="you@farm.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit" className="lp-cta-btn" disabled={loading}>
        {loading ? "Starting…" : "Try free for 14 days →"}
      </button>
      {error && <p className="lp-form-error">{error}</p>}
    </form>
  );
}

export default function Landing() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (token) return <Navigate to="/dashboard" replace />;

  const handleTrial = async (email) => {
    setError("");
    setLoading(true);
    try {
      const data = await authApi.startTrial({ email });
      login(data.access_token, data.user);
      navigate("/dashboard");
    } catch {
      // Backend endpoint not yet implemented — fall back to register with email pre-filled
      navigate(`/register?email=${encodeURIComponent(email)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-root">
      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <Link to="/" className="lp-nav-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="28" height="28" rx="8" fill="#145C33" />
            <path
              d="M14 6C14 6 8 11 8 16a6 6 0 0012 0c0-5-6-10-6-10z"
              fill="#fff"
              opacity="0.9"
            />
            <path
              d="M14 10v12M10 18h8"
              stroke="#fff"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          FarmStock AI
        </Link>
        <div className="lp-nav-links">
          <a href="#features" className="lp-nav-link">Features</a>
          <a href="#how-it-works" className="lp-nav-link">How it Works</a>
          <Link to="/pricing" className="lp-nav-link">Pricing</Link>
        </div>
        <div className="lp-nav-actions">
          <Link to="/login" className="lp-nav-ghost">Sign In</Link>
          <Link to="/register" className="lp-nav-primary">Start Free Trial</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-left">
          <span className="lp-tag-pill">AI-Powered Farm Supply Management</span>
          <h1 className="lp-hero-heading">
            Never run out of
            <br />
            <em>critical supplies</em> again.
          </h1>
          <p className="lp-hero-sub">
            FarmStock AI predicts when you'll run low, alerts you on Telegram, and
            places orders with one tap — before you even notice a problem.
          </p>
          <EmailForm onSubmit={handleTrial} loading={loading} error={error} />
          <p className="lp-fine-print">No credit card needed · 14-day free trial after</p>
          <div className="lp-avatar-row">
            <div className="lp-avatars">
              {["🧑‍🌾", "👩‍🌾", "🧑‍🌾"].map((emoji, i) => (
                <span key={i} className="lp-avatar">{emoji}</span>
              ))}
            </div>
            <span className="lp-avatar-text">Trusted by 500+ NZ &amp; AU farms</span>
          </div>
        </div>

        <div className="lp-hero-right">
          <div className="lp-bento">
            {/* Telegram mock */}
            <div className="lp-bento-card lp-bento-tg">
              <div className="lp-tg-header">
                <span className="lp-tg-icon" aria-hidden="true">✈️</span>
                <div>
                  <p className="lp-tg-name">FarmStock AI</p>
                  <p className="lp-tg-sub">Telegram Bot</p>
                </div>
              </div>
              <div className="lp-tg-bubble">
                ⚠️ Your <strong>Ivomec drench</strong> runs out in{" "}
                <strong>8 days</strong>. Order now?
              </div>
              <div className="lp-tg-actions">
                <button className="lp-tg-btn lp-tg-btn-yes" type="button">
                  ✓ Yes, order
                </button>
                <button className="lp-tg-btn lp-tg-btn-no" type="button">
                  Later
                </button>
              </div>
            </div>

            {/* Inventory mini chart */}
            <div className="lp-bento-card lp-bento-chart">
              <p className="lp-bento-label">Inventory Health</p>
              <div className="lp-mini-bars">
                {INVENTORY_BARS.map(({ label, pct, color }) => (
                  <div key={label} className="lp-mini-bar-row">
                    <span className="lp-mini-bar-label">{label}</span>
                    <div className="lp-mini-bar-track">
                      <div
                        className="lp-mini-bar-fill"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className="lp-mini-bar-pct">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Savings badge */}
            <div className="lp-bento-card lp-bento-badge">
              <span className="lp-badge-num">$2,400</span>
              <span className="lp-badge-label">saved this season</span>
            </div>

            {/* Price-drop pill */}
            <div className="lp-bento-card lp-bento-pill">
              <span className="lp-pill-icon" aria-hidden="true">📉</span>
              <span>
                Price drop! Superphosphate <strong>↓10%</strong> at Farmlands
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ── */}
      <div className="lp-marquee" aria-hidden="true">
        <div className="lp-marquee-track">
          {[0, 1].map((i) => (
            <span key={i} className="lp-marquee-inner">
              AI-Powered Predictions · Telegram Alerts · One-Click Ordering ·
              Price Monitoring · Shelf-Life Intelligence · Zero App Download ·{" "}
            </span>
          ))}
        </div>
      </div>

      {/* ── Pain ── */}
      <section className="lp-section" id="pain">
        <div className="lp-section-label">The Problem</div>
        <h2 className="lp-section-heading">
          Farming is hard enough without supply surprises.
        </h2>
        <div className="lp-pain-cards">
          {PAIN_POINTS.map(({ icon, title, body }) => (
            <div key={title} className="lp-pain-card">
              <span className="lp-pain-icon" aria-hidden="true">{icon}</span>
              <h3 className="lp-pain-title">{title}</h3>
              <p className="lp-pain-body">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-features-wrap" id="features">
        <div className="lp-features-header">
          <div className="lp-section-label">Features</div>
          <h2 className="lp-section-heading">
            Everything your farm supply manager needs.
          </h2>
        </div>
        <div className="lp-features-bento">
          {FEATURES.map(({ icon, title, body, variant }) => (
            <div key={title} className={`lp-feature-card ${variant}`}>
              <span className="lp-feature-icon" aria-hidden="true">{icon}</span>
              <h3 className="lp-feature-title">{title}</h3>
              <p className="lp-feature-body">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="lp-section" id="how-it-works">
        <div className="lp-section-label">How it Works</div>
        <h2 className="lp-section-heading">Up and running in minutes.</h2>
        <div className="lp-steps">
          {STEPS.map(({ n, title, body }) => (
            <div key={n} className="lp-step">
              <span className="lp-step-num">{n}</span>
              <h3 className="lp-step-title">{title}</h3>
              <p className="lp-step-body">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="lp-stats">
        {STATS.map(({ num, label }) => (
          <div key={label} className="lp-stat">
            <span className="lp-stat-num">{num}</span>
            <span className="lp-stat-label">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Final CTA ── */}
      <section className="lp-final-cta">
        <h2 className="lp-cta-heading">Your supplies, always under control.</h2>
        <EmailForm onSubmit={handleTrial} loading={loading} error={error} />
        <p className="lp-cta-fine">1-hour demo with real farm data · No card needed</p>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <span>© 2026 FarmStock AI · Built for NZ &amp; AU farmers</span>
        <div className="lp-footer-links">
          <Link to="/login">Sign In</Link>
          <Link to="/pricing">Pricing</Link>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Verify imports are correct**

Confirm the file imports:
- `useState` from `"react"` ✓
- `Link`, `Navigate`, `useNavigate` from `"react-router-dom"` ✓
- `useAuth` from `"../context/AuthContext"` ✓
- `authApi` from `"../api/client"` ✓
- `"../styles/landing.css"` ✓

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Landing.jsx
git commit -m "feat: add Landing page component (8-section Bento layout)"
```

---

## Task 4: Register the route in App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add the Landing import and public route**

Open `frontend/src/App.jsx`. The current file has imports at the top and a single `<Routes>` block. Make two changes:

**Add import** after the existing page imports (line 10):

```jsx
import Landing from "./pages/Landing";
```

**Replace the Routes block** — add the public `/` route before the ProtectedRoute wrapper, and remove the `<Route index ...>` redirect from inside ProtectedRoute (Landing now handles the redirect for auth users):

```jsx
<Routes future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  <Route path="/" element={<Landing />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/pricing" element={<Pricing />} />
  <Route
    element={
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    }
  >
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/orders" element={<OrdersPage />} />
    <Route path="/farm-profile" element={<FarmProfilePage />} />
    <Route path="/products" element={<ProductsPage />} />
  </Route>
</Routes>
```

Note: The `<Route index element={<Navigate to="/dashboard" replace />} />` line is removed because `Landing.jsx` already handles authenticated users with `if (token) return <Navigate to="/dashboard" replace />`.

- [ ] **Step 2: Start the dev server and verify**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173/` in a browser. Verify:
1. Landing page renders (Navbar, Hero with Bento cards, Marquee strip visible)
2. Navigating to `http://localhost:5173/login` still works
3. Navigating to `http://localhost:5173/register` still works
4. Authenticated session: log in, then visit `/` — should redirect to `/dashboard`

- [ ] **Step 3: Check mobile layout**

In browser devtools, switch to a 375px viewport. Verify:
- Navbar hides the center links (only logo + Sign In + Start Free Trial visible)
- Hero stacks to single column
- Pain cards stack to single column
- Stats grid is 2×2

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: register public / route for Landing page"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|-----------|
| Public `/` route, redirects auth users to `/dashboard` | Task 4 + `Landing.jsx` `if (token)` guard |
| Navbar with Sign In + Start Free Trial | Task 3, Navbar section |
| Hero Bento: email input + tag pill + heading + sub + avatars | Task 3, Hero section |
| Hero Bento right: Telegram mock, inventory chart, savings badge, price pill | Task 3, Bento cards |
| Marquee strip | Task 3, Marquee section |
| Pain section (3 cards) | Task 3, Pain section |
| Features Bento (4 cards, 2 variants) | Task 3, Features section |
| How it Works (3 steps, dashed connector) | Task 3, Steps section |
| Stats (4 metrics) | Task 3, Stats section |
| Final CTA (dark green, email form) | Task 3, Final CTA section |
| Footer | Task 3, Footer |
| No inline styles except dynamic values | Checked: only `pct%` and `color` on bar fill are dynamic |
| All CSS in `.lp-` prefix | Task 1 confirmed |
| Mobile responsive | Task 1 `@media` block + Task 4 Step 3 verification |
| Trial flow: POST `/api/trial/start`, fallback to `/register?email=` | Task 2 + Task 3 `handleTrial` |
| 14-day trial copy | Fine print: "No credit card needed · 14-day free trial after" |
| Telegram (not WhatsApp) throughout | Confirmed in Bento TG card, Features card, hero sub copy |

**No placeholders found.** All steps contain complete code.

**Type consistency:** `authApi.startTrial` defined in Task 2, called in Task 3 — consistent signature `({ email })`.
