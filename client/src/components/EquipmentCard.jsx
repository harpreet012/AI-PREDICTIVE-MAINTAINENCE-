import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import GaugeMeter from './GaugeMeter';
import ConfirmModal from './ConfirmModal';
import { equipmentAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const TYPE_ICONS = {
  'Compressor':  '🔵',
  'Motor':       '⚡',
  'Pump':        '💧',
  'Turbine':     '🌀',
  'Generator':   '🔋',
  'Conveyor':    '📦',
  'CNC Machine': '⚙️',
  'Boiler':      '🔥',
  'Extruder':    '🏗️',
};

const STATUS_GLOW = {
  healthy:     '0 0 20px rgba(16,185,129,0.15)',
  warning:     '0 0 20px rgba(245,158,11,0.2)',
  critical:    '0 0 24px rgba(239,68,68,0.25)',
  offline:     'none',
  maintenance: '0 0 20px rgba(139,92,246,0.2)',
};

const STATUS_BORDER = {
  healthy:     'rgba(16,185,129,0.3)',
  warning:     'rgba(245,158,11,0.35)',
  critical:    'rgba(239,68,68,0.45)',
  offline:     'rgba(100,116,139,0.2)',
  maintenance: 'rgba(139,92,246,0.35)',
};

function SensorPill({ label, value, unit = '', warn = false, danger = false }) {
  const color = danger ? '#ef4444' : warn ? '#f59e0b' : '#94a3b8';
  return (
    <div className="sensor-pill" style={{ borderColor: danger ? 'rgba(239,68,68,0.3)' : warn ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.07)' }}>
      <span className="sensor-pill-val" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
        {value}{unit}
      </span>
      <span className="sensor-pill-lbl">{label}</span>
    </div>
  );
}

export default function EquipmentCard({ equipment, index = 0, onDeleted, canDelete = false }) {
  const navigate = useNavigate();
  const { liveReadings } = useSocket();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const live = liveReadings[equipment._id] || {};
  const healthScore = live.healthScore ?? equipment.healthScore ?? 100;
  const status      = live.status      ?? equipment.status      ?? 'healthy';
  const failureProb = live.failureProbability ?? equipment.failureProbability ?? 0;

  const handleDelete = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await equipmentAPI.delete(equipment._id);
      toast.success(`"${equipment.name}" removed`);
      onDeleted?.(equipment._id);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <motion.div
      className={`equipment-card-v2 ${status}`}
      style={{
        borderColor: STATUS_BORDER[status] || STATUS_BORDER.healthy,
        boxShadow: STATUS_GLOW[status] || STATUS_GLOW.healthy,
      }}
      onClick={() => navigate(`/equipment/${equipment._id}`)}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/equipment/${equipment._id}`)}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Animated top accent bar */}
      <div className="card-accent-bar" style={{
        background: status === 'critical' ? 'linear-gradient(90deg, #ef4444, #f97316)' :
                    status === 'warning'  ? 'linear-gradient(90deg, #f59e0b, #f97316)' :
                    status === 'healthy'  ? 'linear-gradient(90deg, #10b981, #06b6d4)' :
                    status === 'maintenance' ? 'linear-gradient(90deg, #8b5cf6, #3b82f6)' :
                    'linear-gradient(90deg, #64748b, #475569)'
      }} />

      {/* Top row */}
      <div className="eq-card-top">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
          <div className={`eq-type-icon ${status}`}>
            <span>{TYPE_ICONS[equipment.type] || '🔧'}</span>
            {status === 'critical' && <span className="eq-pulse-ring" />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="eq-name">{equipment.name}</div>
            <div className="eq-meta">{equipment.type} · {equipment.location}</div>
            {equipment.manufacturer && equipment.manufacturer !== 'Unknown' && (
              <div className="eq-meta" style={{ color: '#4b5e78' }}>{equipment.manufacturer} · {equipment.model}</div>
            )}
            {equipment.lastMaintenance && (
              <div className="eq-meta" style={{ marginTop: 2 }}>
                🔧 {formatDistanceToNow(new Date(equipment.lastMaintenance), { addSuffix: true })}
              </div>
            )}
          </div>
        </div>
        <span className={`status-badge ${status}`}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Gauge + Sensors Row */}
      <div className="eq-card-body">
        <GaugeMeter value={healthScore} size={90} label="Health" />

        <div className="eq-sensors-grid">
          {live.temperature != null && (
            <SensorPill label="Temp" value={live.temperature.toFixed(1)} unit="°" warn={live.temperature > 75} danger={live.temperature > 88} />
          )}
          {live.vibration != null && (
            <SensorPill label="Vib" value={live.vibration.toFixed(1)} unit=" mm/s" warn={live.vibration > 5} danger={live.vibration > 8} />
          )}
          {live.pressure != null && (
            <SensorPill label="Press" value={live.pressure.toFixed(0)} unit=" bar" warn={live.pressure > 120} danger={live.pressure > 140} />
          )}
          {live.rpm != null && (
            <SensorPill label="RPM" value={live.rpm.toFixed(0)} />
          )}
          {live.current != null && (
            <SensorPill label="Amps" value={live.current.toFixed(1)} unit="A" warn={live.current > 45} danger={live.current > 55} />
          )}
          {failureProb > 0 && (
            <SensorPill label="Risk" value={failureProb.toFixed(0)} unit="%" warn={failureProb > 30} danger={failureProb > 60} />
          )}
          {/* Imported data fields */}
          {equipment.mttf && (
            <SensorPill label="MTTF" value={equipment.mttf} unit="h" />
          )}
          {equipment.age && (
            <SensorPill label="Age" value={equipment.age} unit="yr" />
          )}
        </div>
      </div>

      {/* Failure warning banner */}
      {live.predictedFailureIn != null && live.predictedFailureIn < 72 && (
        <motion.div
          className="eq-failure-banner"
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ⚠️ Predicted failure in <strong>{live.predictedFailureIn}h</strong>
        </motion.div>
      )}

      {/* Bottom: operating hours / serial */}
      <div className="eq-card-footer">
        {equipment.operatingHours > 0 && (
          <span>⏱ {equipment.operatingHours.toLocaleString()} hrs</span>
        )}
        {equipment.serialNumber && (
          <span style={{ color: '#334155' }}>{equipment.serialNumber}</span>
        )}
        <span style={{ flex: 1 }} />
        {canDelete && (
          <motion.button
            className="eq-delete-btn"
            onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Delete equipment"
          >
            <Trash2 size={13} />
          </motion.button>
        )}
        <span className="eq-card-arrow">→</span>
      </div>

      {/* Confirm delete modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Delete Equipment"
        message={`Are you sure you want to remove "${equipment.name}"? This cannot be undone.`}
        confirmLabel={deleting ? 'Deleting…' : 'Yes, Delete'}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </motion.div>
  );
}
