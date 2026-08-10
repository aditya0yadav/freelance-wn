/**
 * Admin API utility - wraps fetch calls for the admin backend
 */

const BASE_URL = `${import.meta.env.VITE_API_URL || 'https://api.wanhongsurvey.com'}/api/admin/platform`;

export const adminFetch = async (endpoint, method = 'GET', body = null, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${endpoint}`, config);

  // Safely parse — server may return HTML on 413/500 etc.
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server error (${res.status}): Response was not valid JSON. Check server logs.`);
  }

  if (!res.ok) throw new Error(data.msg || `Error ${res.status}`);
  return data;
};


export const getAdminToken = () => localStorage.getItem('admin_token') || null;
export const getAdminUser = () => {
  try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; }
};
export const setAdminSession = (token, user) => {
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_user', JSON.stringify(user));
};
export const clearAdminSession = () => {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
};
