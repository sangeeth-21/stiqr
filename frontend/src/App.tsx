import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import SplashScreen from './components/SplashScreen';
import './styles/index.css';

// Layouts
import AdminLayout from './components/Layout/AdminLayout';
import VendorLayout from './components/Layout/VendorLayout';
import StaffLayout from './components/Layout/StaffLayout';

// Pages — lazy loaded for performance
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const VendorStaffLogin = lazy(() => import('./pages/VendorStaffLogin'));
const StatusLookup = lazy(() => import('./pages/StatusLookup'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminOwners = lazy(() => import('./pages/admin/Owners'));
const AdminShops = lazy(() => import('./pages/admin/Shops'));
const AdminSubscriptions = lazy(() => import('./pages/admin/Subscriptions'));
const AdminPayments = lazy(() => import('./pages/admin/Payments'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

// Vendor pages
const VendorDashboard = lazy(() => import('./pages/vendor/Dashboard'));
const VendorPOS = lazy(() => import('./pages/vendor/POS'));
const VendorSales = lazy(() => import('./pages/vendor/Sales'));
const VendorPurchases = lazy(() => import('./pages/vendor/Purchases'));
const VendorInventory = lazy(() => import('./pages/vendor/Inventory'));
const VendorServices = lazy(() => import('./pages/vendor/Services'));
const VendorServiceOrders = lazy(() => import('./pages/vendor/ServiceOrders'));
const VendorStaff = lazy(() => import('./pages/vendor/Staff'));
const VendorCustomers = lazy(() => import('./pages/vendor/Customers'));
const VendorSettings = lazy(() => import('./pages/vendor/Settings'));

// Staff pages
const StaffDashboard = lazy(() => import('./pages/staff/Dashboard'));
const StaffPOS = lazy(() => import('./pages/staff/POS'));
const StaffSales = lazy(() => import('./pages/staff/Sales'));
const StaffServices = lazy(() => import('./pages/staff/Services'));

// ── Page loading fallback ──
const PageLoader = () => null;

// ── Auth Guards ──
const ProtectedRoute: React.FC<{ children: React.ReactNode; role: 'admin' | 'owner' | 'staff' }> = ({ children, role }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) {
    if (role === 'admin') return <Navigate to="/admin/login" replace />;
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== role) {
    if (role === 'admin') return <Navigate to="/admin/login" replace />;
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    if (user?.role === 'owner') return <Navigate to="/vendor" replace />;
    if (user?.role === 'staff') return <Navigate to="/staff" replace />;
  }
  return <>{children}</>;
};

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const { theme } = useThemeStore();

  useEffect(() => {
    // Apply saved theme on mount
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}

      {splashDone && (
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Public & Login routes */}
              <Route path="/admin/login" element={
                <PublicRoute><AdminLogin /></PublicRoute>
              } />
              <Route path="/login" element={
                <PublicRoute><VendorStaffLogin initialTab="vendor" /></PublicRoute>
              } />
              <Route path="/vendor/login" element={
                <PublicRoute><VendorStaffLogin initialTab="vendor" /></PublicRoute>
              } />
              <Route path="/staff/login" element={
                <PublicRoute><VendorStaffLogin initialTab="staff" /></PublicRoute>
              } />
              <Route path="/status" element={<StatusLookup />} />

              {/* Admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="owners" element={<AdminOwners />} />
                <Route path="shops" element={<AdminShops />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="audit-logs" element={<AdminAuditLogs />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Vendor / Owner routes */}
              <Route path="/vendor" element={
                <ProtectedRoute role="owner"><VendorLayout /></ProtectedRoute>
              }>
                <Route index element={<VendorDashboard />} />
                <Route path="pos" element={<VendorPOS />} />
                <Route path="sales" element={<VendorSales />} />
                <Route path="purchases" element={<VendorPurchases />} />
                <Route path="inventory" element={<VendorInventory />} />
                <Route path="services" element={<VendorServices />} />
                <Route path="service-orders" element={<VendorServiceOrders />} />
                <Route path="staff" element={<VendorStaff />} />
                <Route path="customers" element={<VendorCustomers />} />
                <Route path="settings" element={<VendorSettings />} />
              </Route>

              {/* Staff routes */}
              <Route path="/staff" element={
                <ProtectedRoute role="staff"><StaffLayout /></ProtectedRoute>
              }>
                <Route index element={<StaffDashboard />} />
                <Route path="pos" element={<StaffPOS />} />
                <Route path="sales" element={<StaffSales />} />
                <Route path="services" element={<StaffServices />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      )}
    </>
  );
}

export default App;
