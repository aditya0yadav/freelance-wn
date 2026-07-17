import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminFetch, getAdminToken } from '../utils/adminApi';
import { Plus, X, Edit2, Trash2, Globe, Users, Settings } from 'lucide-react';

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
    {children}
  </div>
);

export default function TeamListView() {
  const token = getAdminToken();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  
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
                  <td style={{ fontWeight: 700 }}>{t.team_name}</td>
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
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button onClick={() => handleOpenEdit(t)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-color)', padding: 0 }} title="Edit Team">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(t.team_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', padding: 0 }} title="Delete Team">
                        <Trash2 size={16} />
                      </button>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="premium-metric-card" style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-color)', border: '1px solid var(--divider-color)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-color)' }}>
                {editingTeam ? 'Edit Publisher Team' : 'Create Publisher Team'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Field label="Team Name *">
                <input
                  type="text"
                  placeholder="e.g. Franchise Team A"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--divider-color)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '13px', outline: 'none' }}
                  required
                />
              </Field>

              <Field label="Host Subdomain / Custom Domain">
                <input
                  type="text"
                  placeholder="e.g. partner1.wanhongsurvey.com or otherdomain.com"
                  value={host}
                  onChange={e => setHost(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--divider-color)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '13px', outline: 'none' }}
                />
              </Field>

              <Field label="Commission Ratio (0-100%)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 10.5"
                  value={ratio}
                  onChange={e => setRatio(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--divider-color)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '13px', outline: 'none' }}
                />
              </Field>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ fontSize: 13 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: 13, background: 'var(--primary-brand)', border: 'none' }}>
                  {editingTeam ? 'Save Changes' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
