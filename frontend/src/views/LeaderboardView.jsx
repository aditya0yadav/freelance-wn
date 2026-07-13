import React from 'react';

export default function LeaderboardView({
  leaderboardType,
  loadLeaderboard,
  leaderboardLoading,
  leaderboardData
}) {
  return (
    <main className="leaderboard-main">
      <div className="stats-container">
        <div className="stats-banner">
          <div>
            <h1 className="stats-title">Performance Leaderboard</h1>
            <p className="stats-subtitle">Top members ranked by earnings and completed surveys.</p>
          </div>
          <div className="tab-filters">
            <button className={`tab-btn ${leaderboardType === 'daily' ? 'active' : ''}`} onClick={() => loadLeaderboard('daily')}>Daily</button>
            <button className={`tab-btn ${leaderboardType === 'weekly' ? 'active' : ''}`} onClick={() => loadLeaderboard('weekly')}>Weekly</button>
            <button className={`tab-btn ${leaderboardType === 'monthly' ? 'active' : ''}`} onClick={() => loadLeaderboard('monthly')}>Monthly</button>
          </div>
        </div>

        {leaderboardLoading ? (
          <div className="center-loader">
            <div className="loader-ring" />
            <p>Loading ranking leaderboard...</p>
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="empty-screen">
            <div className="empty-icon">🏆</div>
            <h3>No Rankings Yet</h3>
            <p>Check back later once members start completing surveys!</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium Cards */}
            <div className="podium-container">
              {/* Rank 2 (left) */}
              {leaderboardData[1] && (
                <div className="podium-card silver">
                  <div className="podium-rank">2</div>
                  <img className="podium-avatar" src={leaderboardData[1].avatar_url} alt="Silver" />
                  <h4 className="podium-name">{leaderboardData[1].nickname}</h4>
                  <div className="podium-payout">{Math.round(leaderboardData[1].total_member_payout).toLocaleString()} Coins</div>
                  <div className="podium-count">{leaderboardData[1].total_member_offers} surveys</div>
                </div>
              )}
              {/* Rank 1 (center) */}
              {leaderboardData[0] && (
                <div className="podium-card gold">
                  <div className="podium-rank">1</div>
                  <img className="podium-avatar" src={leaderboardData[0].avatar_url} alt="Gold" />
                  <h4 className="podium-name">{leaderboardData[0].nickname}</h4>
                  <div className="podium-payout">{Math.round(leaderboardData[0].total_member_payout).toLocaleString()} Coins</div>
                  <div className="podium-count">{leaderboardData[0].total_member_offers} surveys</div>
                </div>
              )}
              {/* Rank 3 (right) */}
              {leaderboardData[2] && (
                <div className="podium-card bronze">
                  <div className="podium-rank">3</div>
                  <img className="podium-avatar" src={leaderboardData[2].avatar_url} alt="Bronze" />
                  <h4 className="podium-name">{leaderboardData[2].nickname}</h4>
                  <div className="podium-payout">{Math.round(leaderboardData[2].total_member_payout).toLocaleString()} Coins</div>
                  <div className="podium-count">{leaderboardData[2].total_member_offers} surveys</div>
                </div>
              )}
            </div>

            {/* Rest of the Rank List */}
            {leaderboardData.length > 3 && (
              <div className="ranking-list">
                {leaderboardData.slice(3).map((item, idx) => (
                  <div key={item.member_id} className="ranking-row">
                    <div className="rank-num">{idx + 4}</div>
                    <img className="rank-avatar" src={item.avatar_url} alt="" />
                    <div className="rank-name">{item.nickname}</div>
                    <div className="rank-surveys">{item.total_member_offers} surveys</div>
                    <div className="rank-earnings">{Math.round(item.total_member_payout).toLocaleString()} Coins</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
