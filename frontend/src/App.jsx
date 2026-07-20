import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import { apiFetch } from './utils/api';
import Toast from './components/Toast';
import Topbar from './components/Topbar';
import BottomNav from './components/BottomNav';
import TickerBar from './components/TickerBar';
import ModalSpecs from './components/ModalSpecs';
import Footer from './components/Footer';
import LoginView from './views/LoginView';
import HomeView from './views/HomeView';
import OffersView from './views/OffersView';
import StatisticsView from './views/StatisticsView';
import LeaderboardView from './views/LeaderboardView';
import SupportView from './views/SupportView';
import PrivacyView from './views/PrivacyView';
import TermsView from './views/TermsView';
import ContactView from './views/ContactView';

// Admin Portal imports
import { AdminThemeProvider } from './admin/context/AdminThemeContext';
import AdminLayout from './admin/components/AdminLayout';
import AdminLoginView from './admin/views/AdminLoginView';
import AnalyticsDashboard from './admin/views/AnalyticsDashboard';
import PlatformListView from './admin/views/PlatformListView';
import ProjectListView from './admin/views/ProjectListView';
import CurrencyListView from './admin/views/CurrencyListView';
import MemberListView from './admin/views/MemberListView';
import ExportRecordsView from './admin/views/ExportRecordsView';
import CompletionsLogView from './admin/views/CompletionsLogView';
import TeamListView from './admin/views/TeamListView';


