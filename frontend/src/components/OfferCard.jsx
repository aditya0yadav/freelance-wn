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
  UK: { country: 'United Kingdom' },
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
  EG: { country: 'Egypt' },
  GR: { country: 'Greece' },
  QA: { country: 'Qatar' },
  KW: { country: 'Kuwait' },
  RO: { country: 'Romania' },
  MA: { country: 'Morocco' },
};

const COUNTRY_NAME_TO_CODE = {
  'UNITED STATES': 'US',
  'USA': 'US',
  'AMERICA': 'US',
  'UNITED KINGDOM': 'UK',
  'GREAT BRITAIN': 'UK',
  'ENGLAND': 'UK',
  'UK': 'UK',
  'GB': 'UK',
  'SPAIN': 'ES',
  'ESPANA': 'ES',
  'ES': 'ES',
  'BRAZIL': 'BR',
  'BRASIL': 'BR',
  'BR': 'BR',
  'CANADA': 'CA',
  'CA': 'CA',
  'AUSTRALIA': 'AU',
  'AU': 'AU',
  'GERMANY': 'DE',
  'DEUTSCHLAND': 'DE',
  'DE': 'DE',
  'FRANCE': 'FR',
  'FR': 'FR',
  'ITALY': 'IT',
  'ITALIA': 'IT',
  'IT': 'IT',
  'JAPAN': 'JP',
  'JP': 'JP',
  'CHINA': 'CN',
  'CN': 'CN',
  'INDIA': 'IN',
  'IN': 'IN',
  'MEXICO': 'MX',
  'MX': 'MX',
  'NETHERLANDS': 'NL',
  'HOLLAND': 'NL',
  'NL': 'NL',
  'SWEDEN': 'SE',
  'SE': 'SE',
  'NORWAY': 'NO',
  'NO': 'NO',
  'DENMARK': 'DK',
  'DK': 'DK',
  'FINLAND': 'FI',
  'FI': 'FI',
  'POLAND': 'PL',
  'PL': 'PL',
  'SWITZERLAND': 'CH',
  'CH': 'CH',
  'AUSTRIA': 'AT',
  'AT': 'AT',
  'BELGIUM': 'BE',
  'BE': 'BE',
  'PORTUGAL': 'PT',
  'PT': 'PT',
  'IRELAND': 'IE',
  'IE': 'IE',
  'NEW ZEALAND': 'NZ',
  'NZ': 'NZ',
  'SINGAPORE': 'SG',
  'SG': 'SG',
  'HONG KONG': 'HK',
  'HONG KONG, SAR CHINA': 'HK',
  'HK': 'HK',
  'SOUTH KOREA': 'KR',
  'KOREA (SOUTH)': 'KR',
  'KOREA': 'KR',
  'KR': 'KR',
  'TAIWAN': 'TW',
  'TW': 'TW',
  'THAILAND': 'TH',
  'TH': 'TH',
  'MALAYSIA': 'MY',
  'MY': 'MY',
  'INDONESIA': 'ID',
  'ID': 'ID',
  'PHILIPPINES': 'PH',
  'PH': 'PH',
  'VIETNAM': 'VN',
  'VIET NAM': 'VN',
  'VN': 'VN',
  'SOUTH AFRICA': 'ZA',
  'ZA': 'ZA',
  'ARGENTINA': 'AR',
  'AR': 'AR',
  'CHILE': 'CL',
  'CL': 'CL',
  'COLOMBIA': 'CO',
  'CO': 'CO',
  'PERU': 'PE',
  'PE': 'PE',
  'TURKEY': 'TR',
  'TURKIYE': 'TR',
  'TR': 'TR',
  'SAUDI ARABIA': 'SA',
  'KSA': 'SA',
  'SA': 'SA',
  'UAE': 'AE',
  'UNITED ARAB EMIRATES': 'AE',
  'AE': 'AE',
  'ISRAEL': 'IL',
  'IL': 'IL',
  'RUSSIA': 'RU',
  'RU': 'RU',
  'EGYPT': 'EG',
  'EG': 'EG',
  'GREECE': 'GR',
  'GR': 'GR',
  'QATAR': 'QA',
  'QA': 'QA',
  'KUWAIT': 'KW',
  'KW': 'KW',
  'ROMANIA': 'RO',
  'RO': 'RO',
  'MOROCCO': 'MA',
  'MA': 'MA'
};

