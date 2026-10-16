import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Shield, Globe, Play, Square, X,
  CheckCircle2, AlertCircle, Loader2, Settings, Layers
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getApiBaseUrl } from '../utils/api';

const COUNTRIES = [
  { code: 'US', en: 'United States', zh: '美国' },
  { code: 'GB', en: 'United Kingdom', zh: '英国' },
  { code: 'CA', en: 'Canada', zh: '加拿大' },
  { code: 'AU', en: 'Australia', zh: '澳大利亚' },
  { code: 'DE', en: 'Germany', zh: '德国' },
  { code: 'FR', en: 'France', zh: '法国' },
  { code: 'IT', en: 'Italy', zh: '意大利' },
  { code: 'ES', en: 'Spain', zh: '西班牙' },
  { code: 'JP', en: 'Japan', zh: '日本' },
  { code: 'IN', en: 'India', zh: '印度' },
  { code: 'BR', en: 'Brazil', zh: '巴西' },
  { code: 'MX', en: 'Mexico', zh: '墨西哥' }
];

export default function LaunchFingerprintModal({
  isOpen,
  onClose,
  project,
  isAdmin = false,
  token = ''
}) {
  const { language, t } = useLanguage();
  const [provider, setProvider] = useState('smart');
  const [country, setCountry] = useState('US');
  const [windowCount, setWindowCount] = useState(1);
  const [apiToken, setApiToken] = useState(() => localStorage.getItem('octo_api_token') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [launchStatusText, setLaunchStatusText] = useState('');
  const [launchResult, setLaunchResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setLaunchStatusText('');
      setLaunchResult(null);
    }
  }, [isOpen]);

  if (!isOpen || !project) return null;

  const handleSaveToken = (val) => {
    setApiToken(val);
    localStorage.setItem('octo_api_token', val);
  };

  const handleLaunch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setLaunchResult(null);

    const activeToken = token || (isAdmin ? localStorage.getItem('admin_token') : (localStorage.getItem('rs_token') || localStorage.getItem('token')));
    const apiBase = getApiBaseUrl();
    const baseUrl = isAdmin ? '/api/admin/platform' : '/api/member/platform';
    const endpoint = `${apiBase}${baseUrl}/fingerprint/launch`;

    const headers = { 'Content-Type': 'application/json' };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const isDesktopApp = typeof window !== 'undefined' && Boolean(window.desktopApp?.isDesktop);
    if (isDesktopApp) {
      headers['X-Client-Platform'] = 'desktop';
    }

    setLaunchStatusText(language === 'zh' ? '正在生成指纹环境与住宅代理...' : 'Creating fingerprint profile & proxy on server...');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          project_pno: project.project_pno,
          project_id: project.project_id,
          provider,
          country,
          window_count: Number(windowCount) || 1,
          api_token: apiToken,
          is_desktop: isDesktopApp
        })
      });

      const res = await response.json();
      if (res.code === 200 && res.data) {
        setLaunchResult(res.data);

        // Client-side start fallback (essential when backend is hosted remotely on VPS)
        const pendingWindows = res.data.windows?.filter(w => w.needClientStart) || [];
        if (pendingWindows.length > 0) {
          setLaunchStatusText(language === 'zh' ? '正在本地 Octo 客户端启动浏览器窗口...' : 'Launching window in local Octo browser...');
        }

        for (const w of pendingWindows) {
          try {
            if (typeof window !== 'undefined' && window.desktopApp?.startOctoProfile) {
              await window.desktopApp.startOctoProfile({
                uuid: w.profileUuid,
                targetUrl: w.targetUrl
              });
            } else {
              // Direct local client start fallback (port 4666 / 46666 / 58888)
              const ports = [4666, 46666, 58888, 50888];
              for (const port of ports) {
                try {
                  await fetch(`http://127.0.0.1:${port}/api/profiles/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      uuid: w.profileUuid,
                      headless: false,
                      debug_port: true,
                      timeout: 120,
                      flags: w.targetUrl ? [w.targetUrl, '--start-maximized'] : ['--start-maximized']
                    })
                  });
                  break;
                } catch (e) {}
              }
            }
          } catch (clientErr) {
            console.warn('[Desktop Client Launch Notice]', clientErr);
          }
        }
        setLaunchStatusText('');
      } else {
        setErrorMsg(res.msg || t('failedLaunch'));
      }
    } catch (err) {
      setErrorMsg(err.message || t('networkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleStopProfile = async (profileUuid) => {
    // 1. If in desktop app, also trigger local force_stop
    if (typeof window !== 'undefined' && window.desktopApp?.stopOctoProfile) {
      window.desktopApp.stopOctoProfile({ uuid: profileUuid }).catch(() => {});
    }

    const activeToken = token || (isAdmin ? localStorage.getItem('admin_token') : (localStorage.getItem('rs_token') || localStorage.getItem('token')));
    const apiBase = getApiBaseUrl();
    const baseUrl = isAdmin ? '/api/admin/platform' : '/api/member/platform';
    try {
      await fetch(`${apiBase}${baseUrl}/fingerprint/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken && { 'Authorization': `Bearer ${activeToken}` })
        },
        body: JSON.stringify({ profile_uuid: profileUuid })
      });

      setLaunchResult(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          windows: prev.windows.map(w => w.profileUuid === profileUuid ? { ...w, status: 'stopped' } : w)
        };
      });
    } catch (err) {
      alert(`Error stopping profile: ${err.message}`);
    }
  };

  const isLight = typeof document !== 'undefined' && (
    document.documentElement.classList.contains('light') ||
    document.body.classList.contains('light') ||
    document.querySelector('.root.light') !== null ||
    (!isAdmin && !document.querySelector('.root:not(.light)'))
  );

  const modalContent = (
    <div className={`modal-overlay ${isLight ? 'light' : ''}`} onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="fp-modal-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="fp-modal-header">
          <div className="fp-modal-title-wrap">
            <div className="fp-icon-badge">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="fp-modal-title">{t('launchFingerprint')}</h3>
              <p className="fp-modal-subtitle">{t('fingerprintSub')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="modal-close"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="fp-modal-body">
          {/* Project Details Card */}
          <div className="fp-project-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--blue)' }}>
                {t('targetProject')}
              </span>
              <span className="fp-project-pno-tag">
                {project.project_pno}
              </span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)', marginBottom: '8px', lineHeight: 1.4 }}>
              {project.project_name || project.project_pno}
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--t2)' }}>
              <span>{t('payoutLabel')}: <strong style={{ color: '#10b981' }}>${Number(project.project_cpi || 0).toFixed(2)}</strong></span>
              <span>{t('loiLabel')}: <strong>{project.project_loi || 15}m</strong></span>
              <span>{t('irLabel')}: <strong>{project.project_ir || 50}%</strong></span>
            </div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', fontSize: '11.5px', color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, color: 'var(--blue)' }}>Start Page:</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px', opacity: 0.85 }}>
                {project.project_click_url || `Auto-generated link [${project.project_pno}]`}
              </span>
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleLaunch} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Proxy Provider Choice */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--t1)' }}>
                {t('proxyProvider')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div
                  onClick={() => setProvider('smart')}
                  className={`fp-provider-card ${provider === 'smart' ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--t1)' }}>Smart (ipipbright)</span>
                    {provider === 'smart' && <CheckCircle2 size={16} color="var(--blue)" />}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--t2)' }}>
                    sp.ipipbright.net:1000
                  </span>
                </div>

                <div
                  onClick={() => setProvider('koo')}
                  className={`fp-provider-card ${provider === 'koo' ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--t1)' }}>Koo (Kookeey)</span>
                    {provider === 'koo' && <CheckCircle2 size={16} color="var(--blue)" />}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--t2)' }}>
                    gate.kookeey.info:1000
                  </span>
                </div>
              </div>
            </div>

            {/* Target Country & Window Count Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--t1)' }}>
                  {t('targetCountry')}
                </label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="fp-select"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>
                      [{c.code}] {language === 'zh' ? c.zh : c.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--t1)' }}>
                  {t('windowCount')}
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[1, 2, 3, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setWindowCount(n)}
                      className={`fp-window-pill ${windowCount === n ? 'active' : ''}`}
                    >
                      {n}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={windowCount}
                    onChange={e => setWindowCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="fp-input"
                    style={{ width: '50px', textAlign: 'center', padding: '6px', fontWeight: 700 }}
                  />
                </div>
              </div>
            </div>

            {/* Collapsible Advanced Settings */}
            <div>
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--t2)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <Settings size={14} />
                <span>{showSettings ? t('hideSettings') : t('advancedSettings')}</span>
              </button>

              {showSettings && (
                <div style={{
                  marginTop: '10px',
                  padding: '12px 14px',
                  borderRadius: 'var(--r-sm)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <label style={{ fontSize: '11px', color: 'var(--t2)', fontWeight: 600 }}>
                    {t('octoTokenLabel')}
                  </label>
                  <input
                    type="password"
                    placeholder={t('octoTokenPlaceholder')}
                    value={apiToken}
                    onChange={e => handleSaveToken(e.target.value)}
                    className="fp-input"
                    style={{ fontSize: '12px' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
                    {t('localPortNotice')}
                  </span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: '10px 14px',
                borderRadius: 'var(--r-sm)',
                fontSize: '13px',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="fp-btn-launch"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t('launchingWindows').replace('{count}', windowCount)}</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>
                    {windowCount === 1
                      ? t('launchButtonSingle')
                      : t('launchButton').replace('{count}', windowCount)}
                  </span>
                </>
              )}
            </button>

            {loading && launchStatusText && (
              <div style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                color: '#60a5fa',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Loader2 size={14} className="animate-spin" />
                <span>{launchStatusText}</span>
              </div>
            )}
          </form>

          {/* Launch Output / Active Windows List */}
          {launchResult && (
            <div className="fp-result-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} />
                  {t('windowsLaunchedCount')
                    .replace('{success}', launchResult.successCount)
                    .replace('{total}', launchResult.requestedCount)}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--t2)' }}>
                  {t('countryProvider')
                    .replace('{country}', launchResult.country)
                    .replace('{provider}', launchResult.provider)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {launchResult.windows.map(w => (
                  <div
                    key={w.index}
                    className="fp-window-item"
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--t1)' }}>
                        {t('windowItem').replace('{index}', w.index)}{' '}
                        {w.status === 'stopped' && (
                          <span style={{ color: '#ef4444', fontSize: '11px' }}>{t('stoppedTag')}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--t2)' }}>
                        Proxy: {w.proxy}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {w.profileUuid && w.status !== 'stopped' && (
                        <button
                          onClick={() => handleStopProfile(w.profileUuid)}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontFamily: 'inherit',
                            fontWeight: 600
                          }}
                        >
                          <Square size={10} /> {t('stopBtn')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
