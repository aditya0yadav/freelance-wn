import React, { useState, useEffect, useCallback } from 'react';
import { adminFetch, getAdminToken } from '../utils/adminApi';
import { History, Search, Loader2, Database, ExternalLink, X, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

export default function CompletionsLogView() {
  const token = getAdminToken();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Filters
  const [searchField, setSearchField] = useState('project_name');
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Selected item detail modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (selectedRecord) {
      setSelectedStatus(selectedRecord.reward_status);
    }
  }, [selectedRecord]);

  const handleUpdateStatus = async () => {
    if (!selectedRecord) return;
    setUpdatingStatus(true);
    try {
      const res = await adminFetch('/reward/update-status', 'POST', {
        reward_id: selectedRecord.reward_id,
        reward_status: Number(selectedStatus)
      }, token);
      if (res.code === 200) {
        // Update local state list
        setRecords(prev => prev.map(r => r.reward_id === selectedRecord.reward_id ? { ...r, reward_status: Number(selectedStatus) } : r));
        setSelectedRecord(null);
      } else {
        alert(res.msg || 'Failed to update transaction status');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleBulkUpdateStatus = async (statusVal) => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const label = STATUS_MAP[statusVal]?.label || `Status ${statusVal}`;
    if (!window.confirm(`Are you sure you want to update ${count} transaction(s) to status [${label}]?`)) {
      return;
    }
    setBulkUpdating(true);
    try {
      const res = await adminFetch('/reward/bulk-update-status', 'POST', {
        reward_ids: selectedIds,
        reward_status: Number(statusVal)
      }, token);
      if (res.code === 200) {
        setRecords(prev => prev.map(r => selectedIds.includes(r.reward_id) ? { ...r, reward_status: Number(statusVal) } : r));
        setSelectedIds([]);
        alert(`Successfully updated ${count} transaction(s).`);
      } else {
        alert(res.msg || 'Failed to update transaction statuses');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setBulkUpdating(false);
    }
  };

  const STATUS_MAP = {
    '1': { label: 'Success', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', icon: <CheckCircle2 size={14} /> },
    '2': { label: 'Disqualified', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', icon: <XCircle size={14} /> },
    '3': { label: 'Overquota', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', icon: <Clock size={14} /> },
    '4': { label: 'Terminated', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', icon: <AlertTriangle size={14} /> },
    '6': { label: 'Reconciliation', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.1)', icon: <AlertTriangle size={14} /> }
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setSelectedIds([]); // Clear selection on fetch
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit)
      });
      if (statusFilter) queryParams.append('status', statusFilter);
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);
      if (searchValue) {
        queryParams.append('search_field', searchField);
        queryParams.append('search_value', searchValue);
      }

      const res = await adminFetch(`/reward/list?${queryParams.toString()}`, 'GET', null, token);
      if (res.code === 200) {
        setRecords(res.data.list || []);
        setTotal(res.data.count || 0);
      }
    } catch (err) {
      console.error('Error fetching completions:', err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchField, searchValue, startDate, endDate, token]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-color)', margin: 0, letterSpacing: '-0.3px' }}>
          Completions & Earnings Log
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Track detailed survey completion statuses, earnings payouts, and audit records
        </p>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-color)', padding: '16px 0' }}>
        
        {/* Status select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status:</span>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--divider-color)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '13px', outline: 'none' }}>
            <option value="">All Statuses</option>
            <option value="1">Success</option>
            <option value="2">Disqualified</option>
            <option value="3">Overquota</option>
            <option value="4">Terminated</option>
            <option value="6">Reconciliation</option>
          </select>
        </div>

        {/* Date Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--divider-color)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '13px', outline: 'none' }}
          />
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--divider-color)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '13px', outline: 'none' }}
          />
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <select value={searchField} onChange={(e) => setSearchField(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px 0 0 8px', border: '1px solid var(--divider-color)', borderRight: 'none', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '13px', outline: 'none' }}>
            <option value="project_name">Project Name</option>
            <option value="project_no">Project No</option>
            <option value="nickname">Nickname</option>
          </select>
          <input
            type="text"
            placeholder="Type and press Enter to search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchRecords()}
            style={{ flex: 1, padding: '8px 12px', borderRadius: '0 8px 8px 0', border: '1px solid var(--divider-color)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '13px', outline: 'none' }}
          />
        </div>

        <button className="btn btn-secondary" onClick={() => {
          setStatusFilter(''); setSearchValue(''); setStartDate(''); setEndDate(''); setPage(1);
        }} style={{ padding: '8px 16px', fontSize: '13px' }}>
          Reset
        </button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-color)' }}>
            Selected {selectedIds.length} item(s)
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => handleBulkUpdateStatus(2)}
            disabled={bulkUpdating}
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '12px', border: '1px solid #EF4444', color: '#EF4444', background: 'transparent' }}
          >
            Bulk Disqualify
          </button>
          <button
            onClick={() => handleBulkUpdateStatus(6)}
            disabled={bulkUpdating}
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '12px', background: '#EC4899', borderColor: '#EC4899', color: '#fff' }}
          >
            Bulk Reconcile
          </button>
          <button
            onClick={() => setSelectedIds([])}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', padding: '0 8px' }}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Flat Borderless Table */}
      <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={32} className="anima-spin" style={{ margin: '0 auto 12px' }} />
            <span>Retrieving completions log...</span>
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Database size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <span>No completion records found</span>
          </div>
        ) : (
          <table className="admin-table" style={{ background: 'transparent' }}>
            <thead>
              <tr style={{ background: 'transparent' }}>
                <th style={{ background: 'transparent', padding: '12px 16px', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={records.length > 0 && selectedIds.length === records.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(records.map(r => r.reward_id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ background: 'transparent', padding: '12px 16px 12px 0' }}>ID</th>
                <th style={{ background: 'transparent', padding: '12px 16px' }}>Member</th>
                <th style={{ background: 'transparent', padding: '12px 16px' }}>Platform</th>
                <th style={{ background: 'transparent', padding: '12px 16px' }}>Project Information</th>
                <th style={{ background: 'transparent', padding: '12px 16px' }}>Earnings</th>
                <th style={{ background: 'transparent', padding: '12px 16px' }}>Status</th>
                <th style={{ background: 'transparent', padding: '12px 16px' }}>Date</th>
                <th style={{ background: 'transparent', padding: '12px 0', textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.reward_id} style={{ background: 'transparent' }}>
                  <td style={{ padding: '16px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.reward_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(prev => [...prev, r.reward_id]);
                        } else {
                          setSelectedIds(prev => prev.filter(id => id !== r.reward_id));
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '16px 16px 16px 0', fontWeight: 600, color: 'var(--text-muted)' }}>#{r.reward_id}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-color)' }}>
                      {r.member?.nickname || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-muted)' }}>
                      {r.platform?.platform_name || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary-brand)', fontSize: '13px' }}>{r.project_name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Code: {r.project_no || 'N/A'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700, color: 'var(--chart-success)', fontSize: '13px' }}>
                        ${(r.member_payout / r.usd_currency_coins).toFixed(2)}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Net Payout: ${(r.payout / r.usd_currency_coins).toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {(() => {
                      const s = STATUS_MAP[r.reward_status] || { label: 'Other', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', icon: null };
                      return (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: s.bg, color: s.color, borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                          {s.icon}
                          {s.label}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.create_time}</span>
                  </td>
                  <td style={{ padding: '16px 0', textAlign: 'right' }}>
                    <button onClick={() => setSelectedRecord(r)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary-brand)', padding: 0 }} title="View Telemetry Details">
                      <ExternalLink size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Details Modal */}
      {selectedRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="premium-metric-card" style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-color)', border: '1px solid var(--divider-color)', borderRadius: '16px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-color)' }}>Transaction Audit & Telemetry</h3>
              <button onClick={() => setSelectedRecord(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '1px solid var(--divider-color)', paddingBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Transaction ID</span>
                  <div style={{ fontSize: '13px', color: 'var(--text-color)', fontWeight: 600, fontFamily: 'monospace' }}>{selectedRecord.txn_id}</div>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Session UUID</span>
                  <div style={{ fontSize: '13px', color: 'var(--text-color)', fontWeight: 600, fontFamily: 'monospace' }}>{selectedRecord.uuid}</div>
                </div>
              </div>
 
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '1px solid var(--divider-color)', paddingBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>IP Address</span>
                  <div style={{ fontSize: '13px', color: 'var(--text-color)', fontWeight: 600 }}>{selectedRecord.ip || 'N/A'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Audited Flags</span>
                  <div style={{ fontSize: '13px', color: selectedRecord.is_mark === 1 ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                    {selectedRecord.is_mark === 1 ? '⚠️ Speeder (Fast Complete)' : '✓ Verified Standard'}
                  </div>
                </div>
              </div>
 
              <div style={{ borderBottom: '1px solid var(--divider-color)', paddingBottom: '14px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>User Agent Header</span>
                <div style={{ fontSize: '12px', color: 'var(--text-color)', marginTop: '4px', lineHeight: '1.4' }}>{selectedRecord.ua || 'N/A'}</div>
              </div>
 
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '1px solid var(--divider-color)', paddingBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Start Time</span>
                  <div style={{ fontSize: '12px', color: 'var(--text-color)' }}>{selectedRecord.start_time || 'N/A'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Callback Time</span>
                  <div style={{ fontSize: '12px', color: 'var(--text-color)' }}>{selectedRecord.create_time || 'N/A'}</div>
                </div>
              </div>
 
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Full Payout</span>
                  <div style={{ fontSize: '13px', color: 'var(--text-color)', fontWeight: 600 }}>${(selectedRecord.payout / selectedRecord.usd_currency_coins).toFixed(4)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Team Reward</span>
                  <div style={{ fontSize: '13px', color: 'var(--text-color)', fontWeight: 600 }}>${(selectedRecord.team_payout / selectedRecord.usd_currency_coins).toFixed(4)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Member Earning</span>
                  <div style={{ fontSize: '13px', color: 'var(--text-color)', fontWeight: 600 }}>${(selectedRecord.member_payout / selectedRecord.usd_currency_coins).toFixed(4)}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--divider-color)', paddingTop: '16px', marginTop: '14px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Moderate Transaction Status</span>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <select
                    value={selectedStatus || ''}
                    onChange={e => setSelectedStatus(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--divider-color)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="1">Success</option>
                    <option value="2">Disqualified</option>
                    <option value="3">Overquota</option>
                    <option value="4">Terminated</option>
                    <option value="6">Reconciliation (Deduction)</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleUpdateStatus}
                    disabled={updatingStatus || Number(selectedStatus) === selectedRecord.reward_status}
                    style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--primary-brand)', borderColor: 'var(--primary-brand)' }}
                  >
                    {updatingStatus ? 'Saving...' : 'Save Status'}
                  </button>
                </div>
              </div>

            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedRecord(null)}>Close Audit Details</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
