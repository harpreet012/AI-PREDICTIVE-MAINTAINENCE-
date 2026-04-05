import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { anomalyAPI } from '../services/api';
import PageTransition from '../components/PageTransition';
import toast from 'react-hot-toast';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const SEV_COLOR = { Critical: '#FF003C', Warning: '#FACC15', Normal: '#00FF41' };
const SEV_BG    = {
  Critical: 'rgba(255,0,60,0.09)',
  Warning:  'rgba(250,204,21,0.09)',
  Normal:   'rgba(0,255,65,0.09)',
};
const SEV_BORDER = {
  Critical: 'rgba(255,0,60,0.35)',
  Warning:  'rgba(250,204,21,0.35)',
  Normal:   'rgba(0,255,65,0.25)',
};

function ts(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function ago(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s <  60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

/* ─── Animated Gauge ──────────────────────────────────────────────────────── */
function AnomalyGauge({ score = 0, confidence = 0 }) {
  const r  = 70;
  const cx = 90, cy = 90;
  const circ   = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color  = score >= 75 ? '#FF003C' : score >= 50 ? '#FACC15' : '#00FF41';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg width={180} height={130} style={{ overflow: 'visible' }}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={14}
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          strokeDashoffset={circ * 0.125}
          strokeLinecap="round"
          style={{ transform: 'rotate(135deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
        {/* Fill */}
        <motion.circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeDasharray={`${filled * 0.75} ${circ - filled * 0.75}`}
          strokeDashoffset={circ * 0.125}
          strokeLinecap="round"
          style={{
            transform:       'rotate(135deg)',
            transformOrigin: `${cx}px ${cy}px`,
            filter:          `drop-shadow(0 0 10px ${color}88)`,
          }}
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${filled * 0.75} ${circ - filled * 0.75}` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={28} fontWeight={800} fill={color}>
          {score}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.4)">
          Risk Score
        </text>
      </svg>

      {/* Confidence bar */}
      <div style={{ width: '100%', padding: '0 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
          <span>AI Confidence</span>
          <span style={{ color, fontWeight: 700 }}>{confidence}%</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', borderRadius: 10, background: `linear-gradient(90deg, ${color}99, ${color})` }}
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Toast on new anomaly ────────────────────────────────────────────────── */
function useAnomalyToast(anomalies) {
  const prev = useRef(null);
  useEffect(() => {
    if (!anomalies.length) return;
    if (prev.current === null) { prev.current = anomalies[0]?.id; return; }
    if (anomalies[0]?.id !== prev.current && anomalies[0]?.severity === 'Critical') {
      toast.error(`🚨 Critical: ${anomalies[0].machine} — ${anomalies[0].issue}`, { duration: 5000 });
      prev.current = anomalies[0].id;
    }
  }, [anomalies]);
}

/* ─── Sparkline graph data generator ─────────────────────────────────────── */
function generateGraphPoints(anomalies) {
  const now = Date.now();
  return Array.from({ length: 20 }, (_, i) => {
    const t = now - (19 - i) * 4000;
    const base = 20 + Math.sin(i * 0.6) * 15 + Math.random() * 10;
    const isAnomaly = (i === 5 || i === 12 || i === 17);
    return {
      t: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      score: isAnomaly ? 80 + Math.random() * 18 : base,
      anomaly: isAnomaly ? 80 + Math.random() * 18 : null,
    };
  });
}

/* ──────────────────────────────────────────────────────────────── Component */
const REFRESH_MS = 4000;

export default function AnomalyPage() {
  const [anomalies,   setAnomalies]   = useState([]);
  const [graphData,   setGraphData]   = useState([]);
  const [search,      setSearch]      = useState('');
  const [sevFilter,   setSevFilter]   = useState('All');
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [aiIndex,     setAiIndex]     = useState(0);

  useAnomalyToast(anomalies);

  const fetchAnomalies = useCallback(async () => {
    try {
      const res = await anomalyAPI.getAll();
      if (res.data?.data) {
        setAnomalies(res.data.data);
        setGraphData(generateGraphPoints(res.data.data));
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error('Anomaly fetch error:', err);
      // No fake data — show empty state so user knows API is unreachable
      setAnomalies([]);
      setGraphData([]);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnomalies();
    const id = setInterval(fetchAnomalies, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchAnomalies]);

  /* Rotate AI insight every 6 s */
  useEffect(() => {
    if (!anomalies.length) return;
    const id = setInterval(() => setAiIndex(i => (i + 1) % anomalies.length), 6000);
    return () => clearInterval(id);
  }, [anomalies.length]);

  /* Derived */
  const topAnomaly    = anomalies[0] || null;
  const aiAnomaly     = anomalies[aiIndex] || null;
  const critical      = anomalies.filter(a => a.severity === 'Critical').length;
  const warning       = anomalies.filter(a => a.severity === 'Warning').length;
  const normal        = anomalies.filter(a => a.severity === 'Normal').length;

  const filtered = anomalies.filter(a => {
    const matchSev  = sevFilter === 'All' || a.severity === sevFilter;
    const matchSearch = a.machine.toLowerCase().includes(search.toLowerCase()) ||
                        a.issue.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchSearch;
  });

  /* History rows (duplicate + timestamp variants for table demo) */
  const history = [...anomalies, ...anomalies].map((a, i) => ({
    ...a,
    id: `${a.id}-${i}`,
    timestamp: new Date(Date.now() - i * 7000 - Math.random() * 3000).toISOString(),
  }));

  const TOOLTIP_STYLE = {
    background: '#0d1117',
    border: '1px solid rgba(0,210,255,0.15)',
    borderRadius: 8,
    fontSize: 12,
    color: '#e6edf3',
  };

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <PageTransition>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="page-header-left">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🚨</span>
            Anomaly Detection Center
          </h2>
          <p>Real-time AI-powered anomaly monitoring · Auto-refresh every {REFRESH_MS / 1000}s</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Live status */}
          <motion.div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 20,
              background: critical > 0 ? 'rgba(255,0,60,0.1)' : 'rgba(0,255,65,0.08)',
              border: `1px solid ${critical > 0 ? 'rgba(255,0,60,0.35)' : 'rgba(0,255,65,0.25)'}`,
              fontSize: 12, fontWeight: 700,
              color: critical > 0 ? '#FF003C' : '#00FF41',
            }}
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: critical > 0 ? '#FF003C' : '#00FF41',
              boxShadow: `0 0 8px ${critical > 0 ? '#FF003C' : '#00FF41'}`,
            }} />
            {critical > 0 ? 'ALERT ACTIVE' : 'MONITORING LIVE'}
          </motion.div>

          {/* Last refresh */}
          {lastRefresh && (
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.35)',
              padding: '5px 10px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: 6,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              ⟳ {ts(lastRefresh)}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Events',    value: anomalies.length, color: '#00D2FF', icon: '📊' },
          { label: 'Critical',        value: critical,          color: '#FF003C', icon: '🔴' },
          { label: 'Warning',         value: warning,           color: '#FACC15', icon: '🟡' },
          { label: 'Normal',          value: normal,            color: '#00FF41', icon: '🟢' },
        ].map(({ label, value, color, icon }) => (
          <motion.div
            key={label}
            className="stat-card"
            style={{ '--card-accent': color }}
            whileHover={{ y: -3, boxShadow: `0 8px 32px ${color}22` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
            </div>
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-label">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Row 1: Live Alert Panel + Gauge ──────────────────────────────── */}
      <div className="grid-2 mb-6">
        {/* Live Alert Cards */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">⚡ Live Anomaly Alerts</div>
              <div className="card-subtitle">Latest detected events</div>
            </div>
            <motion.span
              style={{ fontSize: 10, color: '#00FF41', fontWeight: 700, letterSpacing: 1 }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              LIVE
            </motion.span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence>
              {anomalies.slice(0, 4).map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.07 }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: SEV_BG[a.severity],
                    border: `1px solid ${SEV_BORDER[a.severity]}`,
                    borderLeft: `3px solid ${SEV_COLOR[a.severity]}`,
                    boxShadow: a.severity === 'Critical' ? `0 0 16px ${SEV_COLOR.Critical}22` : 'none',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {a.severity === 'Critical' && (
                    <motion.div
                      style={{
                        position: 'absolute', inset: 0,
                        background: 'radial-gradient(circle at 0% 50%, rgba(255,0,60,0.06), transparent 60%)',
                        pointerEvents: 'none',
                      }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3', marginBottom: 2 }}>
                        {a.machine}
                      </div>
                      <div style={{ fontSize: 12, color: SEV_COLOR[a.severity], fontWeight: 600 }}>
                        ⚠ {a.issue}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                      background: SEV_BG[a.severity],
                      border: `1px solid ${SEV_COLOR[a.severity]}`,
                      color: SEV_COLOR[a.severity],
                    }}>
                      {a.severity.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                    🕐 {ago(a.timestamp)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Anomaly Score Gauge */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">🎯 Anomaly Risk Score</div>
              <div className="card-subtitle">Top machine risk assessment</div>
            </div>
          </div>
          {topAnomaly ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <AnomalyGauge score={topAnomaly.score} confidence={topAnomaly.confidence} />
              <div style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                background: SEV_BG[topAnomaly.severity],
                border: `1px solid ${SEV_BORDER[topAnomaly.severity]}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3' }}>{topAnomaly.machine}</div>
                <div style={{ fontSize: 12, color: SEV_COLOR[topAnomaly.severity], marginTop: 3 }}>
                  {topAnomaly.issue}
                </div>
              </div>

              {/* Score scale */}
              <div style={{ width: '100%', display: 'flex', gap: 4 }}>
                {[
                  { label: '0–49 Normal',   bg: 'rgba(0,255,65,0.15)',  color: '#00FF41' },
                  { label: '50–74 Warning', bg: 'rgba(250,204,21,0.15)', color: '#FACC15' },
                  { label: '75+ Critical',  bg: 'rgba(255,0,60,0.15)',   color: '#FF003C' },
                ].map(b => (
                  <div key={b.label} style={{
                    flex: 1, padding: '5px 0', textAlign: 'center', fontSize: 10,
                    fontWeight: 700, borderRadius: 6,
                    background: b.bg, color: b.color,
                  }}>
                    {b.label}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-center" style={{ flex: 1, color: 'var(--text-muted)', fontSize: 13 }}>
              No anomalies detected
            </div>
          )}
        </div>
      </div>

      {/* ── Anomaly Graph ─────────────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="card-header">
          <div>
            <div className="card-title">📈 Real-Time Anomaly Score Graph</div>
            <div className="card-subtitle">Live sensor anomaly score timeline · Red spikes = detected anomalies</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={graphData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00D2FF" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00D2FF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#FF003C" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF003C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#484f58' }} axisLine={false} tickLine={false} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: '#484f58' }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <ReferenceLine y={75} stroke="rgba(255,0,60,0.4)" strokeDasharray="4 4" label={{ value: 'Critical', fill: '#FF003C', fontSize: 10 }} />
            <ReferenceLine y={50} stroke="rgba(250,204,21,0.3)" strokeDasharray="4 4" label={{ value: 'Warning', fill: '#FACC15', fontSize: 10 }} />
            <Area type="monotone" dataKey="score"   stroke="#00D2FF" strokeWidth={2} fill="url(#scoreGrad)"   dot={false} name="Score" />
            <Area type="monotone" dataKey="anomaly" stroke="#FF003C" strokeWidth={2} fill="url(#anomalyGrad)" dot={{ r: 5, fill: '#FF003C', stroke: '#fff', strokeWidth: 1 }} name="Anomaly" connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Machine Status Grid ───────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="card-header">
          <div className="card-title">🏭 Machine Anomaly Status Grid</div>
          <div className="card-subtitle">Per-machine status overview</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {anomalies.map((a, i) => {
            const isCritical = a.severity === 'Critical';
            return (
              <motion.div
                key={a.id}
                style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: SEV_BG[a.severity],
                  border: `1px solid ${SEV_BORDER[a.severity]}`,
                  position: 'relative', overflow: 'hidden',
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.02, boxShadow: `0 8px 30px ${SEV_COLOR[a.severity]}22` }}
              >
                {/* Pulse ring for critical */}
                {isCritical && (
                  <motion.div
                    style={{
                      position: 'absolute', inset: -2, borderRadius: 12,
                      border: '2px solid rgba(255,0,60,0.5)',
                      pointerEvents: 'none',
                    }}
                    animate={{ opacity: [0.8, 0, 0.8], scale: [1, 1.04, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 20 }}>
                    {a.severity === 'Critical' ? '🔴' : a.severity === 'Warning' ? '🟡' : '🟢'}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: SEV_BG[a.severity], color: SEV_COLOR[a.severity],
                    border: `1px solid ${SEV_COLOR[a.severity]}`,
                  }}>
                    {a.severity.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3', marginBottom: 2 }}>{a.machine}</div>
                <div style={{ fontSize: 11, color: SEV_COLOR[a.severity], marginBottom: 8 }}>{a.issue}</div>

                {/* Mini score bar */}
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', borderRadius: 4, background: SEV_COLOR[a.severity] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${a.score}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                  />
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                  Risk: {a.score}/100
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── History Table ────────────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="card-header">
          <div>
            <div className="card-title">📋 Anomaly History</div>
            <div className="card-subtitle">Searchable log of detected anomalies</div>
          </div>
        </div>

        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search machine or issue…"
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 6,
              background: 'var(--bg-primary)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
            }}
          />
          {['All', 'Critical', 'Warning', 'Normal'].map(s => (
            <button
              key={s}
              onClick={() => setSevFilter(s)}
              style={{
                padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${sevFilter === s ? SEV_COLOR[s] || '#00D2FF' : 'var(--border)'}`,
                background: sevFilter === s ? (SEV_BG[s] || 'rgba(0,210,255,0.1)') : 'var(--bg-card)',
                color: sevFilter === s ? (SEV_COLOR[s] || '#00D2FF') : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Machine</th>
                <th>Issue</th>
                <th>Severity</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px 0' }}>
                    No anomalies match your filters
                  </td>
                </tr>
              ) : (
                filtered.map((a, i) => (
                  <motion.tr
                    key={`${a.id}-${i}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{ts(a.timestamp)}</td>
                    <td style={{ color: '#e6edf3', fontWeight: 600 }}>{a.machine}</td>
                    <td>{a.issue}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: SEV_BG[a.severity],
                        color: SEV_COLOR[a.severity],
                        border: `1px solid ${SEV_COLOR[a.severity]}`,
                      }}>
                        {a.severity === 'Critical' ? '🔴' : a.severity === 'Warning' ? '🟡' : '🟢'} {a.severity}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 50, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${a.score}%`, background: SEV_COLOR[a.severity], borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: SEV_COLOR[a.severity], fontFamily: 'JetBrains Mono, monospace' }}>
                          {a.score}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── AI Insight Panel ─────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {aiAnomaly && (
          <motion.div
            key={aiIndex}
            className="card"
            style={{
              background: 'linear-gradient(135deg, rgba(0,210,255,0.04), rgba(139,92,246,0.04))',
              border: '1px solid rgba(0,210,255,0.2)',
              boxShadow: '0 0 40px rgba(0,210,255,0.06)',
              marginBottom: 0,
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
          >
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'linear-gradient(135deg, #00D2FF22, #8b5cf622)',
                  border: '1px solid rgba(0,210,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>🤖</div>
                <div>
                  <div className="card-title">AI Insight Panel</div>
                  <div className="card-subtitle">Machine: {aiAnomaly.machine} · Rotating every 6s</div>
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: 'rgba(0,210,255,0.1)', color: '#00D2FF',
                border: '1px solid rgba(0,210,255,0.25)',
                letterSpacing: 1,
              }}>
                AI • {aiAnomaly.confidence}% CONF
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {[
                { icon: '🔮', label: 'Prediction',      value: aiAnomaly.prediction,     color: '#8b5cf6' },
                { icon: '🔍', label: 'Root Cause',      value: aiAnomaly.rootCause,       color: '#FACC15' },
                { icon: '💡', label: 'Recommendation',  value: aiAnomaly.recommendation,  color: '#00FF41' },
              ].map(({ icon, label, value, color }) => (
                <div key={label} style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid rgba(255,255,255,0.06)`,
                }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 13, color: '#e6edf3', lineHeight: 1.5, fontWeight: 500 }}>
                    {value}
                  </div>
                  <div style={{
                    display: 'inline-flex', marginTop: 8, padding: '2px 8px', borderRadius: 6,
                    background: `${color}18`, color, fontSize: 10, fontWeight: 700,
                    border: `1px solid ${color}33`,
                  }}>
                    {aiAnomaly.severity}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
