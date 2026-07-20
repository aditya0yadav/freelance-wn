import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw, Ban, ShieldAlert, BarChart3, TrendingUp, DollarSign, Award, Percent, Download } from 'lucide-react';
import { adminFetch, getAdminToken, getAdminUser } from '../utils/adminApi';
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  LineChart // Added LineChart import
} from 'recharts';

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ clicks: 0, completes: 0, conversion: 0, revenue: 0, netEarning: 0 });
  const [filter, setFilter] = useState('all');
  const [recentConversions, setRecentConversions] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = getAdminToken();
  const user = getAdminUser();

  // Chart States
  const [chartType, setChartType] = useState('30day');
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [chartMode, setChartMode] = useState('line'); // 'line', 'bar', 'table'

  const fetchChartData = useCallback(async () => {
    setChartLoading(true);
    try {
      let query = `type=${chartType}`;
      if (chartType === 'custom' && customDates.start && customDates.end) {
        query += `&startDate=${customDates.start}&endDate=${customDates.end}`;
      }
      const res = await adminFetch(`/dashboard-chart?${query}`, 'GET', null, token);
      if (res.code === 200) {
        setChartData(res.data || []);
      }
    } catch (err) {
      console.error('Chart fetch error:', err.message);
    } finally {
      setChartLoading(false);
    }
  }, [token, chartType, customDates]);

  useEffect(() => {
    if (chartType !== 'custom') {
      fetchChartData();
    }
  }, [chartType, fetchChartData]);

  const handleCustomChartQuery = () => {
    if (!customDates.start || !customDates.end) {
      alert('Please select both start and end dates');
      return;
    }
    fetchChartData();
  };

  const CustomPeakLabel = ({ x, y, value, color }) => {
    if (!value || Number(value) === 0) return null;
    return (
      <text x={x} y={y - 8} fill={color || 'var(--text-color, #1e1e2d)'} fontSize={9} fontWeight={700} textAnchor="middle">
        {`$${value}`}
      </text>
    );
  };

  const CustomCompletesLabel = ({ x, y, value }) => {
    if (!value || Number(value) === 0) return null;
    return (
      <text x={x} y={y - 8} fill="#9ca3af" fontSize={9} fontWeight={700} textAnchor="middle">
        {value}
      </text>
    );
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/dashboard-stats?filter=${filter}`, 'GET', null, token);
      if (res.code === 200) {
        const { clicks, completes, conversion, revenue, netEarning, recentConversions } = res.data;
        setStats({ clicks, completes, conversion, revenue, netEarning });
        setRecentConversions(recentConversions || []);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  const handleExport = async () => {
    try {
      const res = await adminFetch('/export/generate', 'POST', {
        type: 1,
        export_remark: 'Dashboard Completions Quick Export'
      }, token);
      if (res.code === 200) {
        navigate('/admin/exports');
      }
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleBanMember = async (nickname) => {
    if (!window.confirm(`Blacklist member account: "${nickname}"? This will disable their access.`)) return;
    try {
      await adminFetch('/member/ban', 'POST', { nickname }, token);
      alert(`Banned member: ${nickname}`);
    } catch (err) {
      console.error('Ban member error:', err.message);
    }
  };

  const handleClearMark = async (rewardId) => {
    try {
      await adminFetch('/reward/clear-mark', 'POST', { reward_id: rewardId }, token);
      setRecentConversions(prev => prev.map(c => c.reward_id === rewardId ? { ...c, is_mark: 0 } : c));
    } catch (err) {
      console.error('Clear mark error:', err.message);
    }
  };



  const CustomChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--pm-card, #ffffff)',
          border: '1px solid var(--divider-color, #e2e8f0)',
          borderRadius: '12px',
          padding: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '13px', color: 'var(--text-color, #1e1e2d)' }}>{label}</p>
          {payload.map((entry, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0', fontSize: '12px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }} />
              <span style={{ color: 'var(--text-muted, #64748b)', flex: 1 }}>{entry.name}:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-color, #1e1e2d)' }}>
                {entry.name === 'Revenue' ? `$${Number(entry.value).toFixed(2)}` : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Platform Share Distribution Data
  const platformData = (() => {
    if (!recentConversions || recentConversions.length === 0) {
      return [
        { name: 'Gowebsurveys', value: 45 },
        { name: 'Pollsopinion', value: 30 },
        { name: 'Mirat', value: 15 },
        { name: 'Innovatemr', value: 10 },
      ];
    }
    const counts = {};
    recentConversions.forEach(c => {
      const name = c.platform_name || c.platform_sign || `Platform ${c.platform_id}`;
      counts[name] = (counts[name] || 0) + 1;
    });
    const total = recentConversions.length;
    return Object.keys(counts).map(key => ({
      name: key,
      value: Math.round((counts[key] / total) * 100)
    }));
  })();
  const PIE_COLORS = ['#7C3AED', '#A78BFA', '#C084FC', '#E9D5FF'];

  // Team Performance Data
  const teamData = (() => {
    if (!recentConversions || recentConversions.length === 0) {
      return [
        { name: 'Default Network', Completions: 45 },
        { name: 'VIP Group', Completions: 30 },
        { name: 'Growth Division', Completions: 15 }
      ];
    }
    const counts = {};
    recentConversions.forEach(c => {
      const name = c.team_name || 'Default Network';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      Completions: counts[key]
    }));
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="anima-fade-in">
      
      {/* Upper header action row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-color, #1e1e2d)', margin: 0, letterSpacing: '-0.5px' }}>
            Dashboard
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted, #8c8c9a)', margin: '4px 0 0' }}>
            Logged in as admin <strong style={{ color: 'var(--primary-brand)' }}>{user?.nickname || '管理'}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={14} /> Export CSV
          </button>
          <select 
            className="form-input" 
            value={filter} 
            onChange={e => setFilter(e.target.value)}
            style={{ width: '140px', padding: '8px 12px', borderRadius: '10px', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--divider-color)', fontWeight: 600 }}
          >
            <option value="day">Today (24h)</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            className="btn btn-secondary"
            onClick={fetchDashboardData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', fontWeight: 700 }}
          >
            <RefreshCcw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Sync
          </button>
        </div>
      </div>

      {/* Grid: 4 Metric Cards */}
      <div className="metrics-grid">
        {/* Card 1: Revenue */}
        <div className="premium-metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Net Earnings</span>
            <div className="premium-card-icon-wrapper" style={{ background: 'rgba(124, 58, 237, 0.1)' }}>
              <DollarSign size={18} color="#7C3AED" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-color)', letterSpacing: '-0.5px', marginTop: '12px' }}>
            ${Number(stats.netEarning || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 500 }}>
            Platform Profit
          </div>
        </div>

        {/* Card 2: Conversions */}
        <div className="premium-metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Completions</span>
            <div className="premium-card-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <Award size={18} color="#10B981" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-color)', letterSpacing: '-0.5px', marginTop: '12px' }}>
            {(stats.completes || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 500 }}>
            Completed surveys in period
          </div>
        </div>

        {/* Card 3: Clicks */}
        <div className="premium-metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Traffic</span>
            <div className="premium-card-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
              <BarChart3 size={18} color="#3B82F6" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-color)', letterSpacing: '-0.5px', marginTop: '12px' }}>
            {(stats.clicks || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 500 }}>
            Total outbound clicks logged
          </div>
        </div>

        {/* Card 4: Conv Rate */}
        <div className="premium-metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Conversion Rate</span>
            <div className="premium-card-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
              <Percent size={18} color="#F59E0B" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-color)', letterSpacing: '-0.5px', marginTop: '12px' }}>
            {Number(stats.conversion || 0).toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 500 }}>
            Overall clicks to completion ratio
          </div>
        </div>
      </div>

      {/* Chart Layout: Timeline and Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', borderTop: '1px solid var(--divider-color)', paddingTop: '28px' }}>
        
        {/* Timeline Chart Visualizing live statistics by selected intervals */}
        <div style={{
          background: 'transparent',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          gridColumn: 'span 2'
        }}>
          {/* Chart Period Filters Tab Row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'transparent', border: 'none', padding: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--divider-color)', paddingBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => { setChartType('7day'); }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: chartType === '7day' ? '2.5px solid #2563eb' : '1px solid var(--divider-color, rgba(0,0,0,0.08))',
                    background: chartType === '7day' ? 'transparent' : 'var(--pm-card, #ffffff)',
                    color: chartType === '7day' ? '#2563eb' : 'var(--text-muted, #71717a)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: chartType === '7day' ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Statistics on the 7th
                </button>
                <button 
                  onClick={() => { setChartType('30day'); }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: chartType === '30day' ? '2.5px solid #2563eb' : '1px solid var(--divider-color, rgba(0,0,0,0.08))',
                    background: chartType === '30day' ? 'transparent' : 'var(--pm-card, #ffffff)',
                    color: chartType === '30day' ? '#2563eb' : 'var(--text-muted, #71717a)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: chartType === '30day' ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  30-day statistics
                </button>
                <button 
                  onClick={() => { setChartType('annual'); }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: chartType === 'annual' ? '2.5px solid #2563eb' : '1px solid var(--divider-color, rgba(0,0,0,0.08))',
                    background: chartType === 'annual' ? 'transparent' : 'var(--pm-card, #ffffff)',
                    color: chartType === 'annual' ? '#2563eb' : 'var(--text-muted, #71717a)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: chartType === 'annual' ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Annual statistics
                </button>
                <button 
                  onClick={() => { setChartType('custom'); }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: chartType === 'custom' ? '2.5px solid #2563eb' : '1px solid var(--divider-color, rgba(0,0,0,0.08))',
                    background: chartType === 'custom' ? 'transparent' : 'var(--pm-card, #ffffff)',
                    color: chartType === 'custom' ? '#2563eb' : 'var(--text-muted, #71717a)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: chartType === 'custom' ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Custom query
                </button>
              </div>
              
              {/* Custom Date Picker Fields */}
              {chartType === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="date" 
                    value={customDates.start} 
                    onChange={e => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--divider-color)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                  />
                  <span style={{ color: 'var(--text-muted)' }}>to</span>
                  <input 
                    type="date" 
                    value={customDates.end} 
                    onChange={e => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--divider-color)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                  />
                  <button 
                    onClick={handleCustomChartQuery}
                    style={{ padding: '6px 14px', borderRadius: '6px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Query
                  </button>
                </div>
              )}

              {/* Quick Chart View Icons */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  onClick={() => setChartMode('bar')}
                  style={{ 
                    cursor: 'pointer', 
                    color: chartMode === 'bar' ? '#2563eb' : 'var(--text-muted, #71717a)',
                    transition: 'all 0.2s ease'
                  }}
                  title="Bar Chart"
                >
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  onClick={() => setChartMode('line')}
                  style={{ 
                    cursor: 'pointer', 
                    color: chartMode === 'line' ? '#2563eb' : 'var(--text-muted, #71717a)',
                    transition: 'all 0.2s ease'
                  }}
                  title="Line Chart"
                >
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  onClick={() => setChartMode('table')}
                  style={{ 
                    cursor: 'pointer', 
                    color: chartMode === 'table' ? '#2563eb' : 'var(--text-muted, #71717a)',
                    transition: 'all 0.2s ease'
                  }}
                  title="Data Table"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
            </div>

            {/* Legend row */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#9ca3af' }} />
                <span>完成数量</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }} />
                <span>总收益</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
                <span>团队收益</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
                <span>会员收益</span>
              </div>
            </div>

            {/* Responsive Container for Recharts LineChart */}
            <div style={{ width: '100%', height: '340px', marginTop: '12px', position: 'relative' }}>
              {chartLoading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '8px' }}>
                  <div className="loader-ring" />
                </div>
              )}
              
              {chartMode === 'line' ? (
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={chartData} margin={{ top: 20, right: 15, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--divider-color)" opacity={0.25} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--pm-card, #ffffff)', border: '1px solid var(--divider-color)', borderRadius: '10px' }}
                      labelStyle={{ color: 'var(--text-color)', fontWeight: 700 }}
                    />
                    
                    <Line type="monotone" dataKey="completions" stroke="#9ca3af" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} label={<CustomCompletesLabel />} />
                    <Line type="monotone" dataKey="total_payout" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} label={<CustomPeakLabel color="#10b981" />} />
                    <Line type="monotone" dataKey="team_payout" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} label={<CustomPeakLabel color="#f59e0b" />} />
                    <Line type="monotone" dataKey="member_payout" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} label={<CustomPeakLabel color="#ef4444" />} />
                  </LineChart>
                </ResponsiveContainer>
              ) : chartMode === 'bar' ? (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={chartData} margin={{ top: 20, right: 15, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--divider-color)" opacity={0.25} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--pm-card, #ffffff)', border: '1px solid var(--divider-color)', borderRadius: '10px' }}
                      labelStyle={{ color: 'var(--text-color)', fontWeight: 700 }}
                    />
                    <Bar dataKey="completions" fill="#9ca3af" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="total_payout" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="team_payout" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="member_payout" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '340px', overflowY: 'auto', border: '1px solid var(--divider-color)', borderRadius: '10px', background: 'var(--pm-card, #ffffff)' }}>
                  <table className="admin-table" style={{ margin: 0 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--divider-color)' }}>
                      <tr>
                        <th>Date</th>
                        <th>Completions</th>
                        <th>Total Payout</th>
                        <th>Team Payout</th>
                        <th>Member Payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700 }}>{row.date}</td>
                          <td>{row.completions}</td>
                          <td style={{ color: 'var(--chart-success, #10b981)', fontWeight: 600 }}>${Number(row.total_payout || 0).toFixed(2)}</td>
                          <td style={{ color: 'var(--chart-info, #3b82f6)', fontWeight: 600 }}>${Number(row.team_payout || 0).toFixed(2)}</td>
                          <td style={{ color: 'var(--chart-accent-1, #ef4444)', fontWeight: 700 }}>${Number(row.member_payout || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Platform Share Donut Chart */}
        <div style={{
          background: 'transparent',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-color)', margin: 0 }}>
              Platform Share
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Completion ratios by platform
            </p>
          </div>
          <div style={{ width: '100%', height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="45%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {platformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Completions by Team Chart (Flat / Borderless) */}
      <div style={{
        background: 'transparent',
        border: 'none',
        padding: '28px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        borderTop: '1px solid var(--divider-color)'
      }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-color)', margin: 0 }}>
            Completions by Team
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Performance breakdown by publisher network groups
          </p>
        </div>
        <div style={{ width: '100%', height: '240px' }}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={teamData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="5 5" horizontal={false} stroke="var(--divider-color)" opacity={0.3} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={false} />
              <Bar dataKey="Completions" fill="var(--primary-brand)" radius={[0, 6, 6, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Completion Audit Log */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-color, #1e1e2d)', letterSpacing: '-0.3px', margin: 0 }}>
          Recent Completion Audits
        </h3>

        <div className="table-container">
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              Loading audit logs...
            </div>
          ) : recentConversions.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No completion data found.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>TXN ID</th>
                  <th>Nickname</th>
                  <th>Team</th>
                  <th>Project PNO</th>
                  <th>Payout ($)</th>
                  <th>Status</th>
                  <th>Callback Time</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentConversions.map((conv) => {
                  const isSpeeder = conv.is_mark === 1;
                  return (
                    <tr
                      key={conv.reward_id}
                      style={{ backgroundColor: isSpeeder ? 'var(--pm-danger-bg)' : 'transparent' }}
                    >
                      <td>
                        <code style={{ fontSize: '12px', fontWeight: 700, background: 'var(--divider-color)', padding: '2px 6px', borderRadius: '4px' }}>
                          {conv.txn_id}
                        </code>
                      </td>
                      <td style={{ fontWeight: 700 }}>{conv.nickname}</td>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{conv.team_name}</td>
                      <td>
                        <code style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {conv.project_pno}
                        </code>
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--chart-success)' }}>
                        ${Number(conv.payout).toFixed(2)}
                      </td>
                      <td>
                        {isSpeeder ? (
                          <span className="badge badge-danger">
                            <ShieldAlert size={11} /> Speeder Flag
                          </span>
                        ) : (
                          <span className={`badge ${conv.reward_status === 1 ? 'badge-success' : 'badge-warning'}`}>
                            {conv.reward_status === 1 ? 'Success' : conv.reward_status === 2 ? 'Disqualified' : conv.reward_status === 3 ? 'Overquota' : 'Terminated'}
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}>
                        {conv.create_time}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {isSpeeder && (
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleClearMark(conv.reward_id)}
                              style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--chart-success)', borderColor: 'rgba(16,185,129,0.3)', fontWeight: 700 }}
                            >
                              Approve
                            </button>
                          )}
                          <button
                            className="btn btn-danger"
                            onClick={() => handleBanMember(conv.nickname)}
                            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center', fontWeight: 700 }}
                          >
                            <Ban size={11} /> Ban
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
