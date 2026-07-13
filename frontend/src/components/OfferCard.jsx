import React from 'react';

export default function OfferCard({ offer, onStart, onSpecs }) {
  const loi = offer.project_loi ? `${offer.project_loi} min` : '—';
  const ir = offer.project_ir ? `${offer.project_ir}%` : '—';
  const cpi = Number(offer.project_cpi || 0).toFixed(0);

  const getRelativeTime = (timeStr) => {
    if (!timeStr) return null;
    const diff = new Date() - new Date(timeStr);
    if (diff < 0) return new Date(timeStr).toLocaleDateString();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return new Date(timeStr).toLocaleDateString();
  };

  const isRecent = offer.update_time && (new Date() - new Date(offer.update_time)) < 10 * 60 * 1000;

  const createdDisplay = getRelativeTime(offer.create_time);
  const updatedDisplay = getRelativeTime(offer.update_time);

  return (
    <div className="offer-row">
      <div className="offer-row-info">
        <div className="offer-row-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          <span className="offer-coins-num">+{cpi}</span>
          <span className="offer-coins-lbl">coins</span>
        </div>
        <div className="offer-actions">
          <button className="btn-specs" onClick={onSpecs}>Specs</button>
          <button className="btn-start" onClick={onStart}>Start →</button>
        </div>
      </div>
    </div>
  );
}
