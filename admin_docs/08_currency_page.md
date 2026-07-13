# SurveyStream Admin Portal - 08. Currency Configuration Component

This document contains the complete JSX source code for the currency configuration editor (`frontend/src/admin/views/CurrencyListView.jsx`). It manages exchange variables and validation parameters.

```javascript
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

export default function CurrencyListView() {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  
  // Dialog state variables
  const [formData, setFormData] = useState({ currency_name: '', currency_code: '', currency_coins: 100 });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const items = [
        { currency_id: 1, currency_code: 'USD', currency_name: 'US Dollar', currency_coins: 100.00 },
        { currency_id: 2, currency_code: 'CNY', currency_name: 'Renminbi Yuan', currency_coins: 700.00 },
        { currency_id: 3, currency_code: 'EUR', currency_name: 'Euro Token', currency_coins: 90.00 }
      ];
      setCurrencies(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const handleOpenDialog = (currency = null) => {
    if (currency) {
      setSelectedCurrency(currency);
      setFormData({
        currency_name: currency.currency_name,
        currency_code: currency.currency_code,
        currency_coins: currency.currency_coins
      });
    } else {
      setSelectedCurrency(null);
      setFormData({ currency_name: '', currency_code: '', currency_coins: 100 });
    }
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!formData.currency_name.trim() || !formData.currency_code.trim()) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (isNaN(formData.currency_coins) || formData.currency_coins <= 0) {
      setErrorMsg('Exchange multiplier must be a positive number.');
      return;
    }

    try {
      if (selectedCurrency) {
        // Edit flow
        setCurrencies(prev => prev.map(c => 
          c.currency_id === selectedCurrency.currency_id ? { ...c, ...formData } : c
        ));
      } else {
        // Add flow
        const newCurrency = {
          currency_id: Date.now(),
          ...formData
        };
        setCurrencies(prev => [...prev, newCurrency]);
      }
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(err.message || 'Error occurred while saving currency.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this currency mapping? This might affect platforms mapped to this ID.')) return;
    setCurrencies(prev => prev.filter(c => c.currency_id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Exchange Settings</h2>
          <p style={{ fontSize: '13px', color: 'var(--pm-text-secondary)' }}>Define virtual coin exchange multipliers for different currencies.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenDialog(null)}>
          <Plus size={16} /> Add Currency
        </button>
      </div>

      {/* Grid */}
      <div className="table-container premium-surface">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--pm-text-secondary)' }}>Syncing exchange files...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Currency Name</th>
                <th>Currency Code</th>
                <th>Multiplier (Coins per $1.00 USD)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map(c => (
                <tr key={c.currency_id}>
                  <td>{c.currency_id}</td>
                  <td style={{ fontWeight: 600 }}>{c.currency_name}</td>
                  <td><code style={{ background: 'var(--pm-bg)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{c.currency_code}</code></td>
                  <td style={{ fontWeight: 600 }}>{c.currency_coins.toFixed(2)} Points</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" onClick={() => handleOpenDialog(c)} style={{ padding: '6px' }}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDelete(c.currency_id)} style={{ padding: '6px' }}>
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

      {/* Editor Modal Overlay */}
      {modalOpen && (
        <div className="dialog-overlay">
          <form onSubmit={handleSave} className="dialog-modal" style={{ maxWidth: '450px' }}>
            <div className="dialog-header">
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                {selectedCurrency ? 'Edit Currency Configuration' : 'Create Currency Modifier'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorMsg && (
                <div className="badge badge-danger" style={{ padding: '10px', display: 'flex', gap: '6px', width: '100%' }}>
                  <AlertCircle size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Currency Name</label>
                <input 
                  type="text" 
                  value={formData.currency_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency_name: e.target.value }))}
                  placeholder="e.g. US Dollar"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">ISO Currency Code</label>
                <input 
                  type="text" 
                  value={formData.currency_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency_code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. USD"
                  className="form-input"
                  maxLength={5}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Coins Per Fiat Unit</label>
                <input 
                  type="number" 
                  value={formData.currency_coins}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency_coins: parseFloat(e.target.value) || 0 }))}
                  placeholder="100.00"
                  className="form-input"
                  step="0.01"
                />
              </div>
            </div>

            <div className="dialog-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Currency</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
```
