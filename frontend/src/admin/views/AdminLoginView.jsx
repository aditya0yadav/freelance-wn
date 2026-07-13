import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { adminFetch, setAdminSession } from '../utils/adminApi';

export default function AdminLoginView({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ensure login page always shows in light mode regardless of saved theme
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter your credentials.');
      return;
    }
    setLoading(true);
    try {
      const res = await adminFetch('/login', 'POST', { username: username.trim(), password: password.trim() });
      if (res.code === 200) {
        setAdminSession(res.data.token, res.data.user);
        // Call parent callback if provided, otherwise navigate directly
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          navigate('/admin/dashboard', { replace: true });
        }
      } else {
        setError(res.msg || 'Login failed.');
      }
    } catch (err) {
      setError(err.message || 'Connection error. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-theme">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .admin-login-root {
          display: flex;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          background: #ffffff;
        }

        /* ===== LEFT PANEL ===== */
        .login-left {
          width: 52%;
          background: linear-gradient(145deg, #0a5c3e 0%, #137047 40%, #1a9460 80%, #22c55e 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          position: relative;
          overflow: hidden;
        }

        .login-left::before {
          content: '';
          position: absolute;
          top: -120px;
          right: -120px;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .login-left::after {
          content: '';
          position: absolute;
          bottom: -80px;
          left: -80px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
        }

        .login-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 2;
          position: relative;
        }

        .login-brand-icon {
          width: 44px;
          height: 44px;
          background: rgba(255,255,255,0.18);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.25);
        }

        .login-brand-text {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.3px;
        }

        .login-brand-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.65);
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .login-hero {
          z-index: 2;
          position: relative;
        }

        .login-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.22);
          border-radius: 999px;
          padding: 5px 12px;
          font-size: 11.5px;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          margin-bottom: 20px;
          backdrop-filter: blur(8px);
        }

        .login-hero-badge span.dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #86efac;
          display: inline-block;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .login-hero h1 {
          font-size: 42px;
          font-weight: 900;
          color: #ffffff;
          line-height: 1.12;
          letter-spacing: -1.2px;
          margin-bottom: 16px;
        }

        .login-hero h1 span {
          color: #86efac;
        }

        .login-hero p {
          font-size: 15px;
          color: rgba(255,255,255,0.7);
          line-height: 1.65;
          max-width: 380px;
          font-weight: 400;
        }

        .login-features {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 36px;
        }

        .login-feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: rgba(255,255,255,0.85);
          font-weight: 500;
        }

        .login-feature-icon {
          width: 22px;
          height: 22px;
          background: rgba(134, 239, 172, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .login-footer-quote {
          z-index: 2;
          position: relative;
        }

        .login-footer-quote p {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          font-style: italic;
          line-height: 1.6;
          border-left: 2px solid rgba(255,255,255,0.2);
          padding-left: 14px;
        }

        /* ===== RIGHT PANEL ===== */
        .login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
          background: #fafafa;
          position: relative;
        }

        .login-right::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #16a34a, #22c55e, #86efac);
        }

        .login-form-box {
          width: 100%;
          max-width: 400px;
        }

        .login-form-header {
          margin-bottom: 36px;
        }

        .login-form-header h2 {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.6px;
          margin-bottom: 6px;
        }

        .login-form-header p {
          font-size: 14px;
          color: #64748b;
          font-weight: 400;
        }

        .login-input-group {
          margin-bottom: 18px;
        }

        .login-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
          letter-spacing: -0.1px;
        }

        .login-input-wrap {
          position: relative;
        }

        .login-input {
          width: 100%;
          padding: 12px 16px;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          color: #0f172a;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s ease;
          box-sizing: border-box;
          outline: none;
        }

        .login-input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
          background: #fff;
        }

        .login-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        .login-input-icon-right {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 0;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }

        .login-input-icon-right:hover {
          color: #16a34a;
        }

        .login-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 18px;
          font-size: 13px;
          color: #dc2626;
          font-weight: 500;
          line-height: 1.4;
        }

        .login-submit-btn {
          width: 100%;
          padding: 13px 20px;
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);
          letter-spacing: -0.2px;
          margin-top: 4px;
        }

        .login-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(22, 163, 74, 0.45);
          background: linear-gradient(135deg, #15803d 0%, #166534 100%);
        }

        .login-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-spinner {
          width: 17px;
          height: 17px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .login-divider {
          text-align: center;
          margin: 28px 0 0;
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }

        .login-default-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 10px 14px;
          margin-top: 20px;
          font-size: 12.5px;
          color: #166534;
          font-weight: 500;
        }

        @media (max-width: 900px) {
          .login-left { display: none; }
          .login-right { padding: 32px 24px; background: #fff; }
          .login-right::before { height: 4px; }
        }
      `}</style>

      <div className="admin-login-root">
        {/* LEFT PANEL */}
        <div className="login-left">
          {/* Brand */}
          <div className="login-brand">
            <div className="login-brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white"/>
                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="login-brand-text">XUZHOU WEIJINGJUYAN</div>
              <div className="login-brand-sub">Admin Portal</div>
            </div>
          </div>

          {/* Hero */}
          <div className="login-hero">
            <div className="login-hero-badge">
              <span className="dot" />
              System Operational
            </div>
            <h1>
              Control &<br/>
              <span>Grow</span> Your<br/>
              Survey Network
            </h1>
            <p>
              A unified dashboard to manage platforms, publishers, surveys, and real-time analytics — all from one secure place.
            </p>
            <div className="login-features">
              {[
                'Live survey completion analytics',
                'Multi-platform provider management',
                'Team authorization & payout splits',
                'Fraud detection & speeder flags',
              ].map((f) => (
                <div key={f} className="login-feature-item">
                  <div className="login-feature-icon">
                    <CheckCircle2 size={13} color="#86efac" />
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Footer quote */}
          <div className="login-footer-quote">
            <p>&ldquo;Data-driven decisions start with clean, organized survey infrastructure.&rdquo;</p>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="login-right">
          <div className="login-form-box">
            <div className="login-form-header">
              <h2>Welcome back</h2>
              <p>Sign in to access the admin control panel</p>
            </div>

            {error && (
              <div className="login-error">
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="login-input-group">
                <label className="login-label">Admin Username</label>
                <div className="login-input-wrap">
                  <input
                    type="text"
                    className="login-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="管理"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="login-input-group">
                <label className="login-label">Password</label>
                <div className="login-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    className="login-input-icon-right"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="login-spinner" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="login-default-hint">
              <CheckCircle2 size={14} color="#16a34a" style={{ flexShrink: 0 }} />
              Default credentials: <strong>管理</strong> / <strong>123456</strong>
            </div>

            <div className="login-divider">
              Protected system · Unauthorized access is prohibited
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
