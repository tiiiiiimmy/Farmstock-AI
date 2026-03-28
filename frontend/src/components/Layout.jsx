import { Link, NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Overview" },
  { to: "/orders", label: "Purchase History" },
  { to: "/farm-profile", label: "Farm Profile" },
  { to: "/products", label: "Products" },
  { to: "/insights", label: "AI Insights" }
];

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isTrialing, trialDaysLeft, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <p className="eyebrow">Farm supply dashboard</p>
          <img className="brand-logo" src="/logo.png" alt="FarmStock AI" />
          <p className="brand-copy">
            Predict stock-outs, place supplier orders, and keep the office view in
            sync with the FarmStock bot.
          </p>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.75rem', padding: '0.5rem 0', textAlign: 'left' }}>
          Sign out
        </button>
      </aside>

      <main className="content">
        {isTrialing && trialDaysLeft <= 7 && (
          <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '0.5rem 1rem', fontSize: '0.875rem', color: '#92400e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⏳ Free trial ends in <strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</strong></span>
            <Link to="/pricing" style={{ color: '#15803d', fontWeight: 600, marginLeft: '1rem' }}>Upgrade →</Link>
          </div>
        )}
        <header className="topbar">
          <div>
            <p className="eyebrow">Clawcat Technologies</p>
            <h2>Shared dashboard for web + FarmStock bot operations</h2>
          </div>
          <button
            className="mobile-menu-btn"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className={`hamburger ${menuOpen ? "open" : ""}`} />
          </button>
        </header>

        {menuOpen && (
          <nav className="mobile-nav" onClick={() => setMenuOpen(false)}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? "nav-link nav-link-active" : "nav-link"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <Outlet />
      </main>
    </div>
  );
}
