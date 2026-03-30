const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

let onUnauthorized = null;
let onPaymentRequired = null;

export class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function setApiNavigationHandlers(handlers = {}) {
  onUnauthorized = handlers.onUnauthorized || null;
  onPaymentRequired = handlers.onPaymentRequired || null;
}

function getToken() {
  return localStorage.getItem("farmstock_token");
}

async function parseErrorPayload(response) {
  const text = await response.text();
  if (!text) {
    return { message: "", payload: null };
  }

  try {
    const payload = JSON.parse(text);
    return {
      message: payload.detail || payload.message || text,
      payload,
    };
  } catch {
    return { message: text, payload: text };
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const { message, payload } = await parseErrorPayload(response);
    const errorMessage = message || `Request failed: ${response.status}`;
    const error = new ApiError(errorMessage, response.status, payload);

    if (response.status === 401) {
      onUnauthorized?.(error);
    }

    if (response.status === 402) {
      onPaymentRequired?.(error);
    }

    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const authApi = {
  register: (data) => request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => request("/api/auth/me"),
  logout: () => request("/api/auth/logout", { method: "POST" }),
};

export const api = {
  health: () => request("/health"),
  getFarms: () => request("/api/farms"),
  getFarm: (farmId) => request(`/api/farm/${farmId}`),
  updateFarm: (farmId, payload) => request(`/api/farm/${farmId}`, { method: "PUT", body: JSON.stringify(payload) }),
  getOrders: (searchParams = "") => request(`/api/orders${searchParams ? `?${searchParams}` : ""}`),
  createOrder: (payload) => request("/api/orders", { method: "POST", body: JSON.stringify(payload) }),
  updateOrder: (orderId, payload) => request(`/api/orders/${orderId}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteOrder: (orderId) => request(`/api/orders/${orderId}`, { method: "DELETE" }),
  getProducts: () => request("/api/products"),
  getPredictions: () => request("/api/predictions"),
  getRecommendations: () => request("/api/recommendations"),
  getAlerts: () => request("/api/alerts"),
  updateAlert: (alertId, status) => request(`/api/alerts/${alertId}?status=${status}`, { method: "PUT" }),
  getSpending: (params = "") => request(`/api/spending${params ? `?${params}` : ""}`),
  getPriceBenchmark: (productName, supplierId) => {
    const params = new URLSearchParams({ product_name: productName });
    if (supplierId) params.append("supplier_id", supplierId);
    return request(`/api/price-benchmark?${params.toString()}`);
  },
  placeOrder: (payload) => request("/api/place-order", { method: "POST", body: JSON.stringify(payload) }),
  sendChat: (payload) => request("/api/chat", { method: "POST", body: JSON.stringify(payload) }),
  getSubscriptionStatus: () => request("/api/billing/status"),
  createCheckoutSession: (plan) => request("/api/billing/checkout", { method: "POST", body: JSON.stringify({ plan }) }),
  getSuppliers: (farmId) => request(`/api/farm/${farmId}/suppliers`),
  createSupplier: (farmId, data) => request(`/api/farm/${farmId}/suppliers`, { method: "POST", body: JSON.stringify(data) }),
  updateSupplier: (farmId, supplierId, data) => request(`/api/farm/${farmId}/suppliers/${supplierId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSupplier: (farmId, supplierId) => request(`/api/farm/${farmId}/suppliers/${supplierId}`, { method: "DELETE" }),
  setSupplierProducts: (farmId, supplierId, productIds) => request(`/api/farm/${farmId}/suppliers/${supplierId}/products`, { method: "PUT", body: JSON.stringify({ product_ids: productIds }) }),
  draftOrderEmail: (payload) => request("/api/draft-order-email", { method: "POST", body: JSON.stringify(payload) }),
  sendSupplierEmail: (payload) => request("/api/send-supplier-email", { method: "POST", body: JSON.stringify(payload) }),
};
