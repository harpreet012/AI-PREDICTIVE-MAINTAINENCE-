import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar       from './components/Sidebar';
import TopBar        from './components/TopBar';
import ChatBot       from './components/ChatBot';
import Dashboard     from './pages/Dashboard';
import EquipmentPage from './pages/EquipmentPage';
import EquipmentDetail from './pages/EquipmentDetail';
import AlertsPage    from './pages/AlertsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import DigitalTwinPage from './pages/DigitalTwinPage';
import MaintenancePage from './pages/MaintenancePage';
import DataImportPage  from './pages/DataImportPage';
import UsersPage       from './pages/UsersPage';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import AnomalyPage     from './pages/AnomalyPage';
import './index.css';

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
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/equipment" element={<ProtectedRoute><EquipmentPage /></ProtectedRoute>} />
        <Route path="/equipment/:id" element={<ProtectedRoute><EquipmentDetail /></ProtectedRoute>} />
        <Route path="/digital-twin" element={<ProtectedRoute><DigitalTwinPage /></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/maintenance" element={<ProtectedRoute><MaintenancePage /></ProtectedRoute>} />
        <Route path="/import" element={<ProtectedRoute><DataImportPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="/anomalies" element={<ProtectedRoute><AnomalyPage /></ProtectedRoute>} />
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
