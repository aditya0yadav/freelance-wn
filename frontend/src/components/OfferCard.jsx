import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

// Country flag emoji lookup by currency code (common codes)
const CURRENCY_FLAGS = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', CNY: '🇨🇳', JPY: '🇯🇵',
  AUD: '🇦🇺', CAD: '🇨🇦', INR: '🇮🇳', BRL: '🇧🇷', MXN: '🇲🇽',
  SGD: '🇸🇬', HKD: '🇭🇰', KRW: '🇰🇷', TWD: '🇹🇼', THB: '🇹🇭',
  MYR: '🇲🇾', IDR: '🇮🇩', PHP: '🇵🇭', VND: '🇻🇳', ZAR: '🇿🇦',
  RUB: '🇷🇺', TRY: '🇹🇷', SAR: '🇸🇦', AED: '🇦🇪', SEK: '🇸🇪',
  NOK: '🇳🇴', DKK: '🇩🇰', CHF: '🇨🇭', PLN: '🇵🇱', CZK: '🇨🇿',
};

export default function OfferCard({ offer, onStart, onSpecs, onCopyLink, showUSD = false }) {
  const { language } = useLanguage();
  const [copyState, setCopyState] = useState('idle'); // idle | loading | copied

  const loi = offer.project_loi ? `${offer.project_loi} min` : '—';
  const ir = offer.project_ir ? `${offer.project_ir}%` : '—';
  const coins = Number(offer.project_cpi || 0);
  // USD value: coins ÷ currency_coins rate (how many coins per 1 USD)
  const currencyCoins = Number(offer.currency_coins || 100);
  const usdValue = (coins / currencyCoins).toFixed(4);
  const currencyCode = offer.currency_code || 'USD';
  const countryFlag = CURRENCY_FLAGS[currencyCode] || '🌐';

  const getRelativeTime = (timeStr) => {
    if (!timeStr) return null;
    const diff = new Date() - new Date(timeStr);
    if (diff < 0) return new Date(timeStr).toLocaleDateString();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return language === 'en' ? 'Just now' : '刚刚';
    if (mins < 60) return `${mins}m ago`;
    return new Date(timeStr).toLocaleDateString();
  };

  const isRecent = offer.update_time && (new Date() - new Date(offer.update_time)) < 10 * 60 * 1000;
  const createdDisplay = getRelativeTime(offer.create_time);
  const updatedDisplay = getRelativeTime(offer.update_time);

  const handleCopy = async () => {
    if (!onCopyLink || copyState === 'loading') return;
    setCopyState('loading');
    const success = await onCopyLink(offer.project_pno);
    setCopyState(success ? 'copied' : 'idle');
    if (success) setTimeout(() => setCopyState('idle'), 2000);
  };

  return (
    <div className="offer-row">
      <div className="offer-row-info">
        <div className="offer-row-name" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span>{offer.project_name || 'Survey Campaign'}</span>
          {isRecent && (
            <span style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '9px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              textTransform: 'uppercase'
            }}>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981' }} />
              NEW
            </span>
          )}
          {/* Country / Currency badge */}
          <span style={{
            background: 'rgba(99, 102, 241, 0.08)',
            color: 'var(--t2)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            padding: '1px 7px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            {countryFlag} {currencyCode}
          </span>
        </div>
        <div className="offer-row-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <span>⏱ {loi}</span>
          <span>📊 {ir} IR</span>
          <span className="offer-pno">{offer.project_pno}</span>
          {(createdDisplay || updatedDisplay) && (
            <span style={{ opacity: 0.6, fontSize: '11.5px' }}>
              {createdDisplay && `C: ${createdDisplay}`}
              {updatedDisplay && ` | U: ${updatedDisplay}`}
            </span>
          )}
        </div>
      </div>
      <div className="offer-row-right">
        <div className="offer-coins">
          {showUSD ? (
            <>
              <span className="offer-coins-num" style={{ fontSize: '13px' }}>+${usdValue}</span>
              <span className="offer-coins-lbl">USD</span>
            </>
          ) : (
            <>
              <span className="offer-coins-num">+{Math.round(coins)}</span>
              <span className="offer-coins-lbl">{language === 'en' ? 'coins' : '金币'}</span>
            </>
          )}
        </div>
        <div className="offer-actions">
          <button className="btn-specs" onClick={onSpecs}>
            {language === 'en' ? 'Specs' : '详情'}
          </button>
          {/* Copy Link button */}
          <button
            className="btn-specs"
            onClick={handleCopy}
            title={language === 'en' ? 'Copy survey link' : '复制调查链接'}
            style={{
              background: copyState === 'copied' ? 'rgba(16, 185, 129, 0.1)' : undefined,
              color: copyState === 'copied' ? '#10b981' : undefined,
              borderColor: copyState === 'copied' ? 'rgba(16, 185, 129, 0.3)' : undefined,
              minWidth: '36px',
              padding: '6px 10px',
            }}
            disabled={copyState === 'loading'}
          >
            {copyState === 'copied' ? '✓' : copyState === 'loading' ? '…' : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
          <button className="btn-start" onClick={onStart}>
            {language === 'en' ? 'Start →' : '开始 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
