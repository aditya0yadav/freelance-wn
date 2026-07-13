import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, Menu } from 'lucide-react';
import { useAdminTheme } from '../context/AdminThemeContext';
import { getAdminUser, clearAdminSession } from '../utils/adminApi';

const PAGE_TITLES = {
  '/admin/dashboard': 'Dashboard',
  '/admin/platforms': 'Platform Management',
  '/admin/projects': 'Survey Explorer',
  '/admin/currency': 'Currency Configuration',
  '/admin/auth': 'Team Authorizations',
  '/admin/exports': 'Export Records Center',
  '/admin/completions': 'Completions & Earnings Log',
};

export default function AdminTopbar({ isExpanded, setIsExpanded }) {
  const { isDarkMode, toggleTheme } = useAdminTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const user = getAdminUser();
  const pageTitle = PAGE_TITLES[location.pathname] || 'Admin Panel';

  const handleLogout = () => {
    clearAdminSession();
    navigate('/admin/login');
  };

  return (
    <header style={{
      height: '64px',
      background: 'var(--bg-color)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--divider-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Sidebar Toggle */}
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'var(--bg-color)',
            border: '1px solid var(--divider-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)',
            transition: 'all 0.2s',
          }}
          title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'var(--bg-color)',
            border: '1px solid var(--divider-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)',
            transition: 'all 0.2s',
          }}
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'var(--bg-color)',
            border: '1px solid var(--divider-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)',
            transition: 'all 0.2s',
          }}
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'var(--divider-color)' }} />

        {/* Admin User Badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '6px 14px',
          borderRadius: '12px',
          background: 'var(--bg-color)',
          border: '1px solid var(--divider-color)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            overflow: 'hidden', border: '2px solid rgba(124, 58, 237, 0.2)'
          }}>
            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.nickname || 'Admin'}&backgroundColor=e5e7eb`} alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-color)' }}>
              {user?.nickname || 'Admin'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--primary-brand)', fontWeight: 600 }}>
              Administrator
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
