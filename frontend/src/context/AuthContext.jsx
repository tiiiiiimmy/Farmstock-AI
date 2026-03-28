import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

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

  const logout = () => {
    localStorage.removeItem('farmstock_token')
    localStorage.removeItem('farmstock_user')
    setToken(null)
    setUser(null)
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
