import React, { memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, BarChart3, Trophy, HelpCircle } from 'lucide-react';

const NAV_ITEMS = [
  {
    label: 'Platforms',
    path: '/',
    match: (p) => p === '/' || p.startsWith('/platform/'),
    icon: <LayoutGrid size={18} />,
  },
  {
    label: 'Statistics',
    path: '/statistics',
    match: (p) => p === '/statistics',
    icon: <BarChart3 size={18} />,
  },
  {
    label: 'Leaderboard',
    path: '/leaderboard',
    match: (p) => p === '/leaderboard',
    icon: <Trophy size={18} />,
  },
  {
    label: 'Support',
    path: '/support',
    match: (p) => p === '/support',
    icon: <HelpCircle size={18} />,
  },
];

function BottomNav({
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
    <nav className="mobile-bottom-nav">
      {NAV_ITEMS.map((item) => {
        const active = item.match(path);
        return (
          <a
            key={item.path}
            href={item.path}
            onClick={(e) => handleNavClick(e, item)}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
          >
            <div className="bottom-nav-icon">{item.icon}</div>
            <span className="bottom-nav-label">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

export default memo(BottomNav);
