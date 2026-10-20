const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { SQLiteManager } = require('../config/sqlite');
const ollamaService = require('./ollamaService');
const csvService = require('./csvService');
const mysqlSyncService = require('./mysqlSyncService');

class ImapService {
  constructor() {
    this.client = null;
    this.isRunning = false;
    this.isScanning = false;
    this.pollTimer = null;
  }

  isConfigured() {
    const email = process.env.ZOHO_EMAIL;
    const pass = process.env.ZOHO_APP_PASSWORD;
    return Boolean(email && email.includes('@') && pass && pass.trim().length > 0);
  }

  createClient() {
    const host = process.env.ZOHO_IMAP_HOST || 'imap.zoho.com.cn';
    const port = parseInt(process.env.ZOHO_IMAP_PORT, 10) || 993;
    const secure = process.env.ZOHO_IMAP_SECURE !== 'false';
    const auth = {
      user: process.env.ZOHO_EMAIL,
      pass: process.env.ZOHO_APP_PASSWORD
    };

    const client = new ImapFlow({
      host,
      port,
      secure,
      auth,
      logger: false
    });

    client.on('error', err => {
      console.error('[IMAP Error]', err.message);
    });

    return client;
  }

  /**
   * Resolve company folders to scan, ignoring system/non-survey mailboxes
   */
  async getTargetMailboxes(client) {
    const customList = (process.env.ZOHO_SCAN_FOLDERS || '').trim();
    if (customList && customList !== 'auto') {
      const names = customList.split(',').map(s => s.trim()).filter(Boolean);
      return names.map(n => ({ path: n, name: n }));
    }

    const IGNORED = new Set([
      'newsletter',
      'notification',
      'notifications',
      'snoozed',
      'templates',
      '发票',
      'trash',
      'spam',
      'sent',
      'drafts',
      'archive',
      'junk'
    ]);

    try {
      const list = await client.list();
      const valid = [];
      for (const m of list) {
        const lowerName = (m.name || '').toLowerCase();
        if (m.specialUse && m.specialUse !== '\\Inbox') continue;
        if (IGNORED.has(lowerName)) continue;
        valid.push({ path: m.path, name: m.name });
      }
      return valid.length > 0 ? valid : [{ path: 'INBOX', name: 'INBOX' }];
    } catch (err) {
      console.warn('[IMAP] Failed to list mailboxes, defaulting to INBOX:', err.message);
      return [{ path: 'INBOX', name: 'INBOX' }];
    }
  }

