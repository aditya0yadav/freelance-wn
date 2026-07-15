import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, Power, RefreshCcw, X, AlertCircle,
  BarChart3, Settings, Box, FolderKanban, Image, Search,
  TrendingUp, CheckCircle2, XCircle, Clock, Eye, RotateCcw, ChevronDown, Download, Upload, Link
} from 'lucide-react';
import { adminFetch, getAdminToken } from '../utils/adminApi';

/* ── helpers ───────────────────────────────────────────────── */
const EMPTY_FORM = {
  platform_name: '', platform_sign: '', platform_image: '', platform_color: '#7C3AED',
  platform_url: '', platform_quota_url: '', platform_click_url: '',
  platform_level: 5, is_list: 0, is_wall: 0, is_quota: 0,
  model_type: 0, pay_type: 0, is_disable: 0, sort: 0,
  app_id: '', app_key: '',
};
const Field = ({ label, children }) => (
  <div className="form-group" style={{ marginBottom: 0 }}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

/* ── Platforms Tab ──────────────────────────────────────────── */
function PlatformsTab({ token }) {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [imageMode, setImageMode] = useState('url'); // 'url' | 'upload'
  const fileInputRef = useRef(null);

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setFormData(f => ({ ...f, platform_image: e.target.result }));
    reader.readAsDataURL(file);
  };

  const handleExport = async () => {
    try {
      const res = await adminFetch('/export/generate', 'POST', {
        type: 3,
        export_remark: 'Platforms Directory Quick Export'
      }, token);
      if (res.code === 200) {
        navigate('/admin/exports');
      }
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const fetchPlatforms = useCallback(async (p = page, q = search) => {
    setLoading(true);
    try {
      const qs = `?page=${p}&limit=10${q ? `&search=${encodeURIComponent(q)}` : ''}`;
      const res = await adminFetch(`/list${qs}`, 'GET', null, token);
      if (res.code === 200) {
        setPlatforms(res.data.list || []);
        setTotal(res.data.count || 0);
        setPages(res.data.pages || 1);
      }
    } catch (err) { console.error(err.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchPlatforms(1, ''); }, []);

  const handleSave = async (e) => {
    e.preventDefault(); setErrorMsg('');
    if (!formData.platform_name.trim() || !formData.platform_sign.trim()) {
      setErrorMsg('Platform name and sign are required.'); return;
    }
    setSaving(true);
    try {
      const params = [];
      if (formData.app_id) params.push({ key: 1, name: 'app_id', value: formData.app_id });
      if (formData.app_key) params.push({ key: 2, name: 'app_key', value: formData.app_key });

      const { app_id, app_key, ...rest } = formData;
      const endpoint = selectedPlatform ? '/edit' : '/add';
      const body = selectedPlatform 
        ? { ...rest, params, platform_id: selectedPlatform.platform_id }
        : { ...rest, params };

      const res = await adminFetch(endpoint, 'POST', body, token);
      if (res.code === 200) { setModalOpen(false); fetchPlatforms(page, search); }
      else setErrorMsg(res.msg || 'Save failed');
    } catch (err) { setErrorMsg(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.platform_name}"?`)) return;
    await adminFetch('/dele', 'POST', { ids: [p.platform_id] }, token);
    fetchPlatforms(page, search);
  };

  const handleToggle = async (p) => {
    const newState = p.is_disable === 1 ? 0 : 1;
    await adminFetch('/disable', 'POST', { ids: [p.platform_id], is_disable: newState }, token);
    setPlatforms(prev => prev.map(x => x.platform_id === p.platform_id ? { ...x, is_disable: newState } : x));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Action bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search platforms…" value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchPlatforms(1, search)}
              style={{ paddingLeft: 32, width: 220 }} />
          </div>
          <button className="btn btn-secondary" onClick={() => fetchPlatforms(1, search)}>
            <Search size={13} /> Search
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => { setSelectedPlatform(null); setFormData(EMPTY_FORM); setModalOpen(true); }}>
            <Plus size={16} /> Add Platform
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Total', value: total, icon: <Box size={16} />, color: 'var(--primary-brand)' },
          { label: 'Active', value: platforms.filter(p => p.is_disable !== 1).length, icon: <CheckCircle2 size={16} />, color: 'var(--chart-success)' },
          { label: 'Disabled', value: platforms.filter(p => p.is_disable === 1).length, icon: <XCircle size={16} />, color: 'var(--chart-danger)' },
          { label: 'With Quota', value: platforms.filter(p => p.is_quota === 1).length, icon: <Clock size={16} />, color: 'var(--chart-warning)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-color)', border: '1.5px solid var(--divider-color)', borderRadius: 14, padding: '16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-color)' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : platforms.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No platforms found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th><th>Platform</th><th>Sign</th><th>Level</th>
                <th>Features</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map(p => (
                <tr key={p.platform_id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{p.platform_id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.platform_image
                        ? <img src={p.platform_image} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
                        : <div style={{ width: 28, height: 28, borderRadius: 6, background: p.platform_color || 'var(--primary-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image size={14} color="#fff" /></div>
                      }
                      <span style={{ fontWeight: 700, color: 'var(--text-color)' }}>{p.platform_name}</span>
                    </div>
                  </td>
                  <td><code style={{ fontSize: 12, background: 'var(--divider-color)', padding: '2px 6px', borderRadius: 4 }}>{p.platform_sign}</code></td>
                  <td><span className="badge badge-info">Lv {p.platform_level}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {p.is_list === 1 && <span className="badge badge-success" style={{ fontSize: 10 }}>List</span>}
                      {p.is_wall === 1 && <span className="badge badge-info" style={{ fontSize: 10 }}>Wall</span>}
                      {p.is_quota === 1 && <span className="badge badge-warning" style={{ fontSize: 10 }}>Quota</span>}
                    </div>
                  </td>
                  <td><span className={`badge ${p.is_disable === 1 ? 'badge-danger' : 'badge-success'}`}>{p.is_disable === 1 ? 'Disabled' : 'Active'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" onClick={() => adminFetch('/pull', 'POST', { platform_id: p.platform_id }, token)} style={{ padding: '6px 10px', fontSize: 11 }} title="Pull surveys">
                        <RotateCcw size={13} />
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          let app_id = '';
                          let app_key = '';
                          if (p.params) {
                            try {
                              const arr = typeof p.params === 'string' ? JSON.parse(p.params) : p.params;
                              if (Array.isArray(arr)) {
                                const idObj = arr.find(x => x.name === 'app_id');
                                const keyObj = arr.find(x => x.name === 'app_key');
                                if (idObj) app_id = idObj.value;
                                if (keyObj) app_key = keyObj.value;
                              }
                            } catch (e) {}
                          }
                          setSelectedPlatform(p);
                          setFormData({ ...EMPTY_FORM, ...p, app_id, app_key });
                          setModalOpen(true);
                        }}
                        style={{ padding: '6px' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button className={`btn ${p.is_disable === 1 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleToggle(p)} style={{ padding: '6px' }} title="Toggle"><Power size={14} /></button>
                      <button className="btn btn-danger" onClick={() => handleDelete(p)} style={{ padding: '6px' }}><Trash2 size={14} /></button>
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
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(pg => (
            <button key={pg} className={`btn ${page === pg ? 'btn-primary' : 'btn-secondary'}`}
              style={{ width: 36, height: 36, padding: 0 }}
              onClick={() => { setPage(pg); fetchPlatforms(pg, search); }}>{pg}</button>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="dialog-overlay">
          <form onSubmit={handleSave} className="dialog-modal" style={{ maxWidth: 640 }}>
            <div className="dialog-header">
              <h3 style={{ fontWeight: 700, color: 'var(--text-color)' }}>{selectedPlatform ? 'Edit Platform' : 'Add New Platform'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {errorMsg && <div style={{ background: 'var(--pm-danger-bg)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '10px 14px', color: 'var(--chart-danger)', fontSize: 13, display: 'flex', gap: 8 }}><AlertCircle size={15} />{errorMsg}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Platform Name *"><input className="form-input" value={formData.platform_name} onChange={e => setFormData(f => ({ ...f, platform_name: e.target.value }))} required /></Field>
                <Field label="Sign (unique key) *"><input className="form-input" value={formData.platform_sign} onChange={e => setFormData(f => ({ ...f, platform_sign: e.target.value }))} required /></Field>
                {/* Logo Picker */}
                <div style={{ gridColumn: 'span 2' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label className="form-label">Platform Logo</label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button type="button" onClick={() => setImageMode('url')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: `1px solid ${imageMode === 'url' ? 'var(--primary-brand, #7C3AED)' : 'var(--divider-color, #e6e6ea)'}`, background: imageMode === 'url' ? 'rgba(124,58,237,0.08)' : 'transparent', color: imageMode === 'url' ? 'var(--primary-brand, #7C3AED)' : 'var(--text-muted, #8c8c9a)', cursor: 'pointer' }}>
                          <Link size={10} /> URL
                        </button>
                        <button type="button" onClick={() => setImageMode('upload')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: `1px solid ${imageMode === 'upload' ? 'var(--primary-brand, #7C3AED)' : 'var(--divider-color, #e6e6ea)'}`, background: imageMode === 'upload' ? 'rgba(124,58,237,0.08)' : 'transparent', color: imageMode === 'upload' ? 'var(--primary-brand, #7C3AED)' : 'var(--text-muted, #8c8c9a)', cursor: 'pointer' }}>
                          <Upload size={10} /> Upload
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {/* Preview thumbnail */}
                      <div
                        style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid var(--divider-color, #e6e6ea)', background: '#f8f8fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', cursor: imageMode === 'upload' ? 'pointer' : 'default' }}
                        onClick={() => imageMode === 'upload' && fileInputRef.current?.click()}
                        title={imageMode === 'upload' ? 'Click to choose image' : ''}
                      >
                        {formData.platform_image
                          ? <img src={formData.platform_image} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Image size={18} color="#bbb" />}
                      </div>
                      {imageMode === 'url' ? (
                        <input
                          className="form-input"
                          style={{ flex: 1 }}
                          value={formData.platform_image || ''}
                          onChange={e => setFormData(f => ({ ...f, platform_image: e.target.value }))}
                          placeholder="https://example.com/logo.png"
                        />
                      ) : (
                        <div
                          style={{ flex: 1, border: '2px dashed var(--divider-color, #e6e6ea)', borderRadius: 8, padding: '10px 14px', textAlign: 'center', cursor: 'pointer', background: '#f8f8fc', transition: 'border-color 0.2s' }}
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => { e.preventDefault(); handleImageFile(e.dataTransfer.files[0]); }}
                        >
                          <Upload size={14} color="#aaa" style={{ display: 'inline-block', marginRight: 6 }} />
                          <span style={{ fontSize: 12, color: 'var(--text-muted, #8c8c9a)' }}>
                            {formData.platform_image && imageMode === 'upload' ? 'Image loaded ✓ — click to change' : 'Click or drag & drop an image'}
                          </span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={e => handleImageFile(e.target.files[0])}
                          />
                        </div>
                      )}
                      {formData.platform_image && (
                        <button type="button" onClick={() => setFormData(f => ({ ...f, platform_image: '' }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 4, flexShrink: 0 }} title="Clear">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <Field label="Brand Color"><input type="color" className="form-input" value={formData.platform_color || '#7C3AED'} onChange={e => setFormData(f => ({ ...f, platform_color: e.target.value }))} style={{ height: 38, cursor: 'pointer' }} /></Field>
                <Field label="Platform URL"><input className="form-input" value={formData.platform_url || ''} onChange={e => setFormData(f => ({ ...f, platform_url: e.target.value }))} placeholder="https://…" /></Field>
                <Field label="Quota Check URL"><input className="form-input" value={formData.platform_quota_url || ''} onChange={e => setFormData(f => ({ ...f, platform_quota_url: e.target.value }))} placeholder="https://…" /></Field>
                <Field label="Level (1–10)"><input type="number" className="form-input" value={formData.platform_level} onChange={e => setFormData(f => ({ ...f, platform_level: Number(e.target.value) }))} min={1} max={10} /></Field>
                <Field label="Sort Order"><input type="number" className="form-input" value={formData.sort} onChange={e => setFormData(f => ({ ...f, sort: Number(e.target.value) }))} /></Field>
                <Field label="Platform Click URL"><input className="form-input" value={formData.platform_click_url || ''} onChange={e => setFormData(f => ({ ...f, platform_click_url: e.target.value }))} placeholder="https://…" /></Field>
                <Field label="API App ID"><input className="form-input" value={formData.app_id || ''} onChange={e => setFormData(f => ({ ...f, app_id: e.target.value }))} placeholder="Enter App ID / Supplier ID..." /></Field>
                <div style={{ gridColumn: 'span 2' }}>
                  <Field label="API App Key (app_token)"><input className="form-input" value={formData.app_key || ''} onChange={e => setFormData(f => ({ ...f, app_key: e.target.value }))} placeholder="Enter Authorization App Key..." /></Field>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[{ key: 'is_list', label: 'Survey List' }, { key: 'is_wall', label: 'Offerwall' }, { key: 'is_quota', label: 'Quota Check' }, { key: 'is_disable', label: 'Disabled' }].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-color)' }}>
                    <input type="checkbox" checked={formData[key] === 1} onChange={e => setFormData(f => ({ ...f, [key]: e.target.checked ? 1 : 0 }))} style={{ accentColor: 'var(--primary-brand)', width: 16, height: 16 }} />{label}
                  </label>
                ))}
              </div>
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : selectedPlatform ? 'Update' : 'Add Platform'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ── Projects Tab ───────────────────────────────────────────── */
function ProjectsTab({ token }) {
  const [projects, setProjects] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  /* load platforms for filter dropdown */
  useEffect(() => {
    adminFetch('/list?limit=100', 'GET', null, token)
      .then(res => { if (res.code === 200) setPlatforms(res.data.list || []); })
      .catch(() => {});
  }, [token]);

  const fetchProjects = useCallback(async (p = 1, q = search, pid = platformFilter) => {
    setLoading(true);
    try {
      let qs = `?page=${p}&limit=12`;
      if (q) qs += `&search=${encodeURIComponent(q)}`;
      if (pid) qs += `&platform_id=${pid}`;
      const res = await adminFetch(`/project/list${qs}`, 'GET', null, token);
      if (res.code === 200) {
        setProjects(res.data.list || []);
        setTotal(res.data.count || 0);
        setPages(res.data.pages || 1);
      }
    } catch (err) { console.error(err.message); }
    finally { setLoading(false); }
  }, [token, search, platformFilter]);

  useEffect(() => { fetchProjects(1, '', ''); }, []);

  const handlePlatformChange = (pid) => {
    setPlatformFilter(pid);
    setPage(1);
    fetchProjects(1, search, pid);
  };

  /* IR% → colour */
  const irColor = (ir) => {
    if (ir >= 60) return 'var(--chart-success)';
    if (ir >= 30) return 'var(--chart-warning)';
    return 'var(--chart-danger)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Platform picker */}
          <div style={{ position: 'relative' }}>
            <select
              className="form-input"
              value={platformFilter}
              onChange={e => handlePlatformChange(e.target.value)}
              style={{ paddingLeft: 12, paddingRight: 32, minWidth: 180, cursor: 'pointer' }}
            >
              <option value="">All Platforms</option>
              {platforms.map(p => (
                <option key={p.platform_id} value={p.platform_id}>{p.platform_name}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search PNO…" value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchProjects(1, search, platformFilter)}
              style={{ paddingLeft: 32, width: 180 }} />
          </div>
          <button className="btn btn-secondary" onClick={() => fetchProjects(1, search, platformFilter)}><Search size={13} /> Go</button>
          <button className="btn btn-secondary" onClick={() => { setSearch(''); setPlatformFilter(''); fetchProjects(1, '', ''); }}><RefreshCcw size={13} /> Clear</button>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          {platformFilter ? `${total} projects on ${platforms.find(p => String(p.platform_id) === String(platformFilter))?.platform_name || 'platform'}` : `${total} projects total`}
        </span>
      </div>

      {/* ── Project cards ── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : projects.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <FolderKanban size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontWeight: 600 }}>No projects found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Try a different platform or clear the search</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projects.map(p => {
            const isExpanded = expandedRow === p.project_pno;
            const platform = platforms.find(pl => pl.platform_id === p.platform_id);
            const platColor = platform?.platform_color || 'var(--primary-brand)';

            return (
              <div key={p.project_pno} style={{
                background: 'var(--bg-color)',
                border: `1.5px solid ${isExpanded ? 'var(--primary-brand)' : 'var(--divider-color)'}`,
                borderRadius: 16,
                overflow: 'hidden',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: isExpanded ? '0 4px 24px rgba(124,58,237,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                {/* ── Row header (always visible) ── */}
                <div
                  onClick={() => setExpandedRow(isExpanded ? null : p.project_pno)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3fr 2fr 80px 80px 80px 90px 36px',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 20px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {/* PNO + platform chip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 4, height: 36, borderRadius: 99, background: platColor, flexShrink: 0 }} />
                    <div>
                      <code style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-color)', letterSpacing: '-0.3px' }}>{p.project_pno}</code>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: platColor, background: `${platColor}18`, padding: '2px 8px', borderRadius: 99 }}>
                          {platform?.platform_name || p.platform_name || `Platform ${p.platform_id}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* LOI */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>LOI</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-color)' }}>{p.project_loi || 0}m</span>
                  </div>

                  {/* IR% */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: irColor(p.project_ir || 0) }}>{p.project_ir || 0}%</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>IR</div>
                  </div>

                  {/* Quota */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary-brand)' }}>{p.project_quota || 0}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Quota</div>
                  </div>

                  {/* CPI */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--chart-success)' }}>${Number(p.project_cpi || 0).toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>CPI</div>
                  </div>

                  {/* Status */}
                  <div style={{ textAlign: 'center' }}>
                    <span className={`badge ${p.is_disable ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: 11 }}>
                      {p.is_disable ? '🔴 Closed' : '🟢 Open'}
                    </span>
                  </div>

                  {/* Expand chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                    <ChevronDown size={16} />
                  </div>
                </div>

                {/* ── Expanded detail panel ── */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid var(--divider-color)',
                    padding: '20px 24px',
                    background: 'rgba(124,58,237,0.02)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 20,
                    animation: 'fadeIn 0.2s ease-out'
                  }}>
                    {/* Detail col 1 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <DetailRow label="Project PNO" value={<code style={{ fontSize: 12, background: 'var(--divider-color)', padding: '3px 8px', borderRadius: 4 }}>{p.project_pno}</code>} />
                      <DetailRow label="Project Name" value={p.project_name || '—'} />
                      <DetailRow label="Platform" value={p.platform?.platform_name || platform?.platform_name || '—'} />
                      <DetailRow label="Project Code" value={<code style={{ fontSize: 11, background: 'var(--divider-color)', padding: '2px 6px', borderRadius: 4 }}>{p.project_code || '—'}</code>} />
                    </div>

                    {/* Detail col 2 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <DetailRow label="Incidence Rate" value={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--divider-color)', borderRadius: 99, overflow: 'hidden', width: 60 }}>
                            <div style={{ width: `${Math.min(100, p.project_ir || 0)}%`, height: '100%', background: irColor(p.project_ir || 0), borderRadius: 99 }} />
                          </div>
                          <span style={{ fontWeight: 700, color: irColor(p.project_ir || 0) }}>{p.project_ir || 0}%</span>
                        </div>
                      } />
                      <DetailRow label="LOI (minutes)" value={`${p.project_loi || 0} min`} />
                      <DetailRow label="CPI (USD)" value={<span style={{ fontWeight: 700, color: 'var(--chart-success)' }}>${Number(p.project_cpi || 0).toFixed(4)}</span>} />
                      <DetailRow label="Quota" value={`${p.project_complete || 0} / ${p.project_quota || 0} completed`} />
                    </div>

                    {/* Detail col 3 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <DetailRow label="Survey Link" value={
                        p.project_click_url
                          ? <a href={p.project_click_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-brand)', fontSize: 12, wordBreak: 'break-all', fontWeight: 600 }}>Open ↗</a>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      } />
                      <DetailRow label="Clicks" value={p.project_click || 0} />
                      <DetailRow label="Created" value={p.create_time ? new Date(p.create_time).toLocaleString() : '—'} />
                      <DetailRow label="Status" value={
                        <span className={`badge ${p.is_disable ? 'badge-danger' : 'badge-success'}`}>{p.is_disable ? 'Closed' : 'Open'}</span>
                      } />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
          {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(pg => (
            <button key={pg} className={`btn ${page === pg ? 'btn-primary' : 'btn-secondary'}`}
              style={{ width: 36, height: 36, padding: 0 }}
              onClick={() => { setPage(pg); fetchProjects(pg, search, platformFilter); }}>{pg}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* tiny helper */
const DetailRow = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 13, color: 'var(--text-color)', fontWeight: 600 }}>{value}</div>
  </div>
);


/* ── Analytics Tab ──────────────────────────────────────────── */
function AnalyticsTab({ token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/dashboard-stats', 'GET', null, token)
      .then(res => { if (res.code === 200) setStats(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading analytics…</div>;
  if (!stats) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No analytics data available.</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
      {[
        { label: 'Total Revenue', value: `$${Number(stats.revenue || 0).toFixed(2)}`, icon: <TrendingUp size={20} />, color: 'var(--primary-brand)' },
        { label: 'Total Clicks', value: (stats.clicks || 0).toLocaleString(), icon: <Eye size={20} />, color: 'var(--chart-info)' },
        { label: 'Completions', value: (stats.completes || 0).toLocaleString(), icon: <CheckCircle2 size={20} />, color: 'var(--chart-success)' },
        { label: 'Conversion', value: `${Number(stats.conversion || 0).toFixed(1)}%`, icon: <BarChart3 size={20} />, color: 'var(--chart-warning)' },
      ].map(s => (
        <div key={s.label} style={{
          background: 'var(--bg-color)', border: '1.5px solid var(--divider-color)',
          borderRadius: 18, padding: '28px', display: 'flex', flexDirection: 'column', gap: 12
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
            {s.icon}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-color)' }}>{s.value}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Settings Tab ────────────────────────────────────────────── */
function SettingsTab({ token }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: 'var(--bg-color)', border: '1.5px solid var(--divider-color)', borderRadius: 18, padding: 28 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-color)', marginBottom: 16, marginTop: 0 }}>Platform Configuration</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--text-muted)', fontSize: 14 }}>
          <p style={{ margin: 0 }}>• Platform pulls are triggered manually via the <strong>↺ Pull</strong> button per platform row.</p>
          <p style={{ margin: 0 }}>• Setting <strong>Quota Check</strong> enables automatic over-quota redirection for respondents.</p>
          <p style={{ margin: 0 }}>• The <strong>Level</strong> field controls display priority — higher level = listed first.</p>
          <p style={{ margin: 0 }}>• Platforms marked <strong>Disabled</strong> are hidden from the member survey wall.</p>
        </div>
      </div>
      <div style={{ background: 'var(--bg-color)', border: '1.5px solid var(--divider-color)', borderRadius: 18, padding: 28 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-color)', marginBottom: 16, marginTop: 0 }}>Integration Keys</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[{ label: 'Callback Secret', placeholder: 'sk_live_…' }, { label: 'Auth Token Header', placeholder: 'Authorization: Bearer …' }].map(f => (
            <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.label}</label>
              <input className="form-input" type="password" placeholder={f.placeholder} style={{ fontFamily: 'monospace' }} />
            </div>
          ))}
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 8 }}>Save Keys</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Export ─────────────────────────────────────────────── */
const TABS = [
  { id: 'platforms', label: 'All Platforms', icon: Box },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function PlatformListView() {
  const [activeTab, setActiveTab] = useState('platforms');
  const token = getAdminToken();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="anima-fade-in">
      {/* Page header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-color)', margin: 0, letterSpacing: '-0.5px' }}>Platform Management</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Manage survey providers, projects, analytics and integration settings.</p>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--divider-color)', paddingBottom: 0 }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: active ? 700 : 500,
              color: active ? 'var(--primary-brand)' : 'var(--text-muted)',
              borderBottom: active ? '2px solid var(--primary-brand)' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s', borderRadius: '8px 8px 0 0'
            }}>
              <Icon size={15} />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'platforms' && <PlatformsTab token={token} />}
        {activeTab === 'projects' && <ProjectsTab token={token} />}
        {activeTab === 'analytics' && <AnalyticsTab token={token} />}
        {activeTab === 'settings' && <SettingsTab token={token} />}
      </div>
    </div>
  );
}
