import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Overview" },
  { to: "/orders", label: "Purchase History" },
  { to: "/farm-profile", label: "Farm Profile" },
  { to: "/products", label: "Products" },
  { to: "/insights", label: "AI Insights" }
];

export default function Layout() {
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
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Clawcat Technologies</p>
            <h2>Shared dashboard for web + FarmStock bot operations</h2>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
