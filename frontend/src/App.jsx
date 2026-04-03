import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CurrentFarmProvider } from "./context/CurrentFarmContext";
import AppNavigator from "./components/AppNavigator";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Pricing from "./pages/Pricing";
import Landing from "./pages/Landing";

const DashboardPage = lazy(() => import("./pages/Dashboard"));
const OrdersPage = lazy(() => import("./pages/Orders"));
const FarmProfilePage = lazy(() => import("./pages/FarmProfile"));
const ProductsPage = lazy(() => import("./pages/Products"));

export default function App() {
  return (
    <AuthProvider>
      <CurrentFarmProvider>
        <AppNavigator />
        <Suspense fallback={<div className="loading-state">Loading...</div>}>
          <Routes future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Route path="/" element={<Landing />} />
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
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/farm-profile" element={<FarmProfilePage />} />
              <Route path="/products" element={<ProductsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </CurrentFarmProvider>
    </AuthProvider>
  );
}
