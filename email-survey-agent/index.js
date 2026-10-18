require('dotenv').config();
const imapService = require('./services/imapService');
const { SQLiteManager } = require('./config/sqlite');

const args = process.argv.slice(2);

if (args.includes('--status')) {
  console.log('======================================================');
  console.log('      ON-DEVICE EMAIL SURVEY AGENT - AUDIT STATUS     ');
  console.log('======================================================');
  const stats = SQLiteManager.getStats();
  console.log(`Total Emails Processed:      ${stats.totalEmails}`);
  console.log(`Survey Invitations Detected: ${stats.surveyEmails}`);
  console.log(`Surveys Extracted & Stored:  ${stats.totalSurveys}`);
  console.log(`Synced to ya_project MySQL:  ${stats.syncedSurveys}`);
  console.log('------------------------------------------------------');

  if (stats.recent && stats.recent.length > 0) {
    console.log('\nRecent Surveys in Local SQLite:');
    stats.recent.forEach((r, idx) => {
      console.log(` ${idx + 1}. [${r.project_no}] ${r.project_name} | $${r.project_cpi} ${r.currency} | ${r.platform_name} | Synced: ${r.synced_to_mysql ? 'Yes' : 'No'}`);
    });
  } else {
    console.log('\nNo surveys logged yet.');
  }
  process.exit(0);
}

if (args.includes('--test')) {
  require('./test/mockEmailTest');
} else if (args.includes('--reset')) {
  console.log('======================================================');
  console.log('      RESETTING LOCAL EMAIL SURVEY AUDIT CACHE        ');
  console.log('======================================================');
  SQLiteManager.resetDatabase();
  console.log('[Done] Local processed emails history cleared.');
  console.log('All emails in Zoho will now be ingested freshly.');
  process.exit(0);
} else if (args.includes('--mark-unseen')) {
  console.log('======================================================');
  console.log('      RESETTING \\Seen FLAGS IN ZOHO MAILBOX           ');
  console.log('======================================================');
  imapService.markAllUnseen().then(() => {
    console.log('[Done] All messages in partner folders marked unseen.');
    process.exit(0);
  }).catch(err => {
    console.error('Mark unseen error:', err.message);
    process.exit(1);
  });
} else if (args.includes('--reprocess')) {
  const reprocessIdx = args.indexOf('--reprocess');
  const countArg = args[reprocessIdx + 1];
  const count = (countArg && !isNaN(parseInt(countArg, 10))) ? parseInt(countArg, 10) : 'all';

  console.log('======================================================');
  console.log(`  REPROCESSING EMAILS (${count} per folder) TO REGENERATE QUOTAS `);
  console.log('======================================================');
  imapService.reprocessMailbox({ countPerFolder: count, resetCache: true }).then(() => {
    console.log('\n[Done] All surveys reprocessed with new baseline + chronological update logs!');
    process.exit(0);
  }).catch(err => {
    console.error('Reprocess error:', err.message);
    process.exit(1);
  });
} else if (args.includes('--recent')) {
  const recentIdx = args.indexOf('--recent');
  const count = parseInt(args[recentIdx + 1], 10) || 5;
  console.log('======================================================');
  console.log(`      SCANNING LAST ${count} RECENT EMAILS FROM ZOHO     `);
  console.log('======================================================');
  imapService.checkRecent(count).then(() => {
    console.log('\n[Done] Recent email scan complete.');
    process.exit(0);
  }).catch(err => {
    console.error('Scan error:', err.message);
    process.exit(1);
  });
} else {
  console.log('======================================================');
  console.log('            ON-DEVICE EMAIL SURVEY AGENT              ');
  console.log('======================================================');
  console.log(`Ollama Engine:     ${process.env.OLLAMA_MODEL || 'llama3:latest'} (${process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'})`);
  console.log(`SQLite DB:         ${process.env.SQLITE_DB_PATH || './data/surveys_agent.db'}`);
  console.log(`CSV Export:        ${process.env.CSV_EXPORT_PATH || './exports/surveys_extracted.csv'}`);
  console.log(`MySQL Sync:        ${process.env.ENABLE_MYSQL_SYNC === 'true' ? 'Enabled' : 'Disabled'}`);
  console.log('------------------------------------------------------');

  imapService.startDaemon().catch(err => {
    console.error('[Daemon Error]', err.message);
  });

  process.on('SIGINT', () => {
    console.log('\n[Daemon] Stopping email survey agent...');
    imapService.stop();
    process.exit(0);
  });
}
