# SurveyStream Admin Portal - 03. Complete Layout Shell Component

This document contains the complete JSX source code for the parent shell layout (`frontend/src/admin/components/AdminLayout.jsx`). It manages sidebar toggles, layout styles, and displays dynamic sub-routes using the React Router outlet.

```javascript
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Menu } from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Manage structural layout states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sync collapsed state to local storage
  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const nextState = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(nextState));
      return nextState;
    });
  };

  // Close mobile sidebar on page/route transition
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Read admin metadata from storage
  const adminUserStr = localStorage.getItem('rs_admin_user');
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : { nickname: 'Administrator' };

  // Calculate current page titles dynamically
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/analytics')) return 'System Analytics';
    if (path.includes('/platforms')) return 'Platform Directory';
    if (path.includes('/projects')) return 'Survey Explorer';
    if (path.includes('/currency')) return 'Currency Config';
    if (path.includes('/teams')) return 'Team Authorizations';
    return 'Admin Dashboard';
  };

  const handleLogout = () => {
    localStorage.removeItem('rs_admin_token');
    localStorage.removeItem('rs_admin_user');
    navigate('/admin/login');
  };

  return (
    <div 
      className="admin-app-layout"
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--pm-bg)',
        transition: 'background-color 0.25s ease'
      }}
    >
      {/* 1. Left Sidebar Navigation */}
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={handleToggleSidebar}
        isMobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 95
          }}
        />
      )}

      {/* 2. Main Area Container */}
      <div 
        className="admin-main-container"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          marginLeft: sidebarCollapsed ? '96px' : '288px', // Adjust layout margins based on sidebar width
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* 3. Topbar Header */}
        <Topbar 
          title={getPageTitle()}
          adminUser={adminUser}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onLogout={handleLogout}
          // Mobile trigger
          mobileMenuButton={
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="btn btn-secondary"
              style={{
                display: 'none', // Overridden in mobile CSS media queries
                padding: '8px',
                marginRight: '12px'
              }}
            >
              <Menu size={20} />
            </button>
          }
        />

        {/* 4. Page Content Viewport */}
        <main 
          className="admin-main-viewport anima-fade-in"
          style={{
            padding: '24px 32px 48px 32px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Inline style overrides for mobile responsive screens */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 1023px) {
          .admin-main-container {
            margin-left: 96px !important;
          }
        }
        @media (max-width: 767px) {
          .admin-main-container {
            margin-left: 0 !important;
          }
          .admin-main-viewport {
            padding: 16px !important;
          }
          .btn-secondary {
            display: inline-flex !important;
          }
        }
      `}} />
    </div>
  );
}
```
