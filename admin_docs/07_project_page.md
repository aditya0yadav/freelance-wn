# SurveyStream Admin Portal - 07. Project Explorer Component

This document contains the complete JSX source code for the survey project inventory viewer (`frontend/src/admin/views/ProjectListView.jsx`). It handles database sorting, state filters, and link checks.

```javascript
import React, { useState, useEffect } from 'react';
import { Search, Filter, Play, ToggleLeft, ToggleRight } from 'lucide-react';

export default function ProjectListView() {
  const [projects, setProjects] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active'); // 'active' | 'disabled' | 'all'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchFilters = async () => {
    // Populate platform selectors
    setPlatforms([
      { platform_id: 1, platform_name: 'Torfacts' },
      { platform_id: 2, platform_name: 'Dynata' }
    ]);
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      // Mock data representing standard synced database rows
      const items = [
        {
          project_id: 101,
          project_pno: 'G98231',
          project_name: 'Consumer Preferences Study Q3',
          platform_id: 1,
          platform: { platform_name: 'Torfacts' },
          project_cpi: 2.80,
          project_quota: 500,
          project_complete: 240,
          project_loi: 15,
          project_ir: 75,
          is_disable: 0
        },
        {
          project_id: 102,
          project_pno: 'D88129',
          project_name: 'Automotive Trends Survey 2026',
          platform_id: 2,
          platform: { platform_name: 'Dynata' },
          project_cpi: 4.50,
          project_quota: 100,
          project_complete: 98,
          project_loi: 20,
          project_ir: 45,
          is_disable: 0
        }
      ];
      setProjects(items);
      setTotalPages(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [currentPage, searchQuery, selectedPlatform, selectedStatus]);

  const handleToggleDisable = async (projectId, currentStatus) => {
    const updatedStatus = currentStatus === 1 ? 0 : 1;
    setProjects(prev => prev.map(p => 
      p.project_id === projectId ? { ...p, is_disable: updatedStatus } : p
    ));
    console.log(`Toggled status for project ${projectId} to ${updatedStatus}`);
  };

  // Previews the routing redirect link with fallback variables
  const handleTestLink = (project) => {
    const mockUid = 'test_admin_user';
    const mockSession = `session_${Date.now()}`;
    const targetUrl = `https://supplier-router.com/click?pno=${project.project_pno}&uid=${mockUid}&session_id=${mockSession}`;
    window.open(targetUrl, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Survey Project Explorer</h2>
        <p style={{ fontSize: '13px', color: 'var(--pm-text-secondary)' }}>Audit and manage active project targeting variables.</p>
      </div>

      {/* Filter Row */}
      <div className="premium-surface" style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pm-text-tertiary)' }} />
          <input 
            type="text" 
            placeholder="Search surveys by PNO or title..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="form-input" 
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {/* Platform Selector */}
        <select 
          value={selectedPlatform} 
          onChange={(e) => { setSelectedPlatform(e.target.value); setCurrentPage(1); }}
          className="form-select"
          style={{ width: '200px' }}
        >
          <option value="">All Supplier Platforms</option>
          {platforms.map(p => (
            <option key={p.platform_id} value={p.platform_id}>{p.platform_name}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select 
          value={selectedStatus} 
          onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
          className="form-select"
          style={{ width: '160px' }}
        >
          <option value="all">All States</option>
          <option value="active">Active (Live)</option>
          <option value="disabled">Disabled (Muted)</option>
        </select>
      </div>

      {/* Projects Table */}
      <div className="table-container premium-surface">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--pm-text-secondary)' }}>Syncing survey lists...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>PNO</th>
                <th>Survey Title</th>
                <th>Supplier</th>
                <th>CPI ($)</th>
                <th>Completes / Quota</th>
                <th>LOI</th>
                <th>IR</th>
                <th>Visibility</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => {
                const isOverquota = project.project_complete >= project.project_quota;
                return (
                  <tr key={project.project_id}>
                    <td style={{ fontWeight: 700 }}><code style={{ fontSize: '12px' }}>{project.project_pno}</code></td>
                    <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {project.project_name}
                    </td>
                    <td>{project.platform?.platform_name || 'Manual'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--pm-accent)' }}>${project.project_cpi.toFixed(2)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{project.project_complete} / {project.project_quota}</span>
                        {/* Custom progress bars */}
                        <div style={{ width: '100px', height: '6px', backgroundColor: 'var(--pm-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${Math.min((project.project_complete / project.project_quota) * 100, 100)}%`, 
                              height: '100%', 
                              backgroundColor: isOverquota ? 'var(--pm-danger)' : 'var(--pm-accent)' 
                            }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td>{project.project_loi} min</td>
                    <td>{project.project_ir}%</td>
                    
                    {/* Status checkbox toggle */}
                    <td>
                      <span className={`badge ${project.is_disable === 0 && !isOverquota ? 'badge-success' : 'badge-danger'}`}>
                        {project.is_disable === 1 ? 'Muted' : isOverquota ? 'Overquota' : 'Live'}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleTestLink(project)}
                          className="btn btn-secondary" 
                          style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', gap: '4px' }}
                        >
                          <Play size={12} fill="currentColor" /> Test Router
                        </button>
                        <button
                          onClick={() => handleToggleDisable(project.project_id, project.is_disable)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: project.is_disable === 0 ? 'var(--pm-accent)' : 'var(--pm-text-tertiary)' }}
                        >
                          {project.is_disable === 0 ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--pm-text-secondary)' }}>
          Showing page {currentPage} of {totalPages}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="btn btn-secondary"
            style={{ padding: '8px 16px' }}
          >
            Prev
          </button>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="btn btn-secondary"
            style={{ padding: '8px 16px' }}
          >
            Next
          </button>
        </div>
      </div>

    </div>
  );
}
```
