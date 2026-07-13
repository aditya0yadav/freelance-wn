# SurveyStream Admin Portal - 09. Team Authorization & Split Component

This document contains the complete JSX source code for managing publisher team network splits (`frontend/src/admin/views/TeamAuthListView.jsx`). It details authorization mappings and custom commission split fields.

```javascript
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, ShieldAlert } from 'lucide-react';

export default function TeamAuthListView() {
  const [authList, setAuthList] = useState([]);
  const [teams, setTeams] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAuth, setSelectedAuth] = useState(null);

  // Form State parameters
  const [formData, setFormData] = useState({ platform_id: '', team_id: '', auth_rate: 0.80 });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDependencies = async () => {
    // Fetch options for mapping fields
    setTeams([
      { team_id: 10, team_name: 'Alpha Publishers' },
      { team_id: 11, team_name: 'Beta Marketing Corp' }
    ]);
    setPlatforms([
      { platform_id: 1, platform_name: 'Torfacts' },
      { platform_id: 2, platform_name: 'Dynata' }
    ]);
  };

  const fetchAuthList = async () => {
    setLoading(true);
    try {
      const items = [
        {
          platform_auth_id: 1,
          platform_id: 1,
          team_id: 10,
          auth_rate: 0.85,
          platform: { platform_name: 'Torfacts' },
          team: { team_name: 'Alpha Publishers' }
        },
        {
          platform_auth_id: 2,
          platform_id: 2,
          team_id: 11,
          auth_rate: 0.75,
          platform: { platform_name: 'Dynata' },
          team: { team_name: 'Beta Marketing Corp' }
        }
      ];
      setAuthList(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
    fetchAuthList();
  }, []);

  const handleOpenDialog = (auth = null) => {
    if (auth) {
      setSelectedAuth(auth);
      setFormData({
        platform_id: auth.platform_id,
        team_id: auth.team_id,
        auth_rate: auth.auth_rate
      });
    } else {
      setSelectedAuth(null);
      setFormData({
        platform_id: platforms[0]?.platform_id || '',
        team_id: teams[0]?.team_id || '',
        auth_rate: 0.80
      });
    }
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSaveAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!formData.platform_id || !formData.team_id) {
      setErrorMsg('Please select both a Publisher Team and a Survey Provider Platform.');
      return;
    }

    const rateVal = parseFloat(formData.auth_rate);
    if (isNaN(rateVal) || rateVal < 0 || rateVal > 1) {
      setErrorMsg('Authorization commission rate must be a decimal between 0.00 and 1.00.');
      return;
    }

    try {
      if (selectedAuth) {
        // Edit flow
        setAuthList(prev => prev.map(a => 
          a.platform_auth_id === selectedAuth.platform_auth_id 
            ? { 
                ...a, 
                ...formData,
                platform: platforms.find(p => p.platform_id === Number(formData.platform_id)),
                team: teams.find(t => t.team_id === Number(formData.team_id))
              } 
            : a
        ));
      } else {
        // Add flow
        const duplicate = authList.find(a => 
          a.platform_id === Number(formData.platform_id) && 
          a.team_id === Number(formData.team_id)
        );
        if (duplicate) {
          setErrorMsg('An authorization mapping already exists for this team/platform combination.');
          return;
        }

        const newAuth = {
          platform_auth_id: Date.now(),
          platform_id: Number(formData.platform_id),
          team_id: Number(formData.team_id),
          auth_rate: rateVal,
          platform: platforms.find(p => p.platform_id === Number(formData.platform_id)),
          team: teams.find(t => t.team_id === Number(formData.team_id))
        };
        setAuthList(prev => [...prev, newAuth]);
      }
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(err.message || 'Operation failed.');
    }
  };

  const handleDeleteAuth = async (id) => {
    if (!window.confirm('Revoke access authorization for this team on this platform?')) return;
    setAuthList(prev => prev.filter(a => a.platform_auth_id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Team Authorizations</h2>
          <p style={{ fontSize: '13px', color: 'var(--pm-text-secondary)' }}>Grant platforms access permissions and configure payout splits.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenDialog(null)}>
          <Plus size={16} /> Create Authorization
        </button>
      </div>

      {/* Grid Table */}
      <div className="table-container premium-surface">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--pm-text-secondary)' }}>Syncing authorizations...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Auth ID</th>
                <th>Publisher Network (Team)</th>
                <th>Target Platform</th>
                <th>Commission Split (auth_rate)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {authList.map(auth => (
                <tr key={auth.platform_auth_id}>
                  <td>{auth.platform_auth_id}</td>
                  <td style={{ fontWeight: 600 }}>{auth.team?.team_name}</td>
                  <td style={{ fontWeight: 600 }}>{auth.platform?.platform_name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--pm-accent)' }}>
                        {(auth.auth_rate * 100).toFixed(0)}%
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--pm-text-secondary)' }}>
                        (factor: {auth.auth_rate})
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" onClick={() => handleOpenDialog(auth)} style={{ padding: '6px' }}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDeleteAuth(auth.platform_auth_id)} style={{ padding: '6px' }}>
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

      {/* Dialog Modal */}
      {modalOpen && (
        <div className="dialog-overlay">
          <form onSubmit={handleSaveAuth} className="dialog-modal" style={{ maxWidth: '450px' }}>
            <div className="dialog-header">
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                {selectedAuth ? 'Edit Authorization Split' : 'Assign Team Authorization'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorMsg && (
                <div className="badge badge-danger" style={{ padding: '10px', display: 'flex', gap: '6px', width: '100%' }}>
                  <ShieldAlert size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Select Publisher Team</label>
                <select
                  value={formData.team_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, team_id: e.target.value }))}
                  className="form-select"
                  disabled={!!selectedAuth} // Disabled on edit to protect integrity
                >
                  {teams.map(t => (
                    <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Select Survey Platform</label>
                <select
                  value={formData.platform_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, platform_id: e.target.value }))}
                  className="form-select"
                  disabled={!!selectedAuth}
                >
                  {platforms.map(p => (
                    <option key={p.platform_id} value={p.platform_id}>{p.platform_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Platform Commission Rate (auth_rate)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="range"
                    min="0.10"
                    max="1.00"
                    step="0.05"
                    value={formData.auth_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, auth_rate: parseFloat(e.target.value) }))}
                    style={{ flex: 1, accentColor: 'var(--pm-accent)' }}
                  />
                  <span style={{ minWidth: '48px', textAlign: 'right', fontWeight: 'bold' }}>
                    {Math.round(formData.auth_rate * 100)}%
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--pm-text-secondary)' }}>
                  This rate represents the percentage of survey earnings distributed to the team.
                </p>
              </div>
            </div>

            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Authorization</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
```
