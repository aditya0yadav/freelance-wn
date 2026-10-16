const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');
const prisma = require('../config/database');

// Default supported proxy provider definitions
const PROXY_PROVIDERS = {
  smart: {
    key: 'smart',
    name: 'Smart (ipipbright)',
    host: process.env.SMART_PROXY_HOST || 'sp.ipipbright.net',
    port: parseInt(process.env.SMART_PROXY_PORT, 10) || 1000,
    user: process.env.SMART_PROXY_USER || 'storm-fengchuiguo',
    password: process.env.SMART_PROXY_PASS || 'fcg123456',
    formatLogin: (baseUser) => {
      // Use clean username directly to ensure reliable connection in Octo Browser
      return baseUser;
    }
  },
  koo: {
    key: 'koo',
    name: 'Koo (Kookeey)',
    host: process.env.KOO_PROXY_HOST || 'gate.kookeey.info',
    port: parseInt(process.env.KOO_PROXY_PORT, 10) || 1000,
    user: process.env.KOO_PROXY_USER || '8162185-995261',
    password: process.env.KOO_PROXY_PASS || 'zzz123456',
    formatLogin: (baseUser) => {
      // Use clean username directly
      return baseUser;
    }
  },
  direct: {
    key: 'direct',
    name: 'Direct (No Proxy / Local IP)',
    host: '',
    port: 0,
    user: '',
    password: '',
    formatLogin: () => ''
  }
};

// Supported countries mapping for easy UI selection
const SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸', lang: 'en-US' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', lang: 'en-GB' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', lang: 'en-CA' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', lang: 'en-AU' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', lang: 'de-DE' },
  { code: 'FR', name: 'France', flag: '🇫🇷', lang: 'fr-FR' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', lang: 'it-IT' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', lang: 'es-ES' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', lang: 'ja-JP' },
  { code: 'IN', name: 'India', flag: '🇮🇳', lang: 'en-IN' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', lang: 'pt-BR' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', lang: 'es-MX' }
];

class FingerprintBrowserService {
  constructor() {
    this.cloudApiBase = process.env.OCTO_CLOUD_API || 'https://dog.uomime.com/api/v2/automation/profiles';
    this.localClientPort = parseInt(process.env.OCTO_LOCAL_PORT, 10) || 58888;
    this.localClientBase = `http://127.0.0.1:${this.localClientPort}`;
    this.fallbackPorts = [58888, 46666].filter(p => p !== this.localClientPort);
    this.defaultApiToken = process.env.OCTO_API_TOKEN || '';
  }

  getProviders() {
    return Object.values(PROXY_PROVIDERS).map(p => ({
      key: p.key,
      name: p.name,
      host: p.host,
      port: p.port
    }));
  }

  getCountries() {
    return SUPPORTED_COUNTRIES;
  }

  /**
   * Builds formatted proxy configuration for profile injection
   */
  buildProxyConfig(providerKey, countryCode) {
    const provider = PROXY_PROVIDERS[providerKey] || PROXY_PROVIDERS.smart;
    if (provider.key === 'direct' || !provider.host) {
      return null;
    }

    const sessionId = crypto.randomBytes(4).toString('hex');
    const formattedLogin = provider.formatLogin(provider.user, countryCode, sessionId);

    return {
      type: 'http',
      host: provider.host,
      port: provider.port,
      login: formattedLogin,
      password: provider.password,
      meta: {
        provider: provider.name,
        country: countryCode,
        sessionId
      }
    };
  }

