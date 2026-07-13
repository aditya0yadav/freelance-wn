# SurveyStream Admin Portal - 04. Collapsible Sidebar Component

This document contains the complete JSX source code for the navigation Sidebar component (`frontend/src/admin/components/Sidebar.jsx`). It includes state bindings, toggle triggers, and active path highlights.

```javascript
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Smartphone,
  LayoutGrid,
  Coins,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

const navItems = [
  { path: '/admin/dashboard/analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
  { path: '/admin/dashboard/platforms', label: 'Platforms', icon: <Smartphone size={20} /> },
  { path: '/admin/dashboard/projects', label: 'Surveys', icon: <LayoutGrid size={20} /> },
  { path: '/admin/dashboard/currency', label: 'Currencies', icon: <Coins size={20} /> },
  { path: '/admin/dashboard/teams', label: 'Team Auth', icon: <ShieldCheck size={20} /> },
];

export default function Sidebar({ isCollapsed, onToggle, isMobileOpen, onCloseMobile, onLogout }) {
  return (
    <aside
      className={`admin-sidebar-shell ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
      style={{
        position: 'fixed',
        top: '24px',
        bottom: '24px',
        left: '24px',
        width: isCollapsed ? '72px' : '264px',
        backgroundColor: 'var(--pm-sidebar)',
        border: '1px solid var(--pm-border-layout)',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        justify-content: 'space-between',
        padding: '24px 12px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 100,
        boxShadow: 'var(--pm-shadow-lg)'
      }}
    >
      {/* 1. Header & Collapse Control */}
      <div>
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justify-content: isCollapsed ? 'center' : 'space-between',
            padding: '0 8px 24px 8px',
            borderBottom: '1px solid var(--pm-border-layout)',
            marginBottom: '16px'
          }}
        >
          {!isCollapsed && (
            <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--pm-accent)', letterSpacing: '0.5px' }}>
              SURVEY<span style={{ color: 'var(--pm-text-primary)' }}>STREAM</span>
            </span>
          )}
          
          <button
            onClick={onToggle}
            className="sidebar-collapse-trigger"
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: '1px solid var(--pm-border-layout)',
              backgroundColor: 'var(--pm-bg)',
              color: 'var(--pm-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* 2. Navigation Items List */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: isCollapsed ? '0' : '12px',
                padding: '12px',
                borderRadius: '12px',
                textDecoration: 'none',
                color: isActive ? '#FFFFFF' : 'var(--pm-text-secondary)',
                background: isActive ? 'var(--pm-accent-gradient)' : 'transparent',
                boxShadow: isActive ? '0 4px 12px var(--pm-accent-glow)' : 'none',
                transition: 'all 0.2s ease',
                fontWeight: 600,
                fontSize: '14px',
                position: 'relative'
              })}
            >
              {item.icon}
              
              {!isCollapsed && <span>{item.label}</span>}
              
              {/* Tooltip on collapsed hover */}
              {isCollapsed && (
                <span className="collapsed-tooltip">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* 3. Sidebar Footer (Logout Action) */}
      <div>
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: isCollapsed ? '0' : '12px',
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--pm-danger)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
          className="sidebar-logout-btn"
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Log Out</span>}
        </button>
      </div>

      {/* Inline styles for hover tooltips and actions */}
      <style dangerouslySetInnerHTML={{__html: `
        .sidebar-nav-item:hover {
          color: var(--pm-text-primary) !important;
          background-color: var(--pm-sidebar-hover);
        }
        .sidebar-nav-item.active:hover {
          color: #FFFFFF !important;
          background: var(--pm-accent-gradient) !important;
        }
        .sidebar-logout-btn:hover {
          background-color: var(--pm-danger-bg);
        }
        
        /* Collapsed Hover Tooltips */
        .sidebar-nav-item .collapsed-tooltip {
          position: absolute;
          left: 80px;
          background-color: var(--pm-text-primary);
          color: var(--pm-bg);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          opacity: 0;
          pointer-events: none;
          white-space: nowrap;
          box-shadow: var(--pm-shadow-md);
          transition: opacity 0.15s ease, transform 0.15s ease;
          transform: translateX(-4px);
        }
        .sidebar-nav-item:hover .collapsed-tooltip {
          opacity: 1;
          transform: translateX(0);
        }

        /* Responsive Mobile Drawer Selectors */
        @media (max-width: 767px) {
          .admin-sidebar-shell {
            left: 12px !important;
            top: 12px !important;
            bottom: 12px !important;
            transform: translateX(-110%);
            width: 260px !important;
          }
          .admin-sidebar-shell.mobile-open {
            transform: translateX(0) !important;
          }
          .sidebar-collapse-trigger {
            display: none !important;
          }
          .sidebar-nav-item {
            justify-content: flex-start !important;
            gap: 12px !important;
            padding: 12px 16px !important;
          }
          .sidebar-nav-item span {
            display: inline !important;
          }
        }
      `}} />
    </aside>
  );
}
```
