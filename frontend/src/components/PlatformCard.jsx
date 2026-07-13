import React from 'react';

export function PlatformLogo({ sign, name, theme }) {
  if (sign === 'Bitlabs' || sign === 'BitLabs') return (
    <div className="logo-bitlabs">
      <span style={{ fontSize: 28 }}>🧪</span>
      <div>
        <div className="bitlabs-main">BitLabs</div>
        <div className="bitlabs-sub">by prodege</div>
      </div>
    </div>
  );

  if (sign === 'MarketXcel') return (
    <div className="logo-text-block">
      <span style={{ color: '#2563eb' }}>market</span><span style={{ color: '#ea580c' }}>xcel</span>
    </div>
  );

  if (sign === 'Gowebsurveys' || sign === 'GoWebSurveys') return (
    <div className="logo-text-block" style={{ flexDirection: 'column', gap: 4 }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
      <span style={{ color: 'var(--t1)', fontSize: 11 }}>GoWebSurveys</span>
    </div>
  );

  if (sign === 'Zamplia') return (
    <div style={{ textAlign: 'center', color: 'var(--t1)' }}>
      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: '0.06em' }}>ZAMPLIA</div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', opacity: 0.8, marginTop: 2 }}>SAMPLE MADE SIMPLE</div>
    </div>
  );

  if (sign === 'mirat') return (
    <div style={{ color: 'var(--t1)', fontFamily: 'Outfit, sans-serif', textAlign: 'center' }}>
      <span style={{ fontWeight: 800, fontSize: 15 }}>MIRATS</span>
      <span style={{ fontWeight: 300, fontSize: 15 }}> Insights</span>
    </div>
  );

  // Generic fallback: large initial letter
  return (
    <div className="logo-initial" style={{ color: theme.accent }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function PlatformCard({ platform: p, isWall, onClick, onCopy }) {
  const name = p.platform_name || '';

  // Generate a consistent color from the platform name
  const colorMap = {
    'Bitlabs': { bg: 'var(--bg-3)', accent: '#a855f7', label: 'var(--t2)' },
    'BitLabs': { bg: 'var(--bg-3)', accent: '#a855f7', label: 'var(--t2)' },
    'MarketXcel': { bg: 'var(--bg-3)', accent: '#3b82f6', label: 'var(--t2)' },
    'Gowebsurveys': { bg: 'var(--bg-3)', accent: 'var(--blue)', label: 'var(--t2)' },
    'GoWebSurveys': { bg: 'var(--bg-3)', accent: 'var(--blue)', label: 'var(--t2)' },
    'Zamplia': { bg: 'var(--bg-3)', accent: '#fb923c', label: 'var(--t2)' },
    'mirat': { bg: 'var(--bg-3)', accent: '#ef4444', label: 'var(--t2)' },
    'TNB': { bg: 'var(--bg-3)', accent: '#06b6d4', label: 'var(--t2)' },
  };

  const theme = colorMap[p.platform_sign] || colorMap[name] || {
    bg: 'var(--bg-3)',
    accent: 'var(--blue)',
    label: 'var(--t2)'
  };

  return (
    <div
      className="platform-card"
      style={{
        '--card-bg': theme.bg,
        '--card-accent': theme.accent,
        '--card-label': theme.label,
        aspectRatio: isWall ? '1' : 'auto',
        minHeight: isWall ? 'auto' : '190px',
        padding: isWall ? '20px 16px 14px' : '14px 14px 10px'
      }}
      onClick={onClick}
    >
      {/* Copy overlay for walls */}
      {isWall && onCopy && (
        <button className="card-copy-btn" onClick={(e) => { e.stopPropagation(); onCopy(); }} title="Copy wall link">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
        </button>
      )}

      {/* Logo area */}
      <div className="card-logo-zone">
        {p.platform_image ? (
          <img src={p.platform_image} alt={name} className="card-img" />
        ) : (
          <PlatformLogo sign={p.platform_sign} name={name} theme={theme} />
        )}
      </div>

      {/* Name chip at bottom */}
      <div className="card-footer-name">{name}</div>

      {/* Survey info details */}
      {!isWall && (
        <div className="card-survey-details" style={{ flexDirection: 'column', gap: 4, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span className="card-survey-count">
              {p.survey_count || 0} surveys
            </span>
            <span className="card-survey-payout">
              Earn up to {p.max_cpi || 0}c
            </span>
          </div>
          {(p.create_time || p.update_time) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', opacity: 0.5, borderTop: '1px dashed var(--border)', paddingTop: 4, marginTop: 4 }}>
              {p.create_time ? <span>C: {new Date(p.create_time).toLocaleDateString()}</span> : <span />}
              {p.update_time ? <span>U: {new Date(p.update_time).toLocaleDateString()}</span> : <span />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
