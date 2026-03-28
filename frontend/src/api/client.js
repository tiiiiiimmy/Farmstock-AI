const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

function getToken() {
  return localStorage.getItem('farmstock_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(options.headers || {})
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    localStorage.removeItem('farmstock_token')
    localStorage.removeItem('farmstock_user')
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (response.status === 402) {
    window.location.href = '/pricing'
    throw new Error('Subscription required')
  }

  if (!response.ok) {
    const text = await response.text()
    let detail = text
    try { detail = JSON.parse(text).detail || text } catch {}
    throw new Error(detail || `Request failed: ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}

export const authApi = {
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
}

export const api = {
  health: () => request("/health"),
  getFarms: () => request("/api/farms"),
  getFarm: (farmId) => request(`/api/farm/${farmId}`),
  updateFarm: (farmId, payload) => request(`/api/farm/${farmId}`, { method: "PUT", body: JSON.stringify(payload) }),
  getOrders: (searchParams = "") => request(`/api/orders${searchParams ? '?' + searchParams : ''}`),
  createOrder: (payload) => request("/api/orders", { method: "POST", body: JSON.stringify(payload) }),
  updateOrder: (orderId, payload) => request(`/api/orders/${orderId}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteOrder: (orderId) => request(`/api/orders/${orderId}`, { method: "DELETE" }),
  getProducts: () => request("/api/products"),
  getPredictions: () => request("/api/predictions"),
  getRecommendations: () => request("/api/recommendations"),
  getAlerts: () => request("/api/alerts"),
  updateAlert: (alertId, status) => request(`/api/alerts/${alertId}?status=${status}`, { method: "PUT" }),
  getSpending: (params = "") => request(`/api/spending${params ? '?' + params : ''}`),
  placeOrder: (payload) => request("/api/place-order", { method: "POST", body: JSON.stringify(payload) }),
  sendChat: (payload) => request("/api/chat", { method: "POST", body: JSON.stringify(payload) }),
  getSubscriptionStatus: () => request("/api/billing/status"),
  createCheckoutSession: (plan) => request("/api/billing/checkout", { method: "POST", body: JSON.stringify({ plan }) }),
  getSuppliers: (farmId) => request(`/api/farm/${farmId}/suppliers`),
  createSupplier: (farmId, data) => request(`/api/farm/${farmId}/suppliers`, { method: "POST", body: JSON.stringify(data) }),
  deleteSupplier: (farmId, supplierId) => request(`/api/farm/${farmId}/suppliers/${supplierId}`, { method: "DELETE" }),
}
