import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";

const DashboardPage = lazy(() => import("./pages/Dashboard"));
const OrdersPage = lazy(() => import("./pages/Orders"));
const FarmProfilePage = lazy(() => import("./pages/FarmProfile"));
const ProductsPage = lazy(() => import("./pages/Products"));
const InsightsPage = lazy(() => import("./pages/Insights"));

export default function App() {
  return (
    <Suspense fallback={<div className="loading-state">Loading dashboard...</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/farm-profile" element={<FarmProfilePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/insights" element={<InsightsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
