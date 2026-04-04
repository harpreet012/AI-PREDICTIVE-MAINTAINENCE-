import { useEffect, useState, useCallback } from 'react';
import { maintenanceAPI, equipmentAPI } from '../services/api';
import { Plus, Calendar, CheckCircle, Clock, Wrench, Trash2, Edit } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import PageTransition from '../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_COLORS = {
  preventive: '#3b82f6', corrective: '#ef4444',
  predictive: '#8b5cf6', inspection: '#06b6d4', emergency: '#f97316',
};

const STATUS_COLORS = {
  scheduled: '#f59e0b', 'in-progress': '#3b82f6',
  completed: '#10b981', cancelled: '#64748b',
};

function LogRow({ log, index = 0, onDelete, onUpdate }) {
  const equip = log.equipmentId;
  const color = STATUS_COLORS[log.status] || '#64748b';
  const tc    = TYPE_COLORS[log.type]   || '#94a3b8';

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
    >
      <td style={{ color: '#f0f6ff', fontWeight: 500 }}>{equip?.name || 'Unknown'}</td>
      <td><span style={{ color: tc, fontWeight: 600, fontSize: 12,  textTransform: 'capitalize' }}>{log.type}</span></td>
      <td>{log.technician}</td>
      <td>{format(new Date(log.scheduledDate), 'dd MMM yyyy')}</td>
      <td>
        {log.completedDate
          ? format(new Date(log.completedDate), 'dd MMM yyyy')
          : <span style={{ color: '#4b5e78' }}>—</span>}
      </td>
      <td>{log.duration ? `${log.duration} min` : <span style={{ color: '#4b5e78' }}>—</span>}</td>
      <td>{log.cost ? `$${log.cost.toLocaleString()}` : <span style={{ color: '#4b5e78' }}>—</span>}</td>
      <td>
        <span style={{ padding: '3px 8px', background: `${color}18`, color, borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
          {log.status}
        </span>
      </td>
      <td>
        <span className={`risk-chip ${log.priority === 'critical' ? 'high' : log.priority === 'high' ? 'high' : log.priority === 'medium' ? 'medium' : 'low'}`}>
          {log.priority}
        </span>
      </td>
      <td>
        <motion.button 
          whileHover={{ scale: 1.1, backgroundColor: '#ef4444' }} 
          whileTap={{ scale: 0.9 }} 
          className="btn btn-danger btn-sm btn-icon" 
          style={{ padding: '4px 6px' }} 
          onClick={() => onDelete(log._id)}
        >
          <Trash2 size={11} />
        </motion.button>
      </td>
    </motion.tr>
  );
}

function AddLogModal({ equipment, onClose, onAdded }) {
  const [form, setForm] = useState({
    equipmentId: '', type: 'preventive', priority: 'medium',
    technician: '', scheduledDate: format(new Date(), 'yyyy-MM-dd'),
    description: '', cost: '', status: 'scheduled',
  });

  const handleChange = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await maintenanceAPI.create({
        ...form,
        scheduledDate: new Date(form.scheduledDate),
        cost: parseFloat(form.cost) || 0,
      });
      toast.success('Maintenance log created!');
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create log');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999, backdropFilter: 'blur(4px)',
    }}>
      <div className="card animate-fade-in" style={{ width: 520, maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="card-header">
          <div className="card-title">Schedule Maintenance</div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Equipment *</label>
            <select className="form-select" required value={form.equipmentId} onChange={e => handleChange('equipmentId', e.target.value)}>
              <option value="">Select equipment...</option>
              {equipment.map(eq => <option key={eq._id} value={eq._id}>{eq.name}</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select className="form-select" value={form.type} onChange={e => handleChange('type', e.target.value)}>
                {['preventive', 'corrective', 'predictive', 'inspection', 'emergency'].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => handleChange('priority', e.target.value)}>
                {['low', 'medium', 'high', 'critical'].map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Technician *</label>
              <input className="form-input" placeholder="Technician name" required value={form.technician} onChange={e => handleChange('technician', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Scheduled Date *</label>
              <input className="form-input" type="date" required value={form.scheduledDate} onChange={e => handleChange('scheduledDate', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Estimated Cost (USD)</label>
            <input className="form-input" type="number" placeholder="0" value={form.cost} onChange={e => handleChange('cost', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={3} placeholder="Describe the maintenance work..." value={form.description} onChange={e => handleChange('description', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Schedule</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  const [logs,      setLogs]      = useState([]);
  const [upcoming,  setUpcoming]  = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [costStats, setCostStats] = useState([]);

  const fetchAll = useCallback(async () => {
    try {
      const [logsRes, upRes, eqRes, costRes] = await Promise.all([
        maintenanceAPI.getAll({ limit: 60 }),
        maintenanceAPI.getUpcoming(),
        equipmentAPI.getAll(),
        maintenanceAPI.getCostStats(),
      ]);
      setLogs(logsRes.data.data);
      setUpcoming(upRes.data.data);
      setEquipment(eqRes.data.data);
      setCostStats(costRes.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id) => {
    await maintenanceAPI.delete(id);
    setLogs(prev => prev.filter(l => l._id !== id));
    toast.success('Log deleted');
  };

  const totalCost = logs.filter(l => l.status === 'completed').reduce((sum, l) => sum + (l.cost || 0), 0);
  const completed = logs.filter(l => l.status === 'completed').length;
  const scheduled = logs.filter(l => l.status === 'scheduled').length;

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <PageTransition>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Maintenance Planner</h2>
          <p>{scheduled} scheduled · {completed} completed · ${totalCost.toLocaleString()} total cost</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Schedule Maintenance
        </motion.button>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Scheduled',  value: scheduled,  icon: <Calendar size={18} />,      color: '#f59e0b' },
          { label: 'Completed',  value: completed,  icon: <CheckCircle size={18} />,   color: '#10b981' },
          { label: 'Total Jobs', value: logs.length, icon: <Wrench size={18} />,        color: '#3b82f6' },
          { label: 'Total Cost', value: `$${(totalCost/1000).toFixed(1)}k`, icon: <Clock size={18} />, color: '#8b5cf6' },
        ].map((s, i) => (
          <motion.div 
            key={s.label} 
            className="stat-card" 
            style={{ '--card-accent': s.color }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4, scale: 1.02 }}
          >
            <div className="stat-card-header">
              <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color }}>{s.icon}</div>
            </div>
            <div className="stat-value" style={{ fontSize: 26 }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <div className="card-title">Upcoming Scheduled Maintenance</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map((u, i) => (
              <motion.div 
                key={u._id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                whileHover={{ x: 4 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: 'rgba(59,130,246,0.05)',
                  border: '1px solid rgba(59,130,246,0.1)', borderRadius: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#f0f6ff', fontSize: 13 }}>{u.equipmentId?.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {u.type} · {u.technician} · {format(new Date(u.scheduledDate), 'dd MMM yyyy')}
                  </div>
                </div>
                <span className={`risk-chip ${u.priority === 'critical' || u.priority === 'high' ? 'high' : u.priority === 'medium' ? 'medium' : 'low'}`}>
                  {u.priority}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* All logs table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">All Maintenance Logs</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Type</th>
                <th>Technician</th>
                <th>Scheduled</th>
                <th>Completed</th>
                <th>Duration</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Priority</th>
                <th></th>
              </tr>
            </thead>
            <motion.tbody layout>
              <AnimatePresence>
                {logs.map((log, index) => (
                  <LogRow key={log._id} index={index} log={log} onDelete={handleDelete} />
                ))}
              </AnimatePresence>
            </motion.tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <AddLogModal equipment={equipment} onClose={() => setShowModal(false)} onAdded={fetchAll} />
      )}
    </PageTransition>
  );
}
