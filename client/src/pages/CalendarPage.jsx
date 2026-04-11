import { useEffect, useState, useCallback, useRef } from 'react';
import { analyticsAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import {
  Calendar, RefreshCw, Activity, AlertTriangle,
  Zap, TrendingUp, ChevronRight, Clock,
} from 'lucide-react';

/* ── Color helpers ────────────────────────────── */
const STATUS_CONFIG = {
  healthy:   { bg: '#10b981', glow: 'rgba(16,185,129,0.55)',  label: 'Healthy',  textColor: '#fff' },
  good:      { bg: '#06b6d4', glow: 'rgba(6,182,212,0.55)',   label: 'Good',     textColor: '#fff' },
  warning:   { bg: '#f59e0b', glow: 'rgba(245,158,11,0.55)',  label: 'Warning',  textColor: '#0e1e33' },
  critical:  { bg: '#ef4444', glow: 'rgba(239,68,68,0.55)',   label: 'Critical', textColor: '#fff' },
  'no-data': { bg: 'rgba(255,255,255,0.04)', glow: 'transparent', label: 'No Data', textColor: '#4b5e78' },
};

function healthColor(h) {
  if (h === null || h === undefined) return STATUS_CONFIG['no-data'].bg;
  if (h >= 80) return STATUS_CONFIG.healthy.bg;
  if (h >= 65) return STATUS_CONFIG.good.bg;
  if (h >= 50) return STATUS_CONFIG.warning.bg;
  return STATUS_CONFIG.critical.bg;
}

/* ── Tooltip ─────────────────────────────────── */
function DayTooltip({ day, pos }) {
  if (!day) return null;
  const cfg = STATUS_CONFIG[day.status] || STATUS_CONFIG['no-data'];
  return (
    <motion.div
      className="cal-tooltip"
      initial={{ opacity: 0, y: 6, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.93 }}
      transition={{ duration: 0.15 }}
      style={{ top: pos.y, left: pos.x }}
    >
      <div className="cal-tooltip-date">{day.dayLabel}</div>
      <div className="cal-tooltip-status" style={{ color: cfg.bg }}>
        <span
          style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: cfg.bg, marginRight: 5, boxShadow: `0 0 6px ${cfg.glow}` }}
        />
        {cfg.label}
      </div>
      <div className="cal-tooltip-grid">
        <div className="cal-tt-row">
          <span className="cal-tt-label">⚡ Avg Health</span>
          <span className="cal-tt-value" style={{ color: healthColor(day.avgHealth) }}>
            {day.avgHealth !== null ? `${day.avgHealth}%` : '—'}
          </span>
        </div>
        <div className="cal-tt-row">
          <span className="cal-tt-label">🔴 Anomalies</span>
          <span className="cal-tt-value" style={{ color: day.anomalyCount > 0 ? '#f59e0b' : '#94a3b8' }}>
            {day.anomalyCount}
          </span>
        </div>
        <div className="cal-tt-row">
          <span className="cal-tt-label">🚨 Alerts</span>
          <span className="cal-tt-value" style={{ color: day.alertCount > 0 ? '#ef4444' : '#94a3b8' }}>
            {day.alertCount}
            {day.criticalCount > 0 && (
              <span style={{ fontSize: 9, marginLeft: 4, color: '#ef4444' }}>
                ({day.criticalCount} critical)
              </span>
            )}
          </span>
        </div>
        <div className="cal-tt-row">
          <span className="cal-tt-label">📊 Readings</span>
          <span className="cal-tt-value">{day.totalReadings.toLocaleString()}</span>
        </div>
      </div>
      {day.isToday && (
        <div style={{ marginTop: 8, fontSize: 10, color: '#63b3ed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>
          ● Today
        </div>
      )}
    </motion.div>
  );
}

/* ── Day Cell ─────────────────────────────────── */
function DayCell({ day, index, onHover, onLeave }) {
  const cfg = STATUS_CONFIG[day.status] || STATUS_CONFIG['no-data'];
  const hasData = day.status !== 'no-data';

  return (
    <motion.div
      className={`cal-day-cell ${day.isToday ? 'cal-today' : ''}`}
      style={{ '--day-color': cfg.bg, '--day-glow': cfg.glow }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.025, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.12, zIndex: 10 }}
      onMouseEnter={(e) => onHover(day, e)}
      onMouseLeave={onLeave}
    >
      {/* Background fill */}
      <div
        className="cal-cell-bg"
        style={{
          background: hasData
            ? `linear-gradient(135deg, ${cfg.bg}dd, ${cfg.bg}88)`
            : cfg.bg,
          boxShadow: hasData ? `0 0 18px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.15)` : 'none',
        }}
      />

      {/* Today ring */}
      {day.isToday && (
        <>
          <motion.div
            className="cal-today-ring"
            animate={{ opacity: [0.9, 0.4, 0.9] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <motion.div
            className="cal-today-ring cal-today-ring-outer"
            animate={{ opacity: [0.4, 0.1, 0.4], scale: [1, 1.08, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        </>
      )}

      {/* Day number */}
      <div className="cal-cell-content" style={{ color: hasData ? cfg.textColor : '#4b5e78' }}>
        <div className="cal-cell-day-num">
          {new Date(day.date + 'T00:00:00').getDate()}
        </div>
        {hasData && (
          <div className="cal-cell-health">
            {day.avgHealth}%
          </div>
        )}
        {day.anomalyCount > 0 && (
          <div className="cal-cell-badge">
            {day.anomalyCount > 99 ? '99+' : day.anomalyCount}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Summary Stats Row ────────────────────────── */
function SummaryStats({ data }) {
  const withData   = data.filter(d => d.avgHealth !== null);
  const avgHealth  = withData.length ? Math.round(withData.reduce((s, d) => s + d.avgHealth, 0) / withData.length) : 0;
  const totalAnomaly = data.reduce((s, d) => s + d.anomalyCount, 0);
  const totalAlerts  = data.reduce((s, d) => s + d.alertCount, 0);
  const bestDay    = withData.sort((a, b) => b.avgHealth - a.avgHealth)[0];
  const worstDay   = withData.sort((a, b) => a.avgHealth - b.avgHealth)[0];

  const stats = [
    { label: 'Avg Fleet Health',  value: `${avgHealth}%`,           icon: <Activity size={16} />, color: avgHealth >= 80 ? '#10b981' : avgHealth >= 60 ? '#f59e0b' : '#ef4444' },
    { label: 'Total Anomalies',   value: totalAnomaly.toLocaleString(), icon: <Zap size={16} />, color: '#f59e0b' },
    { label: 'Total Alerts',      value: totalAlerts.toLocaleString(),  icon: <AlertTriangle size={16} />, color: '#ef4444' },
    { label: 'Best Day',          value: bestDay?.avgHealth != null ? `${bestDay.avgHealth}%` : '—',
      sub: bestDay?.date ? new Date(bestDay.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      icon: <TrendingUp size={16} />, color: '#10b981' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          className="cal-stat-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ color: s.color, display: 'flex' }}>{s.icon}</div>
            <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
          {s.sub && <div style={{ fontSize: 10, color: '#4b5e78', marginTop: 4 }}>{s.sub}</div>}
        </motion.div>
      ))}
    </div>
  );
}

/* ══════════════ CALENDAR PAGE ══════════════════ */
export default function CalendarPage() {
  const [calData,    setCalData]    = useState([]);
  const [days,       setDays]       = useState(15);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tooltip,    setTooltip]    = useState({ day: null, pos: { x: 0, y: 0 } });
  const [clock,      setClock]      = useState(new Date());
  const intervalRef  = useRef(null);
  const tooltipRef   = useRef(null);

  /* Live clock */
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Fetch calendar data */
  const fetchCalendar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await analyticsAPI.getCalendar(days);
      setCalData(res.data.data || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Calendar fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => {
    fetchCalendar();
    // Auto-refresh every 60s
    intervalRef.current = setInterval(() => fetchCalendar(true), 60_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchCalendar]);

  /* Tooltip handlers */
  const handleHover = useCallback((day, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = e.currentTarget.closest('.cal-heatmap-wrap')?.getBoundingClientRect() || { left: 0, top: 0 };
    setTooltip({
      day,
      pos: {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top  - containerRect.top  - 4,
      },
    });
  }, []);

  const handleLeave = useCallback(() => {
    setTooltip({ day: null, pos: { x: 0, y: 0 } });
  }, []);

  /* Month labels for the grid */
  const monthLabels = calData.reduce((acc, d, i) => {
    const m = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' });
    if (i === 0 || acc[acc.length - 1]?.label !== m) {
      acc.push({ label: m, index: i });
    }
    return acc;
  }, []);

  const DAY_OPTIONS = [7, 10, 15, 30];

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Header ─────────────────────────────── */}
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-header-left">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
                style={{ fontSize: 22 }}
              >📅</motion.span>
              Real-Time Operations Calendar
            </h2>
            <p>Per-day fleet health, anomaly &amp; alert heatmap — live data</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Live clock */}
            <div className="cal-clock-badge">
              <Clock size={12} />
              <span style={{ fontWeight: 700 }}>
                {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="live-dot" style={{ marginLeft: 2 }} />
            </div>

            {/* Day range selector */}
            <div className="cal-day-selector">
              {DAY_OPTIONS.map(d => (
                <motion.button
                  key={d}
                  className={`cal-day-btn ${days === d ? 'active' : ''}`}
                  onClick={() => setDays(d)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {d}d
                </motion.button>
              ))}
            </div>

            {/* Refresh */}
            <motion.button
              className="btn btn-secondary btn-sm btn-icon"
              onClick={() => fetchCalendar(true)}
              animate={refreshing ? { rotate: 360 } : {}}
              transition={{ duration: 0.7, repeat: refreshing ? Infinity : 0, ease: 'linear' }}
              title="Refresh"
            >
              <RefreshCw size={13} />
            </motion.button>
          </div>
        </div>

        {/* ── Last updated ───────────────────────── */}
        {lastUpdate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#4b5e78', marginTop: -12 }}>
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            Last updated: {lastUpdate.toLocaleTimeString()} · Auto-refreshes every 60s
          </div>
        )}

        {/* ── Summary Stats ──────────────────────── */}
        {!loading && calData.length > 0 && <SummaryStats data={[...calData]} />}

        {/* ── Calendar Heatmap ───────────────────── */}
        <motion.div
          className="card"
          style={{
            border: '1px solid rgba(99,179,237,0.15)',
            background: 'linear-gradient(135deg, rgba(0,210,255,0.03) 0%, rgba(14,30,51,0.98) 60%)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="card-header" style={{ marginBottom: 20 }}>
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} style={{ color: '#63b3ed' }} />
                {days}-Day Operations Heatmap
                <div className="live-badge" style={{ marginLeft: 8 }}>
                  <span className="live-dot" />LIVE
                </div>
              </div>
              <div className="card-subtitle">
                {calData.filter(d => d.avgHealth !== null).length} days with data ·{' '}
                {calData.filter(d => d.isToday)[0]?.date
                  ? new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                  : ''}
              </div>
            </div>

            {/* Legend */}
            <div className="cal-legend">
              <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Health</span>
              {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'no-data').map(([key, cfg]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: cfg.bg, display: 'inline-block', boxShadow: `0 0 6px ${cfg.glow}` }} />
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{cfg.label}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_CONFIG['no-data'].bg, border: '1px solid rgba(255,255,255,0.08)', display: 'inline-block' }} />
                <span style={{ fontSize: 10, color: '#4b5e78' }}>No Data</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 10, padding: '8px 0' }}>
              {Array.from({ length: days }).map((_, i) => (
                <motion.div
                  key={i}
                  style={{ height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 1.4, delay: i * 0.04, repeat: Infinity }}
                />
              ))}
            </div>
          ) : (
            <>
              {/* ── Month labels ── */}
              {monthLabels.length > 1 && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 8, paddingLeft: 2 }}>
                  {monthLabels.map((m, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 11, color: '#63b3ed', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: 0.5,
                        marginRight: 12,
                      }}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
              )}

              {/* ── Heatmap Grid ── */}
              <div className="cal-heatmap-wrap" style={{ position: 'relative' }}>
                <div
                  className="cal-heatmap-grid"
                  style={{ gridTemplateColumns: `repeat(${Math.min(days, 15)}, 1fr)` }}
                >
                  {calData.map((day, i) => (
                    <DayCell
                      key={day.date}
                      day={day}
                      index={i}
                      onHover={handleHover}
                      onLeave={handleLeave}
                    />
                  ))}
                </div>

                {/* Tooltip */}
                <AnimatePresence>
                  {tooltip.day && (
                    <DayTooltip
                      key="tooltip"
                      day={tooltip.day}
                      pos={tooltip.pos}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* ── Day-of-week bar ── */}
              {calData.length > 0 && (
                <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${Math.min(days, 15)}, 1fr)`,
                      gap: 10,
                    }}
                  >
                    {calData.map(day => (
                      <div
                        key={day.date}
                        style={{
                          textAlign: 'center', fontSize: 9,
                          color: day.isToday ? '#63b3ed' : '#334155',
                          fontWeight: day.isToday ? 700 : 400,
                          textTransform: 'uppercase', letterSpacing: 0.3,
                        }}
                      >
                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* ── Alert Timeline ─────────────────────── */}
        {!loading && calData.some(d => d.alertCount > 0 || d.anomalyCount > 0) && (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="card-header">
              <div>
                <div className="card-title">📈 Daily Alert &amp; Anomaly Timeline</div>
                <div className="card-subtitle">Trend over the selected {days}-day window</div>
              </div>
            </div>

            <div className="cal-timeline-wrap">
              {calData.map((day, i) => {
                const maxVal = Math.max(...calData.map(d => Math.max(d.alertCount, d.anomalyCount)), 1);
                const alertPct   = (day.alertCount   / maxVal) * 100;
                const anomalyPct = (day.anomalyCount / maxVal) * 100;
                return (
                  <div key={day.date} className="cal-timeline-col">
                    <div className="cal-timeline-bars">
                      {day.anomalyCount > 0 && (
                        <motion.div
                          className="cal-tbar cal-tbar-anomaly"
                          initial={{ height: 0 }}
                          animate={{ height: `${anomalyPct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.02 }}
                          title={`${day.anomalyCount} anomalies`}
                        />
                      )}
                      {day.alertCount > 0 && (
                        <motion.div
                          className="cal-tbar cal-tbar-alert"
                          initial={{ height: 0 }}
                          animate={{ height: `${alertPct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.02 + 0.1 }}
                          title={`${day.alertCount} alerts`}
                        />
                      )}
                    </div>
                    <div className="cal-timeline-label">
                      {day.isToday ? '●' : new Date(day.date + 'T00:00:00').getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} />
                Anomalies
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} />
                Alerts
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Detailed Day List ──────────────────── */}
        {!loading && (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <div className="card-header">
              <div>
                <div className="card-title">🗒 Day-by-Day Breakdown</div>
                <div className="card-subtitle">All {days} days — most recent first</div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Avg Health</th>
                    <th>Anomalies</th>
                    <th>Alerts</th>
                    <th>Critical Alerts</th>
                    <th>Sensor Readings</th>
                  </tr>
                </thead>
                <tbody>
                  {[...calData].reverse().map((day, i) => {
                    const cfg = STATUS_CONFIG[day.status] || STATUS_CONFIG['no-data'];
                    return (
                      <motion.tr
                        key={day.date}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        style={day.isToday ? { background: 'rgba(99,179,237,0.06)', borderLeft: '2px solid rgba(99,179,237,0.4)' } : {}}
                      >
                        <td style={{ color: day.isToday ? '#63b3ed' : '#f0f6ff', fontWeight: day.isToday ? 700 : 500 }}>
                          {day.dayLabel}
                          {day.isToday && (
                            <span style={{ marginLeft: 8, fontSize: 10, color: '#63b3ed', fontWeight: 700, border: '1px solid rgba(99,179,237,0.4)', padding: '1px 5px', borderRadius: 8 }}>
                              TODAY
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.bg, boxShadow: `0 0 6px ${cfg.glow}`, flexShrink: 0 }} />
                            <span style={{ color: cfg.bg, fontWeight: 600, fontSize: 12 }}>{cfg.label}</span>
                          </span>
                        </td>
                        <td>
                          <span style={{ color: healthColor(day.avgHealth), fontWeight: 700 }}>
                            {day.avgHealth !== null ? `${day.avgHealth}%` : '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: day.anomalyCount > 0 ? '#f59e0b' : '#334155', fontWeight: day.anomalyCount > 0 ? 700 : 400 }}>
                            {day.anomalyCount}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: day.alertCount > 0 ? '#ef4444' : '#334155', fontWeight: day.alertCount > 0 ? 700 : 400 }}>
                            {day.alertCount}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: day.criticalCount > 0 ? '#ef4444' : '#334155', fontWeight: day.criticalCount > 0 ? 700 : 400 }}>
                            {day.criticalCount || 0}
                          </span>
                        </td>
                        <td style={{ color: '#64748b' }}>
                          {day.totalReadings.toLocaleString()}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
