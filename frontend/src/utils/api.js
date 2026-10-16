/**
 * Returns the configured Backend API Base URL.
 * Supports:
 * 1. Runtime override via localStorage ('backend_api_url')
 * 2. Build-time environment variable (import.meta.env.VITE_API_URL)
 * 3. Default fallback to production backend
 */
export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('backend_api_url');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  }

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Fallback default
  return 'https://api.wanhongsurvey.com';
};

export const apiFetch = async (endpoint, method = 'GET', body = null, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);
  const BASE_URL = getApiBaseUrl();
  const res = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || `Error ${res.status}`);
  return data;
};

