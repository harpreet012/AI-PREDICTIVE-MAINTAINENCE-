import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, AlertTriangle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_META = {
  '/':            { title: 'Dashboard',        subtitle: 'Fleet overview & live KPIs',       icon: '🏭' },
  '/equipment':   { title: 'Equipment',        subtitle: 'All machines & sensor readings',    icon: '⚙️' },
  '/alerts':      { title: 'Alerts',           subtitle: 'Anomalies & threshold violations',  icon: '🚨' },
  '/analytics':   { title: 'Analytics',        subtitle: 'Deep-dive performance insights',    icon: '📊' },
  '/maintenance': { title: 'Maintenance',      subtitle: 'Schedule & maintenance history',    icon: '🔧' },
  '/import':      { title: 'Data Import',      subtitle: 'Upload Excel / CSV machine data',   icon: '📂' },
  '/users':       { title: 'User Management',  subtitle: 'Access control & roles',            icon: '👥' },
  '/calendar':    { title: 'Calendar',         subtitle: 'Real-time per-day operations heatmap', icon: '📅' },
};

export default function TopBar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { liveAlerts } = useSocket();
  const { user, logout } = useAuth();
  const [clock,      setClock]      = useState(new Date());
  const [showAlerts, setShowAlerts] = useState(false);

  const path = Object.keys(PAGE_META).find(k =>
    location.pathname === k || location.pathname.startsWith(k + '/')
  ) || '/';
  const meta = PAGE_META[path] || PAGE_META['/'];

  const criticalAlerts = liveAlerts.filter(a => a.severity === 'critical');
  const warningAlerts  = liveAlerts.filter(a => a.severity === 'warning');

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.alert-bell-area')) setShowAlerts(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="topbar">
      {/* ── Left: page title ── */}
      <div className="topbar-left">
        <AnimatePresence mode="wait">
          <motion.div
            key={path}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{meta.icon}</span>
              <div>
                <div className="page-title">{meta.title}</div>
                <div className="page-subtitle">{meta.subtitle}</div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Right: controls ── */}
      <div className="topbar-right">

        {/* Critical alert pill — shows only when critical alerts exist */}
        <AnimatePresence>
          {criticalAlerts.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/alerts')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.35)',
                color: '#ef4444', fontSize: 12, fontWeight: 700,
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <AlertTriangle size={13} />
              </motion.span>
              {criticalAlerts.length} Critical
            </motion.button>
          )}
        </AnimatePresence>

        {/* Clock */}
        <div className="topbar-clock">
          {clock.toLocaleDateString([], { month: 'short', day: 'numeric' })}
          {' · '}
          <span style={{ fontWeight: 600 }}>
            {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Live badge */}
        <div className="live-badge">
          <span className="live-dot" />
          LIVE
        </div>

        {/* Alert Bell */}
        <div style={{ position: 'relative' }} className="alert-bell-area">
          <motion.button
            className="alert-bell-btn"
            onClick={() => setShowAlerts(s => !s)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            animate={liveAlerts.length > 0 ? { rotate: [0, -10, 10, -6, 6, 0] } : {}}
            transition={{ duration: 0.6, repeat: liveAlerts.length > 0 ? Infinity : 0, repeatDelay: 5 }}
            style={criticalAlerts.length > 0 ? { borderColor: 'rgba(239,68,68,0.4)' } : {}}
          >
            <Bell size={16} />
            {liveAlerts.length > 0 && (
              <motion.span
                className="alert-bell-badge"
                style={{ background: criticalAlerts.length > 0 ? '#ef4444' : '#f59e0b' }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                {liveAlerts.length}
              </motion.span>
            )}
          </motion.button>

          {/* Alert dropdown */}
          <AnimatePresence>
            {showAlerts && (
              <motion.div
                className="alert-dropdown"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="alert-dropdown-header">
                  <span>
                    🚨 Active Alerts
                    {liveAlerts.length > 0 && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: criticalAlerts.length > 0 ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>
                        {criticalAlerts.length} critical · {warningAlerts.length} warning
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setShowAlerts(false)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}
                  >✕</button>
                </div>

                {liveAlerts.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                    ✅ No active alerts
                  </div>
                ) : (
                  <>
                    {liveAlerts.slice(0, 6).map((a, i) => (
                      <motion.div
                        key={i}
                        className={`alert-dropdown-item ${a.severity}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => { navigate('/alerts'); setShowAlerts(false); }}
                      >
                        <span style={{ fontSize: 16 }}>{a.severity === 'critical' ? '🚨' : '⚠️'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: '#f0f6ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.message}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                            {a.equipmentId?.name || 'Unknown machine'} · {a.severity}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {liveAlerts.length > 6 && (
                      <div style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => { navigate('/alerts'); setShowAlerts(false); }}
                          style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                        >
                          View all {liveAlerts.length} alerts →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User avatar */}
        {user && (
          <motion.div
            className="topbar-user"
            whileHover={{ borderColor: 'rgba(99,179,237,0.3)' }}
          >
            <motion.div
              className="topbar-user-avatar"
              whileHover={{ scale: 1.1 }}
              title={user.email}
            >
              {user.name[0].toUpperCase()}
            </motion.div>
            <div className="topbar-user-info">
              <span className="topbar-user-name">{user.name}</span>
              <span className="topbar-user-role">{user.role}</span>
            </div>
            <motion.button
              className="topbar-logout"
              title="Logout"
              onClick={logout}
              whileHover={{ color: '#ef4444', scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              <LogOut size={14} />
            </motion.button>
          </motion.div>
        )}
      </div>
    </header>
  );
}
