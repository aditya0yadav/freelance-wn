import React, { memo } from 'react';
import './AdminSidebar.css';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Box,
    Users,
    Download,
    History
} from 'lucide-react';

const NavItem = memo(({ icon, label, to, isExpanded }) => {
    return (
        <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <div className="icon-container">
                {icon}
            </div>
            {isExpanded && <span className="nav-label">{label}</span>}
        </NavLink>
    );
});

const AdminSidebar = ({ isExpanded }) => {
    return (
        <div className={`sidebar-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="sidebar-top">
                <div style={{ height: '20px' }} />

                <nav className="nav-menu">
                    <NavItem to="/admin/dashboard" icon={<LayoutDashboard size={22} />} label="Dashboard" isExpanded={isExpanded} />
                    <NavItem to="/admin/platforms" icon={<Box size={22} />} label="Platform Management" isExpanded={isExpanded} />
                    <NavItem to="/admin/members" icon={<Users size={22} />} label="Team Management" isExpanded={isExpanded} />
                    <NavItem to="/admin/completions" icon={<History size={22} />} label="Completions Log" isExpanded={isExpanded} />
                    <NavItem to="/admin/exports" icon={<Download size={22} />} label="Export Records" isExpanded={isExpanded} />
                </nav>
            </div>
        </div>
    );
};

export default memo(AdminSidebar);
