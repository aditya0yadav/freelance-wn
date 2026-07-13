# SurveyStream Admin Portal - 10. Analytics Dashboard Component

This document contains the complete JSX source code for the system monitoring page (`frontend/src/admin/views/AnalyticsDashboard.jsx`). It displays counters, recent callbacks, and handles fraud verification actions.

```javascript
import React, { useState, useEffect } from 'react';
import { MousePointerClick, CheckCircle, TrendingUp, DollarSign, ShieldAlert, Ban } from 'lucide-react';

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState({ clicks: 0, completes: 0, conversion: 0, revenue: 0 });
  const [recentConversions, setRecentConversions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Mock metrics matching user activity
      setStats({ clicks: 42890, completes: 3210, conversion: 7.48, revenue: 8982.50 });
      
      // Fetch audit logs matching ya_reward database states
      setRecentConversions([
        {
          reward_id: 201,
          txn_id: 'tx_lucid_98213',
          nickname: 'survey_dev_1',
          team_name: 'Alpha Publishers',
          project_pno: 'G98231',
          payout: 2.80,
          reward_status: 1, // Success
          is_mark: 0,       // Standard user speed
          create_time: '2026-07-09 04:30'
        },
        {
          reward_id: 202,
          txn_id: 'tx_torfacts_4412',
          nickname: 'speedy_answers',
          team_name: 'Alpha Publishers',
          project_pno: 'D88129',
          payout: 4.50,
          reward_status: 1,
          is_mark: 1,       // FRAUD TRIGGER! Speeder flag active
          create_time: '2026-07-09 04:21'
        },
        {
          reward_id: 203,
          txn_id: 'tx_cpx_0182',
          nickname: 'normal_user_3',
          team_name: 'Beta Marketing Corp',
          project_pno: 'C9921',
          payout: 0.00,
          reward_status: 2, // Disqualified
          is_mark: 0,
          create_time: '2026-07-09 04:15'
        }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleBanMember = async (nickname) => {
    if (!window.confirm(`Blacklist and disable member account: "${nickname}"?`)) return;
    console.log(`Banned member: ${nickname}`);
  };

  const handleClearMark = async (rewardId) => {
    // Clear speeder flag mapping
    setRecentConversions(prev => prev.map(c => 
      c.reward_id === rewardId ? { ...c, is_mark: 0 } : c
    ));
    console.log(`Audited and cleared speeder flag on reward ID: ${rewardId}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>System Analytics</h2>
        <p style={{ fontSize: '13px', color: 'var(--pm-text-secondary)' }}>Real-time overview of completions, traffic rates, and validation logs.</p>
      </div>

      {/* 1. Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* Total Clicks */}
        <div className="premium-surface" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--pm-accent-bg)', color: 'var(--pm-accent)' }}>
            <MousePointerClick size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--pm-text-secondary)', fontWeight: 600 }}>Total Sessions</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, marginTop: '2px' }}>{stats.clicks.toLocaleString()}</h3>
          </div>
        </div>

        {/* Completions */}
        <div className="premium-surface" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--pm-info-bg)', color: 'var(--pm-info)' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--pm-text-secondary)', fontWeight: 600 }}>Completions</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, marginTop: '2px' }}>{stats.completes.toLocaleString()}</h3>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="premium-surface" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--pm-warning-bg)', color: 'var(--pm-warning)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--pm-text-secondary)', fontWeight: 600 }}>Conversion Rate</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, marginTop: '2px' }}>{stats.conversion}%</h3>
          </div>
        </div>

        {/* Estimated Revenue */}
        <div className="premium-surface" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--pm-accent-bg)', color: 'var(--pm-success)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--pm-text-secondary)', fontWeight: 600 }}>Revenue Generated</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, marginTop: '2px' }}>${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>

      </div>

      {/* 2. Recent Callbacks Table with Speeder checks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Completion Audits</h3>
        
        <div className="table-container premium-surface">
          <table className="admin-table">
            <thead>
              <tr>
                <th>TXN ID</th>
                <th>Nickname</th>
                <th>Team Network</th>
                <th>Project PNO</th>
                <th>Payout ($)</th>
                <th>Status</th>
                <th>Callback Date</th>
                <th style={{ textAlign: 'right' }}>Security Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentConversions.map(conv => {
                const isSpeeder = conv.is_mark === 1;
                return (
                  <tr 
                    key={conv.reward_id}
                    style={{
                      // Highlights suspicious activity in red
                      backgroundColor: isSpeeder ? 'var(--pm-danger-bg)' : 'transparent'
                    }}
                  >
                    <td><code style={{ fontSize: '12px', fontWeight: 'bold' }}>{conv.txn_id}</code></td>
                    <td style={{ fontWeight: 600 }}>{conv.nickname}</td>
                    <td>{conv.team_name}</td>
                    <td><code style={{ fontSize: '12px' }}>{conv.project_pno}</code></td>
                    <td style={{ fontWeight: 'bold' }}>${conv.payout.toFixed(2)}</td>
                    
                    {/* Status Badge */}
                    <td>
                      {isSpeeder ? (
                        <span className="badge badge-danger" style={{ display: 'inline-flex', gap: '4px' }}>
                          <ShieldAlert size={12} /> Speeder Flag
                        </span>
                      ) : (
                        <span className={`badge ${conv.reward_status === 1 ? 'badge-success' : 'badge-warning'}`}>
                          {conv.reward_status === 1 ? 'Success' : 'Disqualified'}
                        </span>
                      )}
                    </td>
                    
                    <td>{conv.create_time}</td>
                    
                    {/* Diagnostic Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {isSpeeder && (
                          <button 
                            onClick={() => handleClearMark(conv.reward_id)}
                            className="btn btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--pm-success)' }}
                          >
                            Approve
                          </button>
                        )}
                        <button 
                          onClick={() => handleBanMember(conv.nickname)}
                          className="btn btn-danger" 
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center' }}
                        >
                          <Ban size={10} /> Blacklist
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
```
