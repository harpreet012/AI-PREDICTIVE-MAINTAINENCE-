import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { equipmentAPI, sensorAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import HealthGauge from '../components/HealthGauge';
import SensorChart from '../components/SensorChart';
import { ArrowLeft, Thermometer, Activity, Gauge, Zap, Wind, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import PageTransition from '../components/PageTransition';

const SENSOR_PANELS = [
  { key: 'temperature', label: 'Temperature', unit: '°C',   icon: '🌡️', color: '#ef4444', warn: 75, crit: 90 },
  { key: 'vibration',   label: 'Vibration',   unit: 'mm/s', icon: '📳', color: '#f97316', warn: 6,  crit: 10 },
  { key: 'pressure',    label: 'Pressure',    unit: 'bar',  icon: '💨', color: '#3b82f6', warn: 120, crit: 145 },
  { key: 'rpm',         label: 'RPM',         unit: '',     icon: '⚙️', color: '#8b5cf6', warn: 3200, crit: 3600 },
  { key: 'current',     label: 'Current',     unit: 'A',    icon: '⚡', color: '#06b6d4', warn: 45, crit: 58 },
];

function LiveSensorTile({ sensor, value, flag }) {
  const isWarn = value >= sensor.warn;
  const isCrit = value >= sensor.crit;
  const color = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : sensor.color;
  return (
    <div className="card" style={{ textAlign: 'center', borderColor: (isWarn || isCrit) ? `${color}40` : '' }}>
      <div style={{ fontSize: 24 }}>{sensor.icon}</div>
      <div style={{
        fontSize: 26, fontWeight: 800, color,
        fontFamily: 'JetBrains Mono, monospace',
        margin: '8px 0 4px',
      }}>
        {typeof value === 'number' ? value.toFixed(1) : '--'}
        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 3 }}>{sensor.unit}</span>
      </div>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{sensor.label}</div>
      {flag && <div style={{ fontSize: 10, color, marginTop: 4 }}>⚠ Flagged</div>}
    </div>
  );
}

export default function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { liveReadings, subscribeToEquipment } = useSocket();

  const [equipment, setEquipment] = useState(null);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [timeRange, setTimeRange] = useState(1); // hours

  useEffect(() => { subscribeToEquipment(id); }, [id, subscribeToEquipment]);

  const fetchData = useCallback(async () => {
    try {
      const [eqRes, histRes] = await Promise.all([
        equipmentAPI.getStats(id),
        sensorAPI.getReadings(id, { hours: timeRange, limit: 200 }),
      ]);
      setEquipment(eqRes.data.data.equipment);
      setHistory(histRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, timeRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const live = liveReadings[id] || {};
  const healthScore = live.healthScore ?? equipment?.healthScore ?? 100;
  const status      = live.status      ?? equipment?.status ?? 'healthy';

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!equipment) return <div style={{ color: '#ef4444', padding: 40 }}>Equipment not found.</div>;

  return (
    <PageTransition>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} />
          </button>
          <div>
            <h2>{equipment.name}</h2>
            <p>{equipment.type} · {equipment.location} · S/N: {equipment.serialNumber}</p>
          </div>
        </div>
        <span className={`status-badge ${status}`}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Top row: gauge + quick facts */}
      <div className="grid-2 mb-6" style={{ gridTemplateColumns: '200px 1fr' }}>
        <div className="card flex-center" style={{ flexDirection: 'column', gap: 10 }}>
          <HealthGauge score={healthScore} size={150} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>Failure Risk</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: live.failureProbability > 50 ? '#ef4444' : '#10b981' }}>
              {live.failureProbability ?? 0}%
            </div>
          </div>
          {live.predictedFailureIn != null && (
            <div style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.1)', borderRadius: 6, fontSize: 11, color: '#ef4444', fontWeight: 600, textAlign: 'center' }}>
              ⚠️ Est. failure in {live.predictedFailureIn}h
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>Equipment Info</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: 13 }}>
            {[
              ['Manufacturer', equipment.manufacturer],
              ['Model', equipment.model],
              ['Type', equipment.type],
              ['Location', equipment.location],
              ['Operating Hours', `${equipment.operatingHours?.toLocaleString() || 0} hrs`],
              ['Install Date', equipment.installDate ? new Date(equipment.installDate).toLocaleDateString() : 'N/A'],
              ['Last Maintenance', equipment.lastMaintenance
                ? formatDistanceToNow(new Date(equipment.lastMaintenance), { addSuffix: true })
                : 'Never'],
              ['Next Service', equipment.nextScheduledMaintenance
                ? new Date(equipment.nextScheduledMaintenance).toLocaleDateString()
                : 'Not scheduled'],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: '#4b5e78', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                <div style={{ color: '#f0f6ff', fontWeight: 500, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* AI Recommendations */}
          {live.recommendations?.length > 0 && (
            <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(59,130,246,0.06)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', marginBottom: 6, letterSpacing: '0.5px' }}>🤖 AI RECOMMENDATIONS</div>
              {live.recommendations.map((rec, i) => (
                <div key={i} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{rec}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live sensor tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {SENSOR_PANELS.map(sp => (
          <LiveSensorTile
            key={sp.key}
            sensor={sp}
            value={live[sp.key]}
            flag={live.sensorFlags?.[`${sp.key}Flag`]}
          />
        ))}
      </div>

      {/* Historical charts */}
      <div className="card mb-6">
        <div className="card-header">
          <div>
            <div className="card-title">Sensor History</div>
            <div className="card-subtitle">{history.length} data points</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 6, 24, 168].map(h => (
              <button
                key={h}
                className={`btn btn-sm ${timeRange === h ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTimeRange(h)}
              >
                {h === 1 ? '1H' : h === 6 ? '6H' : h === 24 ? '24H' : '7D'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <SensorChart data={history} sensors={['temperature']} type="area" height={180} title="Temperature (°C)" anomalyThreshold={75} />
          <SensorChart data={history} sensors={['vibration']}   type="area" height={180} title="Vibration (mm/s)" anomalyThreshold={6} />
          <SensorChart data={history} sensors={['pressure']}    type="area" height={180} title="Pressure (bar)"   anomalyThreshold={120} />
          <SensorChart data={history} sensors={['rpm', 'current']} type="line" height={180} title="RPM & Current" />
        </div>
      </div>

      {/* Health score trend */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Health Score & Anomaly Trend</div>
        </div>
        <SensorChart data={history} sensors={['healthScore', 'anomalyScore']} type="area" height={200} />
      </div>
    </PageTransition>
  );
}
