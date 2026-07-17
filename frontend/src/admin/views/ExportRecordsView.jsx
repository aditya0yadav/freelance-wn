import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { adminFetch, getAdminToken } from '../utils/adminApi';
import { Download, Trash2, Database, Search, Loader2, Edit2, RotateCcw, Plus, X } from 'lucide-react';

export default function ExportRecordsView() {
  const token = getAdminToken();
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'recycle'
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Search & Filters
  const [searchField, setSearchField] = useState('file_name');
  const [searchValue, setSearchValue] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [exportType, setExportType] = useState('1'); // '1' = Rewards, '2' = Members, '3' = Platforms
  const [exportRemark, setExportRemark] = useState('');
  const [generating, setGenerating] = useState(false);

  const [editingRecord, setEditingRecord] = useState(null);
  const [editRemark, setEditRemark] = useState('');
  const [editing, setEditing] = useState(false);

  const TYPE_MAP = {
    '1': 'Team Rewards',
    '2': 'Member Directory',
    '3': 'Platforms Configs',
    '4': 'Platforms Configs'
  };

  const STATUS_MAP = {
    '0': { label: 'Failed', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
    '1': { label: 'Success', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
    '2': { label: 'Processing', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' }
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'list' ? '/export/list' : '/export/recycleList';
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit)
      });
      if (typeFilter) queryParams.append('type', typeFilter);
      if (statusFilter) queryParams.append('status', statusFilter);
      if (searchValue) {
        queryParams.append('search_field', searchField);
        queryParams.append('search_value', searchValue);
      }

      const res = await adminFetch(`${endpoint}?${queryParams.toString()}`, 'GET', null, token);
      if (res.code === 200) {
        setRecords(res.data.list || []);
        setTotal(res.data.count || 0);
      }
    } catch (err) {
      console.error('Error fetching export records:', err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, typeFilter, statusFilter, searchField, searchValue, token]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Tab trigger resets page
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setRecords([]);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await adminFetch('/export/generate', 'POST', {
        type: Number(exportType),
        export_remark: exportRemark
      }, token);
      if (res.code === 200) {
        setShowGenerateModal(false);
        setExportRemark('');
        fetchRecords();
      }
    } catch (err) {
      alert(`Export error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (record) => {
    const fileUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${record.file_path}`;
    window.open(fileUrl, '_blank');
  };

  const startEdit = (record) => {
    setEditingRecord(record);
    setEditRemark(record.remark || '');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditing(true);
    try {
      const res = await adminFetch('/export/edit', 'POST', {
        export_id: editingRecord.export_id,
        remark: editRemark
      }, token);
      if (res.code === 200) {
        setEditingRecord(null);
        fetchRecords();
      }
    } catch (err) {
      alert(`Edit error: ${err.message}`);
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async (exportId) => {
    if (!window.confirm('Move this export record to the Recycle Bin?')) return;
    try {
      const res = await adminFetch('/export/dele', 'POST', { export_id: exportId }, token);
      if (res.code === 200) {
        fetchRecords();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestore = async (exportId) => {
    try {
      const res = await adminFetch('/export/recycleReco', 'POST', { export_id: exportId }, token);
      if (res.code === 200) {
        fetchRecords();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePermanentDelete = async (exportId) => {
    if (!window.confirm('Permanently delete this export and its file? This action is irreversible.')) return;
    try {
      const res = await adminFetch('/export/recycleDele', 'POST', { export_id: exportId }, token);
      if (res.code === 200) {
        fetchRecords();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Upper header action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-color)', margin: 0, letterSpacing: '-0.3px' }}>
            Export Records Center
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Manage generated data worksheets and files logs
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Generate Export
        </button>
      </div>

      {/* Glass Tab Selector */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--divider-color)', paddingBottom: '10px' }}>
        <button
          onClick={() => handleTabChange('list')}
          style={{
            background: 'none', border: 'none', padding: '8px 16px', fontSize: '13px', fontWeight: activeTab === 'list' ? 700 : 500,
            color: activeTab === 'list' ? 'var(--primary-brand)' : 'var(--text-muted)', cursor: 'pointer',
            borderBottom: activeTab === 'list' ? '2.5px solid var(--primary-brand)' : 'none', transition: 'all 0.2s'
          }}
        >
          All Exports
        </button>
        <button
          onClick={() => handleTabChange('recycle')}
          style={{
            background: 'none', border: 'none', padding: '8px 16px', fontSize: '13px', fontWeight: activeTab === 'recycle' ? 700 : 500,
            color: activeTab === 'recycle' ? 'var(--primary-brand)' : 'var(--text-muted)', cursor: 'pointer',
            borderBottom: activeTab === 'recycle' ? '2.5px solid var(--primary-brand)' : 'none', transition: 'all 0.2s'
          }}
        >
          Recycle Bin
        </button>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-color)', padding: '16px 0' }}>
        
        {/* Module select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Module:</span>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--divider-color)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '13px', outline: 'none' }}>
            <option value="">All Modules</option>
            <option value="1">Team Rewards</option>
            <option value="2">Member Directory</option>
            <option value="3">Platforms Configs</option>
          </select>
        </div>

        {/* Status select */}
        {activeTab === 'list' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status:</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--divider-color)', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '13px', outline: 'none' }}>
              <option value="">Any Status</option>
              <option value="1">Success</option>
              <option value="2">Processing</option>
              <option value="0">Failed</option>
            </select>
          </div>
        )}

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <select value={searchField} onChange={(e) => setSearchField(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px 0 0 8px', border: '1px solid var(--divider-color)', borderRight: 'none', background: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '13px', outline: 'none' }}>
            <option value="file_name">File Name</option>
            <option value="remark">Remarks</option>
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
          setTypeFilter(''); setStatusFilter(''); setSearchValue(''); setPage(1);
        }} style={{ padding: '8px 16px', fontSize: '13px' }}>
          Reset
        </button>
      </div>

      {/* Flat Borderless Table */}
      <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={32} className="anima-spin" style={{ margin: '0 auto 12px' }} />
            <span>Retrieving export logs...</span>
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Database size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <span>No export files found</span>
          </div>
        ) : (
          <table className="admin-table" style={{ background: 'transparent' }}>
            <thead>
              <tr style={{ background: 'transparent' }}>
                <th style={{ background: 'transparent', padding: '12px 16px 12px 0' }}>ID</th>
                <th style={{ background: 'transparent', padding: '12px 16px' }}>Type</th>
                <th style={{ background: 'transparent', padding: '12px 16px' }}>File Information</th>
                <th style={{ background: 'transparent', padding: '12px 16px' }}>Status</th>
                <th style={{ background: 'transparent', padding: '12px 16px' }}>Timing</th>
                <th style={{ background: 'transparent', padding: '12px 16px' }}>Remarks</th>
                <th style={{ background: 'transparent', padding: '12px 16px' }}>Generated At</th>
                <th style={{ background: 'transparent', padding: '12px 0', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.export_id} style={{ background: 'transparent' }}>
                  <td style={{ padding: '16px 16px 16px 0', fontWeight: 600, color: 'var(--text-muted)' }}>#{r.export_id}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-color)' }}>
                      {TYPE_MAP[r.type] || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary-brand)', fontSize: '13px' }}>{r.file_name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.file_size}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {(() => {
                      const s = STATUS_MAP[r.status] || STATUS_MAP['2'];
                      return (
                        <span style={{ padding: '4px 10px', background: s.bg, color: s.color, borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                          {s.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-color)' }}>
                      {r.times ? r.times.toFixed(2) + 's' : '-'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {r.remark || <span style={{ opacity: 0.4 }}>No remarks</span>}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.create_time}</span>
                  </td>
                  <td style={{ padding: '16px 0', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                      {activeTab === 'list' ? (
                        <>
                          {r.status === 1 && (
                            <button onClick={() => handleDownload(r)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary-brand)', padding: 0 }} title="Download File">
                              <Download size={16} />
                            </button>
                          )}
                          <button onClick={() => startEdit(r)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }} title="Edit Remarks">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(r.export_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', padding: 0 }} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleRestore(r.export_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary-brand)', padding: 0 }} title="Restore">
                            <RotateCcw size={16} />
                          </button>
                          <button onClick={() => handlePermanentDelete(r.export_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', padding: 0 }} title="Delete Permanently">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="premium-metric-card" style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-color)', border: '1px solid var(--divider-color)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-color)' }}>Generate New Export</h3>
              <button onClick={() => setShowGenerateModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Export Module</label>
                <select value={exportType} onChange={(e) => setExportType(e.target.value)} className="form-select">
                  <option value="1">Team Rewards (Completions Log)</option>
                  <option value="2">Member Directory</option>
                  <option value="3">Platforms Configs</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea rows="3" placeholder="Optional remark (e.g. June Monthly Report)..." value={exportRemark} onChange={(e) => setExportRemark(e.target.value)} className="form-textarea" style={{ resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGenerateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={generating}>
                  {generating ? 'Exporting...' : 'Generate CSV'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {editingRecord && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="premium-metric-card" style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-color)', border: '1px solid var(--divider-color)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-color)' }}>Edit Remarks</h3>
              <button onClick={() => setEditingRecord(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea rows="3" placeholder="Update remark..." value={editRemark} onChange={(e) => setEditRemark(e.target.value)} className="form-textarea" style={{ resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingRecord(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editing}>
                  {editing ? 'Saving...' : 'Save Changes'}
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