function getGeoInfo(offer) {
  const clean = (val) => String(val || '').trim().toUpperCase();

  // 1. Direct country_code if set by backend or GoWebSurveys
  if (offer.country_code && offer.country_code !== 'EMAIL_SURVEY') {
    const cc = clean(offer.country_code);
    const mapped = COUNTRY_NAME_TO_CODE[cc] || cc;
    if (ISO_COUNTRY_META[mapped]) {
      return { country: ISO_COUNTRY_META[mapped].country, code: mapped === 'GB' ? 'UK' : mapped };
    }
  }

  // 2. Check project_code (handles "US", "ES", "BR", "English-GB|54", "Australia")
  const rawCode = (offer.project_code || '').trim();
  if (rawCode && rawCode !== 'EMAIL_SURVEY') {
    const code = rawCode.toUpperCase().split('|')[0].trim();
    if (COUNTRY_NAME_TO_CODE[code]) {
      const codeKey = COUNTRY_NAME_TO_CODE[code];
      const name = ISO_COUNTRY_META[codeKey]?.country || codeKey;
      return { country: name, code: codeKey === 'GB' ? 'UK' : codeKey };
    }
    const localeMatch = rawCode.match(/[-_]([A-Za-z]{2})(?:\||\b|$)/);
    if (localeMatch) {
      const c = localeMatch[1].toUpperCase();
      if (COUNTRY_NAME_TO_CODE[c]) {
        const codeKey = COUNTRY_NAME_TO_CODE[c];
        const name = ISO_COUNTRY_META[codeKey]?.country || codeKey;
        return { country: name, code: codeKey === 'GB' ? 'UK' : codeKey };
      }
    }
    const pCodeUpper = rawCode.toUpperCase();
    if (COUNTRY_NAME_TO_CODE[pCodeUpper]) {
      const codeKey = COUNTRY_NAME_TO_CODE[pCodeUpper];
      const name = ISO_COUNTRY_META[codeKey]?.country || codeKey;
      return { country: name, code: codeKey === 'GB' ? 'UK' : codeKey };
    }
  }

  // 3. Check target_country field (e.g. "United Kingdom", "Spain", "Brazil", "JP")
  const targetCountry = (offer.target_country || '').trim();
  if (targetCountry && targetCountry !== 'Global') {
    const parts = targetCountry.split(/[,/|]/).map(p => clean(p)).filter(Boolean);
    for (const part of parts) {
      if (COUNTRY_NAME_TO_CODE[part]) {
        const codeKey = COUNTRY_NAME_TO_CODE[part];
        const name = ISO_COUNTRY_META[codeKey]?.country || targetCountry;
        return { country: name, code: codeKey === 'GB' ? 'UK' : codeKey };
      }
    }
  }

  // 4. Check project_name for bracketed countries: "[Australia] 1867967", "[United Kingdom]", "[Spain]"
  const pName = offer.project_name || '';
  if (pName) {
    const bracketMatch = pName.match(/\[([A-Za-z0-9\s_-]+)\]/);
    if (bracketMatch) {
      const inside = clean(bracketMatch[1]);
      if (COUNTRY_NAME_TO_CODE[inside]) {
        const codeKey = COUNTRY_NAME_TO_CODE[inside];
        const name = ISO_COUNTRY_META[codeKey]?.country || bracketMatch[1];
        return { country: name, code: codeKey === 'GB' ? 'UK' : codeKey };
      }
    }
    // Check tags in project_name: "B2C-NL", "WANS-NL", "KSA"
    const tagMatch = pName.match(/\b(?:B2B|B2C|WANS?)[-\s]+([A-Za-z]{2,3})\b/i);
    if (tagMatch) {
      const tag = clean(tagMatch[1]);
      if (COUNTRY_NAME_TO_CODE[tag]) {
        const codeKey = COUNTRY_NAME_TO_CODE[tag];
        const name = ISO_COUNTRY_META[codeKey]?.country || tag;
        return { country: name, code: codeKey === 'GB' ? 'UK' : codeKey };
      }
    }
    // Check standalone country names in title
    for (const [key, codeKey] of Object.entries(COUNTRY_NAME_TO_CODE)) {
      if (key.length > 2) {
        const regex = new RegExp(`\\b${key}\\b`, 'i');
        if (regex.test(pName)) {
          const name = ISO_COUNTRY_META[codeKey]?.country || key;
          return { country: name, code: codeKey === 'GB' ? 'UK' : codeKey };
        }
      }
    }
  }

  // 5. Explicit foreign currencies (GBP, EUR, AUD, CAD, BRL, MXN, INR, JPY)
  const cc = (offer.currency_code || '').toUpperCase();
  if (cc && cc !== 'USD') {
    if (CURRENCY_META[cc]) {
      const codeKey = cc === 'GBP' ? 'UK' : (COUNTRY_NAME_TO_CODE[cc] || cc.slice(0, 2));
      return { country: CURRENCY_META[cc].country, code: codeKey };
    }
  }

  // 6. Default fallback
  return { country: 'United States', code: 'US' };
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
    if (!code) return 'US';
    if (code === 'GB' || code === 'GBP') return 'UK';
    if (code === 'USD') return 'US';
    if (code === 'EUR') return 'EU';
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

