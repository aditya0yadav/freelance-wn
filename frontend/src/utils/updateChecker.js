/**
 * GitHub-based In-App Update Checker
 * Checks for updates from GitHub Repository (aditya0yadav/freelance-wn)
 */

export const CURRENT_APP_VERSION = '1.0.0';

/**
 * Compare semantic versions: returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1, v2) {
  const cleanV1 = String(v1 || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const cleanV2 = String(v2 || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(cleanV1.length, cleanV2.length); i++) {
    const num1 = cleanV1[i] || 0;
    const num2 = cleanV2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Check if a newer version exists on GitHub
 * @param {boolean} force - Bypass cache
 */
export async function checkForAppUpdate(force = false) {
  const CACHE_KEY = 'wanhong_update_cache';
  const CACHE_TIME_KEY = 'wanhong_update_cache_time';
  const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  if (!force) {
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedTime && cachedData && Date.now() - Number(cachedTime) < CACHE_DURATION) {
      try {
        const parsed = JSON.parse(cachedData);
        return parsed;
      } catch {}
    }
  }

  // Endpoints to check
  const endpoints = [
    `https://raw.githubusercontent.com/aditya0yadav/freelance-wn/main/version.json?_t=${Date.now()}`,
    '/api/member/platform/check-update',
    '/version.json'
  ];

  let releaseData = null;

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        // Handle both raw json and { code: 200, data: json }
        releaseData = json.data || json;
        if (releaseData && releaseData.version) {
          break;
        }
      }
    } catch (e) {
      // Continue to next endpoint
    }
  }

  if (!releaseData || !releaseData.version) {
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      release: null,
      checkedAt: new Date().toISOString()
    };
  }

  const hasUpdate = compareVersions(releaseData.version, CURRENT_APP_VERSION) > 0;

  const result = {
    hasUpdate,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: releaseData.version,
    release: releaseData,
    checkedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
  } catch {}

  return result;
}
