import React from 'react';
import PlatformCard from '../components/PlatformCard';
import OfferCard from '../components/OfferCard';
import { useLanguage } from '../context/LanguageContext';

export default function HomeView({
  platformsLoading,
  surveyPlatforms,
  platformSectionRef,
  platforms,
  handleSelectPlatform,
  // Global search props
  globalSearchQuery,
  globalSearchLoading,
  globalSearchResults,
  handleGlobalSearch,
  handleStartSurvey,
  handleOpenModal,
  handleCopyLink,
  showUSD = false,
  setShowUSD
}) {
  const { t } = useLanguage();

  return (
    <main className="home-main">
      {/* Unified Global Deep Search Bar */}
      <section className="platform-section" style={{ marginBottom: '28px' }}>
        <div className="section-header">
          <div className="section-label">
            <span className="section-dot dot-green" style={{ background: 'var(--accent)', boxShadow: '0 0 12px var(--accent)' }} />
            {t('unifiedEngine')}
          </div>
          <span className="section-count">{t('deepSearch')}</span>
        </div>

        <div className="filter-row" style={{ marginTop: '14px', marginBottom: '0' }}>
          <div className="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={globalSearchQuery}
              onChange={e => handleGlobalSearch(e.target.value)}
            />
          </div>
        </div>

        {globalSearchLoading && (
          <div className="center-loader" style={{ padding: '32px 0' }}>
            <div className="loader-ring" />
            <p>{t('searchingNetworks')}</p>
          </div>
        )}

        {!globalSearchLoading && globalSearchQuery.trim() && globalSearchResults.length === 0 && (
          <div className="empty-screen" style={{ padding: '32px 0', background: 'transparent', border: 'none' }}>
            <div className="empty-icon">🔍</div>
            <h3 style={{ fontSize: '15px' }}>{t('noSurveysFound')} "{globalSearchQuery}"</h3>
            <p style={{ fontSize: '12px' }}>{t('tryAnotherKeyword')}</p>
          </div>
        )}

        {!globalSearchLoading && globalSearchResults.length > 0 && (
          <div className="offers-list" style={{ marginTop: '20px' }}>
            {globalSearchResults.map(offer => (
              <div key={offer.project_pno} style={{ position: 'relative' }}>
                <OfferCard
                  offer={offer}
                  onStart={() => handleStartSurvey(offer.project_pno)}
                  onSpecs={() => handleOpenModal(offer)}
                  onCopyLink={handleCopyLink}
                  showUSD={showUSD}
                />
                <span className="global-platform-badge">
                  {offer.platform_name || `Platform #${offer.platform_id}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Offer Partners Grid */}
      {platformsLoading ? (
        <div className="center-loader">
          <div className="loader-ring" />
          <p>{t('loadingPlatforms')}</p>
        </div>
      ) : (
        <>
          {surveyPlatforms.length > 0 && (
            <section className="platform-section" ref={platformSectionRef}>
              <div className="section-header">
                <div className="section-label">
                  <span className="section-dot dot-green" />
                  {t('surveyPlatforms')}
                </div>
                <span className="section-count">{surveyPlatforms.length} {t('active')}</span>
              </div>
              <div className="cards-grid">
                {surveyPlatforms.map(p => (
                  <PlatformCard
                    key={p.platform_id}
                    platform={p}
                    isWall={false}
                    onClick={() => handleSelectPlatform(p)}
                    onCopy={null}
                  />
                ))}
              </div>
            </section>
          )}

          {platforms.length === 0 && (
            <div className="empty-screen">
              <div className="empty-icon">🔌</div>
              <h3>{t('noPlatformsConfigured')}</h3>
              <p>{t('noPlatformsConfiguredDesc')}</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
