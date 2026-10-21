import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Shield, Clock, Activity, Copy, Check, ArrowRight, Globe } from 'lucide-react';

// Currency code → { flag, country }
const CURRENCY_META = {
  USD: { country: 'United States' },
  EUR: { country: 'Europe' },
  GBP: { country: 'United Kingdom' },
  CNY: { country: 'China' },
  JPY: { country: 'Japan' },
  AUD: { country: 'Australia' },
  CAD: { country: 'Canada' },
  INR: { country: 'India' },
  BRL: { country: 'Brazil' },
  MXN: { country: 'Mexico' },
  SGD: { country: 'Singapore' },
  HKD: { country: 'Hong Kong' },
  KRW: { country: 'South Korea' },
  TWD: { country: 'Taiwan' },
  THB: { country: 'Thailand' },
  MYR: { country: 'Malaysia' },
  IDR: { country: 'Indonesia' },
  PHP: { country: 'Philippines' },
  VND: { country: 'Vietnam' },
  ZAR: { country: 'South Africa' },
  RUB: { country: 'Russia' },
  TRY: { country: 'Turkey' },
  SAR: { country: 'Saudi Arabia' },
  AED: { country: 'UAE' },
  SEK: { country: 'Sweden' },
  NOK: { country: 'Norway' },
  DKK: { country: 'Denmark' },
  CHF: { country: 'Switzerland' },
  PLN: { country: 'Poland' },
  CZK: { country: 'Czech Republic' },
  NZD: { country: 'New Zealand' },
  HUF: { country: 'Hungary' },
  ILS: { country: 'Israel' },
  CLP: { country: 'Chile' },
  COP: { country: 'Colombia' },
  ARS: { country: 'Argentina' },
  PEN: { country: 'Peru' },
};

// ISO 2-letter country code → { country } (for project_code field from GoWebSurveys)
const ISO_COUNTRY_META = {
  US: { country: 'United States' },
  GB: { country: 'United Kingdom' },
  CN: { country: 'China' },
  JP: { country: 'Japan' },
  AU: { country: 'Australia' },
  CA: { country: 'Canada' },
  IN: { country: 'India' },
  BR: { country: 'Brazil' },
  MX: { country: 'Mexico' },
  SG: { country: 'Singapore' },
  HK: { country: 'Hong Kong' },
  KR: { country: 'South Korea' },
  TW: { country: 'Taiwan' },
  TH: { country: 'Thailand' },
  MY: { country: 'Malaysia' },
  ID: { country: 'Indonesia' },
  PH: { country: 'Philippines' },
  VN: { country: 'Vietnam' },
  ZA: { country: 'South Africa' },
  RU: { country: 'Russia' },
  TR: { country: 'Turkey' },
  SA: { country: 'Saudi Arabia' },
  AE: { country: 'UAE' },
  SE: { country: 'Sweden' },
  NO: { country: 'Norway' },
  DK: { country: 'Denmark' },
  CH: { country: 'Switzerland' },
  PL: { country: 'Poland' },
  CZ: { country: 'Czech Republic' },
  NZ: { country: 'New Zealand' },
  HU: { country: 'Hungary' },
  IL: { country: 'Israel' },
  CL: { country: 'Chile' },
  CO: { country: 'Colombia' },
  AR: { country: 'Argentina' },
  PE: { country: 'Peru' },
  DE: { country: 'Germany' },
  FR: { country: 'France' },
  IT: { country: 'Italy' },
  ES: { country: 'Spain' },
  PT: { country: 'Portugal' },
  NL: { country: 'Netherlands' },
  BE: { country: 'Belgium' },
  AT: { country: 'Austria' },
  PK: { country: 'Pakistan' },
  BD: { country: 'Bangladesh' },
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
  return { country: 'Global', code: cc };
}

