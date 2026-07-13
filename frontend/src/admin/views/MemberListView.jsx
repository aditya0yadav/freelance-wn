import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, X, AlertCircle, Eye, EyeOff, Ban, CheckCircle2, Shield,
  User, Star, RefreshCcw, Edit2, Trash2, Power, BarChart3, UserCheck, Lock, Phone, Download
} from 'lucide-react';
import { adminFetch, getAdminToken } from '../utils/adminApi';

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
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
        border: '2px solid var(--divider-color)', objectFit: 'cover'
      }}
    />
  );
};

/* ── All Members Tab ─────────────────────────────────────────── */
function AllMembersTab({ token }) {
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
  const [formData, setFormData] = useState({
    nickname: '', rate: 0, team_id: '', password: '', is_disable: 0
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
          { label: 'Total Members', value: total, color: 'var(--primary-brand)', icon: <User size={16} /> },
          { label: 'Active', value: members.filter(m => m.is_disable !== 1).length, color: 'var(--chart-success)', icon: <CheckCircle2 size={16} /> },
          { label: 'Suspended', value: members.filter(m => m.is_disable === 1).length, color: 'var(--chart-danger)', icon: <Ban size={16} /> },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-color)', border: '1.5px solid var(--divider-color)', borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-color)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
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
          <button className="btn btn-primary" onClick={() => { setSelectedMember(null); setFormData({ nickname: '', rate: 0, team_id: teams[0]?.team_id || '', password: '', is_disable: 0 }); setModalOpen(true); }}>
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading members…</div>
        ) : members.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No members found.</div>
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
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{m.member_id}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{m.nickname}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {m.team?.team_name || teams.find(t => t.team_id === m.team_id)?.team_name || `Team ${m.team_id}`}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: 'var(--divider-color)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (m.rate || 0) * 100)}%`, height: '100%', background: 'var(--primary-brand)', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{m.rate || 0}</span>
                    </div>
                  </td>
                  <td><span className={`badge ${m.is_disable === 1 ? 'badge-danger' : 'badge-success'}`}>{m.is_disable === 1 ? 'Suspended' : 'Active'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" onClick={() => { setSelectedMember(m); setFormData({ nickname: m.nickname, rate: m.rate, team_id: m.team_id, password: '', is_disable: m.is_disable }); setModalOpen(true); }} style={{ padding: '6px' }} title="Edit"><Edit2 size={13} /></button>
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
      {modalOpen && (
        <div className="dialog-overlay">
          <form onSubmit={handleSave} className="dialog-modal" style={{ maxWidth: 500 }}>
            <div className="dialog-header">
              <h3 style={{ fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>{selectedMember ? 'Edit Member' : 'Add New Member'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {errorMsg && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', color: '#EF4444', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}><AlertCircle size={15} />{errorMsg}</div>}
              
              <Field label="Nickname *">
                <input className="form-input" value={formData.nickname} onChange={e => setFormData(f => ({ ...f, nickname: e.target.value }))} required />
              </Field>

              <Field label="Team *">
                <select className="form-input" value={formData.team_id} onChange={e => setFormData(f => ({ ...f, team_id: Number(e.target.value) }))} required>
                  <option value="" disabled>Select Team</option>
                  {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_name}</option>)}
                </select>
              </Field>

              <Field label="Commission Rate (0-1)">
                <input className="form-input" type="number" step="0.01" min="0" max="1" value={formData.rate} onChange={e => setFormData(f => ({ ...f, rate: parseFloat(e.target.value) }))} required />
              </Field>

              <Field label={selectedMember ? 'Password (leave blank to keep current)' : 'Password *'}>
                <input className="form-input" type="password" value={formData.password} onChange={e => setFormData(f => ({ ...f, password: e.target.value }))} required={!selectedMember} minLength={6} />
              </Field>

              {selectedMember && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-color)', fontWeight: 600, marginTop: 10 }}>
                  <input type="checkbox" checked={formData.is_disable === 1} onChange={e => setFormData(f => ({ ...f, is_disable: e.target.checked ? 1 : 0 }))} style={{ accentColor: 'var(--primary-brand)', width: 16, height: 16 }} />
                  🚫 Suspended Account
                </label>
              )}
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : selectedMember ? 'Update Member' : 'Add Member'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ── Performance Tab ─────────────────────────────────────────── */
function PerformanceTab({ token }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminFetch('/member/performance?limit=20', 'GET', null, token)
      .then(res => { if (res.code === 200) setRecords(res.data.list || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading performance…</div>
        ) : records.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <UserCheck size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div>No performance records available from the API yet.</div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Member</th><th>Team</th><th>Completions</th><th>Revenue</th><th>Avg Rate</th><th>Date</th></tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>{r.nickname}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{r.team_name}</td>
                  <td style={{ fontWeight: 600 }}>{r.completions || 0}</td>
                  <td style={{ color: 'var(--chart-success)', fontWeight: 700 }}>${Number(r.revenue || 0).toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 50, height: 6, background: 'var(--divider-color)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (r.rate || 0) * 100)}%`, height: '100%', background: 'var(--primary-brand)', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{r.rate || 0}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const getName = (arr, idKey, nameKey, id) => arr.find(x => x[idKey] === id)?.[nameKey] || String(id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading authorisations…</div>
        ) : authList.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No platform authorisations configured.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Team</th><th>Platform</th><th>Auth Rate</th><th>Created</th></tr>
            </thead>
            <tbody>
              {authList.map((a, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{a.auth_id || i + 1}</td>
                  <td style={{ fontWeight: 700 }}>{getName(teams, 'team_id', 'team_name', a.team_id)}</td>
                  <td style={{ fontWeight: 600 }}>{getName(platforms, 'platform_id', 'platform_name', a.platform_id)}</td>
                  <td>
                    <span className="badge badge-info">{(a.auth_rate * 100).toFixed(0)}%</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.create_time}</td>
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
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'auth', label: 'Platform Auth', icon: Shield },
];

export default function MemberListView() {
  const [activeTab, setActiveTab] = useState('members');
  const token = getAdminToken();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }} className="anima-fade-in">
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-color)', margin: 0, letterSpacing: '-0.5px' }}>Member Management</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Manage all member accounts, performance records and platform access rights.</p>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--divider-color)' }}>
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

      <div>
        {activeTab === 'members' && <AllMembersTab token={token} />}
        {activeTab === 'performance' && <PerformanceTab token={token} />}
        {activeTab === 'auth' && <PlatformAuthTab token={token} />}
      </div>
    </div>
  );
}