  /**
   * Creates a browser profile via the Octo automation API (cloud or local fallback)
   */
  async createProfile({ title, proxy, country, apiToken, startPages }) {
    const countryObj = SUPPORTED_COUNTRIES.find(c => c.code === (country || 'US').toUpperCase());
    const lang = countryObj ? countryObj.lang : 'en-US';

    const payload = {
      title: title || `Survey-${Date.now()}`,
      fingerprint: {
        os: process.env.FINGERPRINT_OS || 'win',
        screen: '1920x1080',
        languages: [lang, 'en']
      }
    };

    // Set target survey link as Octo profile start page
    if (startPages && Array.isArray(startPages) && startPages.length > 0) {
      payload.start_pages = startPages;
    }

    if (proxy && proxy.host) {
      payload.proxy = {
        type: proxy.type || 'http',
        host: proxy.host,
        port: Number(proxy.port),
        login: proxy.login,
        password: proxy.password
      };
    }

    const headers = { 'Content-Type': 'application/json' };
    const effectiveToken = apiToken || this.defaultApiToken;
    if (effectiveToken) {
      headers['X-Octo-Api-Token'] = effectiveToken;
    }

    try {
      console.log(`[Fingerprint] Creating profile "${payload.title}" via ${this.cloudApiBase}...`);
      const res = await axios.post(this.cloudApiBase, payload, { headers, timeout: 20000 });
      const uuid = res.data?.data?.uuid || res.data?.uuid || res.data?.data?.id || res.data?.id;

      if (!uuid) {
        throw new Error(`Profile created but UUID not found in response: ${JSON.stringify(res.data)}`);
      }

      console.log(`[Fingerprint] Profile created successfully: ${uuid}`);
      return { uuid, source: 'cloud', proxy: payload.proxy };
    } catch (err) {
      console.warn(`[Fingerprint] Cloud profile creation failed (${err.message}). Trying local client fallback on port ${this.localClientPort}...`);

      // Try local client API fallback
      try {
        const localRes = await axios.post(`${this.localClientBase}/api/profiles`, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        const localUuid = localRes.data?.data?.uuid || localRes.data?.uuid || localRes.data?.id;
        if (localUuid) {
          console.log(`[Fingerprint] Local profile created: ${localUuid}`);
          return { uuid: localUuid, source: 'local', proxy: payload.proxy };
        }
      } catch (localErr) {
        console.error(`[Fingerprint] Local profile fallback also failed: ${localErr.message}`);
      }

      throw new Error(`Failed to create fingerprint profile: ${err.response?.data?.message || err.message}`);
    }
  }

  /**
   * Starts a profile window on local client port (58888 or fallback) and navigates to the target survey link
   */
  async startProfile(profileUuid, targetUrl) {
    const flags = ['--start-maximized', '--no-default-browser-check'];
    if (targetUrl) {
      flags.unshift(targetUrl);
    }

    const payload = {
      uuid: profileUuid,
      headless: false,
      debug_port: true,
      timeout: 120,
      flags
    };

    const portsToTry = [this.localClientPort, ...this.fallbackPorts];
    let lastErr = null;
    let data = null;

    for (const port of portsToTry) {
      const startUrl = `http://127.0.0.1:${port}/api/profiles/start`;
      try {
        console.log(`[Fingerprint] Attempting to start profile ${profileUuid} on ${startUrl}...`);
        const res = await axios.post(startUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 4000
        });
        data = res.data;
        this.localClientPort = port;
        this.localClientBase = `http://127.0.0.1:${port}`;
        console.log(`[Fingerprint] Profile ${profileUuid} started on port ${port}. Response:`, data);
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`[Fingerprint] Start failed on port ${port} (${err.message}). Trying next...`);
      }
    }

    if (!data) {
      throw new Error(`Failed to start profile on local ports ${portsToTry.join(', ')}: ${lastErr?.response?.data?.message || lastErr?.message || 'Connection refused'}`);
    }

    const wsEndpoint = data.ws_endpoint || data.data?.ws_endpoint;

    // If WebSocket CDP endpoint returned, ensure targetUrl is navigated
    if (wsEndpoint && targetUrl) {
      this.navigateViaCDP(wsEndpoint, targetUrl).catch(e => {
        console.warn(`[Fingerprint] CDP navigation notice:`, e.message);
      });
    }

