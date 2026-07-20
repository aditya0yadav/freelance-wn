import React from 'react';
import { useLanguage } from '../context/LanguageContext';

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
  conversionsData,
  showUSD
}) {
  const { language, t } = useLanguage();

  const fmtVal = (val) => {
    if (showUSD) {
      return `$${(val / 100).toFixed(2)}`;
    }
    return `${Math.round(val).toLocaleString()} ${t('coins')}`;
  };

  return (
    <main className="stats-main">
      <div className="stats-container">
        <div className="stats-banner">
          <div>
            <h1 className="stats-title">{t('statsCenter')}</h1>
            <p className="stats-subtitle">{t('statsSub')}</p>
          </div>
          <div className="tab-filters">
            <button className={`tab-btn ${statsTab === 'my' ? 'active' : ''}`} onClick={() => { setStatsTab('my'); setStatsPage(1); loadStats('my', 1); }}>{t('personalStats')}</button>
            <button className={`tab-btn ${statsTab === 'team' ? 'active' : ''}`} onClick={() => { setStatsTab('team'); setStatsPage(1); loadStats('team', 1); }}>{t('teamLogs')}</button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="filters-panel">
          <div className="filter-item">
            <label>{language === 'en' ? 'Platform' : '渠道平台'}</label>
            <select value={statsPlatform} onChange={(e) => { setStatsPlatform(e.target.value); setStatsPage(1); loadStats(statsTab, 1, e.target.value, statsStatus, statsNickname); }}>
              <option value="">{language === 'en' ? 'All Platforms' : '所有渠道'}</option>
              {platforms.map(p => (
                <option key={p.platform_id} value={p.platform_id}>{p.platform_name}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>{t('status')}</label>
            <select value={statsStatus} onChange={(e) => { setStatsStatus(e.target.value); setStatsPage(1); loadStats(statsTab, 1, statsPlatform, e.target.value, statsNickname); }}>
              <option value="">{language === 'en' ? 'All Statuses' : '所有状态'}</option>
              <option value="1">{language === 'en' ? 'Success' : '成功'}</option>
              <option value="2">{language === 'en' ? 'Quota Full' : '配额满'}</option>
              <option value="3">{language === 'en' ? 'Pre-Screen Terminated' : '甄别筛选未通过'}</option>
              <option value="4">{language === 'en' ? 'Quality Terminated' : '质量审核未通过'}</option>
              <option value="5">{language === 'en' ? 'Unknown Error' : '未知错误'}</option>
              <option value="6">{language === 'en' ? 'Deduction' : '扣除积分'}</option>
            </select>
          </div>
          {statsTab === 'team' && (
            <div className="filter-item">
              <label>{t('username')}</label>
              <input
                type="text"
                placeholder={language === 'en' ? 'Search member...' : '搜索会员...'}
                value={statsNickname}
                onChange={(e) => setStatsNickname(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setStatsPage(1); loadStats('team', 1, statsPlatform, statsStatus, statsNickname); } }}
              />
            </div>
          )}
          <div className="filter-actions-row">
            <button className="btn-filter-apply" onClick={() => { setStatsPage(1); loadStats(statsTab, 1, statsPlatform, statsStatus, statsNickname); }}>{language === 'en' ? 'Apply' : '筛选'}</button>
            <button className="btn-filter-reset" onClick={() => { setStatsPlatform(''); setStatsStatus(''); setStatsNickname(''); setStatsPage(1); loadStats(statsTab, 1, '', '', ''); }}>{language === 'en' ? 'Reset' : '重置'}</button>
          </div>
        </div>

        {statsLoading ? (
          <div className="center-loader">
            <div className="loader-ring" />
            <p>{t('loading')}</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            {statsTab === 'my' ? (
              <div className="summary-cards">
                <div className="summary-card">
                  <span>{language === 'en' ? 'Total Offers' : '调查总量'}</span>
                  <strong>{personalStats.offers}</strong>
                </div>
                <div className="summary-card stat-green">
                  <span>{language === 'en' ? 'Success Payouts' : '成功结算'}</span>
                  <strong>{fmtVal(personalStats.success)}</strong>
                </div>
                <div className="summary-card stat-red">
                  <span>{language === 'en' ? 'Failed Payouts' : '失败结算'}</span>
                  <strong>{fmtVal(personalStats.failed)}</strong>
                </div>
                <div className="summary-card stat-orange">
                  <span>{t('language') === 'en' ? 'Deductions' : '扣分记录'}</span>
                  <strong>{fmtVal(personalStats.deduction)}</strong>
                </div>
              </div>
            ) : (
              <div className="summary-cards team-summary">
                <div className="summary-card">
                  <span>{language === 'en' ? 'Team Offers' : '团队调查总量'}</span>
                  <strong>{teamStats.offers}</strong>
                </div>
                <div className="summary-card stat-green">
                  <span>{language === 'en' ? 'Total Member Earnings' : '成员成功结算总额'}</span>
                  <strong>{fmtVal(teamStats.teamsuccess)}</strong>
                </div>
                <div className="summary-card stat-red">
                  <span>{language === 'en' ? 'Total Member Failed' : '成员失败结算总额'}</span>
                  <strong>{fmtVal(teamStats.teamfailed)}</strong>
                </div>
                <div className="summary-card stat-orange">
                  <span>{language === 'en' ? 'Total Member Deductions' : '成员扣分记录总额'}</span>
                  <strong>{fmtVal(teamStats.teamdeduction)}</strong>
                </div>
              </div>
            )}

            {/* Conversions Log Table */}
            <div className="conversions-section">
              <h3 className="section-subtitle">{language === 'en' ? 'Conversions Audit Log' : '数据流水审计日志'}</h3>

              {conversionsData.list.length === 0 ? (
                <p className="no-data-msg">{language === 'en' ? 'No conversions recorded matching filters.' : '没有找到符合过滤条件的流水记录。'}</p>
              ) : (
                <>
                  <div className="table-wrap">
                    <table className="stats-table">
                      <thead>
                        <tr>
                          <th>{language === 'en' ? 'Txn ID / Project' : '交易单号 / 调查项目'}</th>
                          <th>{language === 'en' ? 'Platform' : '渠道'}</th>
                          {statsTab === 'team' && <th>{language === 'en' ? 'Member' : '成员'}</th>}
                          <th>{language === 'en' ? 'Member Payout' : '会员积分结算'}</th>
                          <th>{language === 'en' ? 'IP' : 'IP地址'}</th>
                          <th>{t('status')}</th>
                          <th>{language === 'en' ? 'Time' : '结算时间'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversionsData.list.map(c => {
                          let statusText = language === 'en' ? 'Unknown' : '未知';
                          let statusClass = 'badge-other';
                          if (c.reward_status === 1) { statusText = language === 'en' ? 'Success' : '成功'; statusClass = 'badge-success'; }
                          else if (c.reward_status === 2) { statusText = language === 'en' ? 'Quota Full' : '配额满'; statusClass = 'badge-fail'; }
                          else if (c.reward_status === 3) { statusText = language === 'en' ? 'Pre-Screen Terminated' : '筛选淘汰'; statusClass = 'badge-fail'; }
                          else if (c.reward_status === 4) { statusText = language === 'en' ? 'Quality Terminated' : '质量淘汰'; statusClass = 'badge-fail'; }
                          else if (c.reward_status === 5) { statusText = language === 'en' ? 'Unknown Error' : '未知错误'; statusClass = 'badge-fail'; }
                          else if (c.reward_status === 6) { statusText = language === 'en' ? 'Deduction' : '扣分记录'; statusClass = 'badge-deduct'; }

                          return (
                            <tr key={c.reward_id}>
                              <td>
                                <div className="cell-main">{c.txn_id}</div>
                                <div className="cell-sub">{c.project_pno || '—'}</div>
                              </td>
                              <td>{c.platform?.platform_name || '—'}</td>
                              {statsTab === 'team' && <td>{c.member?.nickname || '—'}</td>}
                              <td className="cell-money">{fmtVal(c.member_payout)}</td>
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
                        {language === 'en' ? '← Previous' : '← 上一页'}
                      </button>
                      <span className="pag-info">
                        {language === 'en' ? `Page ${statsPage} of ${conversionsData.total_pages}` : `第 ${statsPage} 页 / 共 ${conversionsData.total_pages} 页`}
                      </span>
                      <button
                        disabled={statsPage >= conversionsData.total_pages}
                        onClick={() => { const p = statsPage + 1; setStatsPage(p); loadStats(statsTab, p); }}
                        className="pag-btn"
                      >
                        {language === 'en' ? 'Next →' : '下一页 →'}
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
