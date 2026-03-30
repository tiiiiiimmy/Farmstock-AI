import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function TrialBanner() {
  const { isTrialing, trialDaysLeft, trialDaysLabel } = useAuth();

  if (!isTrialing || trialDaysLeft > 7) {
    return null;
  }

  return (
    <div className="trial-banner">
      <span>
        Free trial ends in <strong>{trialDaysLabel}</strong>
      </span>
      <Link to="/pricing" className="trial-upgrade">
        Upgrade →
      </Link>
    </div>
  );
}
