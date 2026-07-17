import React, { memo } from 'react';
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
    FolderKanban
} from 'lucide-react';

const NavItem = memo(({ icon, labelKey, isExpanded }) => {
    const { t } = useLanguage();
    return (
        <NavLink to={toForLabelKey(labelKey)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <div className="icon-container">
                {icon}
            </div>
            {isExpanded && <span className="nav-label">{t(labelKey)}</span>}
        </NavLink>
    );
});

// Helper mapping to avoid routing break
function toForLabelKey(key) {
    if (key === 'adminDashboard') return '/admin/dashboard';
    if (key === 'adminPlatforms') return '/admin/platforms';
    if (key === 'adminProjects') return '/admin/projects';
    if (key === 'adminAuth') return '/admin/members';
    if (key === 'adminTeams') return '/admin/teams';
    if (key === 'adminCompletions') return '/admin/completions';
    if (key === 'adminExports') return '/admin/exports';
    return '/admin/dashboard';
}

const AdminSidebar = ({ isExpanded }) => {
    return (
        <div className={`sidebar-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="sidebar-top">
                <div style={{ height: '20px' }} />

                <nav className="nav-menu">
                    <NavItem labelKey="adminDashboard" icon={<LayoutDashboard size={22} />} isExpanded={isExpanded} />
                    <NavItem labelKey="adminPlatforms" icon={<Box size={22} />} isExpanded={isExpanded} />
                    <NavItem labelKey="adminProjects" icon={<FolderKanban size={22} />} isExpanded={isExpanded} />
                    <NavItem labelKey="adminAuth" icon={<Users size={22} />} isExpanded={isExpanded} />
                    <NavItem labelKey="adminTeams" icon={<Globe size={22} />} isExpanded={isExpanded} />
                    <NavItem labelKey="adminCompletions" icon={<History size={22} />} isExpanded={isExpanded} />
                    <NavItem labelKey="adminExports" icon={<Download size={22} />} isExpanded={isExpanded} />
                </nav>
            </div>
        </div>
    );
};

export default memo(AdminSidebar);
