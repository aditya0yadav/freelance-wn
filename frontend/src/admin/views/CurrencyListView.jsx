import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { adminFetch, getAdminToken } from '../utils/adminApi';

export default function CurrencyListView() {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [formData, setFormData] = useState({ currency_name: '', currency_code: '', currency_coins: 100 });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const token = getAdminToken();

  const fetchCurrencies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/currency/list', 'GET', null, token);
      if (res.code === 200) setCurrencies(res.data.list || []);
    } catch (err) {
      console.error('Currency list error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCurrencies(); }, []);

  const handleOpenModal = (currency = null) => {
    setSelectedCurrency(currency);
    setFormData(currency ? {
      currency_name: currency.currency_name,
      currency_code: currency.currency_code,
      currency_coins: currency.currency_coins,
    } : { currency_name: '', currency_code: '', currency_coins: 100 });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!formData.currency_name.trim() || !formData.currency_code.trim()) {
      setErrorMsg('Currency name and code are required.');
      return;
    }
    setSaving(true);
    try {
      const endpoint = selectedCurrency ? '/currency/edit' : '/currency/add';
      const body = selectedCurrency
        ? { ...formData, currency_id: selectedCurrency.currency_id }
        : formData;
      const res = await adminFetch(endpoint, 'POST', body, token);
      if (res.code === 200) {
        setModalOpen(false);
        fetchCurrencies();
      } else {
        setErrorMsg(res.msg || 'Save failed');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (currency) => {
    if (!window.confirm(`Delete currency "${currency.currency_code}"?`)) return;
    try {
      await adminFetch('/currency/dele', 'POST', { currency_id: currency.currency_id }, token);
      fetchCurrencies();
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
            Currency Configuration
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--pm-text-secondary)' }}>
            Manage exchange rates and coin multipliers for reward calculations.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal(null)}>
          <Plus size={16} /> Add Currency
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--pm-text-secondary)' }}>
            Loading currencies...
          </div>
        ) : currencies.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--pm-text-secondary)' }}>
            No currencies configured.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Currency Code</th>
                <th>Currency Name</th>
                <th>Coins per $1 USD</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((c) => (
                <tr key={c.currency_id}>
                  <td style={{ color: 'var(--pm-text-tertiary)', fontSize: '12px' }}>#{c.currency_id}</td>
                  <td>
                    <code style={{ fontWeight: 700, fontSize: '14px', background: 'var(--pm-bg)', padding: '3px 8px', borderRadius: '6px' }}>
                      {c.currency_code}
                    </code>
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.currency_name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--pm-accent)' }}>
                        {Number(c.currency_coins).toLocaleString()}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--pm-text-secondary)' }}>coins / $1</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" onClick={() => handleOpenModal(c)} style={{ padding: '6px' }}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDelete(c)} style={{ padding: '6px' }}>
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
          <form onSubmit={handleSave} className="dialog-modal" style={{ maxWidth: '420px' }}>
            <div className="dialog-header">
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--pm-text-primary)' }}>
                {selectedCurrency ? 'Edit Currency' : 'Add Currency'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pm-text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {errorMsg && (
                <div style={{ background: 'var(--pm-danger-bg)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '8px', padding: '10px 14px', display: 'flex', gap: '8px', color: 'var(--pm-danger)', fontSize: '13px' }}>
                  <AlertCircle size={15} /><span>{errorMsg}</span>
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Currency Code (e.g. USD)</label>
                <input className="form-input" value={formData.currency_code} onChange={e => setFormData(p => ({ ...p, currency_code: e.target.value.toUpperCase() }))} placeholder="USD" maxLength={5} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Currency Name</label>
                <input className="form-input" value={formData.currency_name} onChange={e => setFormData(p => ({ ...p, currency_name: e.target.value }))} placeholder="US Dollar" required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Coins per $1 USD</label>
                <input type="number" className="form-input" value={formData.currency_coins} onChange={e => setFormData(p => ({ ...p, currency_coins: Number(e.target.value) }))} min="1" step="1" required />
                <span style={{ fontSize: '11px', color: 'var(--pm-text-tertiary)' }}>
                  How many virtual coins does $1 USD equal? e.g. 100
                </span>
              </div>
            </div>

            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : selectedCurrency ? 'Update' : 'Add Currency'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
