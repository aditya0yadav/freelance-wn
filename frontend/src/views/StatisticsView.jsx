import React from 'react';

export default function StatisticsView({
  statsTab,
  setStatsTab,
  statsPage,
  setStatsPage,
  loadStats,
  statsPlatform,
  setStatsPlatform,
  statsStatus,
  setStatsStatus,
  statsNickname,
  setStatsNickname,
  platforms,
  statsLoading,
  personalStats,
  teamStats,
  conversionsData
}) {
  return (
    <main className="stats-main">
      <div className="stats-container">
        <div className="stats-banner">
          <div>
            <h1 className="stats-title">Earnings & Statistics</h1>
            <p className="stats-subtitle">Track conversions, payout summaries, and team audit logs.</p>
          </div>
          <div className="tab-filters">
            <button className={`tab-btn ${statsTab === 'my' ? 'active' : ''}`} onClick={() => { setStatsTab('my'); setStatsPage(1); loadStats('my', 1); }}>My Performance</button>
            <button className={`tab-btn ${statsTab === 'team' ? 'active' : ''}`} onClick={() => { setStatsTab('team'); setStatsPage(1); loadStats('team', 1); }}>Team Performance</button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="filters-panel">
          <div className="filter-item">
            <label>Platform</label>
            <select value={statsPlatform} onChange={(e) => { setStatsPlatform(e.target.value); setStatsPage(1); loadStats(statsTab, 1, e.target.value, statsStatus, statsNickname); }}>
              <option value="">All Platforms</option>
              {platforms.map(p => (
                <option key={p.platform_id} value={p.platform_id}>{p.platform_name}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>Status</label>
            <select value={statsStatus} onChange={(e) => { setStatsStatus(e.target.value); setStatsPage(1); loadStats(statsTab, 1, statsPlatform, e.target.value, statsNickname); }}>
              <option value="">All Statuses</option>
              <option value="1">Success</option>
              <option value="2">Quota Full</option>
              <option value="3">Pre-Screen Terminated</option>
              <option value="4">Quality Terminated</option>
              <option value="5">Unknown Error</option>
              <option value="6">Deduction</option>
            </select>
          </div>
          {statsTab === 'team' && (
            <div className="filter-item">
              <label>Member Nickname</label>
              <input
                type="text"
                placeholder="Search member..."
                value={statsNickname}
                onChange={(e) => setStatsNickname(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setStatsPage(1); loadStats('team', 1, statsPlatform, statsStatus, statsNickname); } }}
              />
            </div>
          )}
          <div className="filter-actions-row">
            <button className="btn-filter-apply" onClick={() => { setStatsPage(1); loadStats(statsTab, 1, statsPlatform, statsStatus, statsNickname); }}>Apply</button>
            <button className="btn-filter-reset" onClick={() => { setStatsPlatform(''); setStatsStatus(''); setStatsNickname(''); setStatsPage(1); loadStats(statsTab, 1, '', '', ''); }}>Reset</button>
          </div>
        </div>

        {statsLoading ? (
          <div className="center-loader">
            <div className="loader-ring" />
            <p>Loading statistics...</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            {statsTab === 'my' ? (
              <div className="summary-cards">
                <div className="summary-card">
                  <span>Total Offers</span>
                  <strong>{personalStats.offers}</strong>
                </div>
                <div className="summary-card stat-green">
                  <span>Success Payouts</span>
                  <strong>{Math.round(personalStats.success).toLocaleString()} Coins</strong>
                </div>
                <div className="summary-card stat-red">
                  <span>Failed Payouts</span>
                  <strong>{Math.round(personalStats.failed).toLocaleString()} Coins</strong>
                </div>
                <div className="summary-card stat-orange">
                  <span>Deductions</span>
                  <strong>{Math.round(personalStats.deduction).toLocaleString()} Coins</strong>
                </div>
              </div>
            ) : (
              <div className="summary-cards team-summary">
                <div className="summary-card">
                  <span>Team Offers</span>
                  <strong>{teamStats.offers}</strong>
                </div>
                <div className="summary-card stat-green">
                  <span>Team Earnings</span>
                  <strong>{Math.round(teamStats.teamsuccess).toLocaleString()} Coins</strong>
                  <small className="member-part">Member: {Math.round(teamStats.membersuccess).toLocaleString()}</small>
                </div>
                <div className="summary-card stat-red">
                  <span>Team Failed</span>
                  <strong>{Math.round(teamStats.teamfailed).toLocaleString()} Coins</strong>
                  <small className="member-part">Member: {Math.round(teamStats.memberfailed).toLocaleString()}</small>
                </div>
                <div className="summary-card stat-orange">
                  <span>Team Deductions</span>
                  <strong>{Math.round(teamStats.teamdeduction).toLocaleString()} Coins</strong>
                  <small className="member-part">Member: {Math.round(teamStats.memberdeduction).toLocaleString()}</small>
                </div>
              </div>
            )}

            {/* Conversions Log Table */}
            <div className="conversions-section">
              <h3 className="section-subtitle">Conversions Audit Log</h3>

              {conversionsData.list.length === 0 ? (
                <p className="no-data-msg">No conversions recorded matching filters.</p>
              ) : (
                <>
                  <div className="table-wrap">
                    <table className="stats-table">
                      <thead>
                        <tr>
                          <th>Txn ID / Project</th>
                          <th>Platform</th>
                          {statsTab === 'team' && <th>Member</th>}
                          <th>Member Payout</th>
                          {statsTab === 'team' && <th>Team Payout</th>}
                          <th>IP</th>
                          <th>Status</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversionsData.list.map(c => {
                          let statusText = 'Unknown';
                          let statusClass = 'badge-other';
                          if (c.reward_status === 1) { statusText = 'Success'; statusClass = 'badge-success'; }
                          else if (c.reward_status === 2) { statusText = 'Quota Full'; statusClass = 'badge-fail'; }
                          else if (c.reward_status === 3) { statusText = 'Pre-Screen Terminated'; statusClass = 'badge-fail'; }
                          else if (c.reward_status === 4) { statusText = 'Quality Terminated'; statusClass = 'badge-fail'; }
                          else if (c.reward_status === 5) { statusText = 'Unknown Error'; statusClass = 'badge-fail'; }
                          else if (c.reward_status === 6) { statusText = 'Deduction'; statusClass = 'badge-deduct'; }

                          return (
                            <tr key={c.reward_id}>
                              <td>
                                <div className="cell-main">{c.txn_id}</div>
                                <div className="cell-sub">{c.project_pno || '—'}</div>
                              </td>
                              <td>{c.platform?.platform_name || '—'}</td>
                              {statsTab === 'team' && <td>{c.member?.nickname || '—'}</td>}
                              <td className="cell-money">{Math.round(c.member_payout).toLocaleString()} Coins</td>
                              {statsTab === 'team' && <td className="cell-money">{Math.round(c.team_payout).toLocaleString()} Coins</td>}
                              <td className="cell-ip">{c.ip || '—'}</td>
                              <td>
                                <span className={`status-badge-inline ${statusClass}`}>{statusText}</span>
                              </td>
                              <td className="cell-time">{c.create_time ? new Date(c.create_time).toLocaleString() : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {conversionsData.total_pages > 1 && (
                    <div className="pagination-row">
                      <button
                        disabled={statsPage <= 1}
                        onClick={() => { const p = statsPage - 1; setStatsPage(p); loadStats(statsTab, p); }}
                        className="pag-btn"
                      >
                        ← Previous
                      </button>
                      <span className="pag-info">Page {statsPage} of {conversionsData.total_pages}</span>
                      <button
                        disabled={statsPage >= conversionsData.total_pages}
                        onClick={() => { const p = statsPage + 1; setStatsPage(p); loadStats(statsTab, p); }}
                        className="pag-btn"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
