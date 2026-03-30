import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setApiNavigationHandlers } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AppNavigator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearSession } = useAuth();

  useEffect(() => {
    setApiNavigationHandlers({
      onUnauthorized: () => {
        if (location.pathname !== "/login") {
          clearSession();
          navigate("/login", { replace: true });
        }
      },
      onPaymentRequired: () => {
        if (location.pathname !== "/pricing") {
          navigate("/pricing", { replace: true });
        }
      },
    });

    return () => {
      setApiNavigationHandlers();
    };
  }, [clearSession, location.pathname, navigate]);

  return null;
}
