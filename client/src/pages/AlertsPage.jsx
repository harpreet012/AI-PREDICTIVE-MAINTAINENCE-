import { useEffect, useState, useCallback } from 'react';
import { alertAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { CheckCheck, Trash2, Filter, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import PageTransition from '../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';

const SEVERITY_OPTIONS = ['all', 'critical', 'warning', 'info'];
const TYPE_OPTIONS     = ['all', 'anomaly', 'degradation', 'threshold', 'prediction', 'scheduled'];

function AlertRow({ alert, index = 0, onAck, onResolve, onDelete }) {
  return (
    <motion.div 
      className={`alert-card ${alert.severity}`}
      layout
      initial={{ opacity: 0, x: -20, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
      whileHover={{ x: 4, transition: { duration: 0.15 } }}
    >
      <div className={`alert-icon ${alert.severity}`}>
        {alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
      </div>
      <div className="alert-body">
        <div className="alert-message">{alert.message}</div>
        <div className="alert-equip">{alert.equipmentId?.name} · {alert.equipmentId?.location}</div>
        <div className="alert-meta">
          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })} ·&nbsp;
          <span style={{ textTransform: 'capitalize' }}>{alert.type}</span>
          {alert.healthScore != null && ` · Health: ${alert.healthScore}%`}
          {alert.anomalyScore != null && ` · Anomaly: ${(alert.anomalyScore * 100).toFixed(0)}%`}
          {alert.acknowledged && <span style={{ color: '#10b981', marginLeft: 6 }}>✓ Acknowledged</span>}
        </div>
        {alert.sensorValues && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {Object.entries(alert.sensorValues).filter(([,v]) => v != null).map(([k, v]) => (
              <span key={k} style={{
                padding: '2px 7px',
                background: 'rgba(59,130,246,0.1)',
                borderRadius: 4,
                fontSize: 11,
                fontFamily: 'JetBrains Mono',
                color: '#94a3b8',
              }}>
                {k}: {typeof v === 'number' ? v.toFixed(1) : v}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="alert-actions">
        {!alert.acknowledged && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-success btn-sm" onClick={() => onAck(alert._id)}>Ack</motion.button>
        )}
        {!alert.resolved && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-secondary btn-sm" onClick={() => onResolve(alert._id)}>Resolve</motion.button>
        )}
        <motion.button whileHover={{ scale: 1.1, background: '#ef4444' }} whileTap={{ scale: 0.9 }} className="btn btn-danger btn-sm btn-icon" onClick={() => onDelete(alert._id)}>
          <Trash2 size={12} />
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts]   = useState({ total: 0, unread: 0, critical: 0 });
  const [severity, setSeverity] = useState('all');
  const [type, setType]         = useState('all');
  const [ackFilter, setAck]     = useState('all'); // all | unread | acknowledged
  const { liveAlerts } = useSocket();

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 80 };
      if (severity !== 'all') params.severity = severity;
      if (type !== 'all')     params.type = type;
      if (ackFilter === 'unread')       params.acknowledged = false;
      if (ackFilter === 'acknowledged') params.acknowledged = true;

      const res = await alertAPI.getAll(params);
      setAlerts(res.data.data);
      setCounts({ total: res.data.total, unread: res.data.unread, critical: res.data.critical });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [severity, type, ackFilter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // Prepend live alerts
  useEffect(() => {
    if (liveAlerts.length > 0) {
      setAlerts(prev => {
        const newOnes = liveAlerts.filter(la => !prev.find(p => p._id === la._id));
        return [...newOnes, ...prev];
      });
    }
  }, [liveAlerts]);

  const handleAck = async (id) => {
    await alertAPI.acknowledge(id);
    setAlerts(prev => prev.map(a => a._id === id ? { ...a, acknowledged: true } : a));
    toast.success('Alert acknowledged');
  };

  const handleResolve = async (id) => {
    await alertAPI.resolve(id);
    setAlerts(prev => prev.map(a => a._id === id ? { ...a, resolved: true } : a));
    toast.success('Alert resolved');
  };

  const handleDelete = async (id) => {
    await alertAPI.delete(id);
    setAlerts(prev => prev.filter(a => a._id !== id));
    toast.success('Alert deleted');
  };

  const handleAckAll = async () => {
    await alertAPI.acknowledgeAll();
    setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })));
    toast.success('All alerts acknowledged');
  };

  return (
    <PageTransition>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Alert Management</h2>
          <p>{counts.unread} unread · {counts.critical} critical · {counts.total} total</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-secondary btn-sm" onClick={fetchAlerts}>
            <RefreshCw size={12} /> Refresh
          </motion.button>
          {counts.unread > 0 && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-success btn-sm" onClick={handleAckAll}>
              <CheckCheck size={12} /> Acknowledge All
            </motion.button>
          )}
        </div>
      </div>

      {/* Count chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Unread',   value: counts.unread,   color: '#f59e0b' },
          { label: 'Critical', value: counts.critical, color: '#ef4444' },
          { label: 'Total',    value: counts.total,    color: '#3b82f6' },
        ].map(c => (
          <div key={c.label} style={{
            padding: '8px 16px',
            background: `${c.color}12`,
            border: `1px solid ${c.color}30`,
            borderRadius: 8,
            fontSize: 13,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}>
            <span style={{ color: c.color, fontWeight: 800, fontSize: 18 }}>{c.value}</span>
            <span style={{ color: '#64748b' }}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-6" style={{ padding: '12px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <Filter size={14} style={{ color: '#4b5e78' }} />
          <select className="form-select" style={{ width: 'auto' }} value={severity} onChange={e => setSeverity(e.target.value)}>
            {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Severities' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={type} onChange={e => setType(e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={ackFilter} onChange={e => setAck(e.target.value)}>
            <option value="all">All</option>
            <option value="unread">Unread Only</option>
            <option value="acknowledged">Acknowledged</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#4b5e78' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div>No alerts match your filters.</div>
        </div>
      ) : (
        <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence mode="popLayout">
            {alerts.map((a, index) => (
              <AlertRow key={a._id} alert={a} index={index} onAck={handleAck} onResolve={handleResolve} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </PageTransition>
  );
}
