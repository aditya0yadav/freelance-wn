require('dotenv').config();
const imapService = require('../services/imapService');
const { SQLiteManager } = require('../config/sqlite');
const fs = require('fs');
const path = require('path');

async function runMockTest() {
  console.log('================================================================');
  console.log('       ON-DEVICE EMAIL SURVEY AGENT - SIMULATION TEST           ');
  console.log('================================================================');
  console.log(`Using Ollama Model: ${process.env.OLLAMA_MODEL || 'llama3:latest'}`);
  console.log(`SQLite DB Path: ${process.env.SQLITE_DB_PATH || './data/surveys_agent.db'}`);
  console.log(`CSV Export Path: ${process.env.CSV_EXPORT_PATH || './exports/surveys_extracted.csv'}`);
  console.log('----------------------------------------------------------------\n');

  // Test Case 1: Realistic Market Research Survey Dispatch Email
  const mockSurveyEmail = {
    messageId: `<dispatch-study-${Date.now()}@cint-sample.com>`,
    uid: '1001',
    from: 'Cint Project Management <notifications@cint-sample.com>',
    subject: 'URGENT: Live Feasibility Dispatch - Study #84920 [US - Tech Decision Makers]',
    date: new Date().toISOString(),
    text: `
Hello Team,

We have a new study ready for live fielding on your panel:

Study ID: CINT-84920
Study Name: US Enterprise Cloud & Security Tech Survey 2026
Buyer: Cint Insights Group
Country: US (United States)
Target Audience: IT Decision Makers and Security Engineers
Length of Interview (LOI): 18 minutes
Incidence Rate (IR): 45%
Target Completes (Quota): 250 completes
Incentive / CPI: $3.25 USD per successful completion

Survey Entry Link:
https://surveys.cint.com/live/entry?pid=84920&buyer=cint_cloud&token=live_token_77

Requirements:
- Participants must be employed full-time in companies with 50+ employees.
- Please avoid speeders and ensure unique IP addresses.

Best regards,
Cint Project Management Operations
    `,
    html: null
  };

  // Test Case 2: Non-Survey Email (to verify AI classification and duplicate filtering)
  const mockNonSurveyEmail = {
    messageId: `<invoice-receipt-${Date.now()}@stripe.com>`,
    uid: '1002',
    from: 'Stripe Billing <receipts@stripe.com>',
    subject: 'Your monthly cloud hosting invoice #INV-99381',
    date: new Date().toISOString(),
    text: `
Hi there,

Thank you for your business. Your payment of $49.00 USD for Cloud VPS Hosting has been processed successfully.

Invoice Number: INV-99381
Date: October 14, 2026
Amount: $49.00 USD

You can view your full invoice receipt in your billing dashboard.

Thanks,
Stripe Billing Team
    `,
    html: null
  };

  console.log('>>> [TEST 1/2] Processing Survey Email Dispatch...');
  await imapService.processEmail(mockSurveyEmail);

  console.log('\n>>> [TEST 2/2] Processing Non-Survey Email (Should be filtered out)...');
  await imapService.processEmail(mockNonSurveyEmail);

  console.log('\n================================================================');
  console.log('                       TEST SUMMARY RESULTS                     ');
  console.log('================================================================');

  const stats = SQLiteManager.getStats();
  console.log(`Total Emails Logged in SQLite:  ${stats.totalEmails}`);
  console.log(`Identified Survey Emails:       ${stats.surveyEmails}`);
  console.log(`Total Surveys Extracted:        ${stats.totalSurveys}`);
  console.log(`Surveys Synced to MySQL:        ${stats.syncedSurveys}`);

  if (stats.recent && stats.recent.length > 0) {
    const latest = stats.recent[0];
    console.log('\nLatest Extracted Survey in SQLite:');
    console.log(`  - Project No:   ${latest.project_no}`);
    console.log(`  - Survey Title: ${latest.project_name}`);
    console.log(`  - Platform:     ${latest.platform_name}`);
    console.log(`  - CPI / Payout: $${latest.project_cpi} ${latest.currency}`);
    console.log(`  - Quota / LOI:  ${latest.project_quota} completes / ${latest.project_loi} mins`);
    console.log(`  - Entry URL:    ${latest.project_click_url}`);
    console.log(`  - Synced MySQL: ${latest.synced_to_mysql ? 'YES' : 'NO'}`);
  }

  const csvPath = path.resolve(__dirname, '..', process.env.CSV_EXPORT_PATH || './exports/surveys_extracted.csv');
  if (fs.existsSync(csvPath)) {
    console.log(`\nLocal CSV generated successfully at:`);
    console.log(`  ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');
    console.log(`  (Contains ${lines.length} lines, including header)`);
  }

  console.log('\nAll checks completed!');
}

runMockTest().catch(err => {
  console.error('Mock test failed:', err);
  process.exit(1);
});
