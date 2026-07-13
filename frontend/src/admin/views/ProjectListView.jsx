import { useState, useEffect, useCallback } from 'react';
import { Power, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { adminFetch, getAdminToken } from '../utils/adminApi';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Surveys' },
  { value: 'active', label: 'Active Only' },
  { value: 'disabled', label: 'Disabled Only' },
];

export default function ProjectListView() {
  const [projects, setProjects] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [status, setStatus] = useState('all');

  const token = getAdminToken();

  const fetchProjects = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: p,
        limit: 20,
        ...(search && { search }),
        ...(platformId && { platform_id: platformId }),
        status,
      }).toString();
      const res = await adminFetch(`/project/list?${qs}`, 'GET', null, token);
      if (res.code === 200) {
        setProjects(res.data.list || []);
        setTotal(res.data.count || 0);
        setPages(res.data.pages || 1);
      }
    } catch (err) {
      console.error('Project list error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, search, platformId, status]);

  const fetchPlatforms = useCallback(async () => {
    try {
      const res = await adminFetch('/list?limit=100', 'GET', null, token);
      if (res.code === 200) setPlatforms(res.data.list || []);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    fetchPlatforms();
    fetchProjects(1);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProjects(1);
  };

  const handleToggle = async (project) => {
    const newState = project.is_disable === 1 ? 0 : 1;
    try {
      await adminFetch('/project/toggle', 'POST', { project_id: project.project_id, is_disable: newState }, token);
      setProjects(prev => prev.map(p => p.project_id === project.project_id ? { ...p, is_disable: newState } : p));
    } catch (err) {
      console.error('Toggle error:', err.message);
    }
  };

  const goPage = (p) => {
    setPage(p);
    fetchProjects(p);
  };

  const fmtCPI = (cpi) => {
    const n = Number(cpi);
    return isNaN(n) ? '—' : `$${n.toFixed(2)}`;
  };

  const fmtQuota = (complete, quota) => {
    if (!quota || quota === 0) return `${complete} / ∞`;
    const pct = Math.min(100, Math.round((complete / quota) * 100));
    return (
      <div style={{ minWidth: '100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '11px', color: 'var(--pm-text-secondary)' }}>
          <span>{complete} / {quota}</span>
          <span>{pct}%</span>
        </div>
        <div style={{ height: '4px', borderRadius: '99px', background: 'var(--pm-border-layout)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 90 ? 'var(--pm-danger)' : pct >= 70 ? 'var(--pm-warning)' : 'var(--pm-accent)', borderRadius: '99px', transition: 'width 0.5s' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--pm-text-primary)', marginBottom: '4px' }}>
          Survey Explorer
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--pm-text-secondary)' }}>
          {total.toLocaleString()} survey project{total !== 1 ? 's' : ''} total
        </p>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pm-text-secondary)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by name or PNO..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>

        <select
          className="form-select"
          value={platformId}
          onChange={e => setPlatformId(e.target.value)}
          style={{ width: 'auto', minWidth: '180px' }}
        >
          <option value="">All Platforms</option>
          {platforms.map(p => (
            <option key={p.platform_id} value={p.platform_id}>{p.platform_name}</option>
          ))}
        </select>

        <select
          className="form-select"
          value={status}
          onChange={e => setStatus(e.target.value)}
          style={{ width: 'auto', minWidth: '140px' }}
        >
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--pm-text-secondary)' }}>
            Loading surveys...
          </div>
        ) : projects.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--pm-text-secondary)' }}>
            No surveys found matching your filters.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Project PNO</th>
                <th>Survey Name</th>
                <th>Platform</th>
                <th>CPI</th>
                <th>LOI (min)</th>
                <th>IR (%)</th>
                <th>Quota Progress</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Toggle</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.project_id}>
                  <td>
                    <code style={{ fontSize: '11px', background: 'var(--pm-bg)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      {project.project_pno}
                    </code>
                  </td>
                  <td style={{ fontWeight: 600, maxWidth: '200px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.project_name}
                    </div>
                  </td>
                  <td style={{ color: 'var(--pm-text-secondary)', fontSize: '13px' }}>
                    {project.platform?.platform_name || '—'}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--pm-success)' }}>
                    {fmtCPI(project.project_cpi)}
                  </td>
                  <td style={{ color: 'var(--pm-text-secondary)' }}>{project.project_loi || '—'}</td>
                  <td style={{ color: 'var(--pm-text-secondary)' }}>{project.project_ir ? `${project.project_ir}%` : '—'}</td>
                  <td>{fmtQuota(project.project_complete, project.project_quota)}</td>
                  <td>
                    <span className={`badge ${project.is_disable === 1 ? 'badge-danger' : 'badge-success'}`}>
                      {project.is_disable === 1 ? 'Disabled' : 'Live'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={`btn ${project.is_disable === 1 ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleToggle(project)}
                      style={{ padding: '6px', gap: '4px' }}
                      title={project.is_disable === 1 ? 'Enable' : 'Disable'}
                    >
                      <Power size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 10px' }} disabled={page === 1} onClick={() => goPage(page - 1)}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '13px', color: 'var(--pm-text-secondary)' }}>
            Page {page} of {pages}
          </span>
          <button className="btn btn-secondary" style={{ padding: '6px 10px' }} disabled={page === pages} onClick={() => goPage(page + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
