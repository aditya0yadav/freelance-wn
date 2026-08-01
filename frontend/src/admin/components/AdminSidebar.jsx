import React, { useState } from 'react';
import './AdminSidebar.css';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
    LayoutDashboard,
    Box,
    Users,
    Download,
    History,
    Globe,
    FolderKanban,
    ChevronDown,
    ChevronUp,
    FileText,
    Tag,
    UserCheck,
    Coins,
    Sliders
} from 'lucide-react';

export default function AdminSidebar({ isExpanded }) {
    const { t } = useLanguage();
    
    // Group open states
    const [platformOpen, setPlatformOpen] = useState(true);
    const [teamOpen, setTeamOpen] = useState(true);

    return (
        <div className={`sidebar-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="sidebar-top">
                <div style={{ height: '16px' }} />

                <nav className="nav-menu">
                    {/* Dashboard */}
                    <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <div className="icon-container"><LayoutDashboard size={20} /></div>
                        {isExpanded && <span className="nav-label">Dashboard</span>}
                    </NavLink>

                    {/* Platform Management Group */}
                    <div className="nav-group">
                        <div className="nav-group-header" onClick={() => setPlatformOpen(!platformOpen)} style={{ display: 'flex', justifyContent: isExpanded ? 'space-between' : 'center', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                            {isExpanded ? (
                                <>
                                    <span>Platform Management</span>
                                    {platformOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                </>
                            ) : (
                                <div title="Platform Management" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0' }}>
                                    <Box size={20} style={{ color: platformOpen ? 'var(--primary-mint)' : 'var(--text-muted)' }} />
                                    {platformOpen ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
                                </div>
                            )}
                        </div>
                        {platformOpen && (
                            <div className="nav-group-items">
                                <NavLink to="/admin/platforms" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="All platforms">
                                    <div className="icon-container"><Box size={18} /></div>
                                    {isExpanded && <span className="nav-label">All platforms</span>}
                                </NavLink>
                                <NavLink to="/admin/currency" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Currency Management">
                                    <div className="icon-container"><Coins size={18} /></div>
                                    {isExpanded && <span className="nav-label">Currency Management</span>}
                                </NavLink>
                                <NavLink to="/admin/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="All Projects">
                                    <div className="icon-container"><FolderKanban size={18} /></div>
                                    {isExpanded && <span className="nav-label">All Projects</span>}
                                </NavLink>
                                <NavLink to="/admin/character-template" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Character template">
                                    <div className="icon-container"><Sliders size={18} /></div>
                                    {isExpanded && <span className="nav-label">Character template</span>}
                                </NavLink>
                                <NavLink to="/admin/tag-management" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Tag Management">
                                    <div className="icon-container"><Tag size={18} /></div>
                                    {isExpanded && <span className="nav-label">Tag Management</span>}
                                </NavLink>
                            </div>
                        )}
                    </div>

                    {/* Team Management Group */}
                    <div className="nav-group">
                        <div className="nav-group-header" onClick={() => setTeamOpen(!teamOpen)} style={{ display: 'flex', justifyContent: isExpanded ? 'space-between' : 'center', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                            {isExpanded ? (
                                <>
                                    <span>Team Management</span>
                                    {teamOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                </>
                            ) : (
                                <div title="Team Management" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0' }}>
                                    <Users size={20} style={{ color: teamOpen ? 'var(--primary-mint)' : 'var(--text-muted)' }} />
                                    {teamOpen ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
                                </div>
                            )}
                        </div>
                        {teamOpen && (
                            <div className="nav-group-items">
                                <NavLink to="/admin/teams" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="All Teams">
                                    <div className="icon-container"><Globe size={18} /></div>
                                    {isExpanded && <span className="nav-label">All Teams</span>}
                                </NavLink>
                                <NavLink to="/admin/performance-record" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Performance Record">
                                    <div className="icon-container"><FileText size={18} /></div>
                                    {isExpanded && <span className="nav-label">Performance Record</span>}
                                </NavLink>
                                <NavLink to="/admin/members" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="All members">
                                    <div className="icon-container"><Users size={18} /></div>
                                    {isExpanded && <span className="nav-label">All members</span>}
                                </NavLink>
                                <NavLink to="/admin/performance-persona" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Performance Persona">
                                    <div className="icon-container"><UserCheck size={18} /></div>
                                    {isExpanded && <span className="nav-label">Performance Persona</span>}
                                </NavLink>
                                <NavLink to="/admin/operation-log" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Operation Log">
                                    <div className="icon-container"><FileText size={18} /></div>
                                    {isExpanded && <span className="nav-label">Operation Log</span>}
                                </NavLink>
                            </div>
                        )}
                    </div>
                    {/* Completions & Exports */}
                    <NavLink to="/admin/completions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Completions Log">
                        <div className="icon-container"><History size={20} /></div>
                        {isExpanded && <span className="nav-label">Completions Log</span>}
                    </NavLink>
                    <NavLink to="/admin/exports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Data Exports">
                        <div className="icon-container"><Download size={20} /></div>
                        {isExpanded && <span className="nav-label">Data Exports</span>}
                    </NavLink>
                </nav>
            </div>
        </div>
    );
}
