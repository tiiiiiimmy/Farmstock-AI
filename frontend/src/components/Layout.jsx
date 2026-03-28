import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FloatingChat from "./FloatingChat";

/* ── SVG Icons ──────────────────────────────────────────────── */

const DashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const OrdersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

const FarmIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 21v-5h6v5" />
  </svg>
);

const ProductsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);


/* ── Nav items ──────────────────────────────────────────────── */

const navItems = [
  { to: "/dashboard",    label: "Overview",  Icon: DashIcon },
  { to: "/products",     label: "Products",  Icon: ProductsIcon },
  { to: "/orders",       label: "Orders",    Icon: OrdersIcon },
  { to: "/farm-profile", label: "Farm",      Icon: FarmIcon },
];

/* ── Layout ─────────────────────────────────────────────────── */

export default function Layout() {
  const { isTrialing, trialDaysLeft, logout } = useAuth();

  return (
    <div className="shell">

      {/* ── Desktop sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img className="brand-logo" src="/logo.png" alt="FarmStock AI" />
          <p className="brand-tagline">Farm supply intelligence</p>
        </div>

        <nav className="nav">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="signout-btn" onClick={logout}>
          Sign out
        </button>
      </aside>

      {/* ── Main content ── */}
      <main className="content">
        {/* Mobile top bar — visible only on small screens via CSS */}
        <div className="mobile-topbar">
          <img className="mobile-topbar-logo" src="/logo.png" alt="FarmStock AI" />
          <span className="mobile-topbar-label">FarmStock AI</span>
        </div>

        {isTrialing && trialDaysLeft <= 7 && (
          <div className="trial-banner">
            <span>
              Free trial ends in{" "}
              <strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}</strong>
            </span>
            <Link to="/pricing" className="trial-upgrade">
              Upgrade →
            </Link>
          </div>
        )}

        <Outlet />
      </main>

      <FloatingChat />

      {/* ── Mobile bottom navigation ── */}
      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive ? "bottom-tab bottom-tab-active" : "bottom-tab"
            }
          >
            <Icon />
            <span className="bottom-tab-label">{label}</span>
          </NavLink>
        ))}
      </nav>

    </div>
  );
}
