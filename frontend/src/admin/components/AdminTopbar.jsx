import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, Menu } from 'lucide-react';
import { useAdminTheme } from '../context/AdminThemeContext';
import { getAdminUser, clearAdminSession } from '../utils/adminApi';
import { useLanguage } from '../../context/LanguageContext';

const PAGE_TITLE_KEYS = {
  '/admin/dashboard': 'adminDashboard',
  '/admin/platforms': 'adminPlatforms',
  '/admin/projects': 'adminProjects',
  '/admin/currency': 'adminCurrency',
  '/admin/auth': 'adminAuth',
  '/admin/exports': 'adminExports',
  '/admin/completions': 'adminCompletions',
};

export default function AdminTopbar({ isExpanded, setIsExpanded }) {
  const { isDarkMode, toggleTheme } = useAdminTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const user = getAdminUser();
  const { language, toggleLanguage, t } = useLanguage();

  const titleKey = PAGE_TITLE_KEYS[location.pathname];
  const pageTitle = titleKey ? t(titleKey) : (language === 'en' ? 'Admin Panel' : '管理控制台');

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
          title={isExpanded ? t('collapseSidebar') : t('expandSidebar')}
        >
          <Menu size={18} />
        </button>
        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-color)' }}>
          {pageTitle}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Language switch */}
        <button
          onClick={toggleLanguage}
          style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'var(--bg-color)',
            border: '1px solid var(--divider-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)',
            fontSize: '11px', fontWeight: '700',
            transition: 'all 0.2s',
          }}
          title={language === 'en' ? '切换至中文' : 'Switch to English'}
        >
          {language === 'en' ? '中' : 'EN'}
        </button>

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
          title={language === 'en' ? 'Toggle Theme' : '切换主题'}
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
          title={t('adminSignOut')}
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
              {t('administrator')}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
