import { NavLink } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Cpu, Bell, BarChart2,
  Wrench, Upload, Users, LogOut, Wifi, WifiOff,
  ChevronRight, AlertTriangle, Map, ScanSearch, CalendarDays,
} from 'lucide-react';
import SidebarLiveGraph from './SidebarLiveGraph';

const NAV = [
  { to: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/equipment',    label: 'Equipment',    icon: Cpu },
  { to: '/digital-twin', label: 'Digital Twin', icon: Map },
  { to: '/alerts',       label: 'Alerts',       icon: Bell,         badge: 'alerts' },
  { to: '/analytics',   label: 'Analytics',   icon: BarChart2 },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/anomalies',   label: 'Anomalies',   icon: ScanSearch,   badge: 'anomaly' },
  { to: '/calendar',    label: 'Calendar',    icon: CalendarDays },
];

const ADMIN_NAV = [
  { to: '/import', label: 'Data Import', icon: Upload },
  { to: '/users',  label: 'Users',       icon: Users  },
];

export default function Sidebar() {
  const { connected, liveAlerts } = useSocket();
  const { user, logout, isAdmin }  = useAuth();

  const criticalCount  = liveAlerts.filter(a => a.severity === 'critical').length;
  const totalAlerts    = liveAlerts.length;

  return (
    <motion.aside
      className="sidebar"
      initial={{ x: -260, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ── Logo ── */}
      <div className="sidebar-logo">
        <NavLink to="/" className="sidebar-logo-mark">
          <motion.div
            className="logo-icon"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >🏭</motion.div>
          <div className="logo-text">
            <h1>PredictMaint AI</h1>
            <span>Industrial Intelligence</span>
          </div>
        </NavLink>
      </div>

      {/* ── Nav ── */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Main</div>
        {NAV.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <Icon size={17} />
                <span style={{ flex: 1 }}>{label}</span>
                {/* Alert badge — red for critical, amber for others */}
                {badge === 'alerts' && totalAlerts > 0 && (
                  <motion.span
                    className="nav-badge"
                    style={{ background: criticalCount > 0 ? '#ef4444' : '#f59e0b' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    {totalAlerts}
                  </motion.span>
                )}
                {/* Anomaly badge — red when critical events present */}
                {badge === 'anomaly' && criticalCount > 0 && (
                  <motion.span
                    className="nav-badge"
                    style={{ background: '#FF003C' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {criticalCount}
                  </motion.span>
                )}
                {isActive && (
                  <ChevronRight size={13} style={{ opacity: 0.5 }} />
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* ── Admin section ── */}
        {isAdmin && (
          <>
            <div className="nav-section-label" style={{ marginTop: 16 }}>Admin</div>
            {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={17} />
                    <span style={{ flex: 1 }}>{label}</span>
                    {isActive && <ChevronRight size={13} style={{ opacity: 0.5 }} />}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}

        {/* ── Critical machines warning banner ── */}
        <AnimatePresence>
          {criticalCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{
                padding: '10px 12px', borderRadius: 10,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <AlertTriangle size={14} color="#ef4444" />
                </motion.div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
                    {criticalCount} Critical Alert{criticalCount > 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: 10, color: '#9f2020' }}>Immediate action needed</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <SidebarLiveGraph />

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user-card">
            <motion.div
              className="sidebar-user-avatar"
              whileHover={{ scale: 1.1 }}
              title={user.email}
            >
              {user.name[0].toUpperCase()}
            </motion.div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
            <motion.button
              className="sidebar-logout-btn"
              onClick={logout}
              title="Logout"
              whileHover={{ scale: 1.15, color: '#ef4444' }}
              whileTap={{ scale: 0.9 }}
            >
              <LogOut size={15} />
            </motion.button>
          </div>
        )}

        {/* Connection status */}
        <motion.div
          className="connection-status"
          style={{ marginTop: 8 }}
          animate={{ borderColor: connected ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)' }}
        >
          {connected
            ? <><Wifi size={12} style={{ color: '#10b981' }} /><span>Live · Connected</span></>
            : <><WifiOff size={12} style={{ color: '#64748b' }} /><span style={{ color: '#64748b' }}>Offline</span></>
          }
          <motion.span
            className={`status-dot ${connected ? '' : 'offline'}`}
            style={{ marginLeft: 'auto' }}
            animate={connected ? { opacity: [1, 0.4, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </div>
    </motion.aside>
  );
}
