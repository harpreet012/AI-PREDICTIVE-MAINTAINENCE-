import { useEffect, useState, useCallback } from 'react';
import { analyticsAPI } from '../services/api';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import PageTransition from '../components/PageTransition';

const PIE_COLORS   = ['#10b981', '#f59e0b', '#ef4444', '#64748b', '#8b5cf6'];
const STATUS_LABELS = ['healthy', 'warning', 'critical', 'offline', 'maintenance'];
const RISK_COLORS   = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

function RiskBadge({ level }) {
  return <span className={`risk-chip ${level}`}>{level.toUpperCase()}</span>;
}

const TOOLTIP_STYLE = {
  background: '#101929',
  border: '1px solid rgba(99,179,237,0.15)',
  borderRadius: 8,
  fontSize: 12,
};

export default function AnalyticsPage() {
  const [overview,   setOverview]   = useState({});
  const [riskMatrix, setRiskMatrix] = useState([]);
  const [anomalies,  setAnomalies]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [ovRes, riskRes, anomalyRes] = await Promise.all([
        analyticsAPI.getOverview(),
        analyticsAPI.getRiskMatrix(),
        analyticsAPI.getAnomalies({ hours: 24 }),
      ]);
      setOverview(ovRes.data.data);
      setRiskMatrix(riskRes.data.data);
      setAnomalies(anomalyRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  /* ── Derived data ──────────────────────────────────────────────────────── */
  const pieData = STATUS_LABELS
    .map((s) => ({
      name: s.charAt(0).toUpperCase() + s.slice(1),
      value: overview.statusCounts?.[s] || 0,
    }))
    .filter((d) => d.value > 0);

  const riskData = [
    { risk: 'High',   count: riskMatrix.filter((e) => e.riskLevel === 'high').length },
    { risk: 'Medium', count: riskMatrix.filter((e) => e.riskLevel === 'medium').length },
    { risk: 'Low',    count: riskMatrix.filter((e) => e.riskLevel === 'low').length },
  ];

  const total = overview.totalEquipment || 1;
  const radarData = [
    { metric: 'Avg Health',  value: overview.avgHealthScore || 0 },
    { metric: 'Safe Units',  value: Math.round(((total - (overview.atRisk || 0)) / total) * 100) },
    { metric: 'Alert Rate',  value: Math.max(0, 100 - (overview.recentAlerts || 0) * 10) },
    { metric: 'Uptime',      value: Math.round(((total - (overview.critical || 0)) / total) * 100) },
    { metric: 'Maintenance', value: Math.max(0, 100 - (overview.maintenanceDue || 0) * 15) },
  ].map((d) => ({ ...d, value: Math.min(100, Math.max(0, d.value)) }));

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <PageTransition>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Analytics & Insights</h2>
          <p>Predictive failure analysis · Fleet performance · Risk assessment</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="stat-cards-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Fleet Health',    value: `${overview.avgHealthScore || 0}%`, color: '#10b981' },
          { label: 'At Risk',         value: overview.atRisk || 0,               color: '#f59e0b' },
          { label: 'Critical',        value: overview.critical || 0,             color: '#ef4444' },
          { label: 'Alerts (24 h)',   value: overview.recentAlerts || 0,         color: '#8b5cf6' },
          { label: 'Maintenance Due', value: overview.maintenanceDue || 0,       color: '#06b6d4' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card" style={{ '--card-accent': color }}>
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Row 1: Radar + Pie */}
      <div className="grid-2 mb-6">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Fleet Performance Radar</div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.05)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
              <Radar
                name="Score"
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Equipment Status Distribution</div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Risk bar + Anomaly summary */}
      <div className="grid-2 mb-6">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Risk Level Distribution</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={riskData} margin={{ left: -20, top: 4, right: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="risk" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {riskData.map((d, i) => (
                  <Cell key={i} fill={RISK_COLORS[d.risk.toLowerCase()]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Top Anomalous Equipment (24 h)</div>
          </div>
          {anomalies.length === 0 ? (
            <div style={{ color: '#4b5e78', padding: '40px 0', textAlign: 'center', fontSize: 13 }}>
              ✅ No anomalies detected in the last 24 hours
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {anomalies.slice(0, 6).map((a) => (
                <div
                  key={a._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f6ff' }}>
                      {a.equipment?.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#4b5e78' }}>
                      {a.equipment?.type} · {a.equipment?.location}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
                      {a.anomalyCount} events
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Max: {(a.maxAnomalyScore * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full risk matrix table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Full Risk Matrix</div>
            <div className="card-subtitle">Top 100 equipment ranked by highest failure probability</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Type</th>
                <th>Location</th>
                <th>Health</th>
                <th>Failure Risk</th>
                <th>Est. Failure</th>
                <th>Op. Hours</th>
                <th>Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {[...riskMatrix]
                .sort((a, b) => (b.failureProbability || 0) - (a.failureProbability || 0))
                .map((e) => {
                  const hColor =
                    (e.healthScore || 0) >= 85
                      ? '#10b981'
                      : (e.healthScore || 0) >= 60
                      ? '#f59e0b'
                      : '#ef4444';
                  return (
                    <tr key={e.id}>
                      <td style={{ color: '#f0f6ff', fontWeight: 500 }}>{e.name}</td>
                      <td>{e.type}</td>
                      <td>{e.location}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div
                            style={{
                              width: 48,
                              height: 4,
                              background: 'rgba(255,255,255,0.06)',
                              borderRadius: 4,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${e.healthScore || 0}%`,
                                background: hColor,
                                transition: 'width 0.5s ease',
                              }}
                            />
                          </div>
                          <span
                            className="text-mono"
                            style={{ fontSize: 12, color: hColor }}
                          >
                            {e.healthScore || 0}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="text-mono"
                          style={{
                            color:
                              (e.failureProbability || 0) > 60
                                ? '#ef4444'
                                : (e.failureProbability || 0) > 30
                                ? '#f59e0b'
                                : '#10b981',
                            fontWeight: 700,
                          }}
                        >
                          {e.failureProbability || 0}%
                        </span>
                      </td>
                      <td style={{ color: '#94a3b8' }}>
                        {e.predictedFailureIn != null ? `${e.predictedFailureIn} h` : 'N/A'}
                      </td>
                      <td style={{ color: '#64748b' }}>
                        {(e.operatingHours || 0).toLocaleString()} h
                      </td>
                      <td>
                        <RiskBadge level={e.riskLevel || 'low'} />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </PageTransition>
  );
}
