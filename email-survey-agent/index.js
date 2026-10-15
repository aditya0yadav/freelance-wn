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
