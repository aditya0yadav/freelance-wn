import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';

const NAV_ITEMS = [
  {
    labelKey: 'platforms',
    label: 'Platforms',
    path: '/',
    match: (p) => p === '/' || p.startsWith('/platform/'),
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    labelKey: 'statistics',
    label: 'Statistics',
    path: '/statistics',
    match: (p) => p === '/statistics',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    labelKey: 'leaderboard',
    label: 'Leaderboard',
    path: '/leaderboard',
    match: (p) => p === '/leaderboard',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    labelKey: 'support',
    label: 'Support',
    path: '/support',
    match: (p) => p === '/support',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export default function Topbar({
  darkMode,
  setDarkMode,
  memberCoins,
  profileRef,
  profileOpen,
  setProfileOpen,
  avatarChar,
  displayName,
  member,
  handleLogout,
  loadStats,
  loadLeaderboard,
  setStatsTab,
  setStatsPlatform,
  setStatsStatus,
  setStatsNickname,
  setStatsPage,
  showUSD
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const { language, toggleLanguage, t } = useLanguage();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return language === 'en' ? 'Just now' : '刚刚';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return language === 'en' ? `${diffMin}m ago` : `${diffMin}分钟前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return language === 'en' ? `${diffHr}h ago` : `${diffHr}小时前`;
    const diffDay = Math.floor(diffHr / 24);
    return language === 'en' ? `${diffDay}d ago` : `${diffDay}天前`;
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('rs_token');
      if (!token) return;
      const res = await apiFetch('/api/member/platform/notifications', 'GET', null, token);
      if (res && res.code === 200 && res.data?.list) {
        setNotifications(res.data.list);
        const lastRead = Number(localStorage.getItem('last_read_notif_time') || 0);
        const unread = res.data.list.filter(n => new Date(n.time).getTime() > lastRead).length;
        setUnreadCount(unread);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotif = () => {
    const nextState = !notifOpen;
    setNotifOpen(nextState);
    if (nextState) {
      localStorage.setItem('last_read_notif_time', String(Date.now()));
      setUnreadCount(0);
    }
  };

  const handleNavClick = (item) => {
    navigate(item.path);
    if (item.path === '/statistics') {
      if (setStatsTab) setStatsTab('my');
      if (setStatsPlatform) setStatsPlatform('');
      if (setStatsStatus) setStatsStatus('');
      if (setStatsNickname) setStatsNickname('');
      if (setStatsPage) setStatsPage(1);
      if (loadStats) loadStats('my', 1, '', '', '');
    }
    if (item.path === '/leaderboard') {
      if (loadLeaderboard) loadLeaderboard('daily');
    }
  };

  return (
    <header className="topbar">
      {/* ── Left: logo ─────────────────────────────────────────── */}
      <div className="topbar-left">
        <div className="topbar-logo" onClick={() => navigate('/')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/images/logo.png" alt="Wanhong Survey" className="topbar-logo-img" />
            <span className="topbar-brand-name" style={{ fontWeight: 800 }}>Wanhong Survey</span>
          </div>
          <span className="topbar-brand-sub" style={{ fontSize: '9px', fontWeight: 600, color: 'var(--t3)', marginLeft: '32px', marginTop: '-4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>by XUZHOU WEIJINGJUYAN</span>
        </div>
      </div>

      {/* ── Center: nav ────────────────────────────────────────── */}
      <nav className="topbar-nav">
        {NAV_ITEMS.map((item) => {
          const active = item.match(path);
          return (
            <button
              key={item.path}
              className={`nav-link ${active ? 'active' : ''}`}
              onClick={() => handleNavClick(item)}
              title={t(item.labelKey)}
            >
              <span className="nav-link-icon">{item.icon}</span>
              <span className="nav-link-label">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Right: controls + profile ──────────────────────────── */}
      <div className="topbar-right">
        {/* Language switch */}
        <button
          className="topbar-icon-btn lang-toggle-btn"
          onClick={toggleLanguage}
          title={language === 'en' ? '切换至中文' : 'Switch to English'}
          style={{
            fontWeight: '700',
            fontSize: '11px',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--bg-card, rgba(255, 255, 255, 0.04))',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            color: 'var(--t1, #ffffff)',
            cursor: 'pointer'
          }}
        >
          {language === 'en' ? '中' : 'EN'}
        </button>

        {/* Theme toggle */}
        <button
          className="topbar-icon-btn theme-toggle-btn"
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? 'Switch to Light' : 'Switch to Dark'}
        >
          {darkMode ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Coin balance */}
        <div className="coin-badge" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {showUSD ? (
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--green, #10b981)', marginRight: '2px' }}>$</span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
          )}
          <span className="coin-num">
            {showUSD 
              ? (memberCoins / 100).toFixed(2) 
              : Math.round(memberCoins).toLocaleString() + (language === 'en' ? ' Coins' : ' 金币')}
          </span>
        </div>

        {/* Project Update Notifications */}
        <div className="notif-wrap" ref={notifRef}>
          <button
            className={`topbar-icon-btn notif-btn ${notifOpen ? 'active' : ''}`}
            title={language === 'en' ? 'Project Updates' : '项目更新提醒'}
            onClick={handleToggleNotif}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 ? (
              <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            ) : (
              notifications.length > 0 && <span className="notif-dot" />
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <div className="notif-header-title">
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>
                    {language === 'en' ? 'Project Updates' : '项目更新提醒'}
                  </span>
                  {notifications.length > 0 && (
                    <span className="notif-pill">{notifications.length}</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    className="notif-mark-read"
                    onClick={() => {
                      localStorage.setItem('last_read_notif_time', String(Date.now()));
                      setUnreadCount(0);
                    }}
                  >
                    {language === 'en' ? 'Mark read' : '标为已读'}
                  </button>
                )}
              </div>

              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
                    </svg>
                    <p>{language === 'en' ? 'No recent project updates' : '暂无最新项目变动'}</p>
                  </div>
                ) : (
                  notifications.map((item) => {
                    const timeAgo = formatTimeAgo(item.time);
                    return (
                      <div
                        key={item.id}
                        className="notif-item"
                        onClick={() => {
                          setNotifOpen(false);
                          navigate(`/platform/${item.platform_id}`);
                        }}
                      >
                        <div className="notif-item-top">
                          <span
                            className="notif-platform-tag"
                            style={{
                              borderColor: item.platform_color || 'var(--accent)',
                              color: item.platform_color || 'var(--accent)'
                            }}
                          >
                            {item.platform_name}
                          </span>
                          <span className={`notif-type-tag ${item.type === 'NEW_PROJECT' ? 'tag-new' : 'tag-update'}`}>
                            {item.type === 'NEW_PROJECT'
                              ? (language === 'en' ? 'New Survey' : '新上线')
                              : (language === 'en' ? 'Updated' : '已更新')}
                          </span>
                          <span className="notif-time">{timeAgo}</span>
                        </div>
                        <div className="notif-project-name" title={item.project_name}>
                          {item.project_name}
                        </div>
                        <div className="notif-item-meta">
                          <span className="notif-coins">
                            +{showUSD ? `$${(item.coins / 100).toFixed(2)}` : `${item.coins} Coins`}
                          </span>
                          {item.project_loi > 0 && (
                            <span className="notif-loi">{item.project_loi} min</span>
                          )}
                          {item.project_ir > 0 && (
                            <span className="notif-ir">IR {item.project_ir}%</span>
                          )}
                          <span className="notif-action-hint">
                            {language === 'en' ? 'Start →' : '进入项目 →'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="profile-wrap" ref={profileRef}>
          <button className="profile-btn" onClick={() => setProfileOpen(!profileOpen)}>
            <div className="avatar-circle">{avatarChar}</div>
            <div className="profile-info">
              <span className="profile-name">{displayName}</span>
              {member?.team_name && <span className="profile-team">{member.team_name}</span>}
            </div>
            <svg
              className={`chevron ${profileOpen ? 'open' : ''}`}
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {profileOpen && (
            <div className="profile-dropdown">
              {/* Header */}
              <div className="dropdown-header">
                <div className="dropdown-avatar">{avatarChar}</div>
                <div className="dropdown-info">
                  <div className="dropdown-name">{displayName}</div>
                  {member?.team_name && <div className="dropdown-team">{member.team_name}</div>}
                </div>
              </div>

              <div className="dropdown-divider" />

              {/* Quick links */}
              <div className="dropdown-section">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.path}
                    className="dropdown-item"
                    onClick={() => { handleNavClick(item); setProfileOpen(false); }}
                  >
                    <span className="dropdown-item-icon">{item.icon}</span>
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>

              <div className="dropdown-divider" />

              {/* Logout */}
              <div className="dropdown-section">
                <button onClick={handleLogout} className="dropdown-item logout-item">
                  <span className="dropdown-item-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                  </span>
                  {t('logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
