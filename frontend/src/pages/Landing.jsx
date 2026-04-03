import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/client";
import "../styles/landing.css";
import wordmark from "../../../assets/logo/logo2.png";

function Icon({ name, className = "" }) {
  const icons = {
    alert: (
      <path d="M12 3 2.8 19a1 1 0 0 0 .86 1.5h16.68A1 1 0 0 0 21.2 19L12 3Zm0 5.5v5m0 3.5h.01" />
    ),
    clipboard: (
      <>
        <rect x="6" y="5" width="12" height="15" rx="2" />
        <path d="M9 5.5h6M9.5 3.5h5a1 1 0 0 1 1 1v2h-7v-2a1 1 0 0 1 1-1Z" />
        <path d="M9 10h6M9 14h4" />
      </>
    ),
    trend: (
      <>
        <path d="M4 16.5 9.5 11l3.2 3.2L20 7" />
        <path d="M15.5 7H20v4.5" />
      </>
    ),
    brain: (
      <>
        <path d="M9 6.5a3 3 0 0 1 5.7-1.3A3.5 3.5 0 0 1 17.5 11 3 3 0 0 1 16 16.5H9A3 3 0 0 1 7.5 11 3.5 3.5 0 0 1 9 6.5Z" />
        <path d="M10 8.5c1 .2 1.5.9 1.5 2v5M14 8.5c-1 .2-1.5.9-1.5 2" />
      </>
    ),
    send: (
      <>
        <path d="M21 3 10 14" />
        <path d="m21 3-7 18-4-7-7-4 18-7Z" />
      </>
    ),
    cart: (
      <>
        <circle cx="9" cy="18" r="1.5" />
        <circle cx="17" cy="18" r="1.5" />
        <path d="M3 4h2l2.2 9.5a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.75L20 7H7" />
      </>
    ),
    chart: (
      <>
        <path d="M5 19V9" />
        <path d="M12 19V5" />
        <path d="M19 19v-7" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
      </>
    ),
    warning: (
      <>
        <path d="M12 3 2.8 19a1 1 0 0 0 .86 1.5h16.68A1 1 0 0 0 21.2 19L12 3Zm0 5.5v5m0 3.5h.01" />
      </>
    ),
    check: (
      <path d="m5 12.5 4.2 4.2L19 7.8" />
    ),
    priceDrop: (
      <>
        <path d="M6 7h12" />
        <path d="M12 7v10" />
        <path d="m8.5 13.5 3.5 3.5 3.5-3.5" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" className={`lp-icon ${className}`.trim()} fill="none" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

const PAIN_POINTS = [
  {
    icon: "alert",
    title: "Running out at the worst time",
    body: "Emergency orders cost 20–30% more. Manual tracking misses the warning signs.",
  },
  {
    icon: "clipboard",
    title: "Hours lost on stock-taking",
    body: "Farmers spend 4+ hours a week tracking supplies across spreadsheets and memory.",
  },
  {
    icon: "trend",
    title: "Missing price windows",
    body: "Seasonal price drops come and go while you're busy with the animals.",
  },
];

const VALUE_BLOCKS = [
  {
    icon: "alert",
    title: "Stop paying the emergency premium",
    body: "Catch stock risks earlier so farms can order on schedule, not under pressure.",
    variant: "lp-feature-dark",
  },
  {
    icon: "clipboard",
    title: "Turn messy supply work into one workflow",
    body: "Move from memory, spreadsheets and scattered supplier chats into one daily operating view.",
    variant: "lp-feature-light",
  },
  {
    icon: "cart",
    title: "Get from insight to action in minutes",
    body: "See what matters, confirm the decision, and move toward an order without extra admin steps.",
    variant: "lp-feature-white",
  },
  {
    icon: "trend",
    title: "Start with a demo, then roll out fast",
    body: "Try the workflow on real sample data first, then bring your own farm live when you're ready.",
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

const HERO_PROOF = [
  "Built for NZ dairy and mixed farms",
  "Telegram-first alerts and ordering",
  "Live inventory, spending and supplier visibility",
];

const HERO_MODULES = [
  {
    id: "telegram",
    tabLabel: "TELEGRAM BOT",
    kicker: "Telegram Bot",
    keyword: "Instant Telegram alerts",
    heroHeading: "Approve urgent orders from the paddock.",
    heroBody:
      "FarmStock AI sends low-stock warnings, reorder prompts and fast yes-or-later decisions straight to Telegram, so action happens before shortages interrupt the day.",
    heroProof: [
      "Low-stock prompts arrive instantly",
      "Approve or delay in one tap",
      "No office login needed to respond",
    ],
    points: ["Telegram Bot", "Ivomec drench in 8 days", "Yes, order"],
  },
  {
    id: "inventory",
    tabLabel: "INVENTORY HEALTH",
    kicker: "Inventory Health",
    keyword: "Live stock picture",
    heroHeading: "See supply pressure at a glance.",
    heroBody:
      "Inventory Health condenses current stock, burn rate and category status into a single live readout, so the risky inputs stand out before they become late-night emergency orders.",
    heroProof: [
      "Fast view across key supply categories",
      "High-risk stock rises to the top",
      "Healthy and urgent items stay clearly separated",
    ],
    points: ["Drench 22%", "Feed 60%", "Fertiliser 85%"],
  },
  {
    id: "forecast",
    tabLabel: "REORDER FORECAST",
    kicker: "Reorder Forecast",
    keyword: "Next-buy priority list",
    heroHeading: "Know the next order before it is urgent.",
    heroBody:
      "The reorder forecast ranks upcoming purchases by urgency and timing, giving farms a clear next-action list instead of forcing manual checks across every product and supplier.",
    heroProof: [
      "AI-ranked order queue",
      "Clear timing windows for each input",
      "Less guesswork around season-driven demand",
    ],
    points: ["Silage wrap in 6 days", "Drench critical this week", "Urea healthy for 3 weeks"],
  },
  {
    id: "pricing",
    tabLabel: "PRICE DROP",
    kicker: "Price Drop",
    keyword: "Catch supplier discounts",
    heroHeading: "Turn price swings into better timing.",
    heroBody:
      "Price alerts surface meaningful supplier drops early, so farms can lock in value on expensive inputs while the opportunity is still open instead of hearing about it too late.",
    heroProof: [
      "Supplier price drops flagged early",
      "Better timing for larger-ticket inputs",
      "Savings captured before the window closes",
    ],
    points: ["Superphosphate down 10%", "Farmlands pricing move"],
  },
];

function ModuleRichCard({ module }) {
  if (module.id === "telegram") {
    return (
      <div className="lp-rich-card lp-rich-card-telegram">
        <div className="lp-tg-header">
          <span className="lp-tg-icon" aria-hidden="true">
            <Icon name="send" className="lp-tg-icon-svg" />
          </span>
          <div>
            <p className="lp-tg-name">FarmStock AI</p>
            <p className="lp-tg-sub">Telegram Bot</p>
          </div>
        </div>
        <div className="lp-tg-bubble">
          <Icon name="warning" className="lp-inline-status-icon" /> Your <strong>Ivomec drench</strong> runs out in <strong>8 days</strong>. Order now?
        </div>
        <div className="lp-tg-actions">
          <button className="lp-tg-btn lp-tg-btn-yes" type="button">
            <Icon name="check" className="lp-btn-icon" /> Yes, order
          </button>
          <button className="lp-tg-btn lp-tg-btn-no" type="button">
            Later
          </button>
        </div>
      </div>
    );
  }

  if (module.id === "inventory") {
    return (
      <div className="lp-rich-card lp-rich-card-inventory">
        <p className="lp-bento-label">Inventory Health</p>
        <div className="lp-mini-bars">
          {[
            { label: "Drench", pct: 22, color: "var(--red)" },
            { label: "Feed", pct: 60, color: "var(--amber)" },
            { label: "Fertiliser", pct: 85, color: "var(--brand)" },
          ].map(({ label, pct, color }) => (
            <div key={label} className="lp-mini-bar-row">
              <span className="lp-mini-bar-label">{label}</span>
              <div className="lp-mini-bar-track">
                <div className="lp-mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="lp-mini-bar-pct">{pct}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (module.id === "forecast") {
    return (
      <div className="lp-rich-card lp-rich-card-forecast">
        <div className="lp-forecast-head">
          <p className="lp-bento-label">Reorder forecast</p>
          <span className="lp-forecast-chip">AI ranked</span>
        </div>
        <div className="lp-forecast-list">
          {[
            { name: "Silage wrap", window: "Order in 6 days", tone: "amber" },
            { name: "Drench", window: "Critical this week", tone: "red" },
            { name: "Urea", window: "Healthy for 3 weeks", tone: "green" },
          ].map((item) => (
            <div key={item.name} className="lp-forecast-row">
              <span className={`lp-forecast-dot lp-forecast-dot-${item.tone}`} />
              <div className="lp-forecast-copy">
                <strong>{item.name}</strong>
                <span>{item.window}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="lp-rich-card lp-rich-card-pricing">
      <div className="lp-bento-pill">
        <span className="lp-pill-icon" aria-hidden="true">
          <Icon name="priceDrop" className="lp-pill-icon-svg" />
        </span>
        <span>
          Price drop! Superphosphate <strong>↓10%</strong> at Farmlands
        </span>
      </div>
      <div className="lp-price-card-foot">
        <span>Watchlist active</span>
        <strong>Best buy window open</strong>
      </div>
    </div>
  );
}

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
  const [activeModuleId, setActiveModuleId] = useState(null);

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

  const activeModule =
    HERO_MODULES.find((module) => module.id === activeModuleId) || null;

  return (
    <div className="lp-root">
      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <Link to="/" className="lp-nav-logo">
          <img src={wordmark} alt="FarmStock AI" className="lp-nav-wordmark" />
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
        <div className="lp-hero-bg-orb lp-hero-bg-orb-a" aria-hidden="true" />
        <div className="lp-hero-bg-orb lp-hero-bg-orb-b" aria-hidden="true" />
        <div className="lp-hero-left">
          <div className="lp-hero-copy-shell">
            <div className="lp-hero-copy" key={activeModule?.id || "default"}>
              <span className="lp-tag-pill">AI-Powered Farm Supply Management</span>
              <h1 className="lp-hero-heading">
                {activeModule ? (
                  <>
                    {activeModule.heroHeading.split("\n").map((line) => (
                      <span key={line} className="lp-hero-heading-line">
                        {line}
                      </span>
                    ))}
                  </>
                ) : (
                  <>
                    Never run out of
                    <br />
                    <em>critical supplies</em> again.
                  </>
                )}
              </h1>
              <p className="lp-hero-sub">
                {activeModule
                  ? activeModule.heroBody
                  : "FarmStock AI predicts when you'll run low, alerts you on Telegram, and places orders with one tap — before you even notice a problem."}
              </p>
              <div className="lp-proof-list">
                {(activeModule?.heroProof || HERO_PROOF).map((item) => (
                  <span key={item} className="lp-proof-item">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="lp-hero-fixed-cta">
            <EmailForm onSubmit={handleTrial} loading={loading} error={error} />
            <p className="lp-fine-print">No credit card needed · 14-day free trial after</p>
            <div className="lp-avatar-row">
              <div className="lp-avatars">
                {[0, 1, 2].map((item) => (
                  <span key={item} className="lp-avatar">
                    <Icon name="user" className="lp-avatar-icon" />
                  </span>
                ))}
              </div>
              <span className="lp-avatar-text">Trusted by 500+ NZ &amp; AU farms</span>
            </div>
          </div>
        </div>

        <div className="lp-hero-right">
          <div className="lp-hero-media-stack">
            <div className="lp-hero-visual">
              <img
                src="/heroimg.png"
                alt="FarmStock AI dashboard preview on phone and desktop"
                className="lp-hero-img"
                loading="eager"
              />
            </div>
            <div className="lp-module-showcase">
              <div className="lp-module-grid lp-module-grid--below-hero" role="tablist" aria-label="Product highlights">
                {HERO_MODULES.map((module) => (
                  <button
                    key={module.id}
                    type="button"
                    role="tab"
                    aria-selected={activeModuleId === module.id}
                    className={`lp-module-card lp-module-card--rich lp-module-card--${module.id} ${activeModuleId === module.id ? "lp-module-card-active" : ""}`}
                    onMouseEnter={() => setActiveModuleId(module.id)}
                    onMouseLeave={() => setActiveModuleId(null)}
                    onFocus={() => setActiveModuleId(module.id)}
                    onBlur={() => setActiveModuleId(null)}
                    onClick={() => setActiveModuleId(module.id)}
                  >
                    <span className="lp-module-tab-label">{module.tabLabel}</span>
                    <div className="lp-module-reveal">
                      <ModuleRichCard module={module} />
                    </div>
                  </button>
                ))}
              </div>
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
              <span className="lp-pain-icon" aria-hidden="true">
                <Icon name={icon} className="lp-pain-icon-svg" />
              </span>
              <h3 className="lp-pain-title">{title}</h3>
              <p className="lp-pain-body">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-features-wrap" id="features">
        <div className="lp-features-header">
          <div className="lp-section-label">Value</div>
          <h2 className="lp-section-heading">
            Built to reduce waste, save time, and make trial-to-adoption easy.
          </h2>
        </div>
        <div className="lp-features-bento">
          {VALUE_BLOCKS.map(({ icon, title, body, variant }) => (
            <div key={title} className={`lp-feature-card ${variant}`}>
              <div className="lp-feature-bg-mark" aria-hidden="true">
                <Icon name={icon} className="lp-feature-bg-mark-svg" />
              </div>
              <span className="lp-feature-icon" aria-hidden="true">
                <Icon name={icon} className="lp-feature-icon-svg" />
              </span>
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
