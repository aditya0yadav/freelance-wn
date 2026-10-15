const path = require('path');
const dotenv = require('dotenv');

// Load email-survey-agent .env configuration
dotenv.config({ path: path.resolve(__dirname, '../../email-survey-agent/.env') });

const imapService = require('../../email-survey-agent/services/imapService');

if (imapService.isConfigured()) {
  console.log(`[${new Date().toISOString()}] Starting 24/7 Email Survey Ingestion Daemon...`);
  imapService.startDaemon().catch(err => {
    console.error(`[${new Date().toISOString()}] [Email Survey Daemon Error]`, err.message);
  });
} else {
  console.log(`[${new Date().toISOString()}] [Email Survey Agent] Zoho credentials not configured yet in email-survey-agent/.env`);
}

module.exports = imapService;
