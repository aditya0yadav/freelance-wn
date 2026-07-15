import React, { memo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, BarChart3, Trophy, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const NAV_ITEMS = [
  {
    label: 'Platforms',
    path: '/',
    match: (p) => p === '/' || p.startsWith('/platform/'),
    icon: <LayoutGrid size={20} />,
  },
  {
    label: 'Statistics',
    path: '/statistics',
    match: (p) => p === '/statistics',
    icon: <BarChart3 size={20} />,
  },
  {
    label: 'Leaderboard',
    path: '/leaderboard',
    match: (p) => p === '/leaderboard',
    icon: <Trophy size={20} />,
  },
  {
    label: 'Support',
    path: '/support',
    match: (p) => p === '/support',
    icon: <HelpCircle size={20} />,
  },
];

function Sidebar({
  isExpanded,
  setIsExpanded,
  loadStats,
  loadLeaderboard,
  setStatsTab,
  setStatsPlatform,
  setStatsStatus,
  setStatsNickname,
  setStatsPage,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const handleNavClick = (e, item) => {
    e.preventDefault();
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
    <aside className={`member-sidebar-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-brand-wrapper" onClick={() => navigate('/')}>
        <img src="/images/logo.png" alt="Logo" className="sidebar-brand-logo" />
        {isExpanded && <span className="sidebar-brand-name">WEIJINGJUYAN</span>}
      </div>

      <nav className="sidebar-nav-menu">
        {NAV_ITEMS.map((item) => {
          const active = item.match(path);
          return (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => handleNavClick(e, item)}
              className={`sidebar-nav-item ${active ? 'active' : ''}`}
              title={!isExpanded ? item.label : undefined}
            >
              <div className="sidebar-icon-wrapper">{item.icon}</div>
              {isExpanded && <span className="sidebar-nav-label">{item.label}</span>}
            </a>
          );
        })}
      </nav>

      <button
        className="sidebar-collapse-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? 'Collapse Menu' : 'Expand Menu'}
      >
        {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </aside>
  );
}

export default memo(Sidebar);
