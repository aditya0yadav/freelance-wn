import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCcw } from 'lucide-react';
import { adminFetch, getAdminToken } from '../utils/adminApi';

export default function OperationLogView() {
  const token = getAdminToken();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const qs = `?page=${p}&limit=20${q ? `&search=${encodeURIComponent(q)}` : ''}`;
      const res = await adminFetch(`/admin-log/list${qs}`, 'GET', null, token);
      if (res.code === 200) {
        setLogs(res.data.list || []);
        setTotal(res.data.count || 0);
        setPages(res.data.pages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    fetchLogs(1, '');
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }} className="anima-fade-in">
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--pm-text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
          Operation Logs
        </h2>
        <p style={{ fontSize: 13, color: 'var(--pm-text-secondary)', margin: '4px 0 0' }}>
          Audit trail of administrator actions, login attempts, and configurations updates.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, background: 'var(--pm-bg-card)', padding: '16px 20px', borderRadius: 10, border: '1px solid var(--pm-border-layout)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--pm-text-secondary)' }} />
            <input className="form-input" placeholder="Search admin name/action…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchLogs(1, search)} style={{ paddingLeft: 32, width: 240 }} />
          </div>
          <button className="btn btn-secondary" onClick={() => fetchLogs(1, search)}><Search size={13} /> Search</button>
          <button className="btn btn-secondary" onClick={() => { setSearch(''); fetchLogs(1, ''); }}><RefreshCcw size={13} /> Reset</button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>Loading logs…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>No operation logs found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Log ID</th><th>Admin Operator</th><th>Action Details</th><th>IP Address</th><th>User Agent</th><th>Timestamp</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.log_id}>
                  <td style={{ color: 'var(--pm-text-secondary)', fontSize: 12 }}>#{log.log_id}</td>
                  <td style={{ fontWeight: 700 }}>{log.admin_name}</td>
                  <td style={{ fontWeight: 500, color: 'var(--pm-text-primary)' }}>{log.action}</td>
                  <td><code style={{ fontSize: 12 }}>{log.ip || 'Localhost'}</code></td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--pm-text-secondary)' }} title={log.ua}>
                    {log.ua || 'System CLI'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--pm-text-secondary)' }}>
                    {log.create_time ? new Date(log.create_time).toLocaleString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(pg => (
            <button key={pg} className={`btn ${page === pg ? 'btn-primary' : 'btn-secondary'}`} style={{ width: 36, height: 36, padding: 0 }} onClick={() => { setPage(pg); fetchLogs(pg, search); }}>{pg}</button>
          ))}
        </div>
      )}
    </div>
  );
}
