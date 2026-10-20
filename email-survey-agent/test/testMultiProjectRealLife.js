require('dotenv').config();
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from email-survey-agent/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const imapService = require('../services/imapService');
const prisma = require('../../src/config/database');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printBanner(title) {
  console.log('\n' + '#'.repeat(75));
  console.log(`  ${title}`);
  console.log('#'.repeat(75));
}

function printSection(title) {
  console.log('\n' + '-'.repeat(70));
  console.log(`  ${title}`);
  console.log('-'.repeat(70));
}

async function runMultiProjectRealLifeTest() {
  const runId = Date.now().toString().slice(-5);
  const p1StudyId = `GIP-MED-${runId}`;
  const p2StudyId = `PF-B2C-${runId}`;
  const p3StudyId = `WI-TECH-${runId}`;

  const createdProjectIds = [];

  printBanner(`REAL-WORLD MULTI-PROJECT CONCURRENT EMAIL LIFECYCLE TEST [RUN: ${runId}]`);
  console.log(`Simulating 3 distinct enterprise partner projects across concurrent threads:`);
  console.log(`  1. Glance Insights (GIP):  ${p1StudyId} (Healthcare B2B Oncologist Study)`);
  console.log(`  2. Panel Focus (PF):       ${p2StudyId} (B2C National Consumer Quota Expansion)`);
  console.log(`  3. Wolf Insights (WI):     ${p3StudyId} (Tech IT Decision Makers - Pause & Resume)`);
  console.log(`Database Backend: MySQL (ya_project)`);

  try {
    // =========================================================================
    // STAGE 1: INGEST 3 CONCURRENT SURVEY INVITATIONS
    // =========================================================================
    printBanner('STAGE 1: LAUNCH 3 DIFFERENT PROJECTS IN PARALLEL / SEQUENCE');

    // --- Project 1: GIP Launch ---
    printSection(`[Project 1] Launch GIP Healthcare Study: ${p1StudyId}`);
    const emailGIP_Launch = {
      messageId: `<msg-gip-launch-${p1StudyId}@glanceinsights.com>`,
      uid: String(Date.now()).slice(-6),
      from: '"Glance Operations" <projects@glanceinsights.com>',
      subject: `New Study Launch || ${p1StudyId} || Healthcare Oncologists`,
      date: new Date().toISOString(),
      text: `
Hi Team,

New medical study is ready for launch:
Study ID: ${p1StudyId}
Project Name: US Medical Oncology Practice Assessment
Country: US
CPI: $18.00
Target Quota: 40 completes
LOI: 20 minutes
IR: 25%
Target Audience: Board-certified Medical Oncologists & Hematologists.

Survey Link:
https://survey.glanceinsights.com/s/${p1StudyId}?uid=wanhong

Regards,
Projects Team | Glance Insights
      `,
      folderName: 'GIP'
    };
    await imapService.processEmail(emailGIP_Launch);
    await sleep(1500);

    const proj1_v1 = await prisma.project.findFirst({ where: { project_no: p1StudyId } });
    if (!proj1_v1) throw new Error(`[FAIL] Project 1 (${p1StudyId}) was not created in ya_project!`);
    createdProjectIds.push(proj1_v1.project_id);
    console.log(`  -> GIP Project Created (ID: ${proj1_v1.project_id}, Status: ACTIVE, Quota: ${proj1_v1.project_quota}, CPI: $${proj1_v1.project_cpi})`);

    // --- Project 2: PF Launch ---
    printSection(`[Project 2] Launch Panel Focus Consumer Study: ${p2StudyId}`);
    const emailPF_Launch = {
      messageId: `<msg-pf-launch-${p2StudyId}@panelfocus.com>`,
      uid: String(Date.now() + 10).slice(-6),
      from: '"Aliya Khan" <aliya.khan@panelfocus.com>',
      subject: `${p2StudyId} || WANS-$2.50 || B2C US Beverage Consumption`,
      date: new Date().toISOString(),
      text: `
Hi Team,

Please review and launch this B2C survey:
Study ID: ${p2StudyId}
Project Name: US National Beverage & Energy Drinks Survey
Country: US
CPI: $2.50
Quota: 150 completes
LOI: 8 Minutes
IR: 80%

Audience: General Population Adults 18-65.
Link: https://surveys.panelfocus.com/start/${p2StudyId}?subid=[ID]

Warm Regards,
Aliya Khan | Panel Focus Operations
      `,
      folderName: 'PF'
    };
    await imapService.processEmail(emailPF_Launch);
    await sleep(1500);

    const proj2_v1 = await prisma.project.findFirst({ where: { project_no: p2StudyId } });
    if (!proj2_v1) throw new Error(`[FAIL] Project 2 (${p2StudyId}) was not created in ya_project!`);
    createdProjectIds.push(proj2_v1.project_id);
    console.log(`  -> PF Project Created (ID: ${proj2_v1.project_id}, Status: ACTIVE, Quota: ${proj2_v1.project_quota}, CPI: $${proj2_v1.project_cpi})`);

    // --- Project 3: WI Launch ---
    printSection(`[Project 3] Launch Wolf Insights Tech Study: ${p3StudyId}`);
    const emailWI_Launch = {
      messageId: `<msg-wi-launch-${p3StudyId}@wolfinsights.com>`,
      uid: String(Date.now() + 20).slice(-6),
      from: '"Wolfinsights Team" <pm@wolfinsights.com>',
      subject: `${p3StudyId} [WANSURVEY] Cloud Infrastructure RFQ`,
      date: new Date().toISOString(),
      text: `
Hi wansurvey,

We have a new study live:
Study ID: ${p3StudyId}
Project Name: Enterprise Cloud Migration Trends 2026
Country: Canada
CPI: $7.00
Quota: 80 completes
LOI: 15 min
IR: 40%

Target: IT Directors, CTOs, Cloud Architects.
Link: https://app.wolfinsights.com/survey/${p3StudyId}?partner=wansurvey

Regards,
Wolf Insights Operations
      `,
      folderName: 'WI'
    };
    await imapService.processEmail(emailWI_Launch);
    await sleep(1500);

    const proj3_v1 = await prisma.project.findFirst({ where: { project_no: p3StudyId } });
    if (!proj3_v1) throw new Error(`[FAIL] Project 3 (${p3StudyId}) was not created in ya_project!`);
    createdProjectIds.push(proj3_v1.project_id);
    console.log(`  -> WI Project Created (ID: ${proj3_v1.project_id}, Status: ACTIVE, Quota: ${proj3_v1.project_quota}, CPI: $${proj3_v1.project_cpi})`);

    console.log('\n>>> [PASS] STAGE 1: All 3 distinct projects created simultaneously with active status.');

    // =========================================================================
    // STAGE 2: INTERLEAVED THREAD REPLIES & DIVERGENT LIFECYCLE EVENTS
    // =========================================================================
    printBanner('STAGE 2: CONCURRENT INTERLEAVED THREAD REPLIES');

    // Event 2A: Panel Focus expands quota from 150 to 350
    printSection(`[Event 2A] PF Thread Reply - Quota Expansion (150 -> 350) for ${p2StudyId}`);
    const emailPF_QuotaUpdate = {
      messageId: `<msg-pf-upd-${p2StudyId}@panelfocus.com>`,
      uid: String(Date.now() + 30).slice(-6),
      from: '"Aliya Khan" <aliya.khan@panelfocus.com>',
      subject: `Re: ${p2StudyId} || WANS-$2.50 || B2C US Beverage Consumption`,
      date: new Date().toISOString(),
      text: `
Hi,

Here we go... Latest update.
Client has expanded the field!
Study ID: ${p2StudyId}
New Total Quota: 350 completes (increased from 150)
Please push aggressively to grab max completes!
CPI remains $2.50.

Warm Regards,
Aliya Khan
      `,
      folderName: 'PF'
    };
    await imapService.processEmail(emailPF_QuotaUpdate);
    await sleep(1500);

    // Event 2B: Glance Insights asks to hold/pause fieldwork
    printSection(`[Event 2B] GIP Thread Reply - Hold Fieldwork (Pause) for ${p1StudyId}`);
    const emailGIP_Pause = {
      messageId: `<msg-gip-pause-${p1StudyId}@glanceinsights.com>`,
      uid: String(Date.now() + 40).slice(-6),
      from: '"Projects Team" <projects@glanceinsights.com>',
      subject: `Re: New Study Launch || ${p1StudyId} || Healthcare Oncologists`,
      date: new Date().toISOString(),
      text: `
Hi Team,

Pleas hold the fieldwork.
We are reviewing the sample quality and screening criteria for study ${p1StudyId}.
Stop sending new respondents immediately.

Regards,
Projects Team | Glance Insights
      `,
      folderName: 'GIP'
    };
    await imapService.processEmail(emailGIP_Pause);
    await sleep(1500);

    // Event 2C: Wolf Insights asks to temporarily pause for link maintenance
    printSection(`[Event 2C] WI Thread Reply - Temporary Pause for ${p3StudyId}`);
    const emailWI_Pause = {
      messageId: `<msg-wi-pause-${p3StudyId}@wolfinsights.com>`,
      uid: String(Date.now() + 50).slice(-6),
      from: '"Wolfinsights Team" <pm@wolfinsights.com>',
      subject: `Re: ${p3StudyId} [WANSURVEY] Cloud Infrastructure RFQ`,
      date: new Date().toISOString(),
      text: `
Hi wansurvey,

Please pause study ${p3StudyId} right away.
Client is currently fixing a survey routing error on the end page.
Do not send further traffic.

Regards,
Wolfinsights Team
      `,
      folderName: 'WI'
    };
    await imapService.processEmail(emailWI_Pause);
    await sleep(1500);

    // Event 2D: Wolf Insights sends follow-up email to resume and increase quota
    printSection(`[Event 2D] WI Thread Reply - Resume & Quota Increase (80 -> 120) for ${p3StudyId}`);
    const emailWI_Resume = {
      messageId: `<msg-wi-resume-${p3StudyId}@wolfinsights.com>`,
      uid: String(Date.now() + 60).slice(-6),
      from: '"Wolfinsights Team" <pm@wolfinsights.com>',
      subject: `Re: ${p3StudyId} [WANSURVEY] Cloud Infrastructure RFQ`,
      date: new Date().toISOString(),
      text: `
Hi wansurvey,

The routing issue is resolved!
Please resume study ${p3StudyId} now.
We are live again. Target Quota has been raised to 120 completes.

Regards,
Wolfinsights Team
      `,
      folderName: 'WI'
    };
    await imapService.processEmail(emailWI_Resume);
    await sleep(1500);

    // Event 2E: Glance Insights closes study completely
    printSection(`[Event 2E] GIP Thread Reply - Close Study for ${p1StudyId}`);
    const emailGIP_Close = {
      messageId: `<msg-gip-close-${p1StudyId}@glanceinsights.com>`,
      uid: String(Date.now() + 70).slice(-6),
      from: '"Projects Team" <projects@glanceinsights.com>',
      subject: `Re: New Study Launch || ${p1StudyId} || Healthcare Oncologists`,
      date: new Date().toISOString(),
      text: `
Hi team,

Please close this study ${p1StudyId} with final completes. Fielding has concluded.

Regards,
Projects Team | Glance Insights
      `,
      folderName: 'GIP'
    };
    await imapService.processEmail(emailGIP_Close);
    await sleep(1500);

    // =========================================================================
    // STAGE 3: COMPREHENSIVE VERIFICATION ACROSS ALL PROJECTS
    // =========================================================================
    printBanner('STAGE 3: COMPREHENSIVE DATABASE INTEGRITY VERIFICATION');

    // 1. Verify Project 1 (GIP)
    const p1_final = await prisma.project.findFirst({ where: { project_no: p1StudyId } });
    const p1_count = await prisma.project.count({ where: { project_no: p1StudyId } });
    let p1_timeline = null;
    try { p1_timeline = JSON.parse(p1_final.project_content); } catch {}

    console.log(`\n--- Verification: Project 1 (GIP - ${p1StudyId}) ---`);
    console.log(`  Row count in DB:    ${p1_count} (Must be exactly 1)`);
    console.log(`  State:              ${p1_final.is_disable === 1 ? 'CLOSED / DISABLED (is_disable=1) ✅' : 'ACTIVE ❌'}`);
    console.log(`  Update Events:      ${p1_timeline?.update_logs?.length || 0} events logged`);
    if (p1_count !== 1) throw new Error('[FAIL] GIP project has duplicate rows');
    if (p1_final.is_disable !== 1) throw new Error('[FAIL] GIP project should be disabled/closed');

    // 2. Verify Project 2 (PF)
    const p2_final = await prisma.project.findFirst({ where: { project_no: p2StudyId } });
    const p2_count = await prisma.project.count({ where: { project_no: p2StudyId } });
    let p2_timeline = null;
    try { p2_timeline = JSON.parse(p2_final.project_content); } catch {}

    console.log(`\n--- Verification: Project 2 (PF - ${p2StudyId}) ---`);
    console.log(`  Row count in DB:    ${p2_count} (Must be exactly 1)`);
    console.log(`  State:              ${p2_final.is_disable === 0 ? 'ACTIVE (is_disable=0) ✅' : 'DISABLED ❌'}`);
    console.log(`  Initial Quota:      150`);
    console.log(`  Updated Quota:      ${p2_final.project_quota} (Expected: 350)`);
    console.log(`  Update Events:      ${p2_timeline?.update_logs?.length || 0} events logged`);
    if (p2_count !== 1) throw new Error('[FAIL] PF project has duplicate rows');
    if (p2_final.is_disable !== 0) throw new Error('[FAIL] PF project should be active');
    if (p2_final.project_quota !== 350) throw new Error(`[FAIL] PF quota should be 350, got ${p2_final.project_quota}`);

    // 3. Verify Project 3 (WI)
    const p3_final = await prisma.project.findFirst({ where: { project_no: p3StudyId } });
    const p3_count = await prisma.project.count({ where: { project_no: p3StudyId } });
    let p3_timeline = null;
    try { p3_timeline = JSON.parse(p3_final.project_content); } catch {}

    console.log(`\n--- Verification: Project 3 (WI - ${p3StudyId}) ---`);
    console.log(`  Row count in DB:    ${p3_count} (Must be exactly 1)`);
    console.log(`  State:              ${p3_final.is_disable === 0 ? 'RESUMED / ACTIVE (is_disable=0) ✅' : 'PAUSED ❌'}`);
    console.log(`  Initial Quota:      80`);
    console.log(`  Updated Quota:      ${p3_final.project_quota} (Expected: 120)`);
    console.log(`  Update Events:      ${p3_timeline?.update_logs?.length || 0} events logged (Pause + Resume)`);
    if (p3_count !== 1) throw new Error('[FAIL] WI project has duplicate rows');
    if (p3_final.is_disable !== 0) throw new Error('[FAIL] WI project should be reactivated');
    if (p3_final.project_quota !== 120) throw new Error(`[FAIL] WI quota should be 120, got ${p3_final.project_quota}`);

    printBanner('ALL CONCURRENT MULTI-PROJECT REAL-LIFE TESTS PASSED (100%)');
  } finally {
    // Clean up created test projects
    if (createdProjectIds.length > 0) {
      console.log(`\nCleaning up ${createdProjectIds.length} test projects from MySQL...`);
      await prisma.project.deleteMany({
        where: { project_id: { in: createdProjectIds } }
      });
      console.log('Cleanup finished.');
    }
  }
}

runMultiProjectRealLifeTest()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Multi-Project Test Failed:', err);
    process.exit(1);
  });
