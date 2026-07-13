import React from 'react';

export default function LoginView({ handleLogin, loginInput, setLoginInput, loginPassword, setLoginPassword, loginLoading }) {
  return (
    <div className="login-scene">
      {/* Decorative blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="login-box">
        {/* Brand */}
        <div className="login-brand">
          <div className="brand-mark">
            <img src="/images/logo.png" alt="XUZHOU WEIJINGJUYAN TECHNOLOGY CO.,LTD" className="login-logo-img" />
          </div>
          <div>
            <h1 className="brand-name-lg">XUZHOU WEIJINGJUYAN</h1>
            <p className="brand-sub">Survey & Offerwall Portal</p>
          </div>
        </div>

        {/* Card */}
        <div className="login-card">
          <div className="login-card-header">
            <h2>Member Login</h2>
            <p>Enter your credentials to access the platform dashboard.</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="field">
              <label htmlFor="member-id">
                Member Nickname
              </label>
              <div className="input-wrapper">
                <input
                  id="member-id"
                  type="text"
                  value={loginInput}
                  onChange={e => setLoginInput(e.target.value)}
                  placeholder="Enter your nickname..."
                  autoComplete="off"
                  required
                  autoFocus
                />
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </div>

            <div className="field">
              <label htmlFor="member-password">
                Member Password
              </label>
              <div className="input-wrapper">
                <input
                  id="member-password"
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Enter your password..."
                  required
                />
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <span className="field-hint">Default password is 123456</span>
            </div>

            <button type="submit" className="btn-login" disabled={loginLoading}>
              {loginLoading ? (
                <><span className="spin-ring" /> Verifying...</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                  Sign In to Dashboard
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Access is managed by your team administrator
          </div>
        </div>
      </div>
    </div>
  );
}
