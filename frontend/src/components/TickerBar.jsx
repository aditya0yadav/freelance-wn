import React from 'react';

const pillColors = ['pill-blue', 'pill-purple', 'pill-pink', 'pill-orange', 'pill-teal', 'pill-violet'];

export default function TickerBar({ conversions }) {
  if (!conversions || conversions.length === 0) return null;
  return (
    <div className="ticker-bar">
      <span className="ticker-label">LIVE</span>
      <div className="ticker-track">
        {conversions.map((c, i) => (
          <div key={c.reward_id} className={`ticker-pill ${pillColors[i % pillColors.length]}`}>
            <span className="ticker-amt">$ {Number(c.member_payout).toFixed(2)}</span>
            <span className="ticker-sep" />
            <span className="ticker-nick">{c.member?.nickname || 'Member'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
