import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    // Navigation / Header
    platforms: 'Platforms',
    statistics: 'Statistics',
    leaderboard: 'Leaderboard',
    support: 'Support',
    logout: 'Logout',
    coins: 'Coins',
    profile: 'Profile',

    // Login page
    memberLogin: 'Member Login',
    enterCredentials: 'Enter your credentials to access the platform dashboard.',
    username: 'Username',
    password: 'Password',
    signIn: 'Sign In',
    signingIn: 'Signing In...',
    showPassword: 'Show Password',
    hidePassword: 'Hide Password',
    errorInvalidUser: 'Invalid username or password',
    defaultPasswordHint: 'Default password is 123456',
    accessManagedByAdmin: 'Access is managed by your team administrator',
    signInToDashboard: 'Sign In to Dashboard',
    verifying: 'Verifying...',

    // Home / Platforms page
    surveyPlatforms: 'Offer Partners',
    searchPlaceholder: 'Search surveys globally by Name, PNO code, or Platform...',
    search: 'Search',
    startSurvey: 'Start',
    points: 'Points',
    noPlatforms: 'No platforms found.',
    liveConversions: 'Live Conversions',
    unifiedEngine: 'Unified Survey Engine',
    deepSearch: 'Deep Search',
    searchingNetworks: 'Searching all networks...',
    noSurveysFound: 'No surveys found matching',
    tryAnotherKeyword: 'Try searching another keyword or check individual offer walls.',
    active: 'active',
    loadingPlatforms: 'Loading platforms...',
    noPlatformsConfigured: 'No Platforms Configured',
    noPlatformsConfiguredDesc: "Your administrator hasn't configured any platforms yet. Check back later.",

    // Statistics page
    statsCenter: 'Statistics Center',
    statsSub: 'Track your individual survey completions, reward history, and team performance logs.',
    personalStats: 'Personal History',
    teamLogs: 'Team Completions',
    overview: 'Overview',
    completedSurveys: 'Completed Surveys',
    totalEarned: 'Total Earned',
    date: 'Date',
    surveyPno: 'Survey PNO',
    payout: 'Payout',
    status: 'Status',
    loading: 'Loading...',

    // Leaderboard page
    leaderboardTitle: 'Leaderboard',
    leaderboardSub: 'Top performing members based on survey completions and earnings.',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    rank: 'Rank',
    member: 'Member',
    earnings: 'Earnings',

    // Support page
    technicalSupport: 'Technical Support',
    supportSub: 'Have questions or encountering issues? Send a message to our support team.',
    subject: 'Subject',
    message: 'Message',
    submit: 'Submit Ticket',
    sending: 'Sending...',
    ticketSubmitted: 'Support ticket submitted successfully!',

    // Admin Panel Layout & Components
    adminDashboard: 'Dashboard',
    adminPlatforms: 'Platform Management',
    adminProjects: 'Survey Explorer',
    adminCurrency: 'Currency Configuration',
    adminAuth: 'Team Authorizations',
    adminExports: 'Export Records Center',
    adminCompletions: 'Completions Log',
    adminTeams: 'Publisher Teams',
    administrator: 'Administrator',
    adminSignOut: 'Sign Out',
    adminLoginTitle: 'Admin Portal Login',
    adminLoginSub: 'Provide administrator credentials to access management console.',
    collapseSidebar: 'Collapse Sidebar',
    expandSidebar: 'Expand Sidebar',
  },
  zh: {
    // Navigation / Header
    platforms: '平台',
    statistics: '数据统计',
    leaderboard: '排行榜',
    support: '技术支持',
    logout: '退出登录',
    coins: '金币',
    profile: '个人中心',

    // Login page
    memberLogin: '会员登录',
    enterCredentials: '请输入您的凭据以访问平台仪表盘。',
    username: '用户名',
    password: '密码',
    signIn: '登录',
    signingIn: '登录中...',
    showPassword: '显示密码',
    hidePassword: '隐藏密码',
    errorInvalidUser: '用户名或密码无效',
    defaultPasswordHint: '默认密码为 123456',
    accessManagedByAdmin: '访问权限由您的团队管理员进行管理',
    signInToDashboard: '登录系统仪表盘',
    verifying: '正在验证...',

    // Home / Platforms page
    surveyPlatforms: '合作渠道',
    searchPlaceholder: '通过名称、PNO代码或渠道全局搜索调查...',
    search: '搜索',
    startSurvey: '开始',
    points: '积分',
    noPlatforms: '未找到合作平台。',
    liveConversions: '实时动态',
    unifiedEngine: '统一调查引擎',
    deepSearch: '深度搜索',
    searchingNetworks: '正在检索所有网络...',
    noSurveysFound: '未找到匹配的调查',
    tryAnotherKeyword: '请尝试搜索其他关键字，或检查下方渠道。',
    active: '个启用',
    loadingPlatforms: '正在载入合作渠道...',
    noPlatformsConfigured: '暂无配置的合作渠道',
    noPlatformsConfiguredDesc: '管理员尚未配置任何渠道平台。请稍后再来查看。',

    // Statistics page
    statsCenter: '数据中心',
    statsSub: '在此跟踪您的个人调查完成记录、收益历史以及团队业绩日志。',
    personalStats: '个人历史',
    teamLogs: '团队完成',
    overview: '统计概览',
    completedSurveys: '完成调查数',
    totalEarned: '总收益金币',
    date: '日期',
    surveyPno: '调查代号 PNO',
    payout: '收益额',
    status: '状态',
    loading: '正在加载...',

    // Leaderboard page
    leaderboardTitle: '风云排行榜',
    leaderboardSub: '根据调查完成次数和积分收益排名，展示最优秀的团队成员。',
    daily: '日榜',
    weekly: '周榜',
    monthly: '月榜',
    rank: '排名',
    member: '会员',
    earnings: '金币收益',

    // Support page
    technicalSupport: '联系技术支持',
    supportSub: '有任何疑问或遇到系统问题？请随时向我们的支持团队提交工单。',
    subject: '主题',
    message: '内容描述',
    submit: '提交工单',
    sending: '发送中...',
    ticketSubmitted: '支持工单已成功提交！',

    // Admin Panel Layout & Components
    adminDashboard: '控制面板',
    adminPlatforms: '渠道平台管理',
    adminProjects: '项目探针',
    adminCurrency: '货币及汇率配置',
    adminAuth: '团队管理及授权',
    adminExports: '数据导出记录中心',
    adminCompletions: '审计及流水日志',
    adminTeams: '代理商团队管理',
    administrator: '系统管理员',
    adminSignOut: '退出登录',
    adminLoginTitle: '系统后台管理员登录',
    adminLoginSub: '请提供管理员凭据以访问后台管理控制台。',
    collapseSidebar: '收起侧边栏',
    expandSidebar: '展开侧边栏',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('app_language');
    return (saved === 'en' || saved === 'zh') ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'zh' : 'en'));
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
