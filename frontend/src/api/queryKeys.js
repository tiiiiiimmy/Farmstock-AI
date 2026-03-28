export const queryKeys = {
  alerts: () => ["alerts"],
  farms: {
    all: () => ["farms"],
    detail: (farmId) => ["farm", farmId]
  },
  orders: {
    all: () => ["orders"]
  },
  predictions: () => ["predictions"],
  products: () => ["products"],
  recommendations: () => ["recommendations"],
  spending: {
    period: (period) => ["spending", period]
  },
  subscription: () => ["subscription"],
  suppliers: (farmId) => ["suppliers", farmId],
};
