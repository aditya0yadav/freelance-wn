import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, Power, RefreshCcw, X, AlertCircle,
  BarChart3, Settings, Box, FolderKanban, Image, Search,
  TrendingUp, CheckCircle2, XCircle, Clock, Eye, RotateCcw, ChevronDown, Download, Upload, Link, ArrowLeft, Trash
} from 'lucide-react';
import { adminFetch, getAdminToken } from '../utils/adminApi';
import { useAdminTheme } from '../context/AdminThemeContext';

/* ── helpers ───────────────────────────────────────────────── */
const EMPTY_FORM = {
  platform_name: '', platform_sign: '', platform_image: '', platform_color: '#7C3AED',
  platform_url: '', platform_quota_url: '', platform_click_url: '',
  platform_level: 5, is_list: 0, is_wall: 0, is_quota: 0,
  model_type: 0, pay_type: 0, is_disable: 0, sort: 0,
  app_id: '', app_key: '',
  show_no: 1, show_complete: 1, show_click: 1, show_quota: 1, show_loi: 1, show_ir: 1,
  platform_persona_template: 0, platform_persona_backend: 0, is_custom: 0, is_accept_error: 0
};

const Field = ({ label, children }) => (
  <div className="form-group" style={{ marginBottom: 0 }}>
    <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{label}</label>
    {children}
  </div>
);