  getCutoffDate() {
    const days = parseInt(process.env.MAX_EMAIL_AGE_DAYS, 10) || 30;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  /**
   * Process a single email payload through the pipeline
   */
  async processEmail({ messageId, uid, from, subject, date, text, html, folderName = 'INBOX' }) {
    if (SQLiteManager.isEmailProcessed(messageId)) {
      console.log(`[Deduplicate] Email ${messageId} already processed. Skipping.`);
      return;
    }

    // Restrict processing to the last 1 month (30 days)
    const emailDate = date ? new Date(date) : new Date();
    const cutoffDate = this.getCutoffDate();
    if (emailDate < cutoffDate) {
      console.log(`[Filter] Email ${messageId} is older than 1 month (${emailDate.toISOString().slice(0, 10)} < ${cutoffDate.toISOString().slice(0, 10)}). Skipping.`);
      return;
    }

    console.log(`\n======================================================`);
    console.log(`[Ingest] Processing Email from Folder: [${folderName}]`);
    console.log(`[Ingest] Subject: "${subject}" from <${from}>`);
    console.log(`[Ingest] Message-ID: ${messageId}`);

    const bodyContent = text || (html ? html.replace(/<[^>]+>/g, ' ') : '');

    try {
      // 1. Send to local Ollama LLM with company folder context
      console.log(`[AI Agent] Analyzing email with Ollama (${process.env.OLLAMA_MODEL || 'llama3:latest'})...`);
      const extracted = await ollamaService.extractSurvey({
        from,
        subject,
        date,
        bodyText: bodyContent,
        folderName
      });

      console.log(`[AI Result] Is Survey: ${extracted.is_survey_invitation} (Confidence: ${extracted.confidence})`);

      if (extracted.is_survey_invitation) {
        console.log(`[AI Extracted] Survey: ${extracted.project_name}`);
        console.log(`[AI Extracted] Platform: ${extracted.platform_name} (from folder: ${folderName})`);
        console.log(`[AI Extracted] No: ${extracted.project_no} | CPI: $${extracted.project_cpi} | Quota: ${extracted.project_quota} | LOI: ${extracted.project_loi}m | IR: ${extracted.project_ir}%`);
        if (extracted.project_click_url) {
          console.log(`[AI Extracted] URL: ${extracted.project_click_url}`);
        }

        // 2. Log email to audit table first to satisfy foreign key
        SQLiteManager.logProcessedEmail({
          messageId,
          uid,
          fromAddr: from,
          subject,
          receivedDate: date,
          status: 'processing',
          isSurvey: true,
          folderName
        });

        // 3. Save to on-device SQLite database
        const surveyRecord = {
          ...extracted,
          message_id: messageId,
          folder_name: folderName
        };
        const surveyDbId = SQLiteManager.saveExtractedSurvey(surveyRecord);
        console.log(`[Storage] Saved to local SQLite (Survey ID: ${surveyDbId})`);

        // 4. Append to CSV file
        const csvPath = csvService.appendSurvey(surveyRecord);
        console.log(`[Storage] Appended to local CSV: ${csvPath}`);

        // 5. Auto-sync to main MySQL ya_project & ya_platform (Disabled for Group T per manual review workflow)
        const isGroupT = (folderName || '').trim().toUpperCase() === 'T' ||
          (folderName || '').trim().toLowerCase() === 'group t' ||
          (extracted.platform_name || '').trim().toUpperCase() === 'T';

        if (isGroupT) {
          console.log(`[Group T] Folder "${folderName}" belongs to Group T (manual review & acceptance required). Automatic sync to ya_project disabled.`);
        } else if (process.env.ENABLE_MYSQL_SYNC === 'true') {
          const mysqlProjectId = await mysqlSyncService.syncSurvey(surveyRecord);
          if (mysqlProjectId) {
            SQLiteManager.markSyncedToMysql(surveyDbId, mysqlProjectId);
            console.log(`[Sync] Survey mapped and saved in ya_project (MySQL Project ID: ${mysqlProjectId})`);
          }
        }

        // 6. Update audit log status to success
        SQLiteManager.logProcessedEmail({
          messageId,
          uid,
          fromAddr: from,
          subject,
          receivedDate: date,
          status: 'success',
          isSurvey: true,
          folderName
        });
      } else {
        console.log(`[Filter] Email filtered out (Non-survey email).`);
        SQLiteManager.logProcessedEmail({
          messageId,
          uid,
          fromAddr: from,
          subject,
          receivedDate: date,
          status: 'ignored_non_survey',
          isSurvey: false,
          folderName
        });
      }
    } catch (err) {
      console.error(`[Error] Failed processing email:`, err.message);
      SQLiteManager.logProcessedEmail({
        messageId,
        uid,
        fromAddr: from,
        subject,
        receivedDate: date,
        status: 'error',
        isSurvey: false,
        errorMessage: err.message,
        folderName
      });
    }
  }

  /**
   * Fetch and process unseen emails across all company folders
   */
  async checkMailbox() {
    if (!this.isConfigured()) {
      console.log('[IMAP] Zoho credentials not configured in .env yet. Daemon is waiting.');
      return;
    }

    if (this.isScanning) {
      console.log('[IMAP] Previous mailbox scan still in progress. Skipping overlapping cycle.');
      return;
    }
    this.isScanning = true;

    const client = this.createClient();

    try {
      await client.connect();
      const targetMailboxes = await this.getTargetMailboxes(client);
      const cutoffDate = this.getCutoffDate();
      console.log(`[IMAP] Connected to Zoho. Scanning ${targetMailboxes.length} company folders (since ${cutoffDate.toISOString().slice(0, 10)}): ${targetMailboxes.map(m => m.name).join(', ')}...`);

      for (const mb of targetMailboxes) {
        try {
          const lock = await client.getMailboxLock(mb.path);
          try {
            // Fetch unseen messages from the last 1 month (30 days)
            const searchQuery = { unseen: true, since: cutoffDate };
            const batch = [];
            for await (const message of client.fetch(searchQuery, { envelope: true, source: true, uid: true })) {
              const parsed = await simpleParser(message.source);
              const messageId = parsed.messageId || `msg_${mb.name}_${message.uid}_${Date.now()}`;
              const from = parsed.from ? parsed.from.text : '';
              const subject = parsed.subject || '(No Subject)';
              const date = parsed.date ? parsed.date.toISOString() : new Date().toISOString();

              batch.push({
                messageId,
                uid: String(message.uid),
                from,
                subject,
                date,
                text: parsed.text,
                html: parsed.html,
                folderName: mb.name
              });
            }

            // Sort messages chronologically ascending (oldest -> newest) so initial project creation runs before subsequent updates/pause
            batch.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            for (const item of batch) {
              await this.processEmail(item);
            }
          } finally {
            lock.release();
          }
        } catch (folderErr) {
          console.error(`[IMAP Folder Error] Error scanning "${mb.name}":`, folderErr.message);
        }
      }
    } catch (err) {
      console.error('[IMAP Check Error]', err.message);
    } finally {
      this.isScanning = false;
      await client.logout().catch(() => {});
    }
  }

  /**
   * Scan the most recent N messages from each company folder
   */
  async checkRecent(countPerFolder = 5) {
    if (!this.isConfigured()) return;
    const client = this.createClient();

    try {
      await client.connect();
      const targetMailboxes = await this.getTargetMailboxes(client);
      console.log(`[IMAP] Scanning last ${countPerFolder} emails across ${targetMailboxes.length} company folders...`);

      for (const mb of targetMailboxes) {
        try {
          const lock = await client.getMailboxLock(mb.path);
          try {
            const status = await client.status(mb.path, { messages: true });
            const total = status.messages || 0;
            if (total === 0) continue;

            const startSeq = Math.max(1, total - countPerFolder + 1);
            const seqRange = `${startSeq}:*`;
            const cutoffDate = this.getCutoffDate();
            const batch = [];
            for await (const message of client.fetch(seqRange, { envelope: true, source: true, uid: true })) {
              const parsed = await simpleParser(message.source);
              if (parsed.date && parsed.date < cutoffDate) continue;
              const messageId = parsed.messageId || `msg_${mb.name}_${message.uid}_${Date.now()}`;
              const from = parsed.from ? parsed.from.text : '';
              const subject = parsed.subject || '(No Subject)';
              const date = parsed.date ? parsed.date.toISOString() : new Date().toISOString();

              batch.push({
                messageId,
                uid: String(message.uid),
                from,
                subject,
                date,
                text: parsed.text,
                html: parsed.html,
                folderName: mb.name
              });
            }

            // Sort chronologically ascending (oldest -> newest)
            batch.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            for (const item of batch) {
              await this.processEmail(item);
            }
          } finally {
            lock.release();
          }
        } catch (folderErr) {
          console.error(`[IMAP Recent Error] Folder "${mb.name}":`, folderErr.message);
        }
      }
    } catch (err) {
      console.error('[IMAP Recent Scan Error]', err.message);
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Reprocess emails from Zoho Mailbox to regenerate quotas and chronological timeline
   * @param {Object} options
   * @param {number|'all'} options.countPerFolder - number of messages per folder or 'all'
   * @param {boolean} options.resetCache - whether to clear SQLite processed history
   */
  async reprocessMailbox({ countPerFolder = 'all', resetCache = true } = {}) {
    if (!this.isConfigured()) return;

    if (resetCache) {
      console.log('[Reprocess] Clearing local processed email audit cache...');
      SQLiteManager.resetDatabase();
      console.log('[Reprocess] Local cache cleared. Ready to re-ingest.');
    }

    const client = this.createClient();

    try {
      await client.connect();
      const targetMailboxes = await this.getTargetMailboxes(client);
      console.log(`[Reprocess] Connected to Zoho. Scanning ${targetMailboxes.length} company folders: ${targetMailboxes.map(m => m.name).join(', ')}...`);

      for (const mb of targetMailboxes) {
        try {
          const lock = await client.getMailboxLock(mb.path);
          try {
            const status = await client.status(mb.path, { messages: true });
            const total = status.messages || 0;
            if (total === 0) continue;

            const cutoffDate = this.getCutoffDate();
            let fetchQuery = { since: cutoffDate };
            if (countPerFolder !== 'all' && Number(countPerFolder) > 0) {
              const startSeq = Math.max(1, total - Number(countPerFolder) + 1);
              fetchQuery = `${startSeq}:*`;
            }

            console.log(`[Reprocess] Folder [${mb.name}]: fetching messages (total: ${total}, since: ${cutoffDate.toISOString().slice(0, 10)})...`);

            const batch = [];
            for await (const message of client.fetch(fetchQuery, { envelope: true, source: true, uid: true })) {
              const parsed = await simpleParser(message.source);
              const messageId = parsed.messageId || `msg_${mb.name}_${message.uid}_${Date.now()}`;
              const from = parsed.from ? parsed.from.text : '';
              const subject = parsed.subject || '(No Subject)';
              const date = parsed.date ? parsed.date.toISOString() : new Date().toISOString();

              batch.push({
                messageId,
                uid: String(message.uid),
                from,
                subject,
                date,
                text: parsed.text,
                html: parsed.html,
                folderName: mb.name
              });
            }

            // Sort chronologically ascending (oldest -> newest)
            batch.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            for (const item of batch) {
              await this.processEmail(item);
            }
          } finally {
            lock.release();
          }
        } catch (folderErr) {
          console.error(`[Reprocess Folder Error] Folder "${mb.name}":`, folderErr.message);
        }
      }
    } catch (err) {
      console.error('[Reprocess Error]', err.message);
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Reset the \\Seen flag on Zoho emails so background daemon sees them as unseen
   */
  async markAllUnseen() {
    if (!this.isConfigured()) return;
    const client = this.createClient();
    try {
      await client.connect();
      const targetMailboxes = await this.getTargetMailboxes(client);
      for (const mb of targetMailboxes) {
        try {
          const lock = await client.getMailboxLock(mb.path);
          try {
            const status = await client.status(mb.path, { messages: true });
            if ((status.messages || 0) > 0) {
              await client.messageFlagsRemove('1:*', ['\\Seen']);
              console.log(`[IMAP] Removed \\Seen flag from all messages in [${mb.name}].`);
            }
          } finally {
            lock.release();
          }
        } catch (err) {
          console.warn(`[IMAP] Could not unmark seen in ${mb.name}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[IMAP markAllUnseen Error]', err.message);
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Start IDLE listener daemon
   */
  async startDaemon() {
    if (!this.isConfigured()) {
      console.log('------------------------------------------------------------');
      console.log(' [Notice] Zoho Mail is not configured yet in .env.');
      console.log(' Set ZOHO_EMAIL and ZOHO_APP_PASSWORD in email-survey-agent/.env');
      console.log(' To test with simulated survey emails, run: npm run test:mock');
      console.log('------------------------------------------------------------');
      return;
    }

    this.isRunning = true;
    console.log('[Daemon] Starting Zoho IMAP agent...');

    // Initial check
    await this.checkMailbox();

    // Schedule regular polling interval
    const intervalMs = parseInt(process.env.POLL_INTERVAL_MS, 10) || 300000;
    this.pollTimer = setInterval(() => {
      this.checkMailbox();
    }, intervalMs);

    console.log(`[Daemon] Zoho IMAP active. Polling every ${Math.round(intervalMs / 1000)}s.`);
  }

  stop() {
    this.isRunning = false;
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.client) this.client.close();
  }
}

module.exports = new ImapService();
