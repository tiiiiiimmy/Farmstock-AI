const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
export const DEFAULT_FARM_ID = "farm-001";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  health: () => request("/health"),
  getFarm: (farmId = DEFAULT_FARM_ID) => request(`/api/farm/${farmId}`),
  updateFarm: (farmId, payload) =>
    request(`/api/farm/${farmId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  getOrders: (farmId = DEFAULT_FARM_ID, searchParams = "") =>
    request(`/api/orders?farm_id=${farmId}${searchParams}`),
  createOrder: (farmId, payload) =>
    request(`/api/orders?farm_id=${farmId}`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateOrder: (orderId, payload) =>
    request(`/api/orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  deleteOrder: (orderId) =>
    request(`/api/orders/${orderId}`, {
      method: "DELETE"
    }),
  getProducts: () => request("/api/products"),
  getPredictions: (farmId = DEFAULT_FARM_ID) =>
    request(`/api/predictions?farm_id=${farmId}`),
  getRecommendations: (farmId = DEFAULT_FARM_ID) =>
    request(`/api/recommendations?farm_id=${farmId}`),
  getAlerts: (farmId = DEFAULT_FARM_ID) =>
    request(`/api/alerts?farm_id=${farmId}`),
  getSpending: (farmId = DEFAULT_FARM_ID, period = "") =>
    request(`/api/spending?farm_id=${farmId}${period ? `&period=${period}` : ""}`),
  placeOrder: (payload) =>
    request("/api/place-order", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  sendChat: (payload) =>
    request("/api/chat", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