// Wrapper so AdminLoginView can use useNavigate (must be inside Router context)
function AdminLoginViewWrapper() {
  const navigate = useNavigate();
  return (
    <AdminLoginView
      onLoginSuccess={() => navigate('/admin/dashboard', { replace: true })}
    />
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState(() => localStorage.getItem('rs_token') || '');
  const [member, setMember] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rs_member') || 'null'); } catch { return null; }
  });
  const [darkMode, setDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Data
  const [platforms, setPlatforms] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [memberCoins, setMemberCoins] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [offers, setOffers] = useState([]);

  // UI state
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('default');
  const [offersPage, setOffersPage] = useState(1);
  const [offersPages, setOffersPages] = useState(1);
  const [offersTotal, setOffersTotal] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', error: false, visible: false });
  const [showUSD, setShowUSD] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSurvey, setModalSurvey] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const profileRef = useRef(null);
  const platformSectionRef = useRef(null);

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardType, setLeaderboardType] = useState('daily');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Statistics state
  const [statsTab, setStatsTab] = useState('my');
  const [statsLoading, setStatsLoading] = useState(false);
  const [personalStats, setPersonalStats] = useState({ offers: 0, success: 0, failed: 0, deduction: 0 });
  const [teamStats, setTeamStats] = useState({ offers: 0, teamsuccess: 0, teamfailed: 0, teamdeduction: 0, membersuccess: 0, memberfailed: 0, memberdeduction: 0 });
  const [conversionsData, setConversionsData] = useState({ list: [], total: 0, page: 1, limit: 10, total_pages: 1 });
  const [statsPlatform, setStatsPlatform] = useState('');
  const [statsStatus, setStatsStatus] = useState('');
  const [statsNickname, setStatsNickname] = useState('');
  const [statsPage, setStatsPage] = useState(1);

  // Global search state
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState([]);

  const handleGlobalSearch = async (query) => {
    setGlobalSearchQuery(query);
    if (!query.trim()) {
      setGlobalSearchResults([]);
      return;
    }
    setGlobalSearchLoading(true);
    try {
      // Offers endpoint with search term will query across all authorized networks
      const res = await apiFetch(`/api/member/platform/offers?search=${encodeURIComponent(query.trim())}`, 'GET', null, token);
      if (res.code === 200) {
        setGlobalSearchResults(res.data.list || []);
      }
    } catch (e) {
      showToast(e.message, true);
    } finally {
      setGlobalSearchLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const api = (endpoint, method = 'GET', body = null) =>
    apiFetch(endpoint, method, body, token);

  const showToast = (message, error = false) => {
    setToast({ message, error, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 4000);
  };

  // ── Boot: if token exists go to home or active page ──────────────────────────
  // Load platforms and member profile only when token or member session changes (e.g. login, reload)
  useEffect(() => {
    if (token && member) {
      loadHome();
    }
  }, [token, member]);

  // Handle route guards and page-specific data loaders without re-fetching platforms
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/admin')) {
      return;
    }

    if (!token || !member) {
      navigate('/login');
      return;
    }

    if (path === '/login') {
      navigate('/');
    } else if (path === '/statistics') {
      loadStats('my', 1);
    } else if (path === '/leaderboard') {
      loadLeaderboard('daily');
    }
  }, [token, member, location.pathname]);

  // Handle direct url navigation / refresh for platform page
  const match = location.pathname.match(/\/platform\/(\d+)/);
  const routePlatformId = match ? parseInt(match[1]) : null;

  useEffect(() => {
    if (routePlatformId && platforms.length > 0) {
      const p = platforms.find(x => x.platform_id === routePlatformId);
      if (p && (!selectedPlatform || selectedPlatform.platform_id !== p.platform_id)) {
        setSelectedPlatform(p);
        loadOffers(p.platform_id, 1, searchQuery);
      }
    }
  }, [routePlatformId, platforms, selectedPlatform]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Data loaders ──────────────────────────────────────────────────────────
  const loadHome = async () => {
    setPlatformsLoading(true);
    try {
      const [pRes, profRes, convRes] = await Promise.allSettled([
        apiFetch('/api/member/platform/list', 'GET', null, token || localStorage.getItem('rs_token')),
        apiFetch('/api/member/platform/profile', 'GET', null, token || localStorage.getItem('rs_token')),
        apiFetch('/api/member/platform/conversions', 'GET', null, token || localStorage.getItem('rs_token')),
      ]);
      if (pRes.status === 'fulfilled' && pRes.value.code === 200) setPlatforms(pRes.value.data);
      if (profRes.status === 'fulfilled' && profRes.value.code === 200) setMemberCoins(profRes.value.data.coins || 0);
      if (convRes.status === 'fulfilled' && convRes.value.code === 200) setConversions(convRes.value.data || []);
    } catch (e) {
      showToast(e.message, true);
    } finally {
      setPlatformsLoading(false);
    }
  };

  const loadLeaderboard = async (type) => {
    setLeaderboardLoading(true);
    setLeaderboardType(type);
    try {
      const activeToken = token || localStorage.getItem('rs_token');
      const res = await apiFetch(`/api/member/platform/ranking?type=${type}`, 'GET', null, activeToken);
      if (res.code === 200) {
        setLeaderboardData(res.data);
      }
    } catch (e) {
      showToast(e.message, true);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const loadStats = async (tab, pageNum = 1, pf = statsPlatform, st = statsStatus, nick = statsNickname) => {
    setStatsLoading(true);
    try {
      const activeToken = token || localStorage.getItem('rs_token');
      let queryStr = `page=${pageNum}&limit=10`;
      if (pf) queryStr += `&platform_id=${pf}`;
      if (st) queryStr += `&reward_status=${st}`;

      // Always reload profile balance alongside stats to keep ui updated
      apiFetch('/api/member/platform/profile', 'GET', null, activeToken)
        .then(profRes => {
          if (profRes.code === 200) setMemberCoins(profRes.data.coins || 0);
        }).catch(() => {});

      if (tab === 'my') {
        queryStr += `&personal=true`;
        const [statsRes, convRes] = await Promise.all([
          apiFetch(`/api/member/platform/statistics?${queryStr}`, 'GET', null, activeToken),
          apiFetch(`/api/member/platform/team-rewards?${queryStr}`, 'GET', null, activeToken)
        ]);
        if (statsRes.code === 200) setPersonalStats(statsRes.data);
        if (convRes.code === 200) setConversionsData(convRes.data);
      } else {
        if (nick && nick.trim()) queryStr += `&member_nickname=${encodeURIComponent(nick.trim())}`;
        const [statsRes, convRes] = await Promise.all([
          apiFetch(`/api/member/platform/team-statistics?${queryStr}`, 'GET', null, activeToken),
          apiFetch(`/api/member/platform/team-rewards?${queryStr}`, 'GET', null, activeToken)
        ]);
        if (statsRes.code === 200) setTeamStats(statsRes.data);
        if (convRes.code === 200) setConversionsData(convRes.data);
      }
    } catch (e) {
      showToast(e.message, true);
    } finally {
      setStatsLoading(false);
    }
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginInput.trim() || !loginPassword.trim()) return;
    setLoginLoading(true);
    try {
      const res = await apiFetch('/api/member/platform/login', 'POST', {
        username: loginInput.trim(),
        password: loginPassword.trim()
      });
      if (res.code === 200) {
        const memberData = { nickname: res.data.nickname, member_id: res.data.member_id, team_name: res.data.team_name };
        localStorage.setItem('rs_token', res.data.token);
        localStorage.setItem('rs_member', JSON.stringify(memberData));
        setToken(res.data.token);
        setMember(memberData);
        loadHome();
        navigate('/');
        showToast(`Welcome back, ${res.data.nickname}!`);
      }
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rs_token');
    localStorage.removeItem('rs_member');
    setToken('');
    setMember(null);
    setPlatforms([]);
    setConversions([]);
    setMemberCoins(0);
    setProfileOpen(false);
    setLoginInput('');
    setLoginPassword('');
    navigate('/login');
  };

  // ── Platform select ───────────────────────────────────────────────────────
  const handleSelectPlatform = (p) => {
    setSelectedPlatform(p);
    setOffers([]);
    setSearchQuery('');
    setSortOption('default');
    // Refresh balance too
    api('/api/member/platform/profile').then(profRes => {
      if (profRes.code === 200) {
        setMemberCoins(profRes.data.coins || 0);
        setShowUSD(profRes.data.show_usd || false);
      }
    }).catch(() => {});
    navigate(`/platform/${p.platform_id}`);
    loadOffers(p.platform_id, 1, '');
  };

  const loadOffers = async (platformId, page = 1, search = '') => {
    setOffersLoading(true);
    setOffers([]);
    setOffersTotal(0);
    setOffersPage(page);
    try {
      const q = new URLSearchParams({
        platform_id: platformId,
        page: page,
        limit: 100,
        sort: sortOption
      });
      if (search && search.trim()) {
        q.append('search', search.trim());
      }
      const res = await api(`/api/member/platform/offers?${q.toString()}`);
      if (res.code === 200 && res.data) {
        setOffers(res.data.list || []);
        setOffersPages(res.data.pages || 1);
        setOffersTotal(res.data.count || 0);
      }
    } catch (e) {
      showToast(e.message, true);
    } finally {
      setOffersLoading(false);
    }
  };

  const refreshInventory = async (platformId) => {
    if (refreshLoading) return;
    setRefreshLoading(true);
    try {
      const res = await api('/api/member/platform/pull', 'POST', { platform_id: platformId });
      if (res.code === 200) {
        showToast('Survey inventory refreshed successfully!');
        // Refresh balance too
        api('/api/member/platform/profile').then(profRes => {
          if (profRes.code === 200) setMemberCoins(profRes.data.coins || 0);
        }).catch(() => {});
        await loadOffers(platformId, 1, searchQuery);
      } else {
        showToast(res.msg || 'Refresh failed', true);
      }
    } catch (e) {
      showToast(e.message, true);
    } finally {
      setRefreshLoading(false);
    }
  };

  // Debounce backend offers search when typing query or changing sort option
  useEffect(() => {
    if (selectedPlatform) {
      const delayFn = setTimeout(() => {
        loadOffers(selectedPlatform.platform_id, 1, searchQuery);
      }, 400);
      return () => clearTimeout(delayFn);
    }
  }, [searchQuery, sortOption]);

  // ── Offers processing ─────────────────────────────────────────────────────
  const processedOffers = useMemo(() => {
    let result = [...offers];
    if (sortOption === 'cpi-desc') result.sort((a, b) => b.project_cpi - a.project_cpi);
    else if (sortOption === 'cpi-asc') result.sort((a, b) => a.project_cpi - b.project_cpi);
    else if (sortOption === 'loi-asc') result.sort((a, b) => (a.project_loi || 999) - (b.project_loi || 999));
    return result;
  }, [offers, sortOption]);

  // ── Wall copy ─────────────────────────────────────────────────────────────
  const handleCopyWall = async (platformId, e) => {
    if (e) e.stopPropagation();
    const pid = platformId || selectedPlatform?.platform_id;
    if (!pid) return;
    try {
      const res = await api(`/api/member/platform/wall_copy?platform_id=${pid}`);
      if (res.code === 200 && res.data) {
        await navigator.clipboard.writeText(res.data);
        showToast('Offerwall link copied!');
      }
    } catch (e) {
      showToast(e.message, true);
    }
  };

  // ── Start survey ──────────────────────────────────────────────────────────
  const handleStartSurvey = async (pno) => {
    try {
      const res = await api(`/api/member/platform/copy?project_pno=${pno}`);
      if (res.code === 200 && res.data) window.open(res.data, '_blank');
    } catch (e) {
      showToast(e.message, true);
    }
  };

  // ── Copy survey link ───────────────────────────────────────────────────────
  const handleCopyLink = async (pno) => {
    try {
      const res = await api(`/api/member/platform/copy?project_pno=${pno}`);
      if (res.code === 200 && res.data) {
        await navigator.clipboard.writeText(res.data);
        showToast('Survey link copied to clipboard!');
        return true;
      }
      return false;
    } catch (e) {
      showToast(e.message, true);
      return false;
    }
  };

  // ── Quota modal ───────────────────────────────────────────────────────────
  const handleOpenModal = async (offer) => {
    setModalSurvey(offer);
    setModalData(null);
    setModalOpen(true);
    setModalLoading(true);
    try {
      const res = await api(`/api/member/platform/quota?project_pno=${offer.project_pno}`);
      if (res.code === 200 && res.data) setModalData(res.data);
    } catch (e) {
      showToast(e.message, true);
      setModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalSurvey(null);
    setModalData(null);
    setModalLoading(false);
  };

  // ── Computed splits ───────────────────────────────────────────────────────
  const surveyPlatforms = useMemo(() => platforms.filter(p => p.is_list === 1 && p.is_wall === 0), [platforms]);

  const displayName = member?.nickname || '';
  const avatarChar = displayName.charAt(0).toUpperCase() || '?';

  return (
    <div className={`root ${darkMode ? '' : 'light'}`}>
      <Toast toast={toast} />

      <Routes>
        {/* Admin Portal Routes */}
        <Route
          path="/admin/login"
          element={
            <AdminThemeProvider>
              <AdminLoginViewWrapper />
            </AdminThemeProvider>
          }
        />
        <Route
          path="/admin/*"
          element={
            <AdminThemeProvider>
              <Routes>
                <Route element={<AdminLayout />}>
                  <Route path="dashboard" element={<AnalyticsDashboard />} />
                  <Route path="platforms" element={<PlatformListView />} />
                  <Route path="projects" element={<ProjectListView />} />
                  <Route path="currency" element={<CurrencyListView />} />
                   <Route path="members" element={<MemberListView />} />
                  <Route path="teams" element={<TeamListView />} />
                  <Route path="exports" element={<ExportRecordsView />} />
                  <Route path="completions" element={<CompletionsLogView />} />
                  <Route path="" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                </Route>
              </Routes>
            </AdminThemeProvider>
          }
        />

        {/* Member Login route */}
        <Route
          path="/login"
          element={
            <LoginView
              handleLogin={handleLogin}
              loginInput={loginInput}
              setLoginInput={setLoginInput}
              loginPassword={loginPassword}
              setLoginPassword={setLoginPassword}
              loginLoading={loginLoading}
            />
          }
        />

        {/* Offers View */}
        <Route
          path="/platform/:platformId"
          element={
            <OffersView
              selectedPlatform={selectedPlatform}
              handleCopyWall={handleCopyWall}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortOption={sortOption}
              setSortOption={setSortOption}
              processedOffers={processedOffers}
              offersLoading={offersLoading}
              handleStartSurvey={handleStartSurvey}
              handleOpenModal={handleOpenModal}
              handleCopyLink={handleCopyLink}
              memberCoins={memberCoins}
              avatarChar={avatarChar}
              displayName={displayName}
              handleLogout={handleLogout}
              offersPage={offersPage}
              offersPages={offersPages}
              offersTotal={offersTotal}
              loadOffers={loadOffers}
              refreshInventory={refreshInventory}
              refreshLoading={refreshLoading}
              showUSD={showUSD}
              setShowUSD={setShowUSD}
            />
          }
        />

        {/* Nested Dashboard Layout */}
        <Route
          path="/*"
          element={
            <div className="app-layout" style={{ paddingBottom: isMobile ? '60px' : '0' }}>
              <Topbar
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                memberCoins={memberCoins}
                profileRef={profileRef}
                profileOpen={profileOpen}
                setProfileOpen={setProfileOpen}
                avatarChar={avatarChar}
                displayName={displayName}
                member={member}
                handleLogout={handleLogout}
                loadStats={loadStats}
                loadLeaderboard={loadLeaderboard}
                setStatsTab={setStatsTab}
                setStatsPlatform={setStatsPlatform}
                setStatsStatus={setStatsStatus}
                setStatsNickname={setStatsNickname}
                setStatsPage={setStatsPage}
                showUSD={showUSD}
              />

              <TickerBar conversions={conversions} />

              <div className="main-content">
                <Routes>
                  <Route
                    path="/"
                    element={
                      <HomeView
                        platformsLoading={platformsLoading}
                        surveyPlatforms={surveyPlatforms}
                        platformSectionRef={platformSectionRef}
                        platforms={platforms}
                        handleSelectPlatform={handleSelectPlatform}
                        globalSearchQuery={globalSearchQuery}
                        globalSearchLoading={globalSearchLoading}
                        globalSearchResults={globalSearchResults}
                        handleGlobalSearch={handleGlobalSearch}
                        handleStartSurvey={handleStartSurvey}
                        handleOpenModal={handleOpenModal}
                        handleCopyLink={handleCopyLink}
                        showUSD={showUSD}
                        setShowUSD={setShowUSD}
                      />
                    }
                  />

                  <Route
                    path="/statistics"
                    element={
                      <StatisticsView
                        statsTab={statsTab}
                        setStatsTab={setStatsTab}
                        statsPage={statsPage}
                        setStatsPage={setStatsPage}
                        loadStats={loadStats}
                        statsPlatform={statsPlatform}
                        setStatsPlatform={setStatsPlatform}
                        statsStatus={statsStatus}
                        setStatsStatus={setStatsStatus}
                        statsNickname={statsNickname}
                        setStatsNickname={setStatsNickname}
                        platforms={platforms}
                        statsLoading={statsLoading}
                        personalStats={personalStats}
                        teamStats={teamStats}
                        conversionsData={conversionsData}
                        showUSD={showUSD}
                      />
                    }
                  />

                  <Route
                    path="/leaderboard"
                    element={
                      <LeaderboardView
                        leaderboardType={leaderboardType}
                        loadLeaderboard={loadLeaderboard}
                        leaderboardLoading={leaderboardLoading}
                        leaderboardData={leaderboardData}
                      />
                    }
                  />

                  <Route
                    path="/support"
                    element={
                      <SupportView
                        member={member}
                        showToast={showToast}
                      />
                    }
                  />

                  <Route path="/privacy" element={<PrivacyView />} />
                  <Route path="/terms" element={<TermsView />} />
                  <Route path="/contact" element={<ContactView />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>

              <Footer />

              {isMobile && (
                <BottomNav
                  loadStats={loadStats}
                  loadLeaderboard={loadLeaderboard}
                  setStatsTab={setStatsTab}
                  setStatsPlatform={setStatsPlatform}
                  setStatsStatus={setStatsStatus}
                  setStatsNickname={setStatsNickname}
                  setStatsPage={setStatsPage}
                />
              )}
            </div>
          }
        />
      </Routes>

      <ModalSpecs
        modalOpen={modalOpen}
        setModalOpen={handleCloseModal}
        modalSurvey={modalSurvey}
        modalLoading={modalLoading}
        modalData={modalData}
      />
    </div>
  );
}