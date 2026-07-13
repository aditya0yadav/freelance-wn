export const apiFetch = async (endpoint, method = 'GET', body = null, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);
  const res = await fetch(endpoint, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || `Error ${res.status}`);
  return data;
};
