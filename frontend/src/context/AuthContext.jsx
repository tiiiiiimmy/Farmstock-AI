import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { authApi } from "../api/client";
import { formatDaysLabel } from "../utils/formatters";

const AuthContext = createContext(null);

function clearLocalAuth() {
  localStorage.removeItem("farmstock_token");
  localStorage.removeItem("farmstock_user");
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("farmstock_token"));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("farmstock_user");
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch {
      clearLocalAuth();
      return null;
    }
  });

  const login = useCallback((tokenValue, userData) => {
    localStorage.setItem("farmstock_token", tokenValue);
    localStorage.setItem("farmstock_user", JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  }, []);

  const clearSession = useCallback(() => {
    clearLocalAuth();
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {}

    clearSession();
  }, [clearSession]);

  const isTrialing = user?.subscription_status === "trialing";
  const trialDaysLeft = user?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(user.trial_ends_at) - new Date()) / 86400000))
    : 0;

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      clearSession,
      isTrialing,
      trialDaysLeft,
      trialDaysLabel: formatDaysLabel(trialDaysLeft),
    }),
    [token, user, login, logout, clearSession, isTrialing, trialDaysLeft]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
