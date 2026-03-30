import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FarmSwitcher from "./FarmSwitcher";
import FloatingChat from "./FloatingChat";
import { MobileNav, SidebarNav } from "./ShellNavigation";
import TrialBanner from "./TrialBanner";

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img className="brand-logo" src="/logo.png" alt="FarmStock AI" />
          <p className="brand-tagline">Farm supply intelligence</p>
        </div>

        <FarmSwitcher />
        <SidebarNav />

        <button
          className="signout-btn"
          onClick={async () => {
            await logout();
            navigate("/login", { replace: true });
          }}
        >
          Sign out
        </button>
      </aside>

      <main className="content">
        <div className="mobile-topbar">
          <div className="mobile-topbar-brand">
            <img className="mobile-topbar-logo" src="/logo.png" alt="FarmStock AI" />
            <span className="mobile-topbar-label">FarmStock AI</span>
          </div>
          <FarmSwitcher />
        </div>

        <TrialBanner />
        <Outlet />
      </main>

      <FloatingChat />
      <MobileNav />
    </div>
  );
}
