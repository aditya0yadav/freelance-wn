import React from 'react';
import PlatformCard from '../components/PlatformCard';
import OfferCard from '../components/OfferCard';

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
  handleOpenModal
}) {
  return (
    <main className="home-main">
      {/* Unified Global Deep Search Bar */}
      <section className="platform-section" style={{ marginBottom: '28px' }}>
        <div className="section-header">
          <div className="section-label">
            <span className="section-dot dot-green" style={{ background: 'var(--accent)', boxShadow: '0 0 12px var(--accent)' }} />
            Unified Survey Engine
          </div>
          <span className="section-count">Deep Search</span>
        </div>

        <div className="filter-row" style={{ marginTop: '14px', marginBottom: '0' }}>
          <div className="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              placeholder="Search surveys globally by Name, PNO code, or Platform..."
              value={globalSearchQuery}
              onChange={e => handleGlobalSearch(e.target.value)}
            />
          </div>
        </div>

        {globalSearchLoading && (
          <div className="center-loader" style={{ padding: '32px 0' }}>
            <div className="loader-ring" />
            <p>Searching all networks...</p>
          </div>
        )}

        {!globalSearchLoading && globalSearchQuery.trim() && globalSearchResults.length === 0 && (
          <div className="empty-screen" style={{ padding: '32px 0', background: 'transparent', border: 'none' }}>
            <div className="empty-icon">🔍</div>
            <h3 style={{ fontSize: '15px' }}>No surveys found matching "{globalSearchQuery}"</h3>
            <p style={{ fontSize: '12px' }}>Try searching another keyword or check individual offer walls.</p>
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
          <p>Loading platforms...</p>
        </div>
      ) : (
        <>
          {surveyPlatforms.length > 0 && (
            <section className="platform-section" ref={platformSectionRef}>
              <div className="section-header">
                <div className="section-label">
                  <span className="section-dot dot-green" />
                  Offer Partners
                </div>
                <span className="section-count">{surveyPlatforms.length} active</span>
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
              <h3>No Platforms Configured</h3>
              <p>Your administrator hasn't configured any platforms yet. Check back later.</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
