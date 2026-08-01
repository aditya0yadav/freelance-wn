import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Plus, X, AlertCircle, Eye, EyeOff, Ban, CheckCircle2, Shield,
  User, Star, RefreshCcw, Edit2, Trash2, Power, BarChart3, UserCheck, Lock, Phone, Download,
  Users, Globe
} from 'lucide-react';
import { adminFetch, getAdminToken } from '../utils/adminApi';
import { useAdminTheme } from '../context/AdminThemeContext';
import './MemberManagement.css';

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--pm-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
    {children}
  </div>
);

const MemberAvatar = ({ name, size = 36 }) => {
  const hue = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <img
      src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || 'user')}&backgroundColor=transparent`}
      alt={name}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: `hsl(${hue},55%,92%)`,
        border: '2px solid var(--pm-border-layout)', objectFit: 'cover'
      }}
    />
  );
};

/* ── All Members Tab ─────────────────────────────────────────── */
function AllMembersTab({ token, theme }) {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalTab, setModalTab] = useState('basic');
  const [formData, setFormData] = useState({
    nickname: '', rate: 0, team_id: '', password: '', is_disable: 0,
    username: '', phone: '', email: '', name: '', gender: '', location: '', sort: 250, remark: ''
  });

  const handleExport = async () => {
    try {
      const res = await adminFetch('/export/generate', 'POST', {
        type: 2,
        export_remark: 'Member Directory Quick Export'
      }, token);
      if (res.code === 200) {
        navigate('/admin/exports');
      }
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const fetchMembers = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const qs = `?page=${p}&limit=15${q ? `&search=${encodeURIComponent(q)}` : ''}`;
      const res = await adminFetch(`/member/list${qs}`, 'GET', null, token);
      if (res.code === 200) {
        setMembers(res.data.list || []);
        setTotal(res.data.count || 0);
        setPages(res.data.pages || 1);
      }
    } catch (err) { console.error(err.message); }
    finally { setLoading(false); }
  }, [token, search]);

  useEffect(() => {
    fetchMembers(1, '');
    adminFetch('/team/list', 'GET', null, token).then(res => {
      if (res.code === 200) setTeams(res.data.list || []);
    });
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault(); setErrorMsg('');
    setSaving(true);
    try {
      const endpoint = selectedMember ? '/member/edit' : '/member/add';
      const body = selectedMember ? { ...formData, member_id: selectedMember.member_id } : formData;
      const res = await adminFetch(endpoint, 'POST', body, token);
      if (res.code === 200) { setModalOpen(false); fetchMembers(page, search); }
      else setErrorMsg(res.msg || 'Save failed');
    } catch (err) { setErrorMsg(err.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (m) => {
    const newState = m.is_disable === 1 ? 0 : 1;
    try {
      await adminFetch('/member/toggle', 'POST', { member_id: m.member_id, is_disable: newState }, token);
      setMembers(prev => prev.map(x => x.member_id === m.member_id ? { ...x, is_disable: newState } : x));
    } catch (err) { console.error(err.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 }}>
        {[
          { label: 'Total Members', value: total, color: 'var(--pm-accent)', icon: <User size={16} style={{ width: 16, height: 16 }} /> },
          { label: 'Active', value: members.filter(m => m.is_disable !== 1).length, color: 'var(--pm-success)', icon: <CheckCircle2 size={16} style={{ width: 16, height: 16 }} /> },
          { label: 'Suspended', value: members.filter(m => m.is_disable === 1).length, color: 'var(--pm-danger)', icon: <Ban size={16} style={{ width: 16, height: 16 }} /> },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--pm-card)', border: '1.5px solid var(--pm-border-layout)', borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--pm-text-secondary)', fontWeight: 600 }}>{s.label}</span>
              <span style={{ color: s.color, display: 'inline-flex', alignItems: 'center', flexShrink: 0, lineHeight: 0 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--pm-text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--pm-text-secondary)' }} />
            <input className="form-input" placeholder="Search nickname…" value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchMembers(1, search)}
              style={{ paddingLeft: 32, width: 220 }} />
          </div>
          <button className="btn btn-secondary" onClick={() => fetchMembers(1, search)}><Search size={13} /> Search</button>
          <button className="btn btn-secondary" onClick={() => { setSearch(''); fetchMembers(1, ''); }}><RefreshCcw size={13} /> Reset</button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => { setSelectedMember(null); setFormData({ nickname: '', rate: 0, team_id: teams[0]?.team_id || '', password: '', is_disable: 0, username: '', phone: '', email: '', name: '', gender: '', location: '', sort: 250, remark: '' }); setModalTab('basic'); setModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-brand)', border: 'none' }}>
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>Loading members…</div>
        ) : members.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>No members found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Member</th><th>Nickname</th><th>Team</th><th>Commission Rate</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.member_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <MemberAvatar name={m.nickname} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 12, color: 'var(--pm-text-secondary)' }}>#{m.member_id}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{m.nickname}</td>
                  <td style={{ color: 'var(--pm-text-secondary)', fontSize: 13 }}>
                    {m.team?.team_name || teams.find(t => t.team_id === m.team_id)?.team_name || `Team ${m.team_id}`}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: 'var(--pm-border-layout)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (m.rate || 0) * 100)}%`, height: '100%', background: 'var(--pm-accent)', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pm-text-secondary)' }}>{m.rate || 0}</span>
                    </div>
                  </td>
                  <td><span className={`badge ${m.is_disable === 1 ? 'badge-danger' : 'badge-success'}`}>{m.is_disable === 1 ? 'Suspended' : 'Active'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" onClick={() => { setSelectedMember(m); setFormData({ nickname: m.nickname, rate: m.rate, team_id: m.team_id, password: '', is_disable: m.is_disable, username: m.nickname, phone: '', email: '', name: '', gender: '', location: '', sort: 250, remark: '' }); setModalTab('basic'); setModalOpen(true); }} style={{ padding: '6px' }} title="Edit"><Edit2 size={13} /></button>
                      <button className={`btn ${m.is_disable === 1 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleToggle(m)} style={{ padding: '6px' }} title="Toggle suspend"><Power size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(pg => (
            <button key={pg} className={`btn ${page === pg ? 'btn-primary' : 'btn-secondary'}`}
              style={{ width: 36, height: 36, padding: 0 }}
              onClick={() => { setPage(pg); fetchMembers(pg, search); }}>{pg}</button>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && createPortal(
        <div className="admin-theme" data-theme={theme}>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <form onSubmit={handleSave} className="dialog-modal" style={{ maxWidth: 640, width: '100%' }}>
              <div className="dialog-header" style={{ paddingBottom: 10 }}>
                <h3 style={{ fontWeight: 700, color: 'var(--pm-text-primary)', margin: 0 }}>Membership addition</h3>
                <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pm-text-secondary)' }}><X size={20} /></button>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid var(--pm-border-layout)', padding: '0 24px', background: 'var(--pm-bg-container)' }}>
                {[
                  { id: 'basic', label: 'Basic Information' },
                  { id: 'permission', label: 'Permission information' }
                ].map(tab => {
                  const active = modalTab === tab.id;
                  return (
                    <button key={tab.id} type="button" onClick={() => setModalTab(tab.id)} style={{
                      padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: active ? 700 : 500,
                      color: active ? 'var(--primary-brand)' : 'var(--pm-text-secondary)',
                      borderBottom: active ? '3px solid var(--primary-brand)' : '3px solid transparent',
                      marginBottom: -1, transition: 'all 0.15s'
                    }}>{tab.label}</button>
                  );
                })}
              </div>

              <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '60vh', overflowY: 'auto', padding: '20px 24px' }}>
                {errorMsg && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', color: '#EF4444', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><AlertCircle size={15} />{errorMsg}</div>}

                {modalTab === 'basic' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Avatar Upload */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--pm-text-secondary)', textTransform: 'uppercase', width: 90 }}>avatar</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', border: '1px dashed #ccc' }}>
                          <User size={32} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Upload</button>
                            <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>delete</button>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--pm-text-secondary)' }}>Images smaller than 200KB, in JPG or PNG format, with a 1:1 aspect ratio.</span>
                        </div>
                      </div>
                    </div>

                    {/* Nick name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text-primary)', width: 90 }}>
                        <span style={{ color: 'red', marginRight: 4 }}>*</span>Nick name
                      </label>
                      <input className="form-input" style={{ flex: 1 }} value={formData.nickname} onChange={e => setFormData(f => ({ ...f, nickname: e.target.value }))} required />
                    </div>

                    {/* username */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text-primary)', width: 90 }}>
                        <span style={{ color: 'red', marginRight: 4 }}>*</span>username
                      </label>
                      <input className="form-input" style={{ flex: 1 }} placeholder="Please enter your username." value={formData.username} onChange={e => setFormData(f => ({ ...f, username: e.target.value }))} required />
                    </div>

                    {/* password */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text-primary)', width: 90 }}>
                        <span style={{ color: 'red', marginRight: 4 }}>*</span>password
                      </label>
                      <input className="form-input" type="password" style={{ flex: 1 }} placeholder="Please enter your password." value={formData.password} onChange={e => setFormData(f => ({ ...f, password: e.target.value }))} required={!selectedMember} />
                    </div>

                    {/* Team */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text-primary)', width: 90 }}>
                        <span style={{ color: 'red', marginRight: 4 }}>*</span>Team
                      </label>
                      <select className="form-input" style={{ flex: 1 }} value={formData.team_id} onChange={e => setFormData(f => ({ ...f, team_id: Number(e.target.value) }))} required>
                        <option value="" disabled>Please select</option>
                        {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_name}</option>)}
                      </select>
                    </div>

                    {/* Commission Rate */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text-primary)', width: 90 }}>
                        Commission
                      </label>
                      <input className="form-input" type="number" step="0.1" min="0" max="100" style={{ flex: 1 }} value={formData.rate} onChange={e => setFormData(f => ({ ...f, rate: parseFloat(e.target.value) }))} />
                    </div>

                    {/* cell phone */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text-primary)', width: 90 }}>cell phone</label>
                      <input className="form-input" style={{ flex: 1 }} value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} />
                    </div>

                    {/* Mail */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text-primary)', width: 90 }}>Mail</label>
                      <input className="form-input" style={{ flex: 1 }} value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} />
                    </div>

                    {/* Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text-primary)', width: 90 }}>Name</label>
                      <input className="form-input" style={{ flex: 1 }} value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
                    </div>

                    {/* gender */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text-primary)', width: 90 }}>gender</label>
                      <select className="form-input" style={{ flex: 1 }} value={formData.gender} onChange={e => setFormData(f => ({ ...f, gender: e.target.value }))}>
                        <option value="">Please select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    {/* location */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text-primary)', width: 90 }}>location</label>
                      <input className="form-input" style={{ flex: 1 }} placeholder="Please select" value={formData.location} onChange={e => setFormData(f => ({ ...f, location: e.target.value }))} />
                    </div>

                    {/* Sort */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text-primary)', width: 90 }}>Sort</label>
                      <input className="form-input" type="number" style={{ flex: 1 }} value={formData.sort} onChange={e => setFormData(f => ({ ...f, sort: Number(e.target.value) }))} />
                    </div>

                    {/* Remark */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text-primary)', width: 90, marginTop: 6 }}>Remark</label>
                      <textarea className="form-input" style={{ flex: 1, minHeight: 60, resize: 'vertical' }} value={formData.remark} onChange={e => setFormData(f => ({ ...f, remark: e.target.value }))} />
                    </div>

                    {selectedMember && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
                        <div style={{ width: 90 }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--pm-text-primary)', fontWeight: 600 }}>
                          <input type="checkbox" checked={formData.is_disable === 1} onChange={e => setFormData(f => ({ ...f, is_disable: e.target.checked ? 1 : 0 }))} style={{ accentColor: 'var(--pm-accent)', width: 16, height: 16 }} />
                          🚫 Suspended Account
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {modalTab === 'permission' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ fontSize: 13, color: 'var(--pm-text-secondary)' }}>Select the permission access level for this membership account:</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px', border: '1px solid var(--pm-border-layout)', borderRadius: 8, cursor: 'pointer', background: (formData.role || 'user') === 'user' ? 'rgba(124, 58, 237, 0.05)' : 'none' }}>
                        <input type="radio" name="permission_level" checked={(formData.role || 'user') === 'user'} onChange={() => setFormData(f => ({ ...f, role: 'user' }))} style={{ marginTop: 3, accentColor: 'var(--primary-brand)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pm-text-primary)' }}>Regular User</span>
                          <span style={{ fontSize: 11, color: 'var(--pm-text-secondary)' }}>Standard member permissions. Can only access front-end survey routers and reward walls.</span>
                        </div>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px', border: '1px solid var(--pm-border-layout)', borderRadius: 8, cursor: 'pointer', background: formData.role === 'admin' ? 'rgba(124, 58, 237, 0.05)' : 'none' }}>
                        <input type="radio" name="permission_level" checked={formData.role === 'admin'} onChange={() => setFormData(f => ({ ...f, role: 'admin' }))} style={{ marginTop: 3, accentColor: 'var(--primary-brand)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pm-text-primary)' }}>Administrator</span>
                          <span style={{ fontSize: 11, color: 'var(--pm-text-secondary)' }}>Full management access. Can access the backend console to manage teams, members, and walls.</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="dialog-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '8px 20px' }} onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px', background: 'var(--primary-brand)', border: 'none' }} disabled={saving}>{saving ? 'submitting…' : 'submit'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Performance Tab ─────────────────────────────────────────── */
function PerformanceTab({ token, theme }) {
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
  const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : '—';
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
      const res = await adminFetch(`/reward/list?${params.toString()}`, 'GET', null, token);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filter Bar */}
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
            <input className="form-input" style={{ height: 34, fontSize: 12, width: 180 }} placeholder="Please enter your query…"
              value={searchValue} onChange={e => setSearchValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
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
        <button className={`btn ${sortNewest ? 'btn-primary' : 'btn-secondary'}`} style={{ height: 34, fontSize: 12, alignSelf: 'flex-end' }}
          onClick={() => { setSortNewest(p => !p); setPage(1); setTimeout(() => doFetch(1), 0); }}>
          <RefreshCcw size={12} /> {sortNewest ? 'Newest ✓' : 'Sort: Newest'}
        </button>
        <button className="btn btn-primary" style={{ height: 34, fontSize: 12, alignSelf: 'flex-end' }} onClick={handleSearch}>
          <Search size={12} /> Query
        </button>
        <button className="btn btn-secondary" style={{ height: 34, fontSize: 12, alignSelf: 'flex-end' }} onClick={handleReset}>
          <RefreshCcw size={12} /> Reset
        </button>
      </div>

      {/* Summary */}
      <div style={{ fontSize: 12, color: 'var(--pm-text-secondary)' }}>
        Total: <strong style={{ color: 'var(--pm-text-primary)' }}>{total}</strong> records &nbsp;|&nbsp; Page <strong>{page}</strong> / {pages}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--pm-border-layout)', borderRadius: 10 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>Loading records…</div>
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
                const st = STATUS_MAP[r.reward_status] || { label: `#${r.reward_status}`, color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' };
                return (
                  <tr key={r.reward_id}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--pm-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...TD, fontWeight: 700, color: 'var(--pm-accent)' }}>{r.reward_id}</td>
                    <td style={{ ...TD, fontFamily: 'ui-monospace,monospace', fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.uuid}>{r.uuid}</td>
                    <td style={{ ...TD, fontFamily: 'ui-monospace,monospace', fontSize: 11 }}>{r.project_pno || '—'}</td>
                    <td style={TD}>{r.project_no || '—'}</td>
                    <td style={{ ...TD, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.project_name}>{r.project_name || '—'}</td>
                    <td style={TD}>{r.platform?.platform_name || `#${r.platform_id}`}</td>
                    <td style={TD}>{r.team?.team_name || `#${r.team_id}`}</td>
                    <td style={{ ...TD, fontWeight: 600 }}>{r.member?.nickname || `#${r.member_id}`}</td>
                    <td style={{ ...TD, color: '#7C3AED', fontWeight: 700 }}>{money(r.payout)}</td>
                    <td style={{ ...TD, color: '#F59E0B', fontWeight: 700 }}>{money(r.team_payout)}</td>
                    <td style={{ ...TD, color: '#10B981', fontWeight: 700 }}>{money(r.member_payout)}</td>
                    <td style={TD}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td style={TD}>{timeTaken(r.start_time, r.create_time)}</td>
                    <td style={{ ...TD, fontFamily: 'ui-monospace,monospace', fontSize: 11 }}>{r.ip || '—'}</td>
                    <td style={{ ...TD, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 10 }} title={r.ua}>{r.ua ? r.ua.substring(0, 28) + '…' : '—'}</td>
                    <td style={{ ...TD, fontSize: 11 }}>{r.start_time ? fmt(r.start_time) : '—'}</td>
                    <td style={{ ...TD, fontSize: 11 }}>{r.create_time ? fmt(r.create_time) : '—'}</td>
                    <td style={{ ...TD, fontSize: 11 }}>{r.auth_time ? fmt(r.auth_time) : '—'}</td>
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

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} disabled={page <= 1} onClick={() => goPage(page - 1)}>‹ Prev</button>
          {Array.from({ length: Math.min(pages, 10) }, (_, i) => {
            const pg = pages <= 10 ? i + 1 : Math.max(1, page - 4) + i;
            if (pg > pages) return null;
            return (
              <button key={pg} className={`btn ${page === pg ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: 36, height: 36, padding: 0, fontSize: 12 }} onClick={() => goPage(pg)}>{pg}</button>
            );
          })}
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} disabled={page >= pages} onClick={() => goPage(page + 1)}>Next ›</button>
        </div>
      )}

      {/* Detail Modal */}
      {detailRecord && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setDetailRecord(null)}>
          <div style={{ background: 'var(--pm-card)', borderRadius: 14, width: '100%', maxWidth: 660, maxHeight: '88vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--pm-border-layout)' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--pm-text-primary)' }}>Performance Record Detail</h3>
                <span style={{ fontSize: 11, color: 'var(--pm-text-secondary)', fontFamily: 'ui-monospace,monospace' }}>ID #{detailRecord.reward_id} · {detailRecord.uuid}</span>
              </div>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pm-text-secondary)' }} onClick={() => setDetailRecord(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
              {[
                ['ID', detailRecord.reward_id], ['UUID', detailRecord.uuid],
                ['PID', detailRecord.project_pno || '—'], ['Project No', detailRecord.project_no || '—'],
                ['Project Name', detailRecord.project_name || '—'], ['Platform', detailRecord.platform?.platform_name || `#${detailRecord.platform_id}`],
                ['Team', detailRecord.team?.team_name || `#${detailRecord.team_id}`], ['Member', detailRecord.member?.nickname || `#${detailRecord.member_id}`],
                ['Rewards (Platform)', money(detailRecord.payout)], ['Rewards (Team)', money(detailRecord.team_payout)],
                ['Rewards (Member)', money(detailRecord.member_payout)],
                ['Status', STATUS_MAP[detailRecord.reward_status]?.label || `#${detailRecord.reward_status}`],
                ['Time Taken', timeTaken(detailRecord.start_time, detailRecord.create_time)], ['IP', detailRecord.ip || '—'],
                ['Start Time', fmt(detailRecord.start_time)], ['Completion Time', fmt(detailRecord.create_time)],
                ['Review Time', fmt(detailRecord.auth_time)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--pm-text-secondary)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pm-text-primary)', wordBreak: 'break-all' }}>{String(value)}</div>
                </div>
              ))}
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--pm-text-secondary)', marginBottom: 2 }}>UA (User Agent)</div>
                <div style={{ fontSize: 11, color: 'var(--pm-text-secondary)', wordBreak: 'break-all', fontFamily: 'ui-monospace,monospace', lineHeight: 1.6 }}>{detailRecord.ua || '—'}</div>
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--pm-border-layout)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDetailRecord(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Platform Auth Tab (keep for reference) ─────────────────── */
function PlatformAuthTab({ token }) {
  const [authList, setAuthList] = useState([]);
  const [teams, setTeams] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminFetch('/auth/list', 'GET', null, token),
      adminFetch('/team/list', 'GET', null, token),
      adminFetch('/list?limit=100', 'GET', null, token),
    ]).then(([authRes, teamRes, platRes]) => {
      if (authRes.code === 200) setAuthList(authRes.data.list || []);
      if (teamRes.code === 200) setTeams(teamRes.data.list || []);
      if (platRes.code === 200) setPlatforms(platRes.data.list || []);
    }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  const getName = (arr, idKey, nameKey, id) => arr.find(x => x[idKey] === id)?.[nameKey] || String(id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>Loading authorisations…</div>
        ) : authList.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>No platform authorisations configured.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Team</th><th>Platform</th><th>Auth Rate</th><th>Created</th></tr>
            </thead>
            <tbody>
              {authList.map((a, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--pm-text-secondary)', fontSize: 12 }}>#{a.auth_id || i + 1}</td>
                  <td style={{ fontWeight: 700 }}>{getName(teams, 'team_id', 'team_name', a.team_id)}</td>
                  <td style={{ fontWeight: 600 }}>{getName(platforms, 'platform_id', 'platform_name', a.platform_id)}</td>
                  <td>
                    <span className="badge badge-info">{a.auth_rate}%</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--pm-text-secondary)' }}>{a.create_time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────── */
const TABS = [
  { id: 'members', label: 'All Members', icon: User },
  { id: 'auth', label: 'Platform Auth', icon: Shield },
];

export default function MemberListView() {
  const location = useLocation();
  const initialTab = (() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('tab');
    return TABS.some(tab => tab.id === t) ? t : 'members';
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const token = getAdminToken();
  const { theme } = useAdminTheme();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }} className="anima-fade-in">
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--pm-text-primary)', margin: 0, letterSpacing: '-0.5px' }}>Member Management</h2>
        <p style={{ fontSize: 13, color: 'var(--pm-text-secondary)', margin: '4px 0 0' }}>Manage all member accounts, performance records and platform access rights.</p>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--pm-border-layout)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: active ? 700 : 500,
              color: active ? 'var(--pm-accent)' : 'var(--pm-text-secondary)',
              borderBottom: active ? '2px solid var(--pm-accent)' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s', borderRadius: '8px 8px 0 0'
            }}>
              <Icon size={15} />{tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === 'members' && <AllMembersTab token={token} theme={theme} />}
        {activeTab === 'auth' && <PlatformAuthTab token={token} />}
      </div>
    </div>
  );
}