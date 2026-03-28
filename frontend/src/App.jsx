import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Pricing from "./pages/Pricing";

const DashboardPage = lazy(() => import("./pages/Dashboard"));
const OrdersPage = lazy(() => import("./pages/Orders"));
const FarmProfilePage = lazy(() => import("./pages/FarmProfile"));
const ProductsPage = lazy(() => import("./pages/Products"));

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="loading-state">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/farm-profile" element={<FarmProfilePage />} />
            <Route path="/products" element={<ProductsPage />} />

          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
