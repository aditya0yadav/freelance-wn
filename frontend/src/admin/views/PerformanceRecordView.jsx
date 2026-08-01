import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, RefreshCcw, Eye, X, UserCheck } from 'lucide-react';
import { adminFetch, getAdminToken } from '../utils/adminApi';
import { useAdminTheme } from '../context/AdminThemeContext';

export default function PerformanceRecordView() {
  const token = getAdminToken();
  const { theme } = useAdminTheme();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const LIMIT = 20;

  const [searchField, setSearchField] = useState('nickname');
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortNewest, setSortNewest] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);

  const STATUS_MAP = {
    1: { label: 'Success',        color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    2: { label: 'Disqualified',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    3: { label: 'Overquota',      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    4: { label: 'Terminated',     color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
    6: { label: 'Reconciliation', color: '#EC4899', bg: 'rgba(236,72,153,0.12)' },
  };

  const fmt = (v) => v ? new Date(v).toLocaleString() : '—';
  // coins / usd_currency_coins = real USD amount (e.g. 275 coins / 100 = $2.75)
  const usd = (coins, rate) => {
    if (coins == null) return '—';
    const r = rate && rate > 0 ? rate : 100;
    return '$' + (Number(coins) / r).toFixed(2);
  };
  const timeTaken = (start, end) => {
    if (!start || !end) return '—';
    const ms = new Date(end) - new Date(start);
    if (isNaN(ms) || ms < 0) return '—';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m === 0 ? `${s} sec` : `${m} min ${s % 60} sec`;
  };

  const doFetch = useCallback(async (pg) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
      if (searchField && searchValue) { params.set('search_field', searchField); params.set('search_value', searchValue); }
      if (statusFilter) params.set('status', statusFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const res = await adminFetch('/reward/list?' + params.toString(), 'GET', null, token);
      if (res.code === 200) {
        let list = res.data.list || [];
        if (sortNewest) list = [...list].sort((a, b) => new Date(b.create_time || 0) - new Date(a.create_time || 0));
        setRecords(list);
        const cnt = res.data.count || 0;
        setTotal(cnt);
        setPages(Math.ceil(cnt / LIMIT) || 1);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, searchField, searchValue, statusFilter, startDate, endDate, sortNewest]);

  useEffect(() => { doFetch(1); }, []);

  const handleSearch = () => { setPage(1); doFetch(1); };
  const handleReset = () => {
    setSearchField('nickname'); setSearchValue('');
    setStatusFilter(''); setStartDate(''); setEndDate('');
    setSortNewest(false); setPage(1);
    setTimeout(() => doFetch(1), 0);
  };
  const goPage = (pg) => { setPage(pg); doFetch(pg); };

  const TH = { padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--pm-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', borderBottom: '2px solid var(--pm-border-layout)', background: 'var(--pm-bg)' };
  const TD = { padding: '9px 12px', fontSize: 12, color: 'var(--pm-text-primary)', verticalAlign: 'middle', borderBottom: '1px solid var(--pm-border-layout)', whiteSpace: 'nowrap' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }} className="anima-fade-in">
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--pm-text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
          Performance Records
        </h2>
        <p style={{ fontSize: 13, color: 'var(--pm-text-secondary)', margin: '4px 0 0' }}>
          Full survey completion log with rewards, timing, and member details.
        </p>
      </div>

      <div style={{ background: 'var(--pm-card)', border: '1px solid var(--pm-border-layout)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--pm-text-secondary)' }}>Search</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select className="form-input" style={{ height: 34, fontSize: 12 }} value={searchField} onChange={e => setSearchField(e.target.value)}>
              <option value="nickname">Account / Nickname / ID</option>
              <option value="uuid">UUID</option>
              <option value="project_no">Project No</option>
              <option value="ip">IP Address</option>
            </select>
            <input className="form-input" style={{ height: 34, fontSize: 12, width: 200 }}
              placeholder="Please enter your query..."
              value={searchValue} onChange={e => setSearchValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--pm-text-secondary)' }}>Start Date</label>
          <input type="date" className="form-input" style={{ height: 34, fontSize: 12 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--pm-text-secondary)' }}>End Date</label>
          <input type="date" className="form-input" style={{ height: 34, fontSize: 12 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--pm-text-secondary)' }}>Status</label>
          <select className="form-input" style={{ height: 34, fontSize: 12 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="1">Success</option>
            <option value="2">Disqualified</option>
            <option value="3">Overquota</option>
            <option value="4">Terminated</option>
            <option value="6">Reconciliation</option>
          </select>
        </div>
        <button className={sortNewest ? 'btn btn-primary' : 'btn btn-secondary'} style={{ height: 34, fontSize: 12, alignSelf: 'flex-end' }}
          onClick={() => { setSortNewest(p => !p); setPage(1); setTimeout(() => doFetch(1), 0); }}>
          <RefreshCcw size={12} /> {sortNewest ? 'Newest ON' : 'Sort: Newest'}
        </button>
        <button className="btn btn-primary" style={{ height: 34, fontSize: 12, alignSelf: 'flex-end' }} onClick={handleSearch}>
          <Search size={12} /> Query
        </button>
        <button className="btn btn-secondary" style={{ height: 34, fontSize: 12, alignSelf: 'flex-end' }} onClick={handleReset}>
          <RefreshCcw size={12} /> Reset
        </button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--pm-text-secondary)' }}>
        Total: <strong style={{ color: 'var(--pm-text-primary)' }}>{total}</strong> records | Page <strong>{page}</strong> / {pages}
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--pm-border-layout)', borderRadius: 10 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>Loading records...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>
            <UserCheck size={36} style={{ marginBottom: 10, opacity: 0.25 }} /><div>No performance records found.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={TH}>ID</th><th style={TH}>UUID</th><th style={TH}>PID</th>
                <th style={TH}>Project No</th><th style={TH}>Project Name</th>
                <th style={TH}>Platform</th><th style={TH}>Team</th><th style={TH}>Member</th>
                <th style={TH}>Rewards (Platform)</th><th style={TH}>Rewards (Team)</th><th style={TH}>Rewards (Member)</th>
                <th style={TH}>Status</th><th style={TH}>Time Taken</th>
                <th style={TH}>IP</th><th style={TH}>UA</th>
                <th style={TH}>Start Time</th><th style={TH}>Completion Time</th><th style={TH}>Review Time</th>
                <th style={{ ...TH, textAlign: 'right' }}>Operate</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const st = STATUS_MAP[r.reward_status] || { label: '#' + r.reward_status, color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' };
                return (
                  <tr key={r.reward_id}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--pm-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...TD, fontWeight: 700, color: 'var(--pm-accent)' }}>{r.reward_id}</td>
                    <td style={{ ...TD, fontFamily: 'ui-monospace,monospace', fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.uuid}>{r.uuid}</td>
                    <td style={{ ...TD, fontFamily: 'ui-monospace,monospace', fontSize: 11 }}>{r.project_pno || '-'}</td>
                    <td style={TD}>{r.project_no || '-'}</td>
                    <td style={{ ...TD, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.project_name}>{r.project_name || '-'}</td>
                    <td style={TD}>{(r.platform && r.platform.platform_name) || ('#' + r.platform_id)}</td>
                    <td style={TD}>{(r.team && r.team.team_name) || ('#' + r.team_id)}</td>
                    <td style={{ ...TD, fontWeight: 600 }}>{(r.member && r.member.nickname) || ('#' + r.member_id)}</td>
                    <td style={{ ...TD, color: '#7C3AED', fontWeight: 700 }}>{usd(r.payout, r.usd_currency_coins)}</td>
                    <td style={{ ...TD, color: '#F59E0B', fontWeight: 700 }}>{usd(r.team_payout, r.usd_currency_coins)}</td>
                    <td style={{ ...TD, color: '#10B981', fontWeight: 700 }}>{usd(r.member_payout, r.usd_currency_coins)}</td>
                    <td style={TD}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td style={TD}>{timeTaken(r.start_time, r.create_time)}</td>
                    <td style={{ ...TD, fontFamily: 'ui-monospace,monospace', fontSize: 11 }}>{r.ip || '-'}</td>
                    <td style={{ ...TD, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 10 }} title={r.ua}>{r.ua ? r.ua.substring(0, 28) + '...' : '-'}</td>
                    <td style={{ ...TD, fontSize: 11 }}>{r.start_time ? fmt(r.start_time) : '-'}</td>
                    <td style={{ ...TD, fontSize: 11 }}>{r.create_time ? fmt(r.create_time) : '-'}</td>
                    <td style={{ ...TD, fontSize: 11 }}>{r.auth_time ? fmt(r.auth_time) : '-'}</td>
                    <td style={{ ...TD, textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => setDetailRecord(r)}>
                        <Eye size={12} /> Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} disabled={page <= 1} onClick={() => goPage(page - 1)}>Prev</button>
          {Array.from({ length: Math.min(pages, 10) }, (_, i) => {
            const pg = pages <= 10 ? i + 1 : Math.max(1, page - 4) + i;
            if (pg > pages) return null;
            return (
              <button key={pg} className={'btn ' + (page === pg ? 'btn-primary' : 'btn-secondary')}
                style={{ width: 36, height: 36, padding: 0, fontSize: 12 }} onClick={() => goPage(pg)}>{pg}</button>
            );
          })}
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} disabled={page >= pages} onClick={() => goPage(page + 1)}>Next</button>
        </div>
      )}

      {detailRecord && createPortal(
        <div className="admin-theme" data-theme={theme}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setDetailRecord(null)}>
            <div style={{ background: 'var(--pm-card)', borderRadius: 14, width: '100%', maxWidth: 660, maxHeight: '88vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--pm-border-layout)' }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--pm-text-primary)' }}>Performance Record Detail</h3>
                  <span style={{ fontSize: 11, color: 'var(--pm-text-secondary)', fontFamily: 'ui-monospace,monospace' }}>ID #{detailRecord.reward_id} - {detailRecord.uuid}</span>
                </div>
                <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pm-text-secondary)' }} onClick={() => setDetailRecord(null)}><X size={18} /></button>
              </div>
              <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                {[
                  ['ID', detailRecord.reward_id], ['UUID', detailRecord.uuid],
                  ['PID', detailRecord.project_pno || '-'], ['Project No', detailRecord.project_no || '-'],
                  ['Project Name', detailRecord.project_name || '-'],
                  ['Platform', (detailRecord.platform && detailRecord.platform.platform_name) || ('#' + detailRecord.platform_id)],
                  ['Team', (detailRecord.team && detailRecord.team.team_name) || ('#' + detailRecord.team_id)],
                  ['Member', (detailRecord.member && detailRecord.member.nickname) || ('#' + detailRecord.member_id)],
                  ['Rewards (Platform)', usd(detailRecord.payout, detailRecord.usd_currency_coins)], ['Rewards (Team)', usd(detailRecord.team_payout, detailRecord.usd_currency_coins)],
                  ['Rewards (Member)', usd(detailRecord.member_payout, detailRecord.usd_currency_coins)],
                  ['Status', (STATUS_MAP[detailRecord.reward_status] && STATUS_MAP[detailRecord.reward_status].label) || ('#' + detailRecord.reward_status)],
                  ['Time Taken', timeTaken(detailRecord.start_time, detailRecord.create_time)], ['IP', detailRecord.ip || '-'],
                  ['Start Time', fmt(detailRecord.start_time)], ['Completion Time', fmt(detailRecord.create_time)],
                  ['Review Time', fmt(detailRecord.auth_time)],
                ].map(function(item) {
                  var label = item[0]; var value = item[1];
                  return (
                    <div key={label}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--pm-text-secondary)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text-primary)', wordBreak: 'break-all' }}>{String(value)}</div>
                    </div>
                  );
                })}
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--pm-text-secondary)', marginBottom: 2 }}>UA (User Agent)</div>
                  <div style={{ fontSize: 11, color: 'var(--pm-text-secondary)', wordBreak: 'break-all', fontFamily: 'ui-monospace,monospace', lineHeight: 1.6 }}>{detailRecord.ua || '-'}</div>
                </div>
              </div>
              <div style={{ padding: '14px 24px', borderTop: '1px solid var(--pm-border-layout)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setDetailRecord(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
