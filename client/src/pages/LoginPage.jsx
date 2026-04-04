import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const DEMO_USERS = [
  { label: 'Admin',    email: 'admin@factory.com',    password: 'Admin@1234', color: '#3b82f6' },
  { label: 'Operator', email: 'operator@factory.com', password: 'Op@1234',    color: '#10b981' },
];

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      if (data.success) {
        toast.success(`Welcome back, ${data.user.name}! 👋`);
        navigate('/');
      } else {
        const msg = data.error || 'Login failed. Please check your credentials.';
        setErrorMsg(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        (err?.code === 'ERR_NETWORK' ? 'Cannot reach server. Is it running on port 5000?' : 'Login failed. Check your credentials.');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (user) => {
    setEmail(user.email);
    setPassword(user.password);
    setErrorMsg('');
  };

  return (
    <div className="login-page">
      {/* Animated background orbs */}
      <div className="login-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-overlay" />
      </div>

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">🏭</div>
          <div>
            <h1 className="login-brand">PredictMaint AI</h1>
            <p className="login-brand-sub">Industrial Intelligence Platform</p>
          </div>
        </div>

        <div className="login-divider" />

        <div className="login-header">
          <h2>Sign In</h2>
          <p>Access your maintenance dashboard</p>
        </div>

        {/* Quick-fill buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {DEMO_USERS.map(u => (
            <motion.button
              key={u.label}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => fillCredentials(u)}
              style={{
                flex: 1,
                padding: '7px 0',
                borderRadius: 8,
                border: `1px solid ${u.color}44`,
                background: `${u.color}11`,
                color: u.color,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: 0.3,
              }}
            >
              Quick Fill: {u.label}
            </motion.button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>Email Address</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">📧</span>
              <input
                type="email"
                placeholder="admin@factory.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          <div className="login-field">
            <label>Password</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">🔒</span>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrorMsg(''); }}
                autoComplete="current-password"
                disabled={loading}
              />
              <button type="button" className="login-toggle-pass" onClick={() => setShowPass(s => !s)}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Inline error message */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                style={{
                  background: 'rgba(239,68,68,0.10)',
                  border: '1px solid rgba(239,68,68,0.30)',
                  borderRadius: 8,
                  padding: '9px 12px',
                  fontSize: 12,
                  color: '#fca5a5',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            className="login-btn"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              <>
                <span>Sign In</span>
                <span>→</span>
              </>
            )}
          </motion.button>
        </form>

        <div className="login-hint" style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 4 }}>Default credentials: <code>admin@factory.com / Admin@1234</code></p>
          <p style={{ marginTop: 8 }}>
            New here?{' '}
            <Link to="/register" style={{ color: '#63b3ed', fontWeight: 600, textDecoration: 'none' }}>
              Create an account
            </Link>
          </p>
        </div>

        <div className="login-footer">
          <span>🔐 Secured with JWT · AES-256</span>
        </div>
      </motion.div>
    </div>
  );
}
