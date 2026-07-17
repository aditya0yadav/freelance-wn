import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function LoginView({ handleLogin, loginInput, setLoginInput, loginPassword, setLoginPassword, loginLoading }) {
  const [showPassword, setShowPassword] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <div className="login-scene" style={{ position: 'relative' }}>
      {/* Floating Language Switcher */}
      <button
        onClick={toggleLanguage}
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--t1, #ffffff)',
          fontWeight: '700',
          fontSize: '11px',
          zIndex: 100
        }}
        title={language === 'en' ? '切换至中文' : 'Switch to English'}
      >
        {language === 'en' ? '中' : 'EN'}
      </button>
      {/* Decorative blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="login-box">
        {/* Brand */}
        <div className="login-brand">
          <div className="brand-mark">
            <img src="/images/logo.png" alt="Wanhong Survey" className="login-logo-img" />
          </div>
          <div>
            <h1 className="brand-name-lg" style={{ fontSize: '26px' }}>Wanhong Survey</h1>
            <p className="brand-sub" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>by XUZHOU WEIJINGJUYAN</p>
          </div>
        </div>

        {/* Card */}
        <div className="login-card">
          <div className="login-card-header">
            <h2>{t('memberLogin')}</h2>
            <p>{t('enterCredentials')}</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="field">
              <label htmlFor="member-id">
                {t('username')}
              </label>
              <div className="input-wrapper">
                <input
                  id="member-id"
                  type="text"
                  value={loginInput}
                  onChange={e => setLoginInput(e.target.value)}
                  placeholder={t('username') + '...'}
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
                {t('password')}
              </label>
              <div className="input-wrapper">
                <input
                  id="member-password"
                  className="password-field"
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder={t('password') + '...'}
                  required
                />
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? t('hidePassword') : t('showPassword')}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--t3)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <span className="field-hint">{t('defaultPasswordHint')}</span>
            </div>

            <button type="submit" className="btn-login" disabled={loginLoading}>
              {loginLoading ? (
                <><span className="spin-ring" /> {t('verifying')}</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                  {t('signInToDashboard')}
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            {t('accessManagedByAdmin')}
          </div>
        </div>
      </div>
    </div>
  );
}
