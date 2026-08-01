import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { adminFetch, getAdminToken } from '../utils/adminApi';
import { useAdminTheme } from '../context/AdminThemeContext';

export default function TagManagementView() {
  const token = getAdminToken();
  const { theme } = useAdminTheme();

  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagName, setTagName] = useState('');

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/tag/list?limit=100', 'GET', null, token);
      if (res.code === 200) {
        setTags(res.data.list || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleSaveTag = async (e) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    try {
      const body = { tag_name: tagName.trim() };
      let res;
      if (selectedTag) {
        body.tag_id = selectedTag.tag_id;
        res = await adminFetch('/tag/edit', 'POST', body, token);
      } else {
        res = await adminFetch('/tag/add', 'POST', body, token);
      }
      if (res.code === 200) {
        setModalOpen(false);
        fetchTags();
      } else {
        alert(res.msg || 'Save failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTag = async (tag) => {
    if (!window.confirm(`Delete tag "${tag.tag_name}"?`)) return;
    try {
      const res = await adminFetch('/tag/dele', 'POST', { ids: [tag.tag_id] }, token);
      if (res.code === 200) {
        fetchTags();
      } else {
        alert(res.msg || 'Delete failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }} className="anima-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--pm-text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
            Tag Management
          </h2>
          <p style={{ fontSize: 13, color: 'var(--pm-text-secondary)', margin: '4px 0 0' }}>
            Manage category tags utilized for grouping members.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelectedTag(null); setTagName(''); setModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, background: 'var(--primary-brand)', border: 'none' }}>
          <Plus size={15} /> Create Tag
        </button>
      </div>

      {/* Main Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>Loading tags…</div>
        ) : tags.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>No tags configured.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Tag ID</th><th>Tag Name</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {tags.map((t) => (
                <tr key={t.tag_id}>
                  <td style={{ color: 'var(--pm-text-secondary)', fontSize: 12 }}>#{t.tag_id}</td>
                  <td style={{ fontWeight: 700 }}>
                    <span className="badge badge-info" style={{ fontSize: 13, padding: '4px 10px' }}>{t.tag_name}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" onClick={() => { setSelectedTag(t); setTagName(t.tag_name); setModalOpen(true); }} style={{ padding: '6px' }} title="Edit">
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDeleteTag(t)} style={{ padding: '6px' }} title="Delete">
                        <Trash2 size={13} />
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
      {modalOpen && (
        <div className="admin-theme" data-theme={theme}>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <form onSubmit={handleSaveTag} className="dialog-modal" style={{ maxWidth: '400px', width: '100%' }}>
              <div className="dialog-header">
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--pm-text-primary)' }}>
                  {selectedTag ? 'Edit Tag' : 'Create Tag'}
                </h3>
                <button type="button" onClick={() => setModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pm-text-secondary)' }}><X size={18} /></button>
              </div>

              <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Tag Name *</label>
                  <input type="text" placeholder="e.g. VIP Member" value={tagName} onChange={e => setTagName(e.target.value)} className="form-input" required />
                </div>
              </div>

              <div className="dialog-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--primary-brand)', border: 'none' }}>
                  {selectedTag ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
