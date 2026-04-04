import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [step, setStep] = useState(1); // 1 = form, 2 = success
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.name.trim()) return setErrorMsg('Please enter your full name.');
    if (!form.email.trim()) return setErrorMsg('Please enter your email address.');
    if (form.password.length < 6) return setErrorMsg('Password must be at least 6 characters.');
    if (form.password !== form.confirm) return setErrorMsg('Passwords do not match.');

    setLoading(true);
    try {
      const data = await register(form.name.trim(), form.email.trim(), form.password);
      if (data.success) {
        setStep(2);
        toast.success('Account created! Redirecting to login…');
        setTimeout(() => navigate('/login'), 2200);
      } else {
        const msg = data.error || 'Registration failed. Please try again.';
        setErrorMsg(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        (err?.code === 'ERR_NETWORK'
          ? 'Cannot reach server. Is it running on port 5000?'
          : 'Registration failed. Please try again.');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const strengthScore = (() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strengthScore];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#eab308', '#10b981', '#06b6d4'][strengthScore];

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg">
        <div className="orb orb-1" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)' }} />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-overlay" />
      </div>

      <motion.div
        className="login-card"
        style={{ maxWidth: 440 }}
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

        {/* Success state */}
        <AnimatePresence mode="wait">
          {step === 2 ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '32px 0' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                style={{ fontSize: 64, marginBottom: 16 }}
              >
                ✅
              </motion.div>
              <h2 style={{ color: '#10b981', marginBottom: 8 }}>Account Created!</h2>
              <p style={{ color: '#64748b', fontSize: 13 }}>
                Redirecting you to login…
              </p>
              <div className="login-spinner" style={{ margin: '24px auto 0', opacity: 0.6 }} />
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="login-header">
                <h2>Create Account</h2>
                <p>Register to access the maintenance dashboard</p>
              </div>

              <form onSubmit={handleSubmit} className="login-form">
                {/* Name */}
                <div className="login-field">
                  <label>Full Name</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">👤</span>
                    <input
                      type="text"
                      placeholder="John Smith"
                      value={form.name}
                      onChange={set('name')}
                      autoComplete="name"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="login-field">
                  <label>Email Address</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">📧</span>
                    <input
                      type="email"
                      placeholder="you@factory.com"
                      value={form.email}
                      onChange={set('email')}
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="login-field">
                  <label>Password</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">🔒</span>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={form.password}
                      onChange={set('password')}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="login-toggle-pass"
                      onClick={() => setShowPass((s) => !s)}
                    >
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {form.password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{ marginTop: 6 }}
                    >
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: 3,
                              borderRadius: 2,
                              background: i <= strengthScore ? strengthColor : 'rgba(255,255,255,0.08)',
                              transition: 'background 0.3s',
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: 11, color: strengthColor, fontWeight: 600 }}>
                        {strengthLabel}
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="login-field">
                  <label>Confirm Password</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">🔑</span>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={form.confirm}
                      onChange={set('confirm')}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="login-toggle-pass"
                      onClick={() => setShowConfirm((s) => !s)}
                    >
                      {showConfirm ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {form.confirm && form.password !== form.confirm && (
                    <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>
                      ✗ Passwords do not match
                    </span>
                  )}
                  {form.confirm && form.password === form.confirm && form.confirm.length >= 6 && (
                    <span style={{ fontSize: 11, color: '#10b981', marginTop: 4, display: 'block' }}>
                      ✓ Passwords match
                    </span>
                  )}
                </div>

                {/* Error */}
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
                      <span>Create Account</span>
                      <span>→</span>
                    </>
                  )}
                </motion.button>
              </form>

              {/* Link to Login */}
              <div className="login-footer" style={{ marginTop: 20, flexDirection: 'column', gap: 8 }}>
                <span style={{ color: '#4b5e78', fontSize: 13 }}>
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    style={{ color: '#63b3ed', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Sign In
                  </Link>
                </span>
                <span style={{ fontSize: 11, color: '#334155' }}>🔐 Secured with JWT · bcrypt</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
