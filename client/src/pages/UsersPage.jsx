import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/PageTransition';
import ConfirmModal from '../components/ConfirmModal';

const API = 'http://127.0.0.1:5000/api';

const ROLES = ['admin', 'operator', 'viewer'];
const ROLE_COLORS = { admin: '#f59e0b', operator: '#3b82f6', viewer: '#64748b' };
const ROLE_ICONS  = { admin: '👑', operator: '🔧', viewer: '👁️' };

function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer' });
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/users`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User created!');
      onCreated(data.data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal-card"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
      >
        <div className="modal-header">
          <h3>Add New User</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="John Smith" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="user@factory.com" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {ROLES.map(r => (
                <button key={r} type="button"
                  className={`role-chip ${form.role === r ? 'active' : ''}`}
                  style={{ '--rc': ROLE_COLORS[r] }}
                  onClick={() => setForm(f => ({ ...f, role: r }))}>
                  {ROLE_ICONS[r]} {r}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <motion.button type="submit" className="btn btn-primary" style={{ flex: 1 }}
              disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {loading ? 'Creating…' : 'Create User'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function UsersPage() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, userId: null, userName: '' });
  const { token, user: me, isAdmin } = useAuth();

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(data.data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleActive = async (id, current) => {
    try {
      await axios.patch(`${API}/users/${id}`, { isActive: !current }, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: !current } : u));
      toast.success('Status updated');
    } catch { toast.error('Update failed'); }
  };

  const changeRole = async (id, role) => {
    try {
      await axios.patch(`${API}/users/${id}`, { role }, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(prev => prev.map(u => u._id === id ? { ...u, role } : u));
      toast.success('Role updated');
    } catch { toast.error('Update failed'); }
  };

  const deleteUser = async (id) => {
    try {
      await axios.delete(`${API}/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(prev => prev.filter(u => u._id !== id));
      toast.success('User deleted');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Delete failed');
    } finally {
      setConfirm({ open: false, userId: null, userName: '' });
    }
  };

  if (!isAdmin) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h3>Admin Access Required</h3>
        <p style={{ color: '#64748b', marginTop: 8 }}>Only administrators can manage users.</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="page-header">
        <div className="page-header-left">
          <h2>User Management</h2>
          <p>Control who can access the dashboard</p>
        </div>
        <motion.button className="btn btn-primary" onClick={() => setShowAdd(true)}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
          + Add User
        </motion.button>
      </div>

      {/* Stats */}
      <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { label: 'Total Users', value: users.length, color: '#3b82f6' },
          { label: 'Admins',     value: users.filter(u => u.role === 'admin').length, color: '#f59e0b' },
          { label: 'Operators',  value: users.filter(u => u.role === 'operator').length, color: '#10b981' },
          { label: 'Active',     value: users.filter(u => u.isActive).length, color: '#8b5cf6' },
        ].map(s => (
          <motion.div key={s.label} className="stat-card" style={{ '--card-accent': s.color }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="stat-value" style={{ fontSize: 28, color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th><th>Role</th><th>Status</th><th>Last Login</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <motion.tr key={u._id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="user-avatar-sm">{u.name[0].toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f0f6ff' }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{u.email}</div>
                      </div>
                      {u._id === me?._id && <span style={{ fontSize: 10, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '2px 6px', borderRadius: 10 }}>You</span>}
                    </div>
                  </td>
                  <td>
                    <select
                      className="role-select"
                      value={u.role}
                      onChange={e => changeRole(u._id, e.target.value)}
                      disabled={u._id === me?._id}
                      style={{ color: ROLE_COLORS[u.role] }}>
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_ICONS[r]} {r}</option>)}
                    </select>
                  </td>
                  <td>
                    <button
                      className={`status-badge ${u.isActive ? 'healthy' : 'offline'}`}
                      onClick={() => u._id !== me?._id && toggleActive(u._id, u.isActive)}
                      style={{ cursor: u._id === me?._id ? 'default' : 'pointer', border: 'none', background: u.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                      {u.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    {u._id !== me?._id && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setConfirm({ open: true, userId: u._id, userName: u.name })}
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreated={u => setUsers(prev => [u, ...prev])} />}
      </AnimatePresence>

      <ConfirmModal
        open={confirm.open}
        title="Delete User"
        message={`Are you sure you want to permanently delete "${confirm.userName}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete"
        onConfirm={() => deleteUser(confirm.userId)}
        onCancel={() => setConfirm({ open: false, userId: null, userName: '' })}
      />
    </PageTransition>
  );
}
