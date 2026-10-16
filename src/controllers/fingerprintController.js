const fingerprintBrowserService = require('../services/fingerprintBrowserService');
const axios = require('axios');

class FingerprintController {
  /**
   * GET /api/member/platform/fingerprint/options
   * Returns available proxy providers, countries, and status
   */
  static async getOptions(req, res) {
    try {
      const providers = fingerprintBrowserService.getProviders();
      const countries = fingerprintBrowserService.getCountries();

      // Check if local fingerprint client (port 58888 / 46666) is active
      let localClientActive = false;
      const portsToCheck = [fingerprintBrowserService.localClientPort, ...fingerprintBrowserService.fallbackPorts];
      for (const p of portsToCheck) {
        try {
          await axios.get(`http://127.0.0.1:${p}/api/profiles`, { timeout: 1500 });
          localClientActive = true;
          fingerprintBrowserService.localClientPort = p;
          break;
        } catch (e) {
          if (e.response) {
            localClientActive = true;
            fingerprintBrowserService.localClientPort = p;
            break;
          }
        }
      }

      return res.json({
        code: 200,
        msg: 'success',
        data: {
          providers,
          countries,
          localClientPort: fingerprintBrowserService.localClientPort,
          localClientActive,
          defaultProvider: 'smart',
          defaultCountry: 'US'
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/member/platform/fingerprint/launch
   * Launches batch fingerprint browser windows with selected proxy and target survey URL
   */
  static async launch(req, res) {
    try {
      const {
        project_pno,
        project_id,
        provider = 'smart',
        country = 'US',
        window_count = 1,
        api_token = '',
        apiToken: bodyApiToken = '',
        is_desktop = false
      } = req.body;

      if (!project_pno && !project_id) {
        return res.status(400).json({ code: 400, msg: 'Missing project_pno or project_id' });
      }

      const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
      const protocol = isSecure ? 'https' : 'http';
      const host = req.get('host') || 'localhost:8000';
      const reqRootUrl = `${protocol}://${host}`;

      const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1';
      const memberId = req.user?.member_id || 1;
      const effectiveApiToken = api_token || bodyApiToken || '';
      const isDesktopClient = Boolean(is_desktop) || req.headers['x-client-platform'] === 'desktop';

      const result = await fingerprintBrowserService.launchBatch({
        projectPno: project_pno,
        projectId: project_id,
        providerKey: provider,
        country,
        windowCount: Number(window_count) || 1,
        apiToken: effectiveApiToken,
        memberId,
        clientIp,
        reqRootUrl,
        isDesktop: isDesktopClient
      });

      return res.json({
        code: 200,
        msg: `Successfully initiated ${result.successCount} of ${result.requestedCount} fingerprint browser windows`,
        data: result
      });
    } catch (err) {
      console.error('[Fingerprint Launch Controller Error]', err.message);
      let userMsg = err.message;
      if (err.message && (err.message.includes('ECONNREFUSED') || err.message.includes('Connection refused'))) {
        userMsg = 'Octo / Doge Browser is not running on your computer! Please open the Octo/Doge Browser desktop application and log in first.';
      }
      return res.status(500).json({ code: 500, msg: userMsg });
    }
  }

  /**
   * POST /api/member/platform/fingerprint/stop
   * Stops an active profile window
   */
  static async stop(req, res) {
    try {
      const { profile_uuid } = req.body;
      if (!profile_uuid) return res.status(400).json({ code: 400, msg: 'Missing profile_uuid' });

      const result = await fingerprintBrowserService.stopProfile(profile_uuid);
      return res.json({ code: 200, msg: 'success', data: result });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }
}

module.exports = FingerprintController;
