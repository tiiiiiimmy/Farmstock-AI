import { useState, useEffect } from "react";
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
    title: "Stop paying the emergency premium",
    body: "Catch stock risks earlier so farms can order on schedule, not under pressure.",
  },
  {
    title: "Turn messy supply work into one workflow",
    body: "Move from memory, spreadsheets and scattered supplier chats into one daily operating view.",
    status: "LIVE",
  },
  {
    title: "Get from insight to action in minutes",
    body: "See what matters, confirm the decision, and move toward an order without extra admin steps.",
  },
  {
    title: "Start with a demo, then roll out fast",
    body: "Try the workflow on real sample data first, then bring your own farm live when you're ready.",
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
    id: "ai-entry",
    tabLabel: "AI DATA ENTRY",
    kicker: "Smart Invoice Scanner",
    keyword: "AI Data Entry",
    heroHeading: "Snap a photo, let AI handle the entry.",
    heroBody:
      "Drop a photo of your supplier invoice. FarmStock AI extracts quantities, prices and categories instantly, turning messy paper trails into clean data.",
    heroProof: [
      "Photo to data in seconds",
      "Catches price changes automatically",
      "No manual typing needed",
    ],
    points: ["Scan invoice", "Data extracted", "Ready"],
  },
  {
    id: "regional-price",
    tabLabel: "PRICE TRENDS",
    kicker: "Regional Price Trends",
    keyword: "Price Trends",
    heroHeading: "Know if you're paying fair market price.",
    heroBody:
      "Leverage aggregated, anonymised regional price trends to see how your supplier costs compare to neighboring farms.",
    heroProof: [
      "Anonymised regional data",
      "Spot overpriced inputs",
      "Negotiate with confidence",
    ],
    points: ["Market price", "Your price", "Savings"],
  },
];

const PRICE_BENCHMARK_SAMPLE = {
  farmCount: 12,
  regionalMin: 31.8,
  regionalAvg: 34.9,
  regionalMax: 38.6,
  yourLatestPrice: 33.4,
  yourPercentile: 68,
  unit: "L",
  trend: [
    { date: "Jan", unitPrice: 35.9 },
    { date: "Feb", unitPrice: 35.4 },
    { date: "Mar", unitPrice: 34.7 },
    { date: "Apr", unitPrice: 34.2 },
    { date: "May", unitPrice: 33.9 },
    { date: "Jun", unitPrice: 33.4 },
  ],
};