export default function OfferCard({ offer, onStart, onSpecs, onCopyLink, onFingerprint, showUSD = false }) {
  const { language, t } = useLanguage();
  const [copyState, setCopyState] = useState('idle'); // idle | loading | copied

  const loi = offer.project_loi ? `${offer.project_loi} min` : '—';
  const ir = offer.project_ir ? `${offer.project_ir}%` : '—';
  const coins = Number(offer.project_cpi || 0);

  // USD value: memberPayout in coins ÷ currency_coins rate (coins per $1 USD)
  const currencyCoins = Number(offer.currency_coins || 100);
  const usdValue = (coins / currencyCoins).toFixed(4);

  const geo = getGeoInfo(offer);

  const getAbbr = (code) => {
    if (!code) return 'GL';
    if (code === 'USD') return 'US';
    if (code === 'EUR') return 'EU';
    if (code === 'GBP') return 'GB';
    if (code === 'CNY') return 'CN';
    if (code === 'JPY') return 'JP';
    if (code === 'AUD') return 'AU';
    if (code === 'CAD') return 'CA';
    if (code === 'INR') return 'IN';
    return code.substring(0, 2).toUpperCase();
  };

  const abbr = getAbbr(geo.code);
  const quotaVal = offer.project_quota !== undefined && offer.project_quota !== null ? offer.project_quota : '—';

  const getRelativeTime = (timeStr) => {
    if (!timeStr) return null;
    const diff = new Date() - new Date(timeStr);
    if (diff < 0) return new Date(timeStr).toLocaleDateString();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('justNow');
    if (mins < 60) return t('minsAgo').replace('{mins}', mins);
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
              {t('newBadge')}
            </span>
          )}
          {/* Country abbreviation badge with inline remaining quota */}
          <span
            title={`${geo.country} | ${t('quotaLabel')}: ${quotaVal}`}
            style={{
              background: 'var(--surface)',
              color: 'var(--t2)',
              border: '1px solid var(--border)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'default',
            }}>
            <Globe size={12} style={{ opacity: 0.75 }} />
            <span>{abbr}</span>
            <span style={{ opacity: 0.4, margin: '0 2px' }}>|</span>
            <span style={{ color: '#ef4444', fontWeight: 900 }}>Q: {quotaVal}</span>
          </span>
        </div>
        <div className="offer-row-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} style={{ opacity: 0.7 }} />
            {loi}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={12} style={{ opacity: 0.7 }} />
            {ir} {t('irLabel')}
          </span>
          <span className="offer-pno">{offer.project_pno}</span>
          {(createdDisplay || updatedDisplay) && (
            <span style={{ opacity: 0.6, fontSize: '11.5px' }}>
              {createdDisplay && `${t('createdLabel')}: ${createdDisplay}`}
              {updatedDisplay && ` | ${t('updatedLabel')}: ${updatedDisplay}`}
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
              <span className="offer-coins-lbl">{t('coins')}</span>
            </>
          )}
        </div>
        <div className="offer-actions">
          <button className="btn-specs" onClick={onSpecs}>
            {t('specs')}
          </button>
          {onFingerprint && (
            <button
              className="btn-specs"
              onClick={onFingerprint}
              title={t('launchFingerprint')}
              style={{
                borderColor: 'var(--border-s)',
                color: 'var(--blue)',
                background: 'var(--surface)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 600
              }}
            >
              <Shield size={13} />
              <span>{t('fingerprint')}</span>
            </button>
          )}
          {/* Copy Link button */}
          <button
            className="btn-specs"
            onClick={handleCopy}
            title={t('copyLink')}
            style={{
              background: copyState === 'copied' ? 'rgba(16, 185, 129, 0.1)' : undefined,
              color: copyState === 'copied' ? '#10b981' : undefined,
              borderColor: copyState === 'copied' ? 'rgba(16, 185, 129, 0.3)' : undefined,
              minWidth: '36px',
              padding: '6px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            disabled={copyState === 'loading'}
          >
            {copyState === 'copied' ? (
              <Check size={13} />
            ) : copyState === 'loading' ? (
              '…'
            ) : (
              <Copy size={13} />
            )}
          </button>
          <button className="btn-start" onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span>{t('startAction')}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