    return {
      success: true,
      profileUuid,
      wsEndpoint,
      targetUrl
    };
  }

  /**
   * Connects to Chrome DevTools Protocol WebSocket to navigate to the target survey URL
   */
  navigateViaCDP(wsEndpoint, url) {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(wsEndpoint);
        const timer = setTimeout(() => {
          ws.close();
          resolve();
        }, 5000);

        ws.on('open', () => {
          // Send Page.navigate command
          const msg = JSON.stringify({
            id: 1,
            method: 'Page.navigate',
            params: { url }
          });
          ws.send(msg);
        });

        ws.on('message', (data) => {
          clearTimeout(timer);
          ws.close();
          resolve();
        });

        ws.on('error', (err) => {
          clearTimeout(timer);
          resolve(); // Resolve silently so profile start doesn't fail
        });
      } catch (e) {
        resolve();
      }
    });
  }

  /**
   * Stops an active profile window (with automatic force_stop fallback)
   */
  async stopProfile(profileUuid) {
    const portsToTry = [this.localClientPort, ...this.fallbackPorts];
    let lastErr = null;

    for (const port of portsToTry) {
      try {
        const res = await axios.post(`http://127.0.0.1:${port}/api/profiles/stop`, {
          uuid: profileUuid
        }, { timeout: 10000 });
        console.log(`[Fingerprint] Profile ${profileUuid} stopped successfully on port ${port}`);
        return res.data;
      } catch (err) {
        lastErr = err;
        // Fallback to /api/profiles/force_stop if regular stop failed
        try {
          const forceRes = await axios.post(`http://127.0.0.1:${port}/api/profiles/force_stop`, {
            uuid: profileUuid
          }, { timeout: 10000 });
          console.log(`[Fingerprint] Profile ${profileUuid} force-stopped on port ${port}`);
          return forceRes.data;
        } catch (forceErr) {
          lastErr = forceErr;
        }
      }
    }
    console.error(`[Fingerprint] Failed to stop profile ${profileUuid}:`, lastErr?.message);
    return { success: false, error: lastErr?.message || 'Failed to stop profile' };
  }

  /**
   * Force stops an active profile window
   */
  async forceStopProfile(profileUuid) {
    const portsToTry = [this.localClientPort, ...this.fallbackPorts];
    for (const port of portsToTry) {
      try {
        const res = await axios.post(`http://127.0.0.1:${port}/api/profiles/force_stop`, {
          uuid: profileUuid
        }, { timeout: 10000 });
        return res.data;
      } catch (err) {}
    }
    return { success: false, error: 'Failed to force stop profile' };
  }

  /**
   * Logs into local Octo client via /api/auth/login
   */
  async loginLocalClient({ email, password, apiToken }) {
    const payload = {};
    if (email) payload.email = email;
    if (password) payload.password = password;
    if (apiToken || this.defaultApiToken) payload.api_token = apiToken || this.defaultApiToken;

    const portsToTry = [this.localClientPort, ...this.fallbackPorts];
    for (const port of portsToTry) {
      try {
        const res = await axios.post(`http://127.0.0.1:${port}/api/auth/login`, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        return res.data;
      } catch (err) {}
    }
    return { success: false, error: 'Could not connect to local client auth endpoint' };
  }

  /**
   * Delete profile from cloud API (for disposable session cleanups)
   */
  async deleteProfile(profileUuid, apiToken) {
    try {
      const effectiveToken = apiToken || this.defaultApiToken;
      const headers = effectiveToken ? { 'X-Octo-Api-Token': effectiveToken } : {};
      await axios.delete(`${this.cloudApiBase}/${profileUuid}`, { headers, timeout: 10000 });
      console.log(`[Fingerprint] Cleaned up temporary profile: ${profileUuid}`);
    } catch (e) {
      // Ignored non-critical cleanup error
    }
  }

  /**
   * Updates an existing profile via Octo Cloud API (e.g. start_pages, bookmarks, extensions)
   */
  async updateProfile(profileUuid, data, apiToken) {
    try {
      const effectiveToken = apiToken || this.defaultApiToken;
      const headers = { 'Content-Type': 'application/json' };
      if (effectiveToken) {
        headers['X-Octo-Api-Token'] = effectiveToken;
      }
      const res = await axios.patch(`${this.cloudApiBase}/${profileUuid}`, data, { headers, timeout: 15000 });
      return res.data;
    } catch (err) {
      console.warn(`[Fingerprint] Profile update notice:`, err.response?.data?.message || err.message);
      return null;
    }
  }

  /**
   * High-Level Batch Orchestrator:
   * Opens N fingerprint browser windows for a chosen project, proxy provider, and country.
   */
  async launchBatch({ projectPno, projectId, providerKey, country, windowCount, apiToken, memberId, clientIp, reqRootUrl }) {
    const count = Math.min(Math.max(parseInt(windowCount, 10) || 1, 1), 20); // 1 to 20 windows limit
    const countryCode = (country || 'US').toUpperCase();

    // 1. Fetch survey project details
    const where = projectPno ? { project_pno: projectPno } : { project_id: Number(projectId) };
    const project = await prisma.project.findFirst({
      where,
      include: { platform: true }
    });

    if (!project || project.delete_time !== null) {
      throw new Error('Survey project not found or disabled.');
    }

    console.log(`\n======================================================`);
    console.log(`[Batch Launch] Survey: "${project.project_name}" [${project.project_pno}]`);
    console.log(`[Batch Launch] Provider: ${providerKey} | Country: ${countryCode} | Windows: ${count}`);

    const results = [];

    for (let i = 1; i <= count; i++) {
      const trackingUuid = crypto.randomUUID().replace(/-/g, '');
      const sessionId = `w${i}_${trackingUuid.slice(0, 6)}`;

      // 2. Generate tracking session in ya_flowing
      try {
        await prisma.flowing.create({
          data: {
            uuid: trackingUuid,
            member_id: Number(memberId) || 1,
            project_id: project.project_id,
            ip: clientIp || '127.0.0.1',
            country: countryCode,
            create_time: new Date()
          }
        });

        // Increment project click count
        await prisma.project.update({
          where: { project_id: project.project_id },
          data: { project_click: { increment: 1 } }
        });
      } catch (err) {
        console.warn(`[Flowing Log Error]`, err.message);
      }

      // 3. Determine Final Target Survey URL
      let targetUrl = '';
      if (project.project_click_url) {
        targetUrl = `${project.project_click_url}${trackingUuid}`;
      } else if (reqRootUrl) {
        targetUrl = `${reqRootUrl}/api/member/platform/link?pid=${project.project_pno}&uuid=${trackingUuid}`;
      } else {
        targetUrl = `http://localhost:8000/api/member/platform/link?pid=${project.project_pno}&uuid=${trackingUuid}`;
      }

      // 4. Build proxy configuration
      const proxy = this.buildProxyConfig(providerKey, countryCode);

      // 5. Create Profile with survey URL as start_pages and Start Window
      const profileTitle = `${project.project_no || 'Surv'}_${countryCode}_W${i}_${sessionId}`;
      try {
        const profile = await this.createProfile({
          title: profileTitle,
          proxy,
          country: countryCode,
          apiToken,
          startPages: targetUrl ? [targetUrl] : []
        });

        // Try starting the profile on the backend machine (works when backend is local)
        let startedByBackend = false;
        try {
          await this.startProfile(profile.uuid, targetUrl);
          startedByBackend = true;
        } catch (startErr) {
          console.log(`[Batch Launch Window #${i}] Backend cannot reach local Octo client (${startErr.message}). Delegating launch to Desktop/Web client.`);
        }

        results.push({
          index: i,
          status: 'success',
          profileUuid: profile.uuid,
          targetUrl,
          proxy: proxy ? `${proxy.host}:${proxy.port} (${countryCode})` : 'Direct',
          title: profileTitle,
          startedByBackend,
          needClientStart: !startedByBackend
        });
      } catch (launchErr) {
        console.error(`[Batch Launch Error Window #${i}]`, launchErr.message);
        results.push({
          index: i,
          status: 'failed',
          error: launchErr.message,
          proxy: proxy ? `${proxy.host}:${proxy.port}` : 'Direct',
          targetUrl
        });
      }

      // Stagger window launches by 1.2s to prevent local system port race conditions
      if (i < count) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    return {
      success: true,
      projectName: project.project_name,
      projectPno: project.project_pno,
      provider: providerKey,
      country: countryCode,
      requestedCount: count,
      successCount: results.filter(r => r.status === 'success').length,
      windows: results
    };
  }
}

module.exports = new FingerprintBrowserService();