function formatNzd(amount) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function ModuleRichCard({ module }) {
  if (module.id === "telegram") {
    return (
      <div className="lp-rich-card lp-rich-card-telegram">
        <div className="lp-tg-container">
          <div className="lp-tg-header">
            <span className="lp-tg-icon" aria-hidden="true">
              <Icon name="send" className="lp-tg-icon-svg" />
            </span>
            <div>
              <p className="lp-tg-name">FarmStock AI</p>
              <p className="lp-tg-sub">bot</p>
            </div>
          </div>
          <div className="lp-tg-body">
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
            <div className="lp-tg-bubble lp-tg-bubble-response">
              ✅ Order placed. Farmlands will deliver on Tuesday.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (module.id === "inventory") {
    return (
      <div className="lp-rich-card lp-rich-card-inventory">
        <div className="lp-inv-top">
          <div className="lp-bento-label lp-bento-label-tight">Inventory Health Snapshot</div>
          <span className="lp-forecast-chip">Live sync</span>
        </div>
        <div className="lp-inv-main">
          <div className="lp-inv-stat">
            <h1>92%</h1>
            <p>Overall Health</p>
          </div>
          <div className="lp-mini-bars">
            {[
              { label: "Drench (Ivomec)", pct: 22, color: "var(--red)", note: "Critical" },
              { label: "Feed (Silage)", pct: 60, color: "var(--amber)", note: "Reorder coming up" },
              { label: "Fertiliser (Urea)", pct: 85, color: "var(--brand)", note: "Healthy" },
            ].map(({ label, pct, color, note }) => (
              <div key={label} className="lp-mini-bar-row">
                <div className="lp-mini-bar-meta">
                  <span className="lp-mini-bar-label">{label}</span>
                  <span className="lp-mini-bar-pct" style={{ color: color }}>{note}</span>
                </div>
                <div className="lp-mini-bar-track lp-mini-bar-track-thick">
                  <div className="lp-mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (module.id === "ai-entry") {
    return (
      <div className="lp-rich-card lp-rich-card-ai">
        <div className="lp-forecast-head">
          <p className="lp-bento-label lp-bento-label-tight">Smart Invoice Extraction</p>
          <span className="lp-forecast-chip">AI Powered</span>
        </div>
        <div className="lp-ai-split">
          <div className="lp-ai-receipt-pane">
            <div className="lp-ai-receipt-doc">
               <div className="lp-ai-doc-head">TAX INVOICE</div>
               <div className="lp-ai-doc-vendor">Ravensdown Ltd</div>
               <div className="lp-ai-doc-lines">
                 <div className="lp-ai-doc-line"><span>Superphosphate</span><span>12.5 T</span></div>
                 <div className="lp-ai-doc-line"><span>Urea 46N</span><span>5.0 T</span></div>
               </div>
               <div className="lp-ai-doc-total">Total: $14,250.00</div>
               <div className="lp-ai-scanner-beam"></div>
            </div>
          </div>
          <div className="lp-ai-form-pane">
            <div className="lp-ai-form-header">
              <div className="lp-ai-success-msg">
                 ✓ Data Extracted
              </div>
            </div>
            <div className="lp-ai-grid">
               <div className="lp-ai-field">
                 <label>Supplier Extracted</label>
                 <div className="lp-ai-input">Ravensdown Ltd <Icon name="zap" className="lp-ai-sparkle"/></div>
               </div>
               <div className="lp-ai-field">
                 <label>Items Detected</label>
                 <div className="lp-ai-input">2 Products <Icon name="zap" className="lp-ai-sparkle"/></div>
               </div>
               <div className="lp-ai-field lp-ai-field-full">
                 <label>Total Invoice Value</label>
                 <div className="lp-ai-input lp-ai-input-highlight">$14,250.00 <Icon name="zap" className="lp-ai-sparkle"/></div>
               </div>
            </div>
            <button type="button" className="lp-ai-save-btn">Approve & Save to Inventory</button>
          </div>
        </div>
      </div>
    );
  }

  if (module.id === "regional-price") {
    const sample = PRICE_BENCHMARK_SAMPLE;
    const range = sample.regionalMax - sample.regionalMin || 1;
    const avgPct = Math.min(100, Math.max(0, ((sample.regionalAvg - sample.regionalMin) / range) * 100));
    const youPct = Math.min(100, Math.max(0, ((sample.yourLatestPrice - sample.regionalMin) / range) * 100));
    const labelAlign = youPct < 20 ? "left" : youPct > 80 ? "right" : "center";
    const cheaper = sample.yourPercentile !== null;
    const tone = cheaper
      ? sample.yourPercentile >= 50
        ? "good"
        : sample.yourPercentile >= 25
          ? "mid"
          : "high"
      : "mid";
    const chartWidth = 520;
    const chartHeight = 172;
    const chartPaddingX = 24;
    const chartPaddingTop = 20;
    const chartPaddingBottom = 34;
    const chartMin = Math.min(sample.regionalAvg, ...sample.trend.map((point) => point.unitPrice)) - 0.5;
    const chartMax = Math.max(sample.regionalAvg, ...sample.trend.map((point) => point.unitPrice)) + 0.5;
    const chartRange = chartMax - chartMin || 1;
    const stepX = (chartWidth - chartPaddingX * 2) / Math.max(sample.trend.length - 1, 1);
    const priceToY = (price) =>
      chartPaddingTop + ((chartMax - price) / chartRange) * (chartHeight - chartPaddingTop - chartPaddingBottom);
    const chartPoints = sample.trend
      .map((point, index) => `${chartPaddingX + index * stepX},${priceToY(point.unitPrice)}`)
      .join(" ");
    const avgLineY = priceToY(sample.regionalAvg);

    return (
      <div className="lp-rich-card lp-rich-card-price">
        <div className="lp-price-shell">
        

          <div className="bm-range-wrap">
            <div className="bm-stat-row">
              <div className="bm-stat">
                <span className="bm-stat-label">Min</span>
                <span className="bm-stat-value">{formatNzd(sample.regionalMin)}</span>
              </div>
              <div className="bm-stat bm-stat-center">
                <span className="bm-stat-label">Regional avg</span>
                <span className="bm-stat-value bm-stat-avg">{formatNzd(sample.regionalAvg)}</span>
         
              </div>
              <div className="bm-stat bm-stat-right">
                <span className="bm-stat-label">Max</span>
                <span className="bm-stat-value">{formatNzd(sample.regionalMax)}</span>
              </div>
            </div>

            <div className="bm-track">
              <div className="bm-track-fill" />
              <div className="bm-avg-tick" style={{ left: `${avgPct}%` }} />
              <div
                className={`bm-you-marker bm-you-marker-${tone}`}
                style={{ left: `${youPct}%` }}
              >
                <div className="bm-you-dot" />
                <div className={`bm-you-label bm-you-label-${labelAlign}`}>
                  <span className="bm-you-price">{formatNzd(sample.yourLatestPrice)}/{sample.unit}</span>
                  {cheaper && (
                    <span className={`bm-you-badge bm-badge-${tone}`}>
                      Cheaper than {sample.yourPercentile}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lp-price-chart-panel">
            <div className="lp-price-chart-head">
              <p className="lp-price-chart-label">Your price history</p>
              <span className="lp-price-chart-note">Region avg shown as dashed guide</span>
            </div>

            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="lp-price-chart"
              aria-label="Price history preview"
              role="img"
            >
              <line
                x1={chartPaddingX}
                y1={avgLineY}
                x2={chartWidth - chartPaddingX}
                y2={avgLineY}
                className="lp-price-chart-guide"
              />
              {sample.trend.map((point, index) => {
                const x = chartPaddingX + index * stepX;
                const y = priceToY(point.unitPrice);
                return (
                  <g key={point.date}>
                    <circle cx={x} cy={y} r="5" className="lp-price-chart-dot" />
                    <text x={x} y={chartHeight - 10} textAnchor="middle" className="lp-price-chart-axis">
                      {point.date}
                    </text>
                  </g>
                );
              })}
              <polyline points={chartPoints} className="lp-price-chart-line" />
              <text
                x={chartWidth - chartPaddingX}
                y={Math.max(avgLineY - 8, 12)}
                textAnchor="end"
                className="lp-price-chart-axis lp-price-chart-axis-guide"
              >
                Region avg
              </text>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <img
      src="/heroimg4.png"
      alt="Regional Price Trends"
      className="lp-hero-img"
      loading="eager"
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
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
      {/* <input
        type="email"
        className="lp-email-input"
        placeholder="you@farm.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      /> */}
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
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    let intervalId;
    const timeoutId = setTimeout(() => {
      setActiveModuleId(HERO_MODULES[0].id);
      intervalId = setInterval(() => {
        setActiveModuleId((currentId) => {
          if (!currentId) return HERO_MODULES[0].id;
          const currentIndex = HERO_MODULES.findIndex((m) => m.id === currentId);
          const nextIndex = (currentIndex + 1) % HERO_MODULES.length;
          return HERO_MODULES[nextIndex].id;
        });
      }, 3000);
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoPlaying]);


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
          {token ? (
            <Link to="/dashboard" className="lp-nav-primary">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="lp-nav-ghost">Sign In</Link>
              <Link to="/register" className="lp-nav-primary">Start Free Trial</Link>
            </>
          )}
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
            <div className={`lp-hero-visual ${activeModuleId ? "lp-hero-visual-rich" : ""}`}>
              {!activeModuleId ? (
                <img
                  key="default-img"
                  src="/heroimg.png"
                  alt="FarmStock AI default dashboard"
                  className="lp-hero-img"
                  loading="eager"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <ModuleRichCard key={activeModule.id} module={activeModule} />
              )}
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
                    onMouseEnter={() => { setIsAutoPlaying(false); setActiveModuleId(module.id); }}
                    onFocus={() => { setIsAutoPlaying(false); setActiveModuleId(module.id); }}
                    onClick={() => { setIsAutoPlaying(false); setActiveModuleId(module.id); }}
                  >
                    <span className="lp-module-tab-label">{module.tabLabel}</span>
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
          <h2 className="lp-features-title">Take Control Before Supplies Run Low</h2>
          <p className="lp-features-subtitle">
            Technology that amplifies your intuition, rather than replacing it.
          </p>
        </div>
        <div className="lp-features-bento">
          <article className="lp-feature-card lp-feature-card-premium">
            <img
              src="/valuebg.png"
              alt=""
              className="lp-feature-card-bg"
              loading="lazy"
            />
            <div className="lp-feature-card-overlay" aria-hidden="true" />
            <div className="lp-feature-card-content">
              <span className="lp-feature-eyebrow">Stock notifications</span>
              <h3 className="lp-feature-title">{VALUE_BLOCKS[0].title}</h3>
              <p className="lp-feature-body">{VALUE_BLOCKS[0].body}</p>
            </div>
          </article>

          <article className="lp-feature-card lp-feature-card-action">
            <div className="lp-feature-card-content">
              <h3 className="lp-feature-title">{VALUE_BLOCKS[2].title}</h3>
              <p className="lp-feature-body">{VALUE_BLOCKS[2].body}</p>
            </div>
          </article>

          <article className="lp-feature-card lp-feature-card-workflow">
            <div className="lp-feature-card-top">
              <span className="lp-feature-mini-icon" aria-hidden="true">
                <Icon name="alert" className="lp-feature-mini-icon-svg" />
              </span>
              <span className="lp-feature-status">{VALUE_BLOCKS[1].status}</span>
            </div>
            <div className="lp-feature-card-content">
              <h3 className="lp-feature-title">{VALUE_BLOCKS[1].title}</h3>
              <p className="lp-feature-body">{VALUE_BLOCKS[1].body}</p>
            </div>
          </article>

          <article className="lp-feature-card lp-feature-card-demo">
            <div className="lp-feature-demo-art">
              <img
                src="/valuebg2.png"
                alt=""
                className="lp-feature-demo-image"
                loading="lazy"
              />
            </div>
            <div className="lp-feature-card-content">
              <h3 className="lp-feature-title">{VALUE_BLOCKS[3].title}</h3>
              <p className="lp-feature-body">{VALUE_BLOCKS[3].body}</p>
              <Link to="/register" className="lp-feature-link">
                Try free for 14 days →
              </Link>
            </div>
          </article>
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
