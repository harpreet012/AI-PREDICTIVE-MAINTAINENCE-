import { useEffect, useState, useCallback } from 'react';
import { equipmentAPI } from '../services/api';
import EquipmentCard from '../components/EquipmentCard';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Filter, X } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const TYPES = ['All', 'Compressor', 'Motor', 'Pump', 'Turbine', 'Generator', 'Conveyor', 'CNC Machine', 'Boiler'];
const STATUSES = ['All', 'healthy', 'warning', 'critical', 'offline', 'maintenance'];
const EQUIPMENT_TYPES = ['Compressor', 'Pump', 'Motor', 'Turbine', 'Generator', 'Conveyor', 'CNC Machine', 'Boiler'];

const EMPTY_FORM = {
  name: '',
  type: 'Compressor',
  location: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  operatingHours: '',
};

// ── Add Equipment Modal ────────────────────────────────────────────────────────
function AddEquipmentModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.location.trim()) {
      toast.error('Name and Location are required');
      return;
    }
    setLoading(true);
    try {
      const { data } = await equipmentAPI.create({
        ...form,
        operatingHours: form.operatingHours ? Number(form.operatingHours) : 0,
      });
      if (data.success) {
        toast.success(`✅ "${data.data.name}" added to registry`);
        onCreated(data.data);
        onClose();
      } else {
        toast.error(data.error || 'Failed to add equipment');
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to add equipment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="modal-card"
        style={{ maxWidth: 520 }}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚙️</span>
            <h3>Add New Equipment</h3>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Row 1: Name + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">
                Equipment Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                className="form-input"
                placeholder="e.g. Compressor Unit A"
                value={form.name}
                onChange={set('name')}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type <span style={{ color: '#ef4444' }}>*</span></label>
              <select className="form-select" value={form.type} onChange={set('type')}>
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Location */}
          <div className="form-group">
            <label className="form-label">
              Location <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="form-input"
              placeholder="e.g. Plant A – Bay 3"
              value={form.location}
              onChange={set('location')}
              required
            />
          </div>

          {/* Row 3: Manufacturer + Model */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Manufacturer</label>
              <input
                className="form-input"
                placeholder="e.g. Siemens"
                value={form.manufacturer}
                onChange={set('manufacturer')}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Model</label>
              <input
                className="form-input"
                placeholder="e.g. SX-4000"
                value={form.model}
                onChange={set('model')}
              />
            </div>
          </div>

          {/* Row 4: Serial + Hours */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Serial Number</label>
              <input
                className="form-input"
                placeholder="e.g. SN-2024-001"
                value={form.serialNumber}
                onChange={set('serialNumber')}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Operating Hours</label>
              <input
                className="form-input"
                type="number"
                min="0"
                placeholder="0"
                value={form.operatingHours}
                onChange={set('operatingHours')}
              />
            </div>
          </div>

          {/* Info note */}
          <div style={{
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: '#93c5fd',
            marginBottom: 4,
          }}>
            ℹ️ Initial status will be <strong>Healthy</strong>. Sensor readings will update status automatically.
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <motion.button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ flex: 2 }}
            >
              {loading ? '⏳ Adding…' : '+ Add Equipment'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function EquipmentPage() {
  const [equipment, setEquipment]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [typeFilter, setType]       = useState('All');
  const [statusFilter, setStatus]   = useState('All');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showAdd, setShowAdd]       = useState(false);
  const { liveReadings }            = useSocket();
  const { isAdmin, user }           = useAuth();
  // Only admins and operators can add equipment
  const canAdd = user?.role === 'admin' || user?.role === 'operator';

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(id);
  }, [search]);

  // Fetch paginated equipment
  const fetchEquipment = useCallback(() => {
    setLoading(true);
    equipmentAPI.getAll({
      page,
      limit: 20,
      search: debouncedSearch,
      type: typeFilter,
      status: statusFilter,
    })
      .then((r) => {
        if (r.data.success) {
          setEquipment(r.data.data);
          setTotalPages(r.data.pages);
          setTotalCount(r.data.total);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, typeFilter, statusFilter]);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  // Inject real-time status into the fetched array
  const displayEquipment = equipment.map((e) => ({
    ...e,
    status: liveReadings[e._id]?.status || e.status,
  }));

  const handleCreated = (newEq) => {
    setEquipment((prev) => [newEq, ...prev]);
    setTotalCount((c) => c + 1);
  };

  const handleDeleted = (deletedId) => {
    setEquipment((prev) => prev.filter((e) => e._id !== deletedId));
    setTotalCount((c) => c - 1);
  };

  return (
    <PageTransition>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Equipment Registry</h2>
          <p>{totalCount} total assets registered (Page {page} of {totalPages})</p>
        </div>
        {canAdd && (
          <motion.button
            className="btn btn-primary"
            onClick={() => setShowAdd(true)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <Plus size={16} />
            Add Equipment
          </motion.button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-6" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#4b5e78' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 32 }}
              placeholder="Search by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={typeFilter}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
          >
            {TYPES.map((t) => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
          </select>
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && equipment.length === 0 ? (
        <div className="loading-spinner" style={{ minHeight: 300 }}><div className="spinner" /></div>
      ) : displayEquipment.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#4b5e78' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div>No equipment matches your filters.</div>
          {canAdd && (
            <motion.button
              className="btn btn-primary"
              style={{ marginTop: 20 }}
              onClick={() => setShowAdd(true)}
              whileHover={{ scale: 1.04 }}
            >
              + Add First Equipment
            </motion.button>
          )}
        </div>
      ) : (
        <>
          <motion.div layout className="equipment-grid">
            <AnimatePresence mode="popLayout">
              {displayEquipment.map((e, index) => (
                <EquipmentCard
                  key={e._id}
                  equipment={e}
                  index={index}
                  onDeleted={handleDeleted}
                  canDelete={canAdd}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 40, marginBottom: 20 }}>
              <button
                className="btn btn-secondary w-full"
                style={{ width: 120, padding: '8px 0' }}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                Page <strong style={{ color: '#f0f6ff' }}>{page}</strong> of {totalPages}
              </span>
              <button
                className="btn btn-secondary w-full"
                style={{ width: 120, padding: '8px 0' }}
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Equipment Modal */}
      <AnimatePresence>
        {showAdd && (
          <AddEquipmentModal
            onClose={() => setShowAdd(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
