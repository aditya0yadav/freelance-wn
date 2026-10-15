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

      // Check if local fingerprint client (port 46666) is active
      let localClientActive = false;
      try {
        await axios.get(`http://127.0.0.1:${fingerprintBrowserService.localClientPort}/api/profiles`, { timeout: 1500 });
        localClientActive = true;
      } catch (e) {
        // May return 404 or 401 on root or error if not launched yet
        localClientActive = e.response ? true : false;
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
        api_token = ''
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

      const result = await fingerprintBrowserService.launchBatch({
        projectPno: project_pno,
        projectId: project_id,
        providerKey: provider,
        country,
        windowCount: Number(window_count) || 1,
        apiToken,
        memberId,
        clientIp,
        reqRootUrl
      });

      return res.json({
        code: 200,
        msg: `Successfully initiated ${result.successCount} of ${result.requestedCount} fingerprint browser windows`,
        data: result
      });
    } catch (err) {
      console.error('[Fingerprint Launch Controller Error]', err.message);
      return res.status(500).json({ code: 500, msg: err.message });
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
