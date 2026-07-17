import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { adminFetch, getAdminToken } from '../utils/adminApi';
import './TeamManagement.css';

export default function TeamAuthListView() {
  const [authList, setAuthList] = useState([]);
  const [teams, setTeams] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAuth, setSelectedAuth] = useState(null);
  const [formData, setFormData] = useState({ platform_id: '', team_id: '', auth_rate: 80 });
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const token = getAdminToken();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [authRes, teamRes, platRes] = await Promise.all([
        adminFetch('/auth/list', 'GET', null, token),
        adminFetch('/team/list', 'GET', null, token),
        adminFetch('/list?limit=100', 'GET', null, token),
      ]);
      if (authRes.code === 200) setAuthList(authRes.data.list || []);
      if (teamRes.code === 200) setTeams(teamRes.data.list || []);
      if (platRes.code === 200) setPlatforms(platRes.data.list || []);
    } catch (err) {
      console.error('TeamAuth fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, []);

  const handleOpenModal = (auth = null) => {
    if (auth) {
      setSelectedAuth(auth);
      setFormData({ platform_id: auth.platform_id, team_id: auth.team_id, auth_rate: auth.auth_rate });
    } else {
      setSelectedAuth(null);
      setFormData({ platform_id: platforms[0]?.platform_id || '', team_id: teams[0]?.team_id || '', auth_rate: 80 });
    }
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const rateVal = parseFloat(formData.auth_rate);
    if (!formData.platform_id || !formData.team_id) {
      setErrorMsg('Select both a Team and Platform.');
      return;
    }
    if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
      setErrorMsg('Auth rate must be between 0.00% and 100.00%.');
      return;
    }

    setSaving(true);
    try {
      if (selectedAuth) {
        const res = await adminFetch('/auth/edit', 'POST', {
          platform_auth_id: selectedAuth.platform_auth_id,
          auth_rate: rateVal,
        }, token);
        if (res.code !== 200) { setErrorMsg(res.msg || 'Update failed'); return; }
      } else {
        const res = await adminFetch('/auth/add', 'POST', {
          platform_id: Number(formData.platform_id),
          team_id: Number(formData.team_id),
          auth_rate: rateVal,
        }, token);
        if (res.code !== 200) { setErrorMsg(res.msg || 'Create failed'); return; }
      }
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Revoke this team authorization?')) return;
    try {
      await adminFetch('/auth/dele', 'POST', { platform_auth_id: id }, token);
      setAuthList(prev => prev.filter(a => a.platform_auth_id !== id));
    } catch (err) {
      console.error('Delete error:', err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--pm-text-primary)', marginBottom: '4px' }}>
            Team Authorizations
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--pm-text-secondary)' }}>
            Grant network teams access to platforms and configure payout commission splits.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal(null)}>
          <Plus size={16} /> Create Authorization
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--pm-text-secondary)' }}>
            Syncing authorizations...
          </div>
        ) : authList.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--pm-text-secondary)' }}>
            No authorizations configured.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Auth ID</th>
                <th>Publisher Team</th>
                <th>Target Platform</th>
                <th>Commission Rate</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {authList.map((auth) => (
                <tr key={auth.platform_auth_id}>
                  <td style={{ color: 'var(--pm-text-tertiary)', fontSize: '12px' }}>
                    #{auth.platform_auth_id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{auth.team?.team_name || `Team #${auth.team_id}`}</td>
                  <td style={{ fontWeight: 600 }}>{auth.platform?.platform_name || `Platform #${auth.platform_id}`}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, maxWidth: '100px', height: '6px', borderRadius: '99px', background: 'var(--pm-border-layout)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${auth.auth_rate}%`, background: 'var(--pm-accent)', borderRadius: '99px' }} />
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--pm-accent)', fontSize: '15px' }}>
                        {auth.auth_rate.toFixed(0)}%
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--pm-text-tertiary)' }}>
                        (×{(auth.auth_rate / 100).toFixed(2)})
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" onClick={() => handleOpenModal(auth)} style={{ padding: '6px' }}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDelete(auth.platform_auth_id)} style={{ padding: '6px' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="dialog-overlay">
          <form onSubmit={handleSave} className="dialog-modal" style={{ maxWidth: '450px' }}>
            <div className="dialog-header">
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--pm-text-primary)' }}>
                {selectedAuth ? 'Edit Authorization' : 'Create Authorization'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pm-text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorMsg && (
                <div style={{ background: 'var(--pm-danger-bg)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '8px', padding: '10px 14px', display: 'flex', gap: '8px', color: 'var(--pm-danger)', fontSize: '13px' }}>
                  <AlertCircle size={15} /><span>{errorMsg}</span>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Publisher Team</label>
                <select
                  className="form-select"
                  value={formData.team_id}
                  onChange={e => setFormData(p => ({ ...p, team_id: e.target.value }))}
                  disabled={!!selectedAuth}
                >
                  <option value="">Select Team...</option>
                  {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Survey Platform</label>
                <select
                  className="form-select"
                  value={formData.platform_id}
                  onChange={e => setFormData(p => ({ ...p, platform_id: e.target.value }))}
                  disabled={!!selectedAuth}
                >
                  <option value="">Select Platform...</option>
                  {platforms.map(p => <option key={p.platform_id} value={p.platform_id}>{p.platform_name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Commission Rate (auth_rate)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <input
                    type="range"
                    min="0" max="100" step="5"
                    value={formData.auth_rate}
                    onChange={e => setFormData(p => ({ ...p, auth_rate: parseFloat(e.target.value) }))}
                    style={{ flex: 1, accentColor: 'var(--pm-accent)' }}
                  />
                  <span style={{ minWidth: '48px', fontWeight: 800, fontSize: '16px', color: 'var(--pm-accent)', textAlign: 'right' }}>
                    {formData.auth_rate}%
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--pm-text-tertiary)' }}>
                  Percentage of survey earnings distributed to the publisher network.
                </p>
              </div>
            </div>

            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Authorization'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
