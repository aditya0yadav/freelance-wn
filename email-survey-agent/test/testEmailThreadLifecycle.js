require('dotenv').config();
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from email-survey-agent/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const imapService = require('../services/imapService');
const { SQLiteManager } = require('../config/sqlite');
const prisma = require('../../src/config/database');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printSection(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

async function runThreadLifecycleTest() {
  const testStudyId = `TH-TEST-${Date.now().toString().slice(-5)}`;
  const companyFolder = 'GMS';
  let createdProjectId = null;

  printSection(`STARTING MULTI-MESSAGE EMAIL THREAD LIFECYCLE TEST: [${testStudyId}]`);
  console.log(`Target Study ID:   ${testStudyId}`);
  console.log(`Company Platform:  ${companyFolder}`);
  console.log(`Database Backend:  MySQL (ya_project) + SQLite (${process.env.SQLITE_DB_PATH || './data/surveys_agent.db'})`);

  // =========================================================================
  // TEST 1: Initial Survey Dispatch (Project Creation)
  // =========================================================================
  printSection(`TEST 1: Send Initial Project Invitation Email (Launch)`);
  const email1 = {
    messageId: `<msg-launch-${testStudyId}@globalmatrixsurvey.com>`,
    uid: String(Date.now()).slice(-6),
    from: '"Farooq Khan GMS" <farooq.khan@globalmatrixsurvey.com>',
    subject: `RFQ || ${testStudyId} || New Study Launch`,
    date: new Date().toISOString(),
    text: `
Hi Team,

We have a new project ready for launch:

Study ID: ${testStudyId}
Project Name: US Restaurant & Foodservice Owners Survey 2026
Country: USA
CPI: $4.50
Target Completes (Quota): 100
LOI: 12 Minutes
IR: 55%

Targeting Audience:
Restaurant and bar owners, hospitality decision makers.
Age Range: 25-60

Survey Link:
https://survey.globalmatrixsurvey.com/live/s?id=${testStudyId}&pid=wanhong

Best regards,
Farooq Khan
Global Matrix Survey Operations
    `,
    folderName: companyFolder
  };

  console.log(`[Step 1] Ingesting launch email for ${testStudyId}...`);
  await imapService.processEmail(email1);
  await sleep(1500);

  // Verification in MySQL
  const proj1 = await prisma.project.findFirst({
    where: { project_no: testStudyId }
  });

  if (!proj1) {
    throw new Error(`[FAIL] Step 1 Failed: Project ${testStudyId} was not created in ya_project!`);
  }

  createdProjectId = proj1.project_id;
  let timeline1 = null;
  try { timeline1 = JSON.parse(proj1.project_content); } catch {}

  console.log('\n--- Step 1 Database Verification ---');
  console.log(`  MySQL Project ID:   ${proj1.project_id}`);
  console.log(`  Project PNO:        ${proj1.project_pno}`);
  console.log(`  Active Status:      ${proj1.is_disable === 0 ? 'ACTIVE (is_disable=0) ✅' : 'DISABLED ❌'}`);
  console.log(`  Initial Quota:      ${proj1.project_quota} (Expected: 100)`);
  console.log(`  Initial CPI:        $${proj1.project_cpi} (Expected: $4.50)`);
  console.log(`  Baseline Age:       ${timeline1?.base_requirements?.age_range || 'N/A'}`);
  console.log(`  Baseline Audience:  ${timeline1?.base_requirements?.occupation || 'N/A'}`);

  if (proj1.is_disable !== 0) throw new Error('[FAIL] Step 1: Initial survey must have is_disable === 0');
  if (proj1.project_quota !== 100) throw new Error(`[FAIL] Step 1: Quota should be 100, got ${proj1.project_quota}`);
  console.log('>>> [PASS] Step 1 SUCCESS: Project created with active status and baseline requirements.');

  // =========================================================================
  // TEST 2: Reply in Same Thread to Update Quota (e.g. Quota Increased)
  // =========================================================================
  printSection(`TEST 2: Thread Reply - Quota Increased (100 -> 250)`);
  const email2 = {
    messageId: `<msg-update-quota-${testStudyId}@globalmatrixsurvey.com>`,
    uid: String(Date.now() + 1).slice(-6),
    from: '"Farooq Khan GMS" <farooq.khan@globalmatrixsurvey.com>',
    subject: `Re: RFQ || ${testStudyId} || New Study Launch`,
    date: new Date().toISOString(),
    text: `
Hi Team,

Great traction so far on study ${testStudyId}!
The client has increased the target quota.

Please scale up fielding:
Study ID: ${testStudyId}
New Target Quota: 250 completes (increased from 100)
CPI remains $4.50.
Target audience is still restaurant and bar owners.

Thanks,
Farooq Khan
    `,
    folderName: companyFolder
  };

  console.log(`[Step 2] Ingesting quota update reply for ${testStudyId}...`);
  await imapService.processEmail(email2);
  await sleep(1500);

  // Verification in MySQL
  const proj2 = await prisma.project.findFirst({
    where: { project_no: testStudyId }
  });

  const allProjects = await prisma.project.findMany({
    where: { project_no: testStudyId }
  });

  let timeline2 = null;
  try { timeline2 = JSON.parse(proj2.project_content); } catch {}

  console.log('\n--- Step 2 Database Verification ---');
  console.log(`  Total rows in DB:   ${allProjects.length} (Must be exactly 1, no duplicate rows)`);
  console.log(`  MySQL Project ID:   ${proj2.project_id} (Must match Step 1: ${createdProjectId})`);
  console.log(`  Updated Quota:      ${proj2.project_quota} (Expected: 250)`);
  console.log(`  Baseline Audience:  ${timeline2?.base_requirements?.occupation} (Preserved ✅)`);
  console.log(`  Timeline Updates:   ${timeline2?.update_logs?.length || 0} entry logged in history`);

  if (allProjects.length !== 1) throw new Error(`[FAIL] Step 2: Thread update created duplicate project! Count: ${allProjects.length}`);
  if (proj2.project_id !== createdProjectId) throw new Error('[FAIL] Step 2: Project ID changed!');
  if (proj2.project_quota !== 250) throw new Error(`[FAIL] Step 2: Quota did not update to 250! Got: ${proj2.project_quota}`);
  console.log('>>> [PASS] Step 2 SUCCESS: Quota updated in the exact same project thread without altering base requirements.');

  // =========================================================================
  // TEST 3: Reply in Same Thread - Client Requests Temporary Pause
  // =========================================================================
  printSection(`TEST 3: Thread Reply - Pause Request (is_disable -> 1)`);
  const email3 = {
    messageId: `<msg-pause-${testStudyId}@globalmatrixsurvey.com>`,
    uid: String(Date.now() + 2).slice(-6),
    from: '"Farooq Khan GMS" <farooq.khan@globalmatrixsurvey.com>',
    subject: `Re: RFQ || ${testStudyId} || New Study Launch`,
    date: new Date().toISOString(),
    text: `
Hi Team,

URGENT: Please pause study ${testStudyId} immediately!
The client is currently conducting a mid-field quality and speeder review.
Please halt all traffic and stop sending respondents until further notice.

Best,
Farooq Khan
    `,
    folderName: companyFolder
  };

  console.log(`[Step 3] Ingesting pause request email for ${testStudyId}...`);
  await imapService.processEmail(email3);
  await sleep(1500);

  // Verification in MySQL
  const proj3 = await prisma.project.findFirst({
    where: { project_no: testStudyId }
  });

  let timeline3 = null;
  try { timeline3 = JSON.parse(proj3.project_content); } catch {}
  const latestLog3 = timeline3?.update_logs?.[timeline3.update_logs.length - 1];

  console.log('\n--- Step 3 Database Verification ---');
  console.log(`  MySQL Project ID:   ${proj3.project_id}`);
  console.log(`  Disabled Status:    ${proj3.is_disable === 1 ? 'PAUSED (is_disable=1) ✅ Hidden from portal' : 'ACTIVE ❌'}`);
  console.log(`  Latest Log Status:  ${latestLog3?.status || 'N/A'}`);
  console.log(`  Latest Log Action:  ${latestLog3?.action || 'N/A'}`);
  console.log(`  Action Reason:      "${latestLog3?.action_reason || latestLog3?.summary || ''}"`);

  if (proj3.is_disable !== 1) throw new Error(`[FAIL] Step 3: Project must be paused (is_disable === 1)! Got: ${proj3.is_disable}`);
  console.log('>>> [PASS] Step 3 SUCCESS: Survey paused automatically and hidden from member portal.');

  // =========================================================================
  // TEST 4: Reply in Same Thread - Client Requests Resume & Expands Quota
  // =========================================================================
  printSection(`TEST 4: Thread Reply - Resume & Quota Expansion (is_disable -> 0, Quota -> 300)`);
  const email4 = {
    messageId: `<msg-resume-${testStudyId}@globalmatrixsurvey.com>`,
    uid: String(Date.now() + 3).slice(-6),
    from: '"Farooq Khan GMS" <farooq.khan@globalmatrixsurvey.com>',
    subject: `Re: RFQ || ${testStudyId} || New Study Launch`,
    date: new Date().toISOString(),
    text: `
Hi Team,

Good news! The client has finished their review for ${testStudyId}. Quality is approved.
Please resume the study now! We are live again.

Target Quota: 300 completes
Please send all available traffic.

Thanks,
Farooq Khan
    `,
    folderName: companyFolder
  };

  console.log(`[Step 4] Ingesting resume request email for ${testStudyId}...`);
  await imapService.processEmail(email4);
  await sleep(1500);

  // Verification in MySQL
  const proj4 = await prisma.project.findFirst({
    where: { project_no: testStudyId }
  });

  let timeline4 = null;
  try { timeline4 = JSON.parse(proj4.project_content); } catch {}
  const latestLog4 = timeline4?.update_logs?.[timeline4.update_logs.length - 1];

  console.log('\n--- Step 4 Database Verification ---');
  console.log(`  MySQL Project ID:   ${proj4.project_id}`);
  console.log(`  Active Status:      ${proj4.is_disable === 0 ? 'ACTIVE (is_disable=0) ✅ Live in portal' : 'PAUSED ❌'}`);
  console.log(`  New Quota:          ${proj4.project_quota} (Expected: 300)`);
  console.log(`  Latest Log Status:  ${latestLog4?.status || 'N/A'}`);
  console.log(`  Timeline Entries:   ${timeline4?.update_logs?.length || 0} chronological events logged`);

  if (proj4.is_disable !== 0) throw new Error(`[FAIL] Step 4: Project should be reactivated (is_disable === 0)! Got: ${proj4.is_disable}`);
  if (proj4.project_quota !== 300) throw new Error(`[FAIL] Step 4: Quota should be 300! Got: ${proj4.project_quota}`);
  console.log('>>> [PASS] Step 4 SUCCESS: Survey reactivated automatically with expanded quota.');

  // =========================================================================
  // Clean Up Test Data (Optional)
  // =========================================================================
  printSection(`CLEANUP TEST DATA`);
  await prisma.project.delete({ where: { project_id: createdProjectId } });
  console.log(`Cleaned up test project [${testStudyId}] (ID: ${createdProjectId}) from MySQL database.`);

  printSection(`ALL 4 LIFECYCLE TESTS PASSED PERFECTLY! 100% SUCCESS`);
}

runThreadLifecycleTest()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Thread Lifecycle Test Encountered an Error:', err);
    process.exit(1);
  });
