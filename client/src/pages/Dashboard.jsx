import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { equipmentAPI, alertAPI, analyticsAPI } from '../services/api';
import EquipmentCard from '../components/EquipmentCard';
import GaugeMeter from '../components/GaugeMeter';
import FactoryFloor from '../components/FactoryFloor';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Server, AlertTriangle, Activity, TrendingUp, TrendingDown,
  Minus, Shield, Clock, Zap, Cpu, ThermometerSun, Gauge, BarChart3,
  ChevronRight, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

const SEVERITY_COLORS = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
const STATUS_COLORS   = { healthy: '#10b981', warning: '#f59e0b', critical: '#ef4444', offline: '#64748b', maintenance: '#8b5cf6' };

/* ── Animated Counter ── */
function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = Date.now();
    const from = display;
    const to   = Number(value) || 0;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]); // eslint-disable-line
  return <>{display}</>;
}

/* ── Stat Card ── */
function StatCard({ label, value, unit, icon, color, trend, trendLabel, index = 0, pulse = false }) {
  return (
    <motion.div
      className="stat-card"
      style={{ '--card-accent': color }}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.18 } }}
    >
      {pulse && (
        <motion.div
          style={{ position: 'absolute', inset: 0, borderRadius: 16, border: `2px solid ${color}`, pointerEvents: 'none' }}
          animate={{ opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <div className="stat-card-header">
        <motion.div
          className="stat-icon"
          style={{ background: `${color}18`, color }}
          whileHover={{ rotate: 10, scale: 1.12 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >{icon}</motion.div>
        {trend !== undefined && (
          <div className={`stat-trend ${trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral'}`}>
            {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
            {trendLabel || `${Math.abs(trend)}%`}
          </div>
        )}
      </div>
      <div>
        <div className="stat-value">
          <AnimatedNumber value={value} />
          <span style={{ fontSize: 14, color: '#64748b', marginLeft: 4 }}>{unit}</span>
        </div>
        <div className="stat-label">{label}</div>
      </div>
    </motion.div>
  );
}

/* ── Custom Chart Tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0e1e33', border: '1px solid rgba(99,179,237,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <p style={{ color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color || '#f0f6ff', fontWeight: 600, margin: '2px 0' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ── Critical Machine Card ── */
function CriticalMachineCard({ machine, index }) {
  const navigate = useNavigate();
  const { liveReadings } = useSocket();
  const live   = liveReadings[machine._id] || {};
  const health = live.healthScore ?? machine.healthScore ?? 0;
  const risk   = live.failureProbability ?? machine.failureProbability ?? 0;
  const status = live.status ?? machine.status ?? 'critical';
  const color  = STATUS_COLORS[status] || '#ef4444';

  const TYPE_ICONS = {
    'Compressor': '🔵', 'Motor': '⚡', 'Pump': '💧', 'Turbine': '🌀',
    'Generator': '🔋', 'Conveyor': '📦', 'CNC Machine': '⚙️', 'Boiler': '🔥',
  };

  return (
    <motion.div
      className="critical-machine-card"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ x: 4, transition: { duration: 0.2 } }}
      onClick={() => navigate(`/equipment/${machine._id}`)}
      style={{ cursor: 'pointer' }}
    >
      {/* Pulsing alert dot */}
      <motion.div
        style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}` }}
        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span>{TYPE_ICONS[machine.type] || '🔧'}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f6ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{machine.name}</span>
          <span className={`status-badge ${status}`} style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 10 }}>{status}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b' }}>
          <span>📍 {machine.location}</span>
          <span>🏭 {machine.type}</span>
        </div>
        {/* Health bar */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
            <span style={{ color: '#64748b' }}>Health Score</span>
            <span style={{ color, fontWeight: 700 }}>{health}%</span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', borderRadius: 10, background: `linear-gradient(90deg, ${color}, ${color}88)` }}
              initial={{ width: 0 }}
              animate={{ width: `${health}%` }}
              transition={{ duration: 1, delay: index * 0.1 + 0.2 }}
            />
          </div>
        </div>
        {/* Sensor pills row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {live.temperature != null && (
            <span className={`risk-chip ${live.temperature > 85 ? 'high' : live.temperature > 75 ? 'medium' : 'low'}`}>
              🌡 {live.temperature.toFixed(1)}°C
            </span>
          )}
          {live.vibration != null && (
            <span className={`risk-chip ${live.vibration > 7 ? 'high' : live.vibration > 4.5 ? 'medium' : 'low'}`}>
              📳 {live.vibration.toFixed(1)} mm/s
            </span>
          )}
          {risk > 0 && (
            <span className={`risk-chip ${risk > 60 ? 'high' : risk > 30 ? 'medium' : 'low'}`}>
              ⚡ {risk.toFixed(0)}% risk
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={16} style={{ color: '#4b5e78', flexShrink: 0 }} />
    </motion.div>
  );
}

/* ── Mini Sparkline ── */
function SparkLine({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

import PageTransition from '../components/PageTransition';

/* ══════════════ DASHBOARD ══════════════ */
export default function Dashboard() {
  const [equipment, setEquipment]       = useState([]);
  const [overview,  setOverview]        = useState({});
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading,   setLoading]         = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [oee, setOee] = useState({ availability: 0, performance: 0, quality: 0, overall: 0 });
  const { liveReadings, fleetSummary, liveAlerts } = useSocket();
  const navigate = useNavigate();

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [eqRes, ovRes, alRes] = await Promise.all([
        equipmentAPI.getAll(),
        analyticsAPI.getOverview(),
        alertAPI.getAll({ limit: 8, acknowledged: false }),
      ]);
      setEquipment(eqRes.data.data || []);
      setOverview(ovRes.data.data || {});
      setRecentAlerts(alRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (liveAlerts.length > 0) {
      setRecentAlerts(prev => [...liveAlerts.slice(0, 3), ...prev].slice(0, 8));
    }
  }, [liveAlerts]);

  const stats = fleetSummary || overview;

  // Equipment with live status merged
  const equipmentWithLive = equipment.map(e => ({
    ...e,
    status:           liveReadings[e._id]?.status      ?? e.status,
    healthScore:      liveReadings[e._id]?.healthScore  ?? e.healthScore,
    failureProbability: liveReadings[e._id]?.failureProbability ?? e.failureProbability,
  }));

  // CRITICAL MACHINES — combine DB status + live readings
  const criticalMachines = equipmentWithLive.filter(e =>
    e.status === 'critical' || (e.healthScore != null && e.healthScore < 40)
  ).sort((a, b) => (a.healthScore || 0) - (b.healthScore || 0));

  const warningMachines = equipmentWithLive.filter(e =>
    e.status === 'warning' || (e.healthScore != null && e.healthScore >= 40 && e.healthScore < 65 && e.status !== 'critical')
  );

  // Health history from live readings
  const healthHistory = Object.entries(liveReadings).map(([id, r], i) => {
    const eq = equipment.find(e => e._id === id);
    return {
      name: r.equipmentName?.split(' ')[0] || eq?.name?.split(' ')[0] || `U${i + 1}`,
      health: r.healthScore || 0,
      risk: r.failureProbability || 0,
    };
  }).sort((a, b) => b.health - a.health);

  const trendData = healthHistory.map((r, i) => ({
    ...r,
    time: `M${i + 1}`,
  }));

  const avgHealth = healthHistory.length
    ? Math.round(healthHistory.reduce((s, r) => s + r.health, 0) / healthHistory.length)
    : stats.avgHealthScore || 0;

  // Fleet status for pie chart
  const statusData = equipmentWithLive.reduce((acc, e) => {
    const s = e.status || 'healthy';
    const ex = acc.find(a => a.name === s);
    if (ex) ex.value++;
    else acc.push({ name: s, value: 1, color: STATUS_COLORS[s] || '#64748b' });
    return acc;
  }, []);

  // Risk distribution for bar chart
  const riskDist = [
    { label: 'Low (<30%)',  value: equipmentWithLive.filter(e => (e.failureProbability||0) < 30).length,  color: '#10b981' },
    { label: 'Med (30-60%)', value: equipmentWithLive.filter(e => (e.failureProbability||0) >= 30 && (e.failureProbability||0) < 60).length, color: '#f59e0b' },
    { label: 'High (>60%)', value: equipmentWithLive.filter(e => (e.failureProbability||0) >= 60).length, color: '#ef4444' },
  ];

  // Calculate OEE
  useEffect(() => {
    if (equipment.length === 0) return;
    const availability = Math.max(0, 100 - (criticalMachines.length * 4) - (warningMachines.length * 1.5));
    const performance = Math.min(100, Math.max(0, avgHealth + 5));
    const quality = Math.min(100, Math.max(0, 100 - (liveAlerts.length * 0.5)));
    const overall = (availability * performance * quality) / 10000;
    
    setOee({
      availability: Math.round(availability),
      performance: Math.round(performance),
      quality: Math.round(quality),
      overall: Math.round(overall)
    });
  }, [avgHealth, criticalMachines.length, warningMachines.length, liveAlerts.length, equipment.length]);

  if (loading) {
    return (
      <PageTransition className="loading-page">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i} className="skeleton-card"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.4, delay: i * 0.15, repeat: Infinity }}
          />
        ))}
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── KPI Stats & OEE ──────────────────────── */}
      <div className="grid-2" style={{ marginBottom: 0 }}>
        <div className="stat-cards-grid" style={{ marginBottom: 0, paddingBottom: 0, gap: 10, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <StatCard index={0} label="Total Equipment"   value={stats.totalEquipment || equipment.length} icon={<Server size={18} />} color="#00D2FF" trend={0} />
          <StatCard index={1} label="Fleet Health"      value={avgHealth} unit="%" icon={<Activity size={18} />} color="#00FF41" trend={avgHealth > 75 ? 1 : -1} />
          <StatCard index={2} label="Critical Machines" value={criticalMachines.length || stats.critical || 0} icon={<Shield size={18} />} color="#FF003C" pulse={criticalMachines.length > 0} />
          <StatCard index={3} label="Alerts (24h)"      value={stats.recentAlerts || recentAlerts.length} icon={<Zap size={18} />} color="#8b5cf6" />
        </div>

        {/* Global OEE Module */}
        <motion.div className="card"
          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--border-bright)', background: 'linear-gradient(135deg, rgba(0,210,255,0.05) 0%, var(--bg-card) 60%)' }}
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
        >
          <div className="card-header" style={{ marginBottom: 8 }}>
            <div>
              <div className="card-title" style={{ color: 'var(--accent-cyan)' }}>Overall Equipment Effectiveness</div>
              <div className="card-subtitle">Live real-time production KPI</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#e6edf3', letterSpacing: -1 }}>
              <AnimatedNumber value={oee.overall} />%
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 16, marginTop: 'auto' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, color: 'var(--text-secondary)' }}>
                <span>Availability</span><span style={{ color: '#00D2FF', fontWeight: 700 }}>{oee.availability}%</span>
              </div>
              <div className="metric-bar-wrap"><div className="metric-bar-fill" style={{ width: `${oee.availability}%`, background: '#00D2FF' }} /></div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, color: 'var(--text-secondary)' }}>
                <span>Performance</span><span style={{ color: '#FACC15', fontWeight: 700 }}>{oee.performance}%</span>
              </div>
              <div className="metric-bar-wrap"><div className="metric-bar-fill" style={{ width: `${oee.performance}%`, background: '#FACC15' }} /></div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, color: 'var(--text-secondary)' }}>
                <span>Quality</span><span style={{ color: '#00FF41', fontWeight: 700 }}>{oee.quality}%</span>
              </div>
              <div className="metric-bar-wrap"><div className="metric-bar-fill" style={{ width: `${oee.quality}%`, background: '#00FF41' }} /></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── CRITICAL MACHINES ALERT SECTION ──────── */}
      <AnimatePresence>
        {criticalMachines.length > 0 && (
          <motion.div
            className="card"
            style={{
              border: '1px solid rgba(239,68,68,0.4)',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(14,30,51,1) 60%)',
              boxShadow: '0 0 40px rgba(239,68,68,0.12)',
              marginBottom: 0
            }}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
          >
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <motion.div
                  style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >🚨</motion.div>
                <div>
                  <div className="card-title" style={{ color: '#ef4444' }}>
                    Critical Machines — Immediate Action Required
                  </div>
                  <div className="card-subtitle" style={{ color: '#f87171' }}>
                    {criticalMachines.length} machine{criticalMachines.length > 1 ? 's' : ''} in critical state
                  </div>
                </div>
              </div>
              <motion.button
                className="btn btn-danger btn-sm"
                style={{ fontSize: 11 }}
                onClick={() => navigate('/alerts')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                View All Alerts →
              </motion.button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {criticalMachines.slice(0, 5).map((machine, i) => (
                <CriticalMachineCard key={machine._id} machine={machine} index={i} />
              ))}
              {criticalMachines.length > 5 && (
                <motion.button
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'flex-start', marginTop: 4 }}
                  onClick={() => navigate('/equipment')}
                  whileHover={{ scale: 1.03 }}
                >
                  +{criticalMachines.length - 5} more critical machines →
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Warning Machines (compact) ────────────── */}
      <AnimatePresence>
        {warningMachines.length > 0 && criticalMachines.length === 0 && (
          <motion.div
            className="card"
            style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, rgba(14,30,51,1) 60%)', marginBottom: 0 }}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="card-header">
              <div>
                <div className="card-title" style={{ color: '#f59e0b' }}>⚠️ Warning — {warningMachines.length} Machine(s) Need Attention</div>
                <div className="card-subtitle">Schedule maintenance within 48 hours</div>
              </div>
              <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }} onClick={() => navigate('/maintenance')}>
                Schedule →
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {warningMachines.slice(0, 8).map(m => (
                <motion.span
                  key={m._id}
                  className="status-badge warning"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/equipment/${m._id}`)}
                  whileHover={{ scale: 1.05 }}
                >
                  ⚠️ {m.name} ({m.healthScore}%)
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fleet Gauges ──────────────────────────── */}
      {healthHistory.length > 0 && (
        <motion.div className="card"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="card-header">
            <div>
              <div className="card-title">⚡ Live Fleet Health Gauges</div>
              <div className="card-subtitle">Real-time health score per machine</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <motion.button
                className="btn btn-secondary btn-sm btn-icon"
                onClick={() => fetchData(true)}
                animate={refreshing ? { rotate: 360 } : {}}
                transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}
              >
                <RefreshCw size={13} />
              </motion.button>
              <div className="live-badge"><span className="live-dot" />LIVE</div>
            </div>
          </div>
          <div className="fleet-gauges-row">
            {healthHistory.slice(0, 10).map((r, i) => (
              <motion.div key={i} className="fleet-gauge-item"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 + i * 0.06, type: 'spring', stiffness: 200 }}>
                <GaugeMeter value={r.health} size={64} label={r.name} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Charts Row ─────────────────────────────── */}
      <div className="grid-2">

        {/* Area chart — health & risk trend */}
        <motion.div className="card"
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
          <div className="card-header">
            <div>
              <div className="card-title">📈 Fleet Health Trend</div>
              <div className="card-subtitle">Health & risk across all machines</div>
            </div>
            <BarChart3 size={14} style={{ color: '#4b5e78' }} />
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={{ left: -20, right: 8, top: 12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gHealth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#4b5e78' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#4b5e78' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={75} stroke="rgba(16,185,129,0.15)" strokeDasharray="4 4" />
                <ReferenceLine y={50} stroke="rgba(239,68,68,0.15)"   strokeDasharray="4 4" />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="circle" />
                <Area type="monotone" dataKey="health" stroke="#10b981" strokeWidth={3} fill="url(#gHealth)" name="Health %" activeDot={{ r: 6, fill: '#10b981', stroke: '#fff' }} />
                <Area type="monotone" dataKey="risk"   stroke="#f59e0b" strokeWidth={3} fill="url(#gRisk)"   name="Risk %"   activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="chart-empty">Waiting for live data…</div>}
        </motion.div>

        {/* Pie + Legend — Status breakdown */}
        <motion.div className="card"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
          <div className="card-header">
            <div>
              <div className="card-title">🍩 Fleet Status Distribution</div>
              <div className="card-subtitle">Equipment breakdown by status</div>
            </div>
          </div>
          {statusData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, position: 'relative' }}>
              <div style={{ position: 'relative', width: 150, height: 150 }}>
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={52} outerRadius={68}
                      paddingAngle={4} cornerRadius={6} dataKey="value" strokeWidth={0}>
                      {statusData.map((d, i) => (
                        <Cell key={i} fill={d.color} style={{ filter: `drop-shadow(0 0 6px ${d.color}77)` }} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Donut Center */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#e6edf3', lineHeight: 1 }}>{equipment.length || 0}</div>
                  <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Total</div>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {statusData.map(({ name, value, color }) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}` }} />
                    <span style={{ fontSize: 12, color: '#94a3b8', textTransform: 'capitalize', flex: 1 }}>{name}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color }}>{value}</span>
                    <span style={{ fontSize: 10, color: '#4b5e78' }}>
                      {equipment.length > 0 ? Math.round((value / equipment.length) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="chart-empty">No equipment data</div>}
        </motion.div>
      </div>

      {/* ── Second Charts Row ──────────────────────── */}
      <div className="grid-2">

        {/* Health bar chart per machine */}
        {healthHistory.length > 0 && (
          <motion.div className="card"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <div className="card-header">
              <div className="card-title">📊 Machine Health Scores</div>
              <div className="card-subtitle">Live health per unit (sorted)</div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={healthHistory} margin={{ left: -20, right: 8, top: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#4b5e78' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#4b5e78' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={75} stroke="rgba(16,185,129,0.15)" strokeDasharray="3 2" />
                <ReferenceLine y={50} stroke="rgba(239,68,68,0.15)"  strokeDasharray="3 2" />
                <Bar dataKey="health" radius={[10, 10, 10, 10]} barSize={10} name="Health %">
                  {healthHistory.map((entry, i) => {
                    const color = entry.health >= 80 ? '#10b981' : entry.health >= 60 ? '#f59e0b' : '#ef4444';
                    return <Cell key={i} fill={color} style={{ filter: `drop-shadow(0 0 6px ${color}99)` }} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Risk distribution */}
        <motion.div className="card"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="card-header">
            <div className="card-title">⚡ Failure Risk Distribution</div>
            <div className="card-subtitle">Equipment grouped by risk level</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
            {riskDist.map((r, i) => (
              <motion.div key={r.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: '#94a3b8' }}>{r.label}</span>
                  <span style={{ color: r.color, fontWeight: 700 }}>{r.value} machine{r.value !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ height: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <motion.div
                    style={{ height: '100%', background: `linear-gradient(90deg, ${r.color}, ${r.color}bb)`, borderRadius: 12, boxShadow: `inset 0 2px 4px rgba(255,255,255,0.2)` }}
                    initial={{ width: 0 }}
                    animate={{ width: equipment.length > 0 ? `${(r.value / equipment.length) * 100}%` : '0%' }}
                    transition={{ duration: 1.2, delay: 0.6 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </motion.div>
            ))}
            {/* Summary score */}
            <div style={{ marginTop: 8, padding: '12px 16px', background: 'rgba(59,130,246,0.06)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.15)' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Overall Fleet Risk Score</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: avgHealth > 75 ? '#10b981' : avgHealth > 55 ? '#f59e0b' : '#ef4444' }}>
                {100 - avgHealth}%
                <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b', marginLeft: 6 }}>avg failure probability</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Recent Alerts ──────────────────────────── */}
      {recentAlerts.length > 0 && (
        <motion.div className="card"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <div className="card-header">
            <div>
              <div className="card-title">🚨 Recent Alerts</div>
              <div className="card-subtitle">Latest anomalies & threshold violations</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/alerts')}>View All →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentAlerts.map((alert, i) => (
              <motion.div key={alert._id || i} className={`alert-card ${alert.severity}`}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ x: 4, transition: { duration: 0.15 } }}>
                <div className={`alert-icon ${alert.severity}`}>
                  {alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
                </div>
                <div className="alert-body">
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-equip">{alert.equipmentId?.name} · {alert.equipmentId?.location}</div>
                  <div className="alert-meta">{new Date(alert.createdAt).toLocaleString()} · {alert.type}</div>
                </div>
                <span className={`status-badge ${alert.severity}`}>{alert.severity}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── All Equipment Grid ─────────────────────── */}
      <div className="page-header" style={{ marginBottom: 12, marginTop: 12 }}>
        <div className="page-header-left">
          <h2 style={{ fontSize: 18 }}>All Equipment Data Grid</h2>
          <p style={{ fontSize: 11 }}>Click any digital twin asset or card for granular sensor telemetry</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="live-badge"><span className="live-dot" />Live Updates</div>
        </div>
      </div>

      {equipment.length === 0 ? (
        <motion.div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏭</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Equipment Found</div>
          <p style={{ color: '#64748b', marginBottom: 20 }}>Import equipment data to get started with predictive maintenance.</p>
          <button className="btn btn-primary" onClick={() => navigate('/import')}>📂 Import Data →</button>
        </motion.div>
      ) : (
        <div className="equipment-grid">
          {equipment.map((e, i) => <EquipmentCard key={e._id} equipment={e} index={i} />)}
        </div>
      )}
      </div>
    </PageTransition>
  );
}
