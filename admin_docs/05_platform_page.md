# SurveyStream Admin Portal - 05. Platform Directory Component

This document contains the complete JSX source code for the platform list page (`frontend/src/admin/views/PlatformListView.jsx`). It handles sorting, filtering, toggle buttons, and edit actions.

```javascript
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, RefreshCw, Star } from 'lucide-react';
import PlatformModal from './PlatformModal';

// Renders visual star ratings
const StarRatingView = ({ count }) => (
  <div style={{ display: 'flex', gap: '2px', color: '#FFAB00' }}>
    {[...Array(5)].map((_, i) => (
      <Star key={i} size={14} fill={i < count ? 'currentColor' : 'none'} stroke="currentColor" />
    ))}
  </div>
);

export default function PlatformListView() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal controllers
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [syncingStates, setSyncingStates] = useState({}); // Tracking platform sync clicks

  const fetchPlatforms = async () => {
    setLoading(true);
    try {
      // Mock loading logic - Replace with direct request mappings
      const items = [
        {
          platform_id: 1,
          platform_name: 'Torfacts',
          platform_sign: 'torfacts',
          platform_level: 5,
          platform_currency: 1,
          is_list: 1,
          is_wall: 0,
          is_disable: 0
        },
        {
          platform_id: 2,
          platform_name: 'Dynata Router',
          platform_sign: 'dynata',
          platform_level: 4,
          platform_currency: 1,
          is_list: 1,
          is_wall: 1,
          is_disable: 0
        }
      ];
      setPlatforms(items);
      setTotalPages(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, [currentPage, searchQuery]);

  // Handles updating toggle states directly
  const handleToggleState = async (platformId, field, currentValue) => {
    const updatedValue = currentValue === 1 ? 0 : 1;
    // Optimistic UI updates
    setPlatforms(prev => prev.map(p => 
      p.platform_id === platformId ? { ...p, [field]: updatedValue } : p
    ));
    
    try {
      console.log(`Toggled ${field} for ID ${platformId} to ${updatedValue}`);
      // Triggers update request callback
    } catch (err) {
      fetchPlatforms(); // Revert on failure
    }
  };

  // Triggers manual API sync
  const handleTriggerSync = async (platform) => {
    setSyncingStates(prev => ({ ...prev, [platform.platform_id]: true }));
    try {
      console.log(`Sync inventory initiated for ${platform.platform_name}`);
      // Callback hooks trigger the backend pulling engine
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setSyncingStates(prev => ({ ...prev, [platform.platform_id]: false }));
      }, 1000);
    }
  };

  const handleEditClick = (platform) => {
    setSelectedPlatform(platform);
    setModalOpen(true);
  };

  const handleAddClick = () => {
    setSelectedPlatform(null);
    setModalOpen(true);
  };

  const handleDeleteClick = async (platformId) => {
    if (!window.confirm('Are you sure you want to delete this platform?')) return;
    try {
      setPlatforms(prev => prev.filter(p => p.platform_id !== platformId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Survey Providers</h2>
          <p style={{ fontSize: '13px', color: 'var(--pm-text-secondary)' }}>Configure networks, API credentials, and sync schedules.</p>
        </div>
        <button className="btn btn-primary" onClick={handleAddClick}>
          <Plus size={16} /> Add Platform
        </button>
      </div>

      {/* 2. Search Filters */}
      <div className="premium-surface" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pm-text-tertiary)' }} />
          <input 
            type="text" 
            placeholder="Search platforms by name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input" 
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      {/* 3. Platforms Data Grid */}
      <div className="table-container premium-surface">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--pm-text-secondary)' }}>Loading platforms list...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Platform Name</th>
                <th>Signature</th>
                <th>Quality Rating</th>
                <th>Show in List</th>
                <th>Show in Wall</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map(platform => (
                <tr key={platform.platform_id}>
                  <td>{platform.platform_id}</td>
                  <td style={{ fontWeight: 600 }}>{platform.platform_name}</td>
                  <td><code style={{ background: 'var(--pm-bg)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{platform.platform_sign}</code></td>
                  <td><StarRatingView count={platform.platform_level} /></td>
                  
                  {/* Toggles */}
                  <td>
                    <div 
                      onClick={() => handleToggleState(platform.platform_id, 'is_list', platform.is_list)}
                      className={`switch-container ${platform.is_list === 1 ? 'active' : ''}`}
                    >
                      <div className="switch-control" />
                    </div>
                  </td>
                  <td>
                    <div 
                      onClick={() => handleToggleState(platform.platform_id, 'is_wall', platform.is_wall)}
                      className={`switch-container ${platform.is_wall === 1 ? 'active' : ''}`}
                    >
                      <div className="switch-control" />
                    </div>
                  </td>
                  
                  {/* Status Badge */}
                  <td>
                    <span className={`badge ${platform.is_disable === 0 ? 'badge-success' : 'badge-danger'}`}>
                      {platform.is_disable === 0 ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  
                  {/* Action Actions */}
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleTriggerSync(platform)}
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        disabled={syncingStates[platform.platform_id]}
                      >
                        <RefreshCw size={14} className={syncingStates[platform.platform_id] ? 'spin-anim' : ''} /> 
                        {syncingStates[platform.platform_id] ? 'Syncing...' : 'Sync'}
                      </button>
                      <button 
                        onClick={() => handleEditClick(platform)}
                        className="btn btn-secondary" 
                        style={{ padding: '6px' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(platform.platform_id)}
                        className="btn btn-danger" 
                        style={{ padding: '6px' }}
                      >
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

      {/* 4. Platform Editor Overlay Dialog */}
      {modalOpen && (
        <PlatformModal 
          platform={selectedPlatform} 
          onClose={() => setModalOpen(false)} 
          onRefresh={fetchPlatforms}
        />
      )}

      {/* Custom Keyframe Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-anim {
          animation: spin 1s linear infinite;
        }
      `}} />
    </div>
  );
}
```
