import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { adminFetch, getAdminToken } from '../utils/adminApi';
import { useAdminTheme } from '../context/AdminThemeContext';
import { Plus, X, Edit2, Trash2, Globe, Users, Settings, ArrowLeft, Search, RefreshCcw, CheckCircle2, XCircle } from 'lucide-react';

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
    {children}
  </div>
);

/* ── Team Detail View Subcomponent ── */
function TeamDetailView({ team, onClose, token, theme }) {
  const [activeSubTab, setActiveSubTab] = useState('settings');
  const [teamData, setTeamData] = useState(team);
  const [saving, setSaving] = useState(false);

  // Form inputs
  const [name, setName] = useState(team.team_name);
  const [host, setHost] = useState(team.team_host || '');
  const [ratio, setRatio] = useState(String(team.commission_ratio || 0));

  // Authorized platforms lists
  const [authList, setAuthList] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRate, setAuthRate] = useState(80);
  const [selectedPlatformId, setSelectedPlatformId] = useState('');
  const [authsLoading, setAuthsLoading] = useState(false);

  // Editing state
  const [editingAuth, setEditingAuth] = useState(null);
  const [editAuthRate, setEditAuthRate] = useState('');

  // Members lists
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Performance Records
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    fetchAuthorizations();
    fetchMembers();
    fetchPerformanceRecords();
  }, [team.team_id]);

  const fetchAuthorizations = async () => {
    setAuthsLoading(true);
    try {
      const [authRes, platRes] = await Promise.all([
        adminFetch('/auth/list', 'GET', null, token),
        adminFetch('/list?limit=100', 'GET', null, token)
      ]);
      if (authRes.code === 200) {
        setAuthList((authRes.data.list || []).filter(a => a.team_id === team.team_id));
      }
      if (platRes.code === 200) {
        setPlatforms(platRes.data.list || []);
        if (platRes.data.list?.length > 0) {
          setSelectedPlatformId(platRes.data.list[0].platform_id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuthsLoading(false);
    }
  };

  const fetchMembers = async (q = memberSearch) => {
    setMembersLoading(true);
    try {
      const qs = `?limit=100${q ? `&search=${encodeURIComponent(q)}` : ''}`;
      const res = await adminFetch(`/member/list${qs}`, 'GET', null, token);
      if (res.code === 200) {
        setMembers((res.data.list || []).filter(m => m.team_id === team.team_id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchPerformanceRecords = async () => {
    setRecordsLoading(true);
    try {
      const res = await adminFetch(`/reward/list?limit=100`, 'GET', null, token);
      if (res.code === 200) {
        setRecords((res.data.list || []).filter(r => r.team_id === team.team_id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleSaveTeamSettings = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await adminFetch('/team/update', 'POST', {
        team_id: team.team_id,
        team_name: name.trim(),
        team_host: host.trim(),
        commission_ratio: Number(ratio)
      }, token);
      if (res.code === 200) {
        setTeamData({ ...teamData, team_name: name.trim(), team_host: host.trim(), commission_ratio: Number(ratio) });
        alert('Team settings updated successfully');
      } else {
        alert(res.msg || 'Save failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPlatformAuth = async (e) => {
    e.preventDefault();
    if (!selectedPlatformId) return;
    try {
      const res = await adminFetch('/auth/add', 'POST', {
        platform_id: Number(selectedPlatformId),
        team_id: team.team_id,
        auth_rate: parseFloat(authRate)
      }, token);
      if (res.code === 200) {
        setAuthModalOpen(false);
        fetchAuthorizations();
      } else {
        alert(res.msg || 'Authorization failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditPlatformAuth = async (e) => {
    e.preventDefault();
    if (!editingAuth) return;
    try {
      const res = await adminFetch('/auth/edit', 'POST', {
        platform_auth_id: editingAuth.platform_auth_id,
        auth_rate: parseFloat(editAuthRate)
      }, token);
      if (res.code === 200) {
        setEditingAuth(null);
        fetchAuthorizations();
      } else {
        alert(res.msg || 'Edit failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteAuth = async (auth) => {
    if (!window.confirm(`Revoke authorized platform "${auth.platform?.platform_name}"?`)) return;
    try {
      const res = await adminFetch('/auth/delete', 'POST', { platform_auth_id: auth.platform_auth_id }, token);
      if (res.code === 200) {
        fetchAuthorizations();
      } else {
        // Fallback endpoint
        const res2 = await adminFetch('/auth/dele', 'POST', { platform_auth_id: auth.platform_auth_id }, token);
        if (res2.code === 200) fetchAuthorizations();
        else alert(res2.msg || 'Failed to revoke authorization');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="anima-fade-in">
      {/* Detail Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} /> Back to Teams
        </button>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-color)', margin: 0 }}>
            {teamData.team_name} Team Details
          </h2>
        </div>
      </div>

      {/* Info card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'var(--bg-color)', border: '1px solid var(--divider-color)', borderRadius: 14, padding: '20px' }}>
        <div>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Team Name</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-color)' }}>{teamData.team_name}</span>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Host Domain</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-color)' }}>{teamData.team_host || '—'}</span>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Commission Ratio</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-color)' }}>{teamData.commission_ratio}%</span>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Authorized Members</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-color)' }}>{members.length}</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '2px solid var(--divider-color)' }}>
        {[
          { id: 'settings', label: 'Team settings' },
          { id: 'auths', label: 'Authorized Platforms' },
          { id: 'members', label: 'Team Members' },
          { id: 'performance', label: 'Performance Records' }
        ].map(sub => (
          <button key={sub.id} onClick={() => setActiveSubTab(sub.id)} style={{
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

      {/* Tab Contents */}
      <div>
        {/* Settings Tab */}
        {activeSubTab === 'settings' && (
          <form onSubmit={handleSaveTeamSettings} style={{ background: 'var(--bg-color)', border: '1px solid var(--divider-color)', borderRadius: 14, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 540 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800, color: 'var(--text-color)' }}>Franchise Configurations</h3>
            <Field label="Team Name *">
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="form-input" required />
            </Field>
            <Field label="Host Domain / Subdomain">
              <input type="text" value={host} onChange={e => setHost(e.target.value)} className="form-input" placeholder="domain.com" />
            </Field>
            <Field label="Commission Ratio (0-100%)">
              <input type="number" step="0.1" value={ratio} onChange={e => setRatio(e.target.value)} className="form-input" min="0" max="100" />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="submit" className="btn btn-primary" style={{ background: 'var(--primary-brand)', border: 'none' }} disabled={saving}>
                Save Team Settings
              </button>
            </div>
          </form>
        )}

        {/* Auths Tab */}
        {activeSubTab === 'auths' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-color)' }}>Authorized Network Providers</h3>
              <button onClick={() => setAuthModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary-brand)', border: 'none' }}>
                <Plus size={15} /> Authorize Platform
              </button>
            </div>

            <div className="table-container">
              {authsLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading authorizations…</div>
              ) : authList.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No platform authorizations configured.</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr><th>Platform Name</th><th>Sign</th><th>Commission Split Rate</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
                  </thead>
                  <tbody>
                    {authList.map(a => (
                      <tr key={a.platform_auth_id}>
                        <td style={{ fontWeight: 700 }}>{a.platform?.platform_name || 'N/A'}</td>
                        <td><code style={{ fontSize: 12 }}>{a.platform?.platform_sign}</code></td>
                        <td><span className="badge badge-info">{a.auth_rate}%</span></td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <button onClick={() => { setEditingAuth(a); setEditAuthRate(String(a.auth_rate)); }} className="btn btn-secondary" style={{ padding: '6px', marginRight: '6px' }} title="Edit Split Rate"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteAuth(a)} className="btn btn-danger" style={{ padding: '6px' }} title="Delete Split"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Authorize Platform Modal */}
            {authModalOpen && createPortal(
              <div className="admin-theme" data-theme={theme}>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                  <form onSubmit={handleAddPlatformAuth} className="dialog-modal" style={{ maxWidth: 420, width: '100%' }}>
                    <div className="dialog-header">
                      <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-color)' }}>Authorize Platform</h3>
                      <button type="button" onClick={() => setAuthModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                    </div>
                    <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <Field label="Select Survey Provider *">
                        <select className="form-select" value={selectedPlatformId} onChange={e => setSelectedPlatformId(e.target.value)} required>
                          {platforms.map(p => <option key={p.platform_id} value={p.platform_id}>{p.platform_name}</option>)}
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

            {/* Edit Platform split rate modal */}
            {editingAuth && createPortal(
              <div className="admin-theme" data-theme={theme}>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                  <form onSubmit={handleEditPlatformAuth} className="dialog-modal" style={{ maxWidth: 420, width: '100%' }}>
                    <div className="dialog-header">
                      <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-color)' }}>Edit Commission Split Rate</h3>
                      <button type="button" onClick={() => setEditingAuth(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                    </div>
                    <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Platform: <strong style={{ color: 'var(--text-color)' }}>{editingAuth.platform?.platform_name}</strong>
                      </div>
                      <Field label="Commission split rate (0-100%) *">
                        <input type="number" step="0.01" value={editAuthRate} onChange={e => setEditAuthRate(e.target.value)} className="form-input" required />
                      </Field>
                    </div>
                    <div className="dialog-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setEditingAuth(null)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" style={{ background: 'var(--primary-brand)', border: 'none' }}>Save Changes</button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeSubTab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-input" placeholder="Search member nickname…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchMembers(memberSearch)} style={{ paddingLeft: 32, width: 220 }} />
              </div>
              <button className="btn btn-secondary" onClick={() => fetchMembers(memberSearch)}><Search size={13} /> Go</button>
              <button className="btn btn-secondary" onClick={() => { setMemberSearch(''); fetchMembers(''); }}><RefreshCcw size={13} /> Reset</button>
            </div>

            <div className="table-container">
              {membersLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading members…</div>
              ) : members.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No members found under this team.</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr><th>ID</th><th>Member Nickname</th><th>Deduction Rate</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.member_id}>
                        <td>#{m.member_id}</td>
                        <td style={{ fontWeight: 700 }}>{m.nickname}</td>
                        <td>{m.rate}%</td>
                        <td>
                          <span className={`badge ${m.is_disable === 1 ? 'badge-danger' : 'badge-success'}`}>
                            {m.is_disable === 1 ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeSubTab === 'performance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-color)' }}>Performance Completions Log</h3>
            <div className="table-container">
              {recordsLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading performance logs…</div>
              ) : records.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No completions logged for this team yet.</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr><th>UUID / TXN</th><th>Survey PNO</th><th>Member</th><th>Payout (Team)</th><th>Status</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.reward_id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.uuid}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>TXN: {r.txn_id}</div>
                        </td>
                        <td>{r.project_pno || '—'}</td>
                        <td>{r.member?.nickname || `ID: ${r.member_id}`}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary-brand)' }}>{r.team_payout} coins</td>
                        <td>
                          <span className={`badge ${r.reward_status === 1 ? 'badge-success' : 'badge-danger'}`}>
                            {r.reward_status === 1 ? 'Success' : 'Invalid'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {r.create_time ? new Date(r.create_time).toLocaleString() : 'N/A'}
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

/* ── Main Table Component ── */
export default function TeamListView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const token = getAdminToken();
  const { theme } = useAdminTheme();
  
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailTeam, setDetailTeam] = useState(null);

  useEffect(() => {
    const teamId = searchParams.get('team_id');
    if (teamId && teams.length > 0) {
      const found = teams.find(t => t.team_id === Number(teamId));
      if (found) {
        setDetailTeam(found);
      } else {
        setSearchParams({});
      }
    } else {
      setDetailTeam(null);
    }
  }, [searchParams, teams]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  
  // Form states
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [ratio, setRatio] = useState('0');
  
  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/team/list', 'GET', null, token);
      if (res.code === 200) {
        setTeams(res.data.list || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleOpenCreate = () => {
    setEditingTeam(null);
    setName('');
    setHost('');
    setRatio('0');
    setShowModal(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTeam(t);
    setName(t.team_name);
    setHost(t.team_host || '');
    setRatio(String(t.commission_ratio || 0));
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      let res;
      if (editingTeam) {
        res = await adminFetch('/team/update', 'POST', {
          team_id: editingTeam.team_id,
          team_name: name.trim(),
          team_host: host.trim(),
          commission_ratio: Number(ratio)
        }, token);
      } else {
        res = await adminFetch('/team/create', 'POST', {
          team_name: name.trim(),
          team_host: host.trim(),
          commission_ratio: Number(ratio)
        }, token);
      }
      if (res.code === 200) {
        setShowModal(false);
        fetchTeams();
      } else {
        alert(res.msg || 'Save failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this publisher team?')) return;
    try {
      const res = await adminFetch('/team/delete', 'POST', { team_id: teamId }, token);
      if (res.code === 200) {
        fetchTeams();
      } else {
        alert(res.msg || 'Delete failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }} className="anima-fade-in">
      {detailTeam ? (
        <TeamDetailView
          team={detailTeam}
          onClose={() => setSearchParams({})}
          token={token}
          theme={theme}
        />
      ) : (
        <>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-color)', margin: 0, letterSpacing: '-0.5px' }}>
                Publisher Teams Management
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Configure franchise partner teams, split commission rates, and custom domains
              </p>
            </div>
            <button className="btn btn-primary" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, background: 'var(--primary-brand)', border: 'none' }}>
              <Plus size={15} /> Create Publisher Team
            </button>
          </div>

          {/* Main Table */}
          <div className="table-container">
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading publisher teams…</div>
            ) : teams.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No teams configured.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>ID</th><th>Team Name</th><th>Host Domain/Subdomain</th><th>Commission Rate</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t.team_id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{t.team_id}</td>
                      <td>
                        <span
                          onClick={() => setSearchParams({ team_id: t.team_id })}
                          style={{ fontWeight: 700, color: 'var(--text-color)', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {t.team_name}
                        </span>
                      </td>
                      <td>
                        {t.team_host ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--primary-brand)', fontSize: 13, fontWeight: 600 }}>
                            <Globe size={13} /> {t.team_host}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-info">{t.commission_ratio}%</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => setSearchParams({ team_id: t.team_id })} className="btn btn-secondary" style={{ padding: '6px' }} title="Configure Team Details">
                            <Settings size={14} /> Configure
                          </button>
                          <button onClick={() => handleOpenEdit(t)} className="btn btn-secondary" style={{ padding: '6px' }} title="Edit Team">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(t.team_id)} className="btn btn-danger" style={{ padding: '6px' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Create / Edit Modal */}
          {showModal && createPortal(
            <div className="admin-theme" data-theme={theme}>
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div className="dialog-modal" style={{ maxWidth: '460px', width: '100%' }}>
                  <div className="dialog-header">
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-color)' }}>
                      {editingTeam ? 'Edit Publisher Team' : 'Create Publisher Team'}
                    </h3>
                    <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
                  </div>

                  <form onSubmit={handleSave}>
                    <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">Team Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Franchise Team A"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          className="form-input"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Host Subdomain / Custom Domain</label>
                        <input
                          type="text"
                          placeholder="e.g. partner1.wanhongsurvey.com"
                          value={host}
                          onChange={e => setHost(e.target.value)}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Commission Ratio (0-100%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="e.g. 10.5"
                          value={ratio}
                          onChange={e => setRatio(e.target.value)}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="dialog-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" style={{ background: 'var(--primary-brand)', border: 'none' }}>
                        {editingTeam ? 'Save Changes' : 'Create Team'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}
