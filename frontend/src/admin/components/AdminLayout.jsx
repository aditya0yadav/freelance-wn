import '../admin.css';
import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import { getAdminToken } from '../utils/adminApi';

export default function AdminLayout() {
  const token = getAdminToken();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!token) return <Navigate to="/admin/login" replace />;

  return (
    <div className="admin-theme" style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-color)',
    }}>
      <AdminSidebar isExpanded={isExpanded} />
      <div style={{
        marginLeft: 0,
        paddingLeft: isExpanded ? '304px' : '112px',
        transition: 'padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        overflowX: 'hidden',
      }}>
        <AdminTopbar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
        <main style={{ flex: 1, padding: '28px 28px 48px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
