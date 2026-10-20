const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

// Output text file path
const OUTPUT_FILE = path.join(__dirname, '..', 'emails_by_folder.txt');

async function fetchEmailsByFolder() {
  console.log('Connecting to Zoho IMAP...');
  const client = new ImapFlow({
    host: process.env.ZOHO_IMAP_HOST || 'imap.zoho.com.cn',
    port: parseInt(process.env.ZOHO_IMAP_PORT, 10) || 993,
    secure: process.env.ZOHO_IMAP_SECURE !== 'false',
    auth: {
      user: process.env.ZOHO_EMAIL,
      pass: process.env.ZOHO_APP_PASSWORD
    },
    logger: false
  });

  await client.connect();
  console.log('Connected successfully to Zoho Mail!');

  const allFolders = await client.list();
  
  // Folders to skip (system/empty)
  const IGNORED = new Set([
    '草稿箱',
    'archive',
    '垃圾邮件',
    '已删除邮件',
    'snoozed',
    '模板'
  ]);

  let outputText = '';
  const timestamp = new Date().toISOString();

  outputText += '================================================================================\n';
  outputText += `ZOHO MAIL - EMAILS FETCHED BY FOLDER\n`;
  outputText += `Account: ${process.env.ZOHO_EMAIL}\n`;
  outputText += `Fetched At: ${timestamp}\n`;
  outputText += '================================================================================\n\n';

  outputText += '--- FOLDER OVERVIEW ---\n';
  const folderStats = [];
  for (const f of allFolders) {
    if (IGNORED.has(f.name.toLowerCase())) continue;
    try {
      const status = await client.status(f.path, { messages: true, unseen: true });
      folderStats.push({ name: f.name, path: f.path, total: status.messages, unseen: status.unseen });
      outputText += `  - Folder [${f.name}]: ${status.messages} total messages (${status.unseen} unseen)\n`;
    } catch (e) {
      folderStats.push({ name: f.name, path: f.path, total: 0, unseen: 0, error: e.message });
      outputText += `  - Folder [${f.name}]: error checking (${e.message})\n`;
    }
  }
  outputText += '\n================================================================================\n\n';

  // We will fetch up to 3 latest emails from each folder (or all if <= 5)
  const FETCH_COUNT_PER_FOLDER = 3;

  for (const f of folderStats) {
    if (f.total === 0) continue;
    console.log(`\nFetching emails from folder: [${f.name}] (Total: ${f.total})...`);

    outputText += `################################################################################\n`;
    outputText += `FOLDER: [${f.name}]  (Total Messages: ${f.total}, Unseen: ${f.unseen})\n`;
    outputText += `################################################################################\n\n`;

    try {
      const lock = await client.getMailboxLock(f.path);
      try {
        const fetchCount = Math.min(FETCH_COUNT_PER_FOLDER, f.total);
        const startSeq = Math.max(1, f.total - fetchCount + 1);
        const seqRange = `${startSeq}:*`;

        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        let emailIndex = 0;
        for await (const message of client.fetch(seqRange, { envelope: true, source: true, uid: true })) {
          const parsed = await simpleParser(message.source);
          if (parsed.date && parsed.date < oneMonthAgo) continue;
          emailIndex++;
          const dateStr = parsed.date ? parsed.date.toLocaleString() : 'Unknown';
          const fromText = parsed.from ? parsed.from.text : 'Unknown';
          const toText = parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map(t => t.text).join(', ') : parsed.to.text) : 'Unknown';
          const subject = parsed.subject || '(No Subject)';
          const msgId = parsed.messageId || `msg_${message.uid}`;
          
          let cleanBody = parsed.text ? parsed.text.trim() : '';
          if (!cleanBody && parsed.html) {
            cleanBody = parsed.html
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<br\s*[\/]?>/gi, '\n')
              .replace(/<\/(p|div|tr|h[1-6])>/gi, '\n')
              .replace(/<[^>]+>/g, ' ')
              .replace(/[ \t]+/g, ' ')
              .replace(/\n\s*\n\s*\n/g, '\n\n')
              .trim();
          }

          // Truncate overly long body text (e.g. max 2000 chars per email) for clean readability
          let truncatedBody = cleanBody;
          if (truncatedBody.length > 2500) {
            truncatedBody = truncatedBody.substring(0, 2500) + '\n\n... [Content Truncated for Readability] ...';
          }

          outputText += `--------------------------------------------------------------------------------\n`;
          outputText += `Folder:       [${f.name}]\n`;
          outputText += `Item:         #${emailIndex} of ${fetchCount} latest fetched (Total in folder: ${f.total})\n`;
          outputText += `UID:          ${message.uid}\n`;
          outputText += `Message-ID:   ${msgId}\n`;
          outputText += `Date:         ${dateStr}\n`;
          outputText += `From:         ${fromText}\n`;
          outputText += `To:           ${toText}\n`;
          outputText += `Subject:      ${subject}\n`;
          outputText += `--------------------------------- BODY -----------------------------------------\n`;
          outputText += `${truncatedBody || '(No text content)'}\n`;
          outputText += `--------------------------------------------------------------------------------\n\n`;
        }
      } finally {
        lock.release();
      }
    } catch (err) {
      console.error(`Error reading folder ${f.name}:`, err.message);
      outputText += `[Error fetching messages from folder ${f.name}: ${err.message}]\n\n`;
    }
  }

  outputText += '================================================================================\n';
  outputText += 'END OF FETCH REPORT\n';
  outputText += '================================================================================\n';

  fs.writeFileSync(OUTPUT_FILE, outputText, 'utf8');
  console.log(`\nAll emails successfully fetched and saved to: ${OUTPUT_FILE}`);
  await client.logout();
}

fetchEmailsByFolder().catch(err => {
  console.error('Fatal error during fetch:', err);
  process.exit(1);
});
