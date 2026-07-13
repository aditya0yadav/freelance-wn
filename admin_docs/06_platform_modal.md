# SurveyStream Admin Portal - 06. Platform Configuration Modal Component

This document contains the complete JSX source code for the platform editor modal (`frontend/src/admin/views/PlatformModal.jsx`). It manages settings, JSON structure validation, and rating stars.

```javascript
import React, { useState, useEffect } from 'react';
import { X, Star, AlertCircle } from 'lucide-react';

export default function PlatformModal({ platform, onClose, onRefresh }) {
  const isEdit = !!platform;
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Available currencies populated inside select
  const [currencies, setCurrencies] = useState([{ currency_id: 1, currency_code: 'USD' }]);

  // Local Form state matching the database variables
  const [formData, setFormData] = useState({
    platform_name: '',
    platform_sign: '',
    platform_level: 5,
    platform_currency: 1,
    platform_url: '',
    platform_quota_url: '',
    platform_click_url: '',
    params: '{}',
    project_params: '{}',
    is_list: 1,
    is_wall: 0,
    is_persona: 0,
    is_quota: 0,
    is_disable: 0,
    show_quota: 1,
    show_click: 1,
    show_complete: 1,
    show_loi: 1,
    show_ir: 1,
    show_no: 1,
    sort: 0,
    limit_endtime: 0
  });

  // Load initial settings on edit
  useEffect(() => {
    if (platform) {
      setFormData({
        ...platform,
        // Ensure JSON strings are readable when loaded into textareas
        params: typeof platform.params === 'object' ? JSON.stringify(platform.params, null, 2) : platform.params || '{}',
        project_params: typeof platform.project_params === 'object' ? JSON.stringify(platform.project_params, null, 2) : platform.project_params || '{}'
      });
    }
  }, [platform]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateJson = (str) => {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    // 1. Validate Form Fields
    if (!formData.platform_name.trim() || !formData.platform_sign.trim()) {
      setErrorMessage('Platform Name and Signature parameters are required.');
      return;
    }

    // 2. Validate JSON inputs
    if (!validateJson(formData.params)) {
      setErrorMessage('Credentials (params) must be a valid JSON string.');
      return;
    }
    if (!validateJson(formData.project_params)) {
      setErrorMessage('API Mappings (project_params) must be a valid JSON string.');
      return;
    }

    setLoading(true);
    try {
      // Save changes
      console.log('Sending payload:', {
        ...formData,
        params: JSON.parse(formData.params),
        project_params: JSON.parse(formData.project_params)
      });
      
      onRefresh();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-modal" style={{ maxWidth: '750px' }}>
        
        {/* Header */}
        <div className="dialog-header">
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
            {isEdit ? `Edit Platform: ${platform.platform_name}` : 'Add New Platform'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pm-text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {errorMessage && (
            <div className="badge badge-danger" style={{ padding: '12px', borderRadius: '8px', display: 'flex', gap: '8px', width: '100%' }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tabular Groups */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Platform Name</label>
              <input 
                type="text" 
                value={formData.platform_name}
                onChange={(e) => handleInputChange('platform_name', e.target.value)}
                className="form-input" 
                placeholder="e.g. Lucid Router"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Unique Signature (Sign)</label>
              <input 
                type="text" 
                value={formData.platform_sign}
                onChange={(e) => handleInputChange('platform_sign', e.target.value)}
                className="form-input" 
                placeholder="e.g. lucid"
                disabled={isEdit} // Signature values are read-only after creation
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Quality Score Rating</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '38px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => handleInputChange('platform_level', star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: star <= formData.platform_level ? '#FFAB00' : 'var(--pm-text-tertiary)' }}
                  >
                    <Star size={22} fill={star <= formData.platform_level ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Default Exchange Currency</label>
              <select
                value={formData.platform_currency}
                onChange={(e) => handleInputChange('platform_currency', Number(e.target.value))}
                className="form-select"
              >
                {currencies.map(c => (
                  <option key={c.currency_id} value={c.currency_id}>{c.currency_code}</option>
                ))}
              </select>
            </div>
          </div>

          {/* URLs */}
          <div className="form-group">
            <label className="form-label">API Fetch URL</label>
            <input 
              type="text" 
              value={formData.platform_url}
              onChange={(e) => handleInputChange('platform_url', e.target.value)}
              className="form-input" 
              placeholder="https://api.supplier.com/v1/surveys"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Click Router Endpoint</label>
            <input 
              type="text" 
              value={formData.platform_click_url}
              onChange={(e) => handleInputChange('platform_click_url', e.target.value)}
              className="form-input" 
              placeholder="https://route.supplier.com/start?pid=[project_no]&uid=[member_id]&session=[uuid]"
            />
          </div>

          {/* Visibility Options */}
          <div>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Dashboard Card Visibility Details</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'var(--pm-bg)', padding: '16px', borderRadius: '10px' }}>
              {[
                { key: 'show_quota', label: 'Remaining Quota' },
                { key: 'show_click', label: 'Clicks Logged' },
                { key: 'show_complete', label: 'Completed Checks' },
                { key: 'show_loi', label: 'Length of Interview' },
                { key: 'show_ir', label: 'Incidence Rates' },
                { key: 'show_no', label: 'Serial References' },
              ].map(opt => (
                <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    id={opt.key}
                    checked={formData[opt.key] === 1}
                    onChange={(e) => handleInputChange(opt.key, e.target.checked ? 1 : 0)}
                  />
                  <label htmlFor={opt.key} style={{ fontSize: '13px', cursor: 'pointer' }}>{opt.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Parameters Textareas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">API Credentials JSON (params)</label>
              <textarea 
                value={formData.params}
                onChange={(e) => handleInputChange('params', e.target.value)}
                className="form-textarea" 
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
                placeholder='{ "api_key": "..." }'
              />
            </div>
            <div className="form-group">
              <label className="form-label">Field Mapping JSON (project_params)</label>
              <textarea 
                value={formData.project_params}
                onChange={(e) => handleInputChange('project_params', e.target.value)}
                className="form-textarea" 
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
                placeholder='{ "loi_field": "Length" }'
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="dialog-footer" style={{ margin: '-1.5rem -1.5rem -1.5rem -1.5rem', padding: '1.25rem 1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
```
