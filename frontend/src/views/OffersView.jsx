import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OfferCard from '../components/OfferCard';
import { PlatformLogo } from '../components/PlatformCard';
import { useLanguage } from '../context/LanguageContext';
import LaunchFingerprintModal from '../components/LaunchFingerprintModal';
import { Search } from 'lucide-react';

export default function OffersView({
  selectedPlatform,
  handleCopyWall,
  searchQuery,
  setSearchQuery,
  sortOption,
  setSortOption,
  countryFilter = 'all',
  setCountryFilter,
  processedOffers,
  offersLoading,
  handleStartSurvey,
  handleOpenModal,
  handleCopyLink,
  memberCoins,
  avatarChar,
  displayName,
  handleLogout,
  offersPage = 1,
  offersPages = 1,
  offersTotal = 0,
  loadOffers,
  refreshInventory,
  refreshLoading,
  showUSD = false,
  setShowUSD
}) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [fingerprintProject, setFingerprintProject] = useState(null);

  if (!selectedPlatform) return null;

  const platformName = selectedPlatform.platform_name || '';
  const platformSign = selectedPlatform.platform_sign || '';

  // Generate a consistent color theme for this platform
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

  const theme = colorMap[platformSign] || colorMap[platformName] || {
    bg: 'var(--bg-3)',
    accent: 'var(--blue)',
    label: 'var(--t2)'
  };

  // Compute summary metrics (payout coins sum and avg loi on the loaded list)
  const surveyCount = processedOffers.length;
  const totalCoins = processedOffers.reduce((sum, o) => sum + Number(o.project_cpi || 0), 0);
  const avgLoi = surveyCount > 0 
    ? Math.round(processedOffers.reduce((sum, o) => sum + Number(o.project_loi || 0), 0) / surveyCount)
    : 0;

  return (
    <div className="app-layout">
      <header className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate('/')} title="Back to Platforms">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </button>
          <div className="topbar-logo">
            <span className="offers-platform-name">{platformName}</span>
          </div>
        </div>

        <div className="topbar-right">
          <div className="coin-badge">
            <span>🪙</span>
            <span className="coin-num">{Math.round(memberCoins).toLocaleString()}</span>
          </div>
          <div className="profile-wrap">
            <button className="profile-btn" onClick={handleLogout} title="Sign Out">
              <div className="avatar-circle">{avatarChar}</div>
              <span className="profile-name">{displayName}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="offers-main">
        {/* Premium Hero Banner */}
        <div className="offers-hero-banner">
          <div className="hero-banner-content">
            <div className="hero-platform-info">
              <div className="hero-logo-box">
                {selectedPlatform.platform_image ? (
                  <img src={selectedPlatform.platform_image} alt={platformName} className="hero-img" />
                ) : (
                  <PlatformLogo sign={platformSign} name={platformName} theme={theme} />
                )}
              </div>
              <div className="hero-text">
                <h1 className="hero-title">{platformName}</h1>
                <p className="hero-subtitle">Premium offer partner. Maximize your earnings with high-paying surveys.</p>
              </div>
            </div>

            <div className="hero-stats-grid">
              <div className="hero-stat-pill">
                <span className="stat-pill-label">Total Pool</span>
                <span className="stat-pill-value">{offersTotal.toLocaleString()}</span>
              </div>
              <div className="hero-stat-pill">
                <span className="stat-pill-label">Page Payout</span>
                <span className="stat-pill-value">+{Math.round(totalCoins).toLocaleString()}c</span>
              </div>
              <div className="hero-stat-pill">
                <span className="stat-pill-label">Avg. Time</span>
                <span className="stat-pill-value">{avgLoi} min</span>
              </div>
            </div>
          </div>

          {selectedPlatform.is_wall === 1 && (
            <button className="btn-copy-wall-hero" onClick={() => handleCopyWall(null, null)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              Copy Offerwall Link
            </button>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="filter-row">
          <div className="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              placeholder={language === 'zh' ? '搜索项目、编号、国家...' : 'Search surveys globally...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Country Filter */}
          {setCountryFilter && (
            <div className="country-filter-wrap" style={{ display: 'flex', alignItems: 'center' }}>
              <select
                className="sort-select"
                value={countryFilter || 'all'}
                onChange={e => setCountryFilter(e.target.value)}
                style={{ minWidth: '135px' }}
                title={language === 'zh' ? '按国家/地区筛选' : 'Filter by Country/Region'}
              >
                <option value="all">🌐 {language === 'zh' ? '所有国家/地区' : 'All Countries'}</option>
                <option value="US">🇺🇸 {language === 'zh' ? '美国 (US)' : 'United States (US)'}</option>
                <option value="UK">🇬🇧 {language === 'zh' ? '英国 (UK)' : 'United Kingdom (UK)'}</option>
                <option value="CA">🇨🇦 {language === 'zh' ? '加拿大 (CA)' : 'Canada (CA)'}</option>
                <option value="AU">🇦🇺 {language === 'zh' ? '澳大利亚 (AU)' : 'Australia (AU)'}</option>
                <option value="DE">🇩🇪 {language === 'zh' ? '德国 (DE)' : 'Germany (DE)'}</option>
                <option value="FR">🇫🇷 {language === 'zh' ? '法国 (FR)' : 'France (FR)'}</option>
                <option value="JP">🇯🇵 {language === 'zh' ? '日本 (JP)' : 'Japan (JP)'}</option>
                <option value="CN">🇨🇳 {language === 'zh' ? '中国 (CN)' : 'China (CN)'}</option>
                <option value="IN">🇮🇳 {language === 'zh' ? '印度 (IN)' : 'India (IN)'}</option>
                <option value="BR">🇧🇷 {language === 'zh' ? '巴西 (BR)' : 'Brazil (BR)'}</option>
                <option value="MX">🇲🇽 {language === 'zh' ? '墨西哥 (MX)' : 'Mexico (MX)'}</option>
              </select>
            </div>
          )}

          <select className="sort-select" value={sortOption} onChange={e => setSortOption(e.target.value)}>
            <option value="default">{language === 'zh' ? '最新创建' : 'Newest First'}</option>
            <option value="cpi-desc">{language === 'zh' ? '最高单价' : 'Highest Payout'}</option>
            <option value="cpi-asc">{language === 'zh' ? '最低单价' : 'Lowest Payout'}</option>
            <option value="loi-asc">{language === 'zh' ? '最短耗时' : 'Quickest'}</option>
          </select>
          {/* Coins / USD Toggle — prominent position */}
          {setShowUSD && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '3px',
              gap: '0',
              flexShrink: 0,
            }}>
              <button
                onClick={() => setShowUSD(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  background: !showUSD ? 'var(--accent)' : 'transparent',
                  color: !showUSD ? '#fff' : 'var(--t2)',
                  fontWeight: 700,
                  fontSize: '12px',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >🪙 {language === 'en' ? 'Coins' : '金币'}</button>
              <button
                onClick={() => setShowUSD(true)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  background: showUSD ? 'var(--accent)' : 'transparent',
                  color: showUSD ? '#fff' : 'var(--t2)',
                  fontWeight: 700,
                  fontSize: '12px',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >$ USD</button>
            </div>
          )}
          <button
            className="btn-refresh"
            onClick={() => refreshInventory(selectedPlatform.platform_id)}
            disabled={refreshLoading || offersLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              padding: '10px 14px',
              color: 'var(--t1)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              gap: '6px',
              transition: 'background 0.15s, border-color 0.15s',
              opacity: (refreshLoading || offersLoading) ? 0.6 : 1,
              pointerEvents: (refreshLoading || offersLoading) ? 'none' : 'auto'
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                animation: refreshLoading ? 'spin 1.2s linear infinite' : 'none',
                transformOrigin: 'center'
              }}
            >
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {refreshLoading ? 'Syncing...' : 'Sync Inventory'}
          </button>
          <span className="result-count">{offersTotal.toLocaleString()} surveys matched</span>
          {/* Auto-refresh notice */}
          <span style={{ fontSize: '11px', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {language === 'en' ? 'Auto-synced every 15 min' : '每15分钟自动同步'}
          </span>
        </div>

        {/* Offers list */}
        {offersLoading ? (
          <div className="center-loader">
            <div className="loader-ring" />
            <p>{language === 'zh' ? '正在拉取调查库存...' : 'Fetching inventory...'}</p>
          </div>
        ) : processedOffers.length === 0 ? (
          <div className="empty-screen">
            <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
              <Search size={32} style={{ opacity: 0.5 }} />
            </div>
            <h3>{language === 'zh' ? '未找到匹配的调查' : 'No Surveys Found'}</h3>
            <p>{language === 'zh' ? '请尝试调整搜索条件，或稍后再来查看新上线的项目。' : 'Try adjusting your search or check back later for new campaigns.'}</p>
          </div>
        ) : (
          <>
            <div className="offers-list">
              {processedOffers.map(offer => (
                <OfferCard
                  key={offer.project_pno}
                  offer={offer}
                  onStart={() => setFingerprintProject(offer)}
                  onSpecs={() => handleOpenModal(offer)}
                  onCopyLink={handleCopyLink}
                  onFingerprint={() => setFingerprintProject(offer)}
                  showUSD={showUSD}
                />
              ))}
            </div>

            {/* Premium Classic Pagination Bar */}
            {offersPages > 1 && (
              <div className="pagination-bar">
                <button
                  disabled={offersPage === 1}
                  onClick={() => loadOffers(selectedPlatform.platform_id, 1, searchQuery)}
                  className="paginate-btn"
                  title="First Page"
                >
                  {language === 'zh' ? '« 首页' : '« First'}
                </button>
                <button
                  disabled={offersPage === 1}
                  onClick={() => loadOffers(selectedPlatform.platform_id, offersPage - 1, searchQuery)}
                  className="paginate-btn"
                  title="Previous Page"
                >
                  {language === 'zh' ? '‹ 上一页' : '‹ Prev'}
                </button>
                
                <span className="paginate-info">
                  {language === 'zh' ? (
                    <>第 <strong className="paginate-active-page">{offersPage}</strong> 页 / 共 <strong>{offersPages}</strong> 页</>
                  ) : (
                    <>Page <strong className="paginate-active-page">{offersPage}</strong> of <strong>{offersPages}</strong></>
                  )}
                </span>

                <button
                  disabled={offersPage === offersPages}
                  onClick={() => loadOffers(selectedPlatform.platform_id, offersPage + 1, searchQuery)}
                  className="paginate-btn"
                  title="Next Page"
                >
                  {language === 'zh' ? '下一页 ›' : 'Next ›'}
                </button>
                <button
                  disabled={offersPage === offersPages}
                  onClick={() => loadOffers(selectedPlatform.platform_id, offersPages, searchQuery)}
                  className="paginate-btn"
                  title="Last Page"
                >
                  {language === 'zh' ? '末页 »' : 'Last »'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Fingerprint Browser Automation Modal */}
      <LaunchFingerprintModal
        isOpen={!!fingerprintProject}
        onClose={() => setFingerprintProject(null)}
        project={fingerprintProject}
      />
    </div>
  );
}
