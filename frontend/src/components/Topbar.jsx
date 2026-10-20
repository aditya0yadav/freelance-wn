import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';
import { Sparkles } from 'lucide-react';
import { checkForAppUpdate } from '../utils/updateChecker';
import ModalAppUpdate from './ModalAppUpdate';

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
  const [liveToast, setLiveToast] = useState(null);
  const notifRef = useRef(null);
  const lastNotifKeyRef = useRef(null);

  // App Update State
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    checkForAppUpdate().then((info) => {
      setUpdateInfo(info);
    });

    const updateTimer = setInterval(() => {
      checkForAppUpdate().then((info) => {
        setUpdateInfo(info);
      });
    }, 15 * 60 * 1000);

    return () => clearInterval(updateTimer);
  }, []);

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
        const list = res.data.list;
        setNotifications(list);
        const lastRead = Number(localStorage.getItem('last_read_notif_time') || 0);
        const unread = list.filter(n => new Date(n.time).getTime() > lastRead).length;
        setUnreadCount(unread);

        // Detect newly arrived notification for live toast alert
        if (list.length > 0) {
          const newest = list[0];
          const newKey = `${newest.id}_${newest.time}_${newest.type}`;
          if (lastNotifKeyRef.current && newKey !== lastNotifKeyRef.current) {
            const isFresh = (Date.now() - new Date(newest.time).getTime()) < 5 * 60 * 1000;
            if (isFresh) {
              setLiveToast(newest);
              // Trigger browser desktop notification if permission granted
              if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                  try {
                    new Notification(`[${newest.platform_name}] ${newest.change_summary || 'Survey Update'}`, {
                      body: `${newest.project_name}\n${newest.message || ''}`,
                      icon: '/images/logo.png'
                    });
                  } catch {}
                } else if (Notification.permission === 'default') {
                  Notification.requestPermission();
                }
              }
            }
          }
          lastNotifKeyRef.current = newKey;
        }
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss live toast after 8 seconds
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => {
      setLiveToast(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [liveToast]);

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

        {/* In-app update notification button */}
        {updateInfo?.hasUpdate && (
          <button
            className="update-btn-topbar"
            onClick={() => setUpdateModalOpen(true)}
            title={language === 'en' ? 'New version available! Click to view update' : '发现新版本！点击查看并更新'}
          >
            <span className="update-pulse-dot" />
            <Sparkles size={13} />
            <span>{language === 'en' ? `v${updateInfo.latestVersion}` : `新版本 v${updateInfo.latestVersion}`}</span>
          </button>
        )}

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

                    // Determine change badge
                    let typeBadgeText = language === 'en' ? 'Updated' : '已更新';
                    let typeBadgeClass = 'tag-update';
                    let typeBadgeStyle = null;

                    if (item.type === 'SURVEY_PAUSED') {
                      typeBadgeText = language === 'en' ? '⏸️ Paused' : '⏸️ 已暂停';
                      typeBadgeStyle = { background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' };
                    } else if (item.type === 'SURVEY_RESUMED') {
                      typeBadgeText = language === 'en' ? '▶️ Resumed' : '▶️ 已恢复';
                      typeBadgeStyle = { background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' };
                    } else if (item.type === 'SURVEY_CLOSED') {
                      typeBadgeText = language === 'en' ? '🛑 Closed' : '🛑 已结束';
                      typeBadgeStyle = { background: 'rgba(100, 116, 139, 0.12)', color: '#64748b', borderColor: 'rgba(100, 116, 139, 0.3)' };
                    } else if (item.type === 'QUOTA_INCREASE') {
                      typeBadgeText = language === 'en' ? '⚡ Quota Increased' : '⚡ 配额增加';
                      typeBadgeStyle = { background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' };
                    } else if (item.type === 'QUOTA_DECREASE' || item.type === 'QUOTA_UPDATED') {
                      typeBadgeText = language === 'en' ? '🎯 Quota Adjusted' : '🎯 配额变更';
                      typeBadgeStyle = { background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', borderColor: 'rgba(59, 130, 246, 0.3)' };
                    } else if (item.type === 'EXCLUSION_UPDATE') {
                      typeBadgeText = language === 'en' ? '⛔ Restrictions' : '⛔ 人群排除';
                      typeBadgeStyle = { background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' };
                    } else if (item.type === 'CPI_CHANGED') {
                      typeBadgeText = language === 'en' ? '💰 CPI Changed' : '💰 单价调整';
                      typeBadgeStyle = { background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', borderColor: 'rgba(245, 158, 11, 0.3)' };
                    } else if (item.type === 'NEW_PROJECT') {
                      typeBadgeText = language === 'en' ? '✨ New Survey' : '✨ 新上线';
                      typeBadgeClass = 'tag-new';
                    }

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
                          <span
                            className={`notif-type-tag ${typeBadgeClass}`}
                            style={typeBadgeStyle || {}}
                          >
                            {typeBadgeText}
                          </span>
                          <span className="notif-time">{timeAgo}</span>
                        </div>
                        <div className="notif-project-name" title={item.project_name}>
                          {item.project_name}
                        </div>

                        {item.change_summary && (
                          <div style={{
                            fontSize: '11.5px',
                            fontWeight: 600,
                            color: item.type === 'QUOTA_INCREASE' ? '#10b981' : item.type === 'EXCLUSION_UPDATE' ? '#ef4444' : 'var(--blue, #3b82f6)',
                            marginTop: '2px',
                            marginBottom: '4px'
                          }}>
                            {item.change_summary}
                          </div>
                        )}

                        {Array.isArray(item.exclusions) && item.exclusions.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px', marginBottom: '4px' }}>
                            {item.exclusions.map((ex, exIdx) => (
                              <span key={exIdx} style={{
                                fontSize: '10.5px',
                                fontWeight: 600,
                                background: '#fee2e2',
                                color: '#b91c1c',
                                padding: '1px 6px',
                                borderRadius: '4px'
                              }}>
                                ⛔ {ex}
                              </span>
                            ))}
                          </div>
                        )}

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

              {/* In-app check for updates */}
              <div className="dropdown-section">
                <button
                  className="dropdown-item"
                  onClick={async () => {
                    setProfileOpen(false);
                    setCheckingUpdate(true);
                    setUpdateModalOpen(true);
                    const res = await checkForAppUpdate(true);
                    setUpdateInfo(res);
                    setCheckingUpdate(false);
                  }}
                >
                  <span className="dropdown-item-icon">
                    <Sparkles size={14} style={{ color: updateInfo?.hasUpdate ? '#10b981' : 'var(--blue)' }} />
                  </span>
                  <span>{language === 'en' ? 'Check for Updates' : '检查版本更新'}</span>
                  {updateInfo?.hasUpdate && (
                    <span className="update-pulse-dot" style={{ marginLeft: 'auto' }} />
                  )}
                </button>
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

      {/* Live In-App Notification Toast Alert */}
      {liveToast && (
        <div
          className="live-toast-banner"
          onClick={() => {
            navigate(`/platform/${liveToast.platform_id}`);
            setLiveToast(null);
          }}
          style={{
            position: 'fixed',
            top: '72px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            background: 'var(--surface, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderLeft: `4px solid ${liveToast.type === 'QUOTA_INCREASE' ? '#10b981' : liveToast.type === 'EXCLUSION_UPDATE' ? '#ef4444' : '#3b82f6'}`,
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
            cursor: 'pointer',
            maxWidth: '380px',
            animation: 'fadeInSlide 0.3s ease-out'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: liveToast.type === 'QUOTA_INCREASE' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
            color: liveToast.type === 'QUOTA_INCREASE' ? '#10b981' : '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            flexShrink: 0
          }}>
            {liveToast.type === 'QUOTA_INCREASE' ? '⚡' : liveToast.type === 'EXCLUSION_UPDATE' ? '⛔' : '📢'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--t3, #64748b)' }}>
              {liveToast.platform_name} • {liveToast.type === 'QUOTA_INCREASE' ? (language === 'en' ? 'Quota Increased' : '配额增加') : (language === 'en' ? 'Survey Updated' : '项目更新')}
            </span>
            <strong style={{ fontSize: '13px', color: 'var(--t1, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {liveToast.change_summary || liveToast.project_name}
            </strong>
            <span style={{ fontSize: '11.5px', color: 'var(--blue, #3b82f6)', fontWeight: 600 }}>
              {language === 'en' ? 'Click to open project →' : '点击立即进入项目 →'}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLiveToast(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--t3, #94a3b8)',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '2px',
              marginLeft: 'auto'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* App Update Modal */}
      <ModalAppUpdate
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        updateInfo={updateInfo}
        onCheckAgain={async () => {
          setCheckingUpdate(true);
          const res = await checkForAppUpdate(true);
          setUpdateInfo(res);
          setCheckingUpdate(false);
        }}
        checking={checkingUpdate}
      />
    </header>
  );
}