/* ── Platforms Tab (Main Directory) ──────────────────────────── */
function PlatformsTab({ token, theme, onSelectPlatform }) {
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
  const [imageMode, setImageMode] = useState('url');
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
      const qs = `?page=${p}&limit=15${q ? `&search=${encodeURIComponent(q)}` : ''}`;
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
          <button className="btn btn-primary" onClick={() => { setSelectedPlatform(null); setFormData(EMPTY_FORM); setModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary-brand)', border: 'none' }}>
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
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading platforms…</div>
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
                      <span
                        onClick={() => onSelectPlatform(p)}
                        style={{ fontWeight: 700, color: 'var(--text-color)', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {p.platform_name}
                      </span>
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
                      <button className="btn btn-secondary" onClick={() => onSelectPlatform(p)} style={{ padding: '6px' }} title="Configure Details Settings">
                        <Settings size={14} /> Configure
                      </button>
                      <button className="btn btn-secondary" onClick={() => {
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
                      }} style={{ padding: '6px' }} title="Edit Name/Sign">
                        <Edit2 size={14} />
                      </button>
                      <button className={`btn ${p.is_disable === 1 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleToggle(p)} style={{ padding: '6px' }} title="Toggle Status"><Power size={14} /></button>
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

      {/* Basic Platform Add/Edit Modal */}
      {modalOpen && createPortal(
        <div className="admin-theme" data-theme={theme}>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <form onSubmit={handleSave} className="dialog-modal" style={{ maxWidth: 640, width: '100%' }}>
              <div className="dialog-header">
                <h3 style={{ fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>{selectedPlatform ? 'Edit Platform' : 'Add New Platform'}</h3>
                <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>
              <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '75vh', overflowY: 'auto' }}>
                {errorMsg && <div style={{ background: 'var(--pm-danger-bg)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '10px 14px', color: 'var(--chart-danger)', fontSize: 13, display: 'flex', gap: 8 }}><AlertCircle size={15} />{errorMsg}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Platform Name *"><input className="form-input" value={formData.platform_name} onChange={e => setFormData(f => ({ ...f, platform_name: e.target.value }))} required /></Field>
                  <Field label="Sign (unique key) *"><input className="form-input" value={formData.platform_sign} onChange={e => setFormData(f => ({ ...f, platform_sign: e.target.value }))} required /></Field>
                  {/* Logo picker */}
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
                        <div
                          style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid var(--divider-color, #e6e6ea)', background: '#f8f8fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}
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
                            style={{ flex: 1, border: '2px dashed var(--divider-color, #e6e6ea)', borderRadius: 8, padding: '10px 14px', textAlign: 'center', cursor: 'pointer', background: '#f8f8fc' }}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload size={14} color="#aaa" style={{ display: 'inline-block', marginRight: 6 }} />
                            <span style={{ fontSize: 12, color: 'var(--text-muted, #8c8c9a)' }}>Choose image file</span>
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageFile(e.target.files[0])} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Field label="Brand Color"><input type="color" className="form-input" value={formData.platform_color || '#7C3AED'} onChange={e => setFormData(f => ({ ...f, platform_color: e.target.value }))} style={{ height: 38 }} /></Field>
                  <Field label="Platform URL"><input className="form-input" value={formData.platform_url || ''} onChange={e => setFormData(f => ({ ...f, platform_url: e.target.value }))} /></Field>
                  <Field label="Quota Check URL"><input className="form-input" value={formData.platform_quota_url || ''} onChange={e => setFormData(f => ({ ...f, platform_quota_url: e.target.value }))} /></Field>
                  <Field label="Level"><input type="number" className="form-input" value={formData.platform_level} onChange={e => setFormData(f => ({ ...f, platform_level: Number(e.target.value) }))} /></Field>
                  <Field label="Sort Order"><input type="number" className="form-input" value={formData.sort} onChange={e => setFormData(f => ({ ...f, sort: Number(e.target.value) }))} /></Field>
                  <Field label="Click Callback URL"><input className="form-input" value={formData.platform_click_url || ''} onChange={e => setFormData(f => ({ ...f, platform_click_url: e.target.value }))} /></Field>
                </div>
              </div>
              <div className="dialog-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--primary-brand)', border: 'none' }} disabled={saving}>Save</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Platform Detail View (New Detailed Settings tab layout) ──── */
function PlatformDetailView({ platform, onClose, onSave, token, theme }) {
  const [activeSubTab, setActiveSubTab] = useState('settings');
  const [platformData, setPlatformData] = useState(platform);
  const [personas, setPersonas] = useState([]);
  const [saving, setSaving] = useState(false);

  // Authorized team states
  const [authList, setAuthList] = useState([]);
  const [teams, setTeams] = useState([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRate, setAuthRate] = useState(80);
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // Scoped project inventory state
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewRecycle, setViewRecycle] = useState(false);

  // Load configuration options
  useEffect(() => {
    adminFetch('/persona/list?limit=100', 'GET', null, token).then(res => {
      if (res.code === 200) setPersonas(res.data.list || []);
    });
    fetchAuthorizations();
    fetchProjects();
  }, [token]);

  const fetchAuthorizations = async () => {
    try {
      const [authRes, teamRes] = await Promise.all([
        adminFetch('/auth/list', 'GET', null, token),
        adminFetch('/team/list', 'GET', null, token),
      ]);
      if (authRes.code === 200) {
        // filter authorizations belonging to this platform
        setAuthList((authRes.data.list || []).filter(a => a.platform_id === platform.platform_id));
      }
      if (teamRes.code === 200) {
        setTeams(teamRes.data.list || []);
        if (teamRes.data.list?.length > 0) setSelectedTeamId(teamRes.data.list[0].team_id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProjects = async (q = searchQuery, recycle = viewRecycle) => {
    setProjectsLoading(true);
    try {
      const endpoint = recycle ? '/project/recycleList' : '/project/list';
      const qs = `?platform_id=${platform.platform_id}&limit=100${q ? `&search=${encodeURIComponent(q)}` : ''}`;
      const res = await adminFetch(`${endpoint}${qs}`, 'GET', null, token);
      if (res.code === 200) {
        setProjects(res.data.list || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProjectsLoading(false);
    }
  };

  const updateField = async (key, value) => {
    const updated = { ...platformData, [key]: value };
    setPlatformData(updated);
    try {
      const body = {
        platform_id: platform.platform_id,
        platform_name: updated.platform_name,
        platform_sign: updated.platform_sign,
        platform_url: updated.platform_url || '',
        platform_quota_url: updated.platform_quota_url || '',
        platform_click_url: updated.platform_click_url || '',
        platform_persona_template: Number(updated.platform_persona_template) || 0,
        platform_persona_backend: Number(updated.platform_persona_backend) || 0,
        is_disable: Number(updated.is_disable),
        is_list: Number(updated.is_list),
        is_wall: Number(updated.is_wall),
        show_no: Number(updated.show_no),
        show_complete: Number(updated.show_complete),
        show_click: Number(updated.show_click),
        show_quota: Number(updated.show_quota),
        show_loi: Number(updated.show_loi),
        show_ir: Number(updated.show_ir),
        model_type: Number(updated.model_type),
        pay_type: Number(updated.pay_type),
        platform_currency: Number(updated.platform_currency),
        is_accept_error: Number(updated.is_accept_error)
      };
      const res = await adminFetch('/edit', 'POST', body, token);
      if (res.code === 200 && onSave) {
        onSave(res.data);
      }
    } catch (err) {
      console.error('Auto-save failed:', err.message);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        platform_id: platform.platform_id,
        platform_name: platformData.platform_name,
        platform_sign: platformData.platform_sign,
        platform_url: platformData.platform_url || '',
        platform_quota_url: platformData.platform_quota_url || '',
        platform_click_url: platformData.platform_click_url || '',
        platform_persona_template: Number(platformData.platform_persona_template) || 0,
        platform_persona_backend: Number(platformData.platform_persona_backend) || 0,
        is_disable: Number(platformData.is_disable),
        is_list: Number(platformData.is_list),
        is_wall: Number(platformData.is_wall),
        show_no: Number(platformData.show_no),
        show_complete: Number(platformData.show_complete),
        show_click: Number(platformData.show_click),
        show_quota: Number(platformData.show_quota),
        show_loi: Number(platformData.show_loi),
        show_ir: Number(platformData.show_ir),
        model_type: Number(platformData.model_type),
        pay_type: Number(platformData.pay_type),
        platform_currency: Number(platformData.platform_currency),
        is_accept_error: Number(platformData.is_accept_error)
      };
      const res = await adminFetch('/edit', 'POST', body, token);
      if (res.code === 200) {
        alert('Platform configuration saved successfully');
        if (onSave) onSave(res.data);
      } else {
        alert(res.msg || 'Save failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAuth = async (e) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    try {
      const res = await adminFetch('/auth/add', 'POST', {
        platform_id: platform.platform_id,
        team_id: Number(selectedTeamId),
        auth_rate: parseFloat(authRate)
      }, token);
      if (res.code === 200) {
        setAuthModalOpen(false);
        fetchAuthorizations();
      } else {
        alert(res.msg || 'Failed to authorize team');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteAuth = async (auth) => {
    if (!window.confirm(`Revoke authorization for ${auth.team?.team_name}?`)) return;
    try {
      const res = await adminFetch('/auth/delete', 'POST', { platform_auth_id: auth.platform_auth_id }, token);
      if (res.code === 200) {
        fetchAuthorizations();
      } else {
        // Fallback to /auth/dele
        const res2 = await adminFetch('/auth/dele', 'POST', { platform_auth_id: auth.platform_auth_id }, token);
        if (res2.code === 200) fetchAuthorizations();
        else alert(res2.msg || 'Failed to revoke');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  // Recycle actions for projects of this platform
  const handleRecycleRestore = async (proj) => {
    try {
      const res = await adminFetch('/project/recycleReco', 'POST', { ids: [proj.project_id] }, token);
      if (res.code === 200) {
        fetchProjects(searchQuery, true);
      } else {
        alert(res.msg || 'Failed to restore project');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const handleRecyclePurge = async (proj) => {
    if (!window.confirm('Permanently delete this project from database?')) return;
    try {
      const res = await adminFetch('/project/recycleDele', 'POST', { ids: [proj.project_id] }, token);
      if (res.code === 200) {
        fetchProjects(searchQuery, true);
      } else {
        alert(res.msg || 'Failed to purge project');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const handleProjectDelete = async (proj) => {
    if (!window.confirm(`Move project ${proj.project_no} to Recycle Bin?`)) return;
    try {
      const res = await adminFetch('/project/delete', 'POST', { ids: [proj.project_id] }, token);
      if (res.code === 200) {
        fetchProjects(searchQuery, false);
      } else {
        alert(res.msg || 'Delete failed');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="anima-fade-in">
      {/* Back Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} /> Back to List
        </button>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-color)', margin: 0 }}>
            {platform.platform_name} Platform Details
          </h2>
        </div>
      </div>

      {/* Basic info card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'var(--bg-color)', border: '1px solid var(--divider-color)', borderRadius: 14, padding: '20px' }}>
        <div>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Platform Name</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-color)' }}>{platform.platform_name}</span>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Platform Identifier</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-color)' }}>{platform.platform_sign}</span>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Creation Time</span>
          <span style={{ fontSize: 13, color: 'var(--text-color)' }}>
            {platform.create_time ? new Date(platform.create_time).toLocaleString() : 'N/A'}
          </span>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Update Time</span>
          <span style={{ fontSize: 13, color: 'var(--text-color)' }}>
            {platform.update_time ? new Date(platform.update_time).toLocaleString() : 'N/A'}
          </span>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '2px solid var(--divider-color)' }}>
        {[
          { id: 'settings', label: 'Platform settings' },
          { id: 'auths', label: 'Authorized Team' },
          { id: 'projects', label: 'Project List' },
          { id: 'recycle', label: 'Recycling Station' },
        ].map(sub => (
          <button key={sub.id} onClick={() => { setActiveSubTab(sub.id); setViewRecycle(sub.id === 'recycle'); fetchProjects(searchQuery, sub.id === 'recycle'); }} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: activeSubTab === sub.id ? 700 : 500,
            color: activeSubTab === sub.id ? 'var(--primary-brand)' : 'var(--text-muted)',
            borderBottom: activeSubTab === sub.id ? '2px solid var(--primary-brand)' : '2px solid transparent',
            marginBottom: -2, transition: 'all 0.15s'
          }}>
            {sub.label}
          </button>
        ))}
      </div>

      {/* Sub Tab contents */}
      <div>
        {/* Settings Sub Tab */}
        {activeSubTab === 'settings' && (
          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              
              {/* Toggles Container */}
              <div style={{ background: 'var(--bg-color)', border: '1px solid var(--divider-color)', borderRadius: 14, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800, color: 'var(--text-color)' }}>Basic Configurations</h3>
                
                {[
                  { label: 'On status (Active)', key: 'is_disable', invert: true },
                  { label: 'Enabled list', key: 'is_list' },
                  { label: 'Activation discount (Wall)', key: 'is_wall' },
                  { label: 'Showcase Guide', key: 'show_loi' },
                  { label: 'Show Survey ID', key: 'show_no' },
                  { label: 'Show survey name', key: 'show_complete' },
                  { label: 'View count', key: 'show_click' },
                  { label: 'Display completion rate', key: 'show_ir' },
                  { label: 'Display quota', key: 'show_quota' }
                ].map(item => {
                  const val = platformData[item.key] === 1;
                  const displayChecked = item.invert ? !val : val;
                  return (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-color)' }}>{item.label}:</span>
                      <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 22, cursor: 'pointer' }}>
                        <input type="checkbox" checked={displayChecked} onChange={e => {
                          const toSet = item.invert ? (e.target.checked ? 0 : 1) : (e.target.checked ? 1 : 0);
                          updateField(item.key, toSet);
                        }} style={{ opacity: 0, width: 0, height: 0 }} />
                        <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: displayChecked ? 'var(--primary-brand)' : '#ccc', borderRadius: 34, transition: '0.3s', pointerEvents: 'none' }}>
                          <span style={{ position: 'absolute', content: '""', height: 16, width: 16, left: displayChecked ? 25 : 3, bottom: 3, background: 'white', borderRadius: '50%', transition: '0.3s', pointerEvents: 'none' }} />
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* Radios & Selectors Container */}
              <div style={{ background: 'var(--bg-color)', border: '1px solid var(--divider-color)', borderRadius: 14, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800, color: 'var(--text-color)' }}>Callback & Persona Configuration</h3>

                {/* Radios */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Project Type</label>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                      <input type="radio" name="model_type" checked={platformData.model_type === 0} onChange={() => updateField('model_type', 0)} style={{ accentColor: 'var(--primary-brand)' }} /> Create manually
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                      <input type="radio" name="model_type" checked={platformData.model_type === 1} onChange={() => updateField('model_type', 1)} style={{ accentColor: 'var(--primary-brand)' }} /> API creation
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Callback Model</label>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                      <input type="radio" name="pay_type" checked={platformData.pay_type === 0} onChange={() => updateField('pay_type', 0)} style={{ accentColor: 'var(--primary-brand)' }} /> General Model
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                      <input type="radio" name="pay_type" checked={platformData.pay_type === 1} onChange={() => updateField('pay_type', 1)} style={{ accentColor: 'var(--primary-brand)' }} /> Custom Model
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Callback Reward</label>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                      <input type="radio" name="platform_currency" checked={platformData.platform_currency === 0} onChange={() => updateField('platform_currency', 0)} style={{ accentColor: 'var(--primary-brand)' }} /> currency
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                      <input type="radio" name="platform_currency" checked={platformData.platform_currency === 1} onChange={() => updateField('platform_currency', 1)} style={{ accentColor: 'var(--primary-brand)' }} /> gold
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Error Callback</label>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                      <input type="radio" name="is_accept_error" checked={platformData.is_accept_error === 0} onChange={() => updateField('is_accept_error', 0)} style={{ accentColor: 'var(--primary-brand)' }} /> Not accepted
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                      <input type="radio" name="is_accept_error" checked={platformData.is_accept_error === 1} onChange={() => updateField('is_accept_error', 1)} style={{ accentColor: 'var(--primary-brand)' }} /> take over
                    </label>
                  </div>
                </div>

                {/* Dropdowns */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Character Template</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Field label="Pre-existing character template:">
                      <select value={platformData.platform_persona_template} onChange={e => updateField('platform_persona_template', Number(e.target.value))} className="form-select">
                        <option value={0}>Do not use</option>
                        {personas.filter(p => p.persona_type === 0).map(p => (
                          <option key={p.persona_id} value={p.persona_id}>{p.persona_name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Post-character template:">
                      <select value={platformData.platform_persona_backend} onChange={e => updateField('platform_persona_backend', Number(e.target.value))} className="form-select">
                        <option value={0}>Do not use</option>
                        {personas.filter(p => p.persona_type === 1).map(p => (
                          <option key={p.persona_id} value={p.persona_id}>{p.persona_name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>

              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px', background: 'var(--primary-brand)', border: 'none' }} disabled={saving}>
                {saving ? 'Saving Config…' : 'Save Platform Settings'}
              </button>
            </div>
          </form>
        )}

        {/* Auths Sub Tab */}
        {activeSubTab === 'auths' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-color)' }}>Authorized Publisher Teams</h3>
              <button onClick={() => setAuthModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary-brand)', border: 'none' }}>
                <Plus size={15} /> Authorize Team
              </button>
            </div>

            <div className="table-container">
              {authList.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No teams authorized for this platform yet.</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr><th>Team ID</th><th>Team Name</th><th>Commission Rate split</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
                  </thead>
                  <tbody>
                    {authList.map(a => (
                      <tr key={a.platform_auth_id}>
                        <td>#{a.team_id}</td>
                        <td style={{ fontWeight: 700 }}>{a.team?.team_name || 'N/A'}</td>
                        <td><span className="badge badge-info">{a.auth_rate}%</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => handleDeleteAuth(a)} className="btn btn-danger" style={{ padding: '6px' }}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Authorize modal */}
            {authModalOpen && createPortal(
              <div className="admin-theme" data-theme={theme}>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                  <form onSubmit={handleAddAuth} className="dialog-modal" style={{ maxWidth: 420, width: '100%' }}>
                    <div className="dialog-header">
                      <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-color)' }}>Authorize Team</h3>
                      <button type="button" onClick={() => setAuthModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                    </div>
                    <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <Field label="Select Publisher Team *">
                        <select className="form-select" value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} required>
                          {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_name}</option>)}
                        </select>
                      </Field>
                      <Field label="Commission Rate split (0-100%) *">
                        <input type="number" step="0.01" value={authRate} onChange={e => setAuthRate(e.target.value)} className="form-input" required />
                      </Field>
                    </div>
                    <div className="dialog-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setAuthModalOpen(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" style={{ background: 'var(--primary-brand)', border: 'none' }}>Authorize</button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )}
          </div>
        )}

        {/* Projects Sub Tab */}
        {activeSubTab === 'projects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-input" placeholder="Search project PNO/No…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchProjects(searchQuery, false)} style={{ paddingLeft: 32, width: 220 }} />
              </div>
              <button className="btn btn-secondary" onClick={() => fetchProjects(searchQuery, false)}><Search size={13} /> Go</button>
              <button className="btn btn-secondary" onClick={() => { setSearchQuery(''); fetchProjects('', false); }}><RefreshCcw size={13} /> Reset</button>
            </div>

            <div className="table-container">
              {projectsLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading projects…</div>
              ) : projects.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No projects found under this platform.</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr><th>Project PNO</th><th>Survey No</th><th>CPI (Payout)</th><th>Completes</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
                  </thead>
                  <tbody>
                    {projects.map(proj => (
                      <tr key={proj.project_id}>
                        <td style={{ fontWeight: 700 }}>{proj.project_pno}</td>
                        <td>{proj.project_no}</td>
                        <td><span style={{ color: 'var(--primary-brand)', fontWeight: 700 }}>{proj.project_cpi} coins</span></td>
                        <td>{proj.project_complete} / {proj.project_quota}</td>
                        <td><span className={`badge ${proj.is_disable === 1 ? 'badge-danger' : 'badge-success'}`}>{proj.is_disable === 1 ? 'Disabled' : 'Active'}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => handleProjectDelete(proj)} className="btn btn-danger" style={{ padding: '6px' }} title="Delete"><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Recycling Station Sub Tab */}
        {activeSubTab === 'recycle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-color)' }}>Recycled Projects (Soft-deleted)</h3>
            <div className="table-container">
              {projectsLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading recycled projects…</div>
              ) : projects.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Recycle bin is empty.</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr><th>Project PNO</th><th>Survey No</th><th>CPI (Coins)</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {projects.map(proj => (
                      <tr key={proj.project_id}>
                        <td style={{ fontWeight: 700 }}>{proj.project_pno}</td>
                        <td>{proj.project_no}</td>
                        <td>{proj.project_cpi} coins</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleRecycleRestore(proj)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12 }}>
                              <RotateCcw size={12} /> Recycle to Enable
                            </button>
                            <button onClick={() => handleRecyclePurge(proj)} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12 }}>
                              <Trash size={12} /> Purge Database
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

/* ── Projects Tab (Global list) ────────────────────────────── */
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
  const [viewRecycle, setViewRecycle] = useState(false);

  useEffect(() => {
    adminFetch('/list?limit=100', 'GET', null, token)
      .then(res => { if (res.code === 200) setPlatforms(res.data.list || []); })
      .catch(() => {});
  }, [token]);

  const fetchProjects = useCallback(async (p = 1, q = search, pid = platformFilter, recycle = viewRecycle) => {
    setLoading(true);
    try {
      let qs = `?page=${p}&limit=12`;
      if (q) qs += `&search=${encodeURIComponent(q)}`;
      if (pid) qs += `&platform_id=${pid}`;
      const endpoint = recycle ? '/project/recycleList' : '/project/list';
      const res = await adminFetch(`${endpoint}${qs}`, 'GET', null, token);
      if (res.code === 200) {
        setProjects(res.data.list || []);
        setTotal(res.data.count || 0);
        setPages(res.data.pages || 1);
      }
    } catch (err) { console.error(err.message); }
    finally { setLoading(false); }
  }, [token, search, platformFilter, viewRecycle]);

  useEffect(() => { fetchProjects(1, '', '', false); }, []);

  const handlePlatformChange = (pid) => {
    setPlatformFilter(pid);
    setPage(1);
    fetchProjects(1, search, pid, viewRecycle);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-input"
            value={platformFilter}
            onChange={e => handlePlatformChange(e.target.value)}
            style={{ minWidth: 180, cursor: 'pointer' }}
          >
            <option value="">All Platforms</option>
            {platforms.map(p => (
              <option key={p.platform_id} value={p.platform_id}>{p.platform_name}</option>
            ))}
          </select>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search PNO…" value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchProjects(1, search, platformFilter, viewRecycle)}
              style={{ paddingLeft: 32, width: 180 }} />
          </div>
          <button className="btn btn-secondary" onClick={() => fetchProjects(1, search, platformFilter, viewRecycle)}><Search size={13} /> Go</button>
          <button className="btn btn-secondary" onClick={() => { setSearch(''); setPlatformFilter(''); setViewRecycle(false); fetchProjects(1, '', '', false); }}><RefreshCcw size={13} /> Clear</button>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading projects…</div>
        ) : projects.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No projects found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>PNO</th><th>No</th><th>Platform</th><th>CPI</th><th>Completes</th><th>Status</th></tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.project_id}>
                  <td style={{ fontWeight: 700 }}>{p.project_pno}</td>
                  <td>{p.project_no}</td>
                  <td>{p.platform?.platform_name || 'Unknown'}</td>
                  <td>{p.project_cpi} coins</td>
                  <td>{p.project_complete} / {p.project_quota}</td>
                  <td><span className={`badge ${p.is_disable === 1 ? 'badge-danger' : 'badge-success'}`}>{p.is_disable === 1 ? 'Disabled' : 'Active'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── Analytics Tab ──────────────────────────────────────────── */
function AnalyticsTab({ token }) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminFetch('/statistic', 'GET', null, token)
      .then(res => { if (res.code === 200) setStats(res.data || []); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-color)' }}>Platform Completions Statistics</h3>
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading analytics…</div>
        ) : stats.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No stats logged yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Platform</th><th>Clicks Count</th><th>Successful Completes</th><th>Disqualified</th><th>Overquota</th><th>Success Rate</th></tr>
            </thead>
            <tbody>
              {stats.map(s => (
                <tr key={s.platform_id}>
                  <td style={{ fontWeight: 700 }}>{s.platform_name}</td>
                  <td>{s.clicks || 0}</td>
                  <td style={{ color: 'var(--chart-success)', fontWeight: 700 }}>{s.success || 0}</td>
                  <td>{s.disqualified || 0}</td>
                  <td>{s.overquota || 0}</td>
                  <td><span className="badge badge-info">{s.success_rate || '0.00%'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── Settings Tab ───────────────────────────────────────────── */
function SettingsTab({ token }) {
  return (
    <div style={{ background: 'var(--bg-color)', border: '1px solid var(--divider-color)', borderRadius: 14, padding: 24 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: 'var(--text-color)' }}>Global API Config</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Configure fallback authorization rules and cron synchronization schedules.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
        <Field label="Platform Auto-sync Cron"><input className="form-input" defaultValue="*/5 * * * *" disabled /></Field>
        <Field label="System Admin Contact Notification email"><input className="form-input" defaultValue="admin@stream.com" disabled /></Field>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'platforms');
  const [detailPlatform, setDetailPlatform] = useState(null);
  
  const token = getAdminToken();
  const { theme } = useAdminTheme();

  useEffect(() => {
    const platformId = searchParams.get('platform_id');
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
    
    if (platformId) {
      const pid = Number(platformId);
      adminFetch(`/info?platform_id=${pid}`, 'GET', null, token)
        .then(res => {
          if (res.code === 200 && res.data) {
            setDetailPlatform(res.data);
          } else {
            setSearchParams({});
          }
        })
        .catch(() => setSearchParams({}));
    } else {
      setDetailPlatform(null);
    }
  }, [searchParams, token]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="anima-fade-in">
      {/* Page header */}
      {!detailPlatform && (
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-color)', margin: 0, letterSpacing: '-0.5px' }}>Platform Management</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Manage survey providers, projects, analytics and integration settings.</p>
        </div>
      )}

      {/* Tab nav */}
      {!detailPlatform && (
        <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--divider-color)', paddingBottom: 0 }}>
           {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => {
                setActiveTab(tab.id);
                setSearchParams({ tab: tab.id });
              }} style={{
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
      )}

      {/* Tab content */}
      <div>
        {detailPlatform ? (
          <PlatformDetailView
            platform={detailPlatform}
            onClose={() => setSearchParams({ tab: activeTab })}
            onSave={(updatedPlatform) => {
              setDetailPlatform(updatedPlatform);
            }}
            token={token}
            theme={theme}
          />
        ) : (
          <>
            {activeTab === 'platforms' && (
              <PlatformsTab
                token={token}
                theme={theme}
                onSelectPlatform={(p) => setSearchParams({ platform_id: p.platform_id, tab: activeTab })}
              />
            )}
            {activeTab === 'projects' && <ProjectsTab token={token} />}
            {activeTab === 'analytics' && <AnalyticsTab token={token} />}
            {activeTab === 'settings' && <SettingsTab token={token} />}
          </>
        )}
      </div>
    </div>
  );
}
