import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

// Currency code → { flag, country }
const CURRENCY_META = {
  USD: { flag: '🇺🇸', country: 'United States' },
  EUR: { flag: '🇪🇺', country: 'Europe' },
  GBP: { flag: '🇬🇧', country: 'United Kingdom' },
  CNY: { flag: '🇨🇳', country: 'China' },
  JPY: { flag: '🇯🇵', country: 'Japan' },
  AUD: { flag: '🇦🇺', country: 'Australia' },
  CAD: { flag: '🇨🇦', country: 'Canada' },
  INR: { flag: '🇮🇳', country: 'India' },
  BRL: { flag: '🇧🇷', country: 'Brazil' },
  MXN: { flag: '🇲🇽', country: 'Mexico' },
  SGD: { flag: '🇸🇬', country: 'Singapore' },
  HKD: { flag: '🇭🇰', country: 'Hong Kong' },
  KRW: { flag: '🇰🇷', country: 'South Korea' },
  TWD: { flag: '🇹🇼', country: 'Taiwan' },
  THB: { flag: '🇹🇭', country: 'Thailand' },
  MYR: { flag: '🇲🇾', country: 'Malaysia' },
  IDR: { flag: '🇮🇩', country: 'Indonesia' },
  PHP: { flag: '🇵🇭', country: 'Philippines' },
  VND: { flag: '🇻🇳', country: 'Vietnam' },
  ZAR: { flag: '🇿🇦', country: 'South Africa' },
  RUB: { flag: '🇷🇺', country: 'Russia' },
  TRY: { flag: '🇹🇷', country: 'Turkey' },
  SAR: { flag: '🇸🇦', country: 'Saudi Arabia' },
  AED: { flag: '🇦🇪', country: 'UAE' },
  SEK: { flag: '🇸🇪', country: 'Sweden' },
  NOK: { flag: '🇳🇴', country: 'Norway' },
  DKK: { flag: '🇩🇰', country: 'Denmark' },
  CHF: { flag: '🇨🇭', country: 'Switzerland' },
  PLN: { flag: '🇵🇱', country: 'Poland' },
  CZK: { flag: '🇨🇿', country: 'Czech Republic' },
  NZD: { flag: '🇳🇿', country: 'New Zealand' },
  HUF: { flag: '🇭🇺', country: 'Hungary' },
  ILS: { flag: '🇮🇱', country: 'Israel' },
  CLP: { flag: '🇨🇱', country: 'Chile' },
  COP: { flag: '🇨🇴', country: 'Colombia' },
  ARS: { flag: '🇦🇷', country: 'Argentina' },
  PEN: { flag: '🇵🇪', country: 'Peru' },
};

// ISO 2-letter country code → { flag, country } (for project_code field from GoWebSurveys)
const ISO_COUNTRY_META = {
  US: { flag: '🇺🇸', country: 'United States' },
  GB: { flag: '🇬🇧', country: 'United Kingdom' },
  CN: { flag: '🇨🇳', country: 'China' },
  JP: { flag: '🇯🇵', country: 'Japan' },
  AU: { flag: '🇦🇺', country: 'Australia' },
  CA: { flag: '🇨🇦', country: 'Canada' },
  IN: { flag: '🇮🇳', country: 'India' },
  BR: { flag: '🇧🇷', country: 'Brazil' },
  MX: { flag: '🇲🇽', country: 'Mexico' },
  SG: { flag: '🇸🇬', country: 'Singapore' },
  HK: { flag: '🇭🇰', country: 'Hong Kong' },
  KR: { flag: '🇰🇷', country: 'South Korea' },
  TW: { flag: '🇹🇼', country: 'Taiwan' },
  TH: { flag: '🇹🇭', country: 'Thailand' },
  MY: { flag: '🇲🇾', country: 'Malaysia' },
  ID: { flag: '🇮🇩', country: 'Indonesia' },
  PH: { flag: '🇵🇭', country: 'Philippines' },
  VN: { flag: '🇻🇳', country: 'Vietnam' },
  ZA: { flag: '🇿🇦', country: 'South Africa' },
  RU: { flag: '🇷🇺', country: 'Russia' },
  TR: { flag: '🇹🇷', country: 'Turkey' },
  SA: { flag: '🇸🇦', country: 'Saudi Arabia' },
  AE: { flag: '🇦🇪', country: 'UAE' },
  SE: { flag: '🇸🇪', country: 'Sweden' },
  NO: { flag: '🇳🇴', country: 'Norway' },
  DK: { flag: '🇩🇰', country: 'Denmark' },
  CH: { flag: '🇨🇭', country: 'Switzerland' },
  PL: { flag: '🇵🇱', country: 'Poland' },
  CZ: { flag: '🇨🇿', country: 'Czech Republic' },
  NZ: { flag: '🇳🇿', country: 'New Zealand' },
  HU: { flag: '🇭🇺', country: 'Hungary' },
  IL: { flag: '🇮🇱', country: 'Israel' },
  CL: { flag: '🇨🇱', country: 'Chile' },
  CO: { flag: '🇨🇴', country: 'Colombia' },
  AR: { flag: '🇦🇷', country: 'Argentina' },
  PE: { flag: '🇵🇪', country: 'Peru' },
  DE: { flag: '🇩🇪', country: 'Germany' },
  FR: { flag: '🇫🇷', country: 'France' },
  IT: { flag: '🇮🇹', country: 'Italy' },
  ES: { flag: '🇪🇸', country: 'Spain' },
  PT: { flag: '🇵🇹', country: 'Portugal' },
  NL: { flag: '🇳🇱', country: 'Netherlands' },
  BE: { flag: '🇧🇪', country: 'Belgium' },
  AT: { flag: '🇦🇹', country: 'Austria' },
  PK: { flag: '🇵🇰', country: 'Pakistan' },
  BD: { flag: '🇧🇩', country: 'Bangladesh' },
};

function getGeoInfo(offer) {
  // 1. Try project_code as ISO country code (GoWebSurveys)
  const code = (offer.project_code || '').trim().toUpperCase().split('|')[0];
  if (code && code.length === 2 && ISO_COUNTRY_META[code]) {
    return { ...ISO_COUNTRY_META[code], code };
  }
  // 2. Fallback to currency code
  const cc = (offer.currency_code || 'USD').toUpperCase();
  if (CURRENCY_META[cc]) {
    return { ...CURRENCY_META[cc], code: cc };
  }
  return { flag: '🌐', country: 'Global', code: cc };
}

export default function OfferCard({ offer, onStart, onSpecs, onCopyLink, showUSD = false }) {
  const { language } = useLanguage();
  const [copyState, setCopyState] = useState('idle'); // idle | loading | copied

  const loi = offer.project_loi ? `${offer.project_loi} min` : '—';
  const ir = offer.project_ir ? `${offer.project_ir}%` : '—';
  const coins = Number(offer.project_cpi || 0);

  // USD value: memberPayout in coins ÷ currency_coins rate (coins per $1 USD)
  const currencyCoins = Number(offer.currency_coins || 100);
  const usdValue = (coins / currencyCoins).toFixed(4);

  const geo = getGeoInfo(offer);

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
          {/* Country / Currency badge with full country name */}
          <span
            title={geo.country}
            style={{
              background: 'rgba(99, 102, 241, 0.08)',
              color: 'var(--t2)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '10px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'default',
            }}>
            {geo.flag} {geo.country}
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
