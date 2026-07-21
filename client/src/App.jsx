import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { lazy, Suspense } from 'react';
import Sidebar       from './components/Sidebar';
import TopBar        from './components/TopBar';
import ChatBot       from './components/ChatBot';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import './index.css';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EquipmentPage = lazy(() => import('./pages/EquipmentPage'));
const EquipmentDetail = lazy(() => import('./pages/EquipmentDetail'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const DigitalTwinPage = lazy(() => import('./pages/DigitalTwinPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const DataImportPage = lazy(() => import('./pages/DataImportPage'));
const DataInputPage = lazy(() => import('./pages/DataInputPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const AnomalyPage = lazy(() => import('./pages/AnomalyPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const AssetLibrary = lazy(() => import('./pages/AssetLibrary'));
const DatasetPage = lazy(() => import('./pages/DatasetPage'));

// Loading component for lazy loaded routes
function PageLoader() {
  return (
    <div className="loading-spinner" style={{ minHeight: '60vh' }}>
      <div className="spinner" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

// Redirect already-logged-in users away from auth pages
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/data-input" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><DataInputPage /></Suspense></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></ProtectedRoute>} />
        <Route path="/asset-library" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><AssetLibrary /></Suspense></ProtectedRoute>} />
        <Route path="/dataset/:id" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><DatasetPage /></Suspense></ProtectedRoute>} />
        <Route path="/equipment" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><EquipmentPage /></Suspense></ProtectedRoute>} />
        <Route path="/equipment/:id" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><EquipmentDetail /></Suspense></ProtectedRoute>} />
        <Route path="/digital-twin" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><DigitalTwinPage /></Suspense></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><AlertsPage /></Suspense></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense></ProtectedRoute>} />
        <Route path="/maintenance" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><MaintenancePage /></Suspense></ProtectedRoute>} />
        <Route path="/import" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><DataImportPage /></Suspense></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><UsersPage /></Suspense></ProtectedRoute>} />
        <Route path="/anomalies" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><AnomalyPage /></Suspense></ProtectedRoute>} />
        <Route path="/calendar"  element={<ProtectedRoute><Suspense fallback={<PageLoader />}><CalendarPage /></Suspense></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage || !user) {
    return <AnimatedRoutes />;
  }

  return (
    <div className="app-layout">
      {/* Animated background orbs across the app */}
      <div className="login-bg" style={{ position: 'fixed', zIndex: -1 }}>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-overlay" />
      </div>

      <Sidebar />
      <div className="main-content">
        <TopBar />
        <main className="page-body">
          <AnimatedRoutes />
        </main>
      </div>
      <ChatBot />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <HashRouter>
          <AppShell />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { background: '#101929', color: '#f0f6ff', border: '1px solid rgba(99,179,237,0.15)', borderRadius: 10, fontSize: 13 },
              success: { iconTheme: { primary: '#10b981', secondary: '#101929' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#101929' } },
            }}
          />
        </HashRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
