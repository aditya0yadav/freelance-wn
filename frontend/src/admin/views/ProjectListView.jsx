import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Power, ChevronLeft, ChevronRight, Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { adminFetch, getAdminToken } from '../utils/adminApi';
import { useAdminTheme } from '../context/AdminThemeContext';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Surveys' },
  { value: 'active', label: 'Active Only' },
  { value: 'disabled', label: 'Disabled Only' },
];

export default function ProjectListView() {
  const { theme } = useAdminTheme();
  const [projects, setProjects] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [status, setStatus] = useState('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Form states
  const [projNo, setProjNo] = useState('');
  const [projName, setProjName] = useState('');
  const [projPlatformId, setProjPlatformId] = useState('');
  const [projCpi, setProjCpi] = useState('0');
  const [projCurrency, setProjCurrency] = useState('');
  const [projQuota, setProjQuota] = useState('0');
  const [projLoi, setProjLoi] = useState('0');
  const [projIr, setProjIr] = useState('0');
  const [projClickUrl, setProjClickUrl] = useState('');
  const [projIsDisable, setProjIsDisable] = useState(0);

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

  const fetchCurrencies = useCallback(async () => {
    try {
      const res = await adminFetch('/currency/list', 'GET', null, token);
      if (res.code === 200) {
        const list = res.data.list || [];
        setCurrencies(list);
        if (list.length > 0) setProjCurrency(list[0].currency_id);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    fetchPlatforms();
    fetchCurrencies();
    fetchProjects(1);
  }, []);

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setProjNo('');
    setProjName('');
    setProjPlatformId(platforms[0]?.platform_id || '');
    setProjCpi('1.0');
    setProjCurrency(currencies[0]?.currency_id || '');
    setProjQuota('100');
    setProjLoi('15');
    setProjIr('80');
    setProjClickUrl('');
    setProjIsDisable(0);
    setShowModal(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingProject(p);
    setProjNo(p.project_no);
    setProjName(p.project_name);
    setProjPlatformId(p.platform_id);
    setProjCpi(p.project_cpi);
    setProjCurrency(p.project_currency);
    setProjQuota(p.project_quota);
    setProjLoi(p.project_loi);
    setProjIr(p.project_ir);
    setProjClickUrl(p.project_click_url || '');
    setProjIsDisable(p.is_disable);
    setShowModal(true);
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    try {
      const body = {
        project_no: projNo,
        platform_id: Number(projPlatformId),
        project_name: projName,
        project_cpi: Number(projCpi),
        project_currency: Number(projCurrency),
        project_quota: Number(projQuota),
        project_loi: Number(projLoi),
        project_ir: Number(projIr),
        project_click_url: projClickUrl,
        is_disable: Number(projIsDisable)
      };

      if (editingProject) {
        body.project_id = editingProject.project_id;
        const res = await adminFetch('/project/edit', 'POST', body, token);
        if (res.code === 200) {
          setShowModal(false);
          fetchProjects(page);
        } else {
          alert(res.msg || 'Save failed');
        }
      } else {
        const res = await adminFetch('/project/add', 'POST', body, token);
        if (res.code === 200) {
          setShowModal(false);
          fetchProjects(1);
        } else {
          alert(res.msg || 'Add failed');
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleDeleteProject = async (p) => {
    if (!window.confirm('Are you sure you want to delete this survey project?')) return;
    try {
      const res = await adminFetch('/project/delete', 'POST', { project_id: p.project_id }, token);
      if (res.code === 200) {
        fetchProjects(page);
      } else {
        alert(res.msg || 'Delete failed');
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--pm-text-primary)', marginBottom: '4px' }}>
            Survey Explorer
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--pm-text-secondary)' }}>
            {total.toLocaleString()} survey project{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-brand)', border: 'none' }}>
          <Plus size={16} /> Create Manual Project
        </button>
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
                <th style={{ textAlign: 'right' }}>Actions</th>
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
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className={`btn ${project.is_disable === 1 ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleToggle(project)}
                        style={{ padding: '6px' }}
                        title={project.is_disable === 1 ? 'Enable' : 'Disable'}
                      >
                        <Power size={14} />
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleOpenEditModal(project)}
                        style={{ padding: '6px' }}
                        title="Edit Project"
                      >
                        <Edit2 size={14} />
                      </button>
                      {project.is_api === 0 && (
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteProject(project)}
                          style={{ padding: '6px' }}
                          title="Delete Project"
                        >
                          <Trash2 size={14} style={{ color: 'var(--chart-danger)' }} />
                        </button>
                      )}
                    </div>
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
      {/* Create / Edit Modal */}
      {showModal && createPortal(
        <div className="admin-theme" data-theme={theme}>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="dialog-modal" style={{ maxWidth: '620px', width: '100%' }}>
              <div className="dialog-header">
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-color)' }}>
                  {editingProject ? 'Edit Manual Project' : 'Create Manual Project'}
                </h3>
                <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
              </div>

              <form onSubmit={handleSaveProject}>
                <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto' }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Project Code / No *</label>
                      <input
                        type="text"
                        placeholder="e.g. PRJ101"
                        value={projNo}
                        onChange={e => setProjNo(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Survey Name / Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. Tech Habits Study 2026"
                        value={projName}
                        onChange={e => setProjName(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Survey Platform *</label>
                      <select
                        value={projPlatformId}
                        onChange={e => setProjPlatformId(e.target.value)}
                        className="form-select"
                        required
                      >
                        <option value="">Select Platform</option>
                        {platforms.map(p => (
                          <option key={p.platform_id} value={p.platform_id}>{p.platform_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Target Currency *</label>
                      <select
                        value={projCurrency}
                        onChange={e => setProjCurrency(e.target.value)}
                        className="form-select"
                        required
                      >
                        <option value="">Select Currency</option>
                        {currencies.map(c => (
                          <option key={c.currency_id} value={c.currency_id}>{c.currency_name} ({c.currency_code})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">CPI ($ USD) *</label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={projCpi}
                        onChange={e => setProjCpi(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">LOI (Minutes)</label>
                      <input
                        type="number"
                        min="0"
                        value={projLoi}
                        onChange={e => setProjLoi(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">IR Incidence (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={projIr}
                        onChange={e => setProjIr(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Quota Maximum Limit</label>
                      <input
                        type="number"
                        min="0"
                        value={projQuota}
                        onChange={e => setProjQuota(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Moderate Status</label>
                      <select
                        value={projIsDisable}
                        onChange={e => setProjIsDisable(Number(e.target.value))}
                        className="form-select"
                      >
                        <option value="0">Live</option>
                        <option value="1">Disabled</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Manual Survey Redirect URL (Use `uuid` as param suffix) *</label>
                    <input
                      type="url"
                      placeholder="e.g. https://router.zamplia.com/click?survey_id=123&uid="
                      value={projClickUrl}
                      onChange={e => setProjClickUrl(e.target.value)}
                      className="form-input"
                      required
                    />
                    <small style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Tip: When users click on the survey, the platform's routing system automatically appends the unique tracking Session ID to the end of this URL.
                    </small>
                  </div>

                </div>

                <div className="dialog-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ background: 'var(--primary-brand)', border: 'none' }}>
                    {editingProject ? 'Save Changes' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
