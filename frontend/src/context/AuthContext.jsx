import { createContext, useContext, useState } from 'react'
import { authApi } from '../api/client'

const AuthContext = createContext(null)

function clearLocalAuth() {
  localStorage.removeItem('farmstock_token')
  localStorage.removeItem('farmstock_user')
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('farmstock_token'))
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('farmstock_user')
    return u ? JSON.parse(u) : null
  })

  const login = (tokenValue, userData) => {
    localStorage.setItem('farmstock_token', tokenValue)
    localStorage.setItem('farmstock_user', JSON.stringify(userData))
    setToken(tokenValue)
    setUser(userData)
  }

  const logout = async () => {
    // Best-effort server notification — don't block on failure
    try { await authApi.logout() } catch {}
    clearLocalAuth()
    setToken(null)
    setUser(null)
    window.location.href = '/login'
  }

  const isTrialing = user?.subscription_status === 'trialing'
  const trialDaysLeft = user?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(user.trial_ends_at) - new Date()) / 86400000))
    : 0

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isTrialing, trialDaysLeft }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
