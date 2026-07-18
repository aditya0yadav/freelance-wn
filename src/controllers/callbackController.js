const prisma = require('../config/database');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class CallbackController {
  /**
   * Helper to write logs
   */
  static logToFile(filename, content) {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(path.join(logDir, filename), content + '\n');
    } catch (e) {
      console.error('Failed to log to file:', e.message);
    }
  }

  /**
   * GET/POST /api/callback
   */
  static async callback(req, res) {
    try {
      const platformSign = req.query.platform || req.body.platform || '';
      const uid = req.query.uid || req.body.uid || '';
      const status = req.query.status || req.body.status || '';

      if (!platformSign || !uid) {
        return res.status(400).send(CallbackController.renderErrorPage('Missing callback parameters'));
      }

      const platform = await prisma.platform.findUnique({
        where: { platform_sign: platformSign }
      });
      const flowing = await prisma.flowing.findUnique({
        where: { uuid: uid }
      });

      if (!platform || !flowing) {
        return res.status(404).send(CallbackController.renderErrorPage('Platform sign or flowing session not found.'));
      }

      const txnId = crypto.createHash('md5').update(uid).digest('hex');

      // Map status
      let cstatus = 5; // Other
      const cleanStatus = String(status).toUpperCase();
      if (['C', '1'].includes(cleanStatus)) cstatus = 1; // Success
      else if (['S', '2'].includes(cleanStatus)) cstatus = 2; // Disqualified
      else if (['Q', '3'].includes(cleanStatus)) cstatus = 3; // Overquota
      else if (['T', '4'].includes(cleanStatus)) cstatus = 4; // Terminated
      else if (['R', '6', 'RECONCILE', 'RECONCILIATION', 'REVERSED', 'CHARGEBACK'].includes(cleanStatus)) cstatus = 6;

      // Check if duplicate transaction
      const existingReward = await prisma.reward.findUnique({
        where: { txn_id: txnId }
      });

      if (existingReward) {
        // If status changed (e.g. a chargeback or reconciliation event), update status in DB
        if (cstatus !== existingReward.reward_status) {
          await prisma.reward.update({
            where: { txn_id: txnId },
            data: { reward_status: cstatus }
          });

          // Decrement project complete count if moving away from Success status
          if (existingReward.reward_status === 1 && cstatus !== 1 && existingReward.project_pno) {
            try {
              const project = await prisma.project.findFirst({
                where: { project_pno: existingReward.project_pno }
              });
              if (project) {
                await prisma.project.update({
                  where: { project_id: project.project_id },
                  data: { project_complete: { decrement: 1 } }
                });
              }
            } catch (e) {}
          }

          return res.send(CallbackController.renderSuccessPage({
            uuid: uid,
            statusText: CallbackController.getStatusText(cstatus),
            payout: existingReward.member_payout,
            isDuplicate: false,
            saved: true
          }));
        }

        return res.send(CallbackController.renderSuccessPage({
          uuid: uid,
          statusText: CallbackController.getStatusText(existingReward.reward_status),
          payout: existingReward.member_payout,
          isDuplicate: true
        }));
      }

      const member = await prisma.member.findUnique({ where: { member_id: flowing.member_id } });
      const team = member ? await prisma.team.findUnique({ where: { team_id: member.team_id } }) : null;
      const platformAuth = member ? await prisma.platformAuth.findFirst({
        where: { platform_id: platform.platform_id, team_id: member.team_id }
      }) : null;

      if (!member || !team || !platformAuth) {
        return res.status(400).send(CallbackController.renderErrorPage('Invalid member / team configuration for flowing session.'));
      }

      // Calculate speeder check
      let isMark = 0;
      if (platform.limit_endtime > 0 && flowing.create_time) {
        const deltaSeconds = (Date.now() - new Date(flowing.create_time).getTime()) / 1000;
        if (deltaSeconds < platform.limit_endtime * 60) {
          isMark = 1;
        }
      }

      let project = null;
      if (flowing.project_id) {
        project = await prisma.project.findUnique({
          where: { project_id: flowing.project_id },
          include: { currency: true }
        });
      }

      // Calculate payout rate details
      const usdCurrency = await prisma.currency.findFirst({ where: { currency_code: 'USD' } });
      const coinsExchange = project?.currency?.currency_coins ?? (usdCurrency?.currency_coins || 100.00);

      const cpi = project ? project.project_cpi : 0;
      const payout = cpi * coinsExchange;
      const teamPayout = payout * ((100 - team.commission_ratio) / 100) * ((100 - platformAuth.auth_rate) / 100);
      const memberPayout = payout * ((100 - member.rate) / 100);

      let recordSaved = false;

      // Increment project completed counter if Success
      if (cstatus === 1 && project) {
        await prisma.project.update({
          where: { project_id: project.project_id },
          data: { project_complete: { increment: 1 } }
        });
      }

      // Save to rewards database if success, or if platform permits error logging
      if (cstatus === 1 || platform.is_accept_error === 1) {
        await prisma.reward.create({
          data: {
            txn_id: txnId,
            member_id: member.member_id,
            team_id: team.team_id,
            platform_id: platform.platform_id,
            project_pno: project ? project.project_pno : null,
            project_no: project ? project.project_no : null,
            project_name: project ? project.project_name : 'Offerwall Survey',
            payout: Number(payout.toFixed(4)),
            team_payout: Number(teamPayout.toFixed(4)),
            member_payout: Number(memberPayout.toFixed(4)),
            usd_currency_coins: usdCurrency?.currency_coins || 100.00,
            uuid: uid,
            front_rs: flowing.rs_content,
            address: flowing.country,
            ip: flowing.ip,
            ua: flowing.ua,
            reward_status: cstatus,
            is_mark: isMark,
            create_uid: member.member_id,
            start_time: flowing.create_time,
            create_time: new Date()
          }
        });
        recordSaved = true;
      }

      return res.send(CallbackController.renderSuccessPage({
        uuid: uid,
        statusText: CallbackController.getStatusText(cstatus),
        payout: Number(memberPayout.toFixed(2)),
        isDuplicate: false,
        saved: recordSaved
      }));
    } catch (err) {
      console.error('Webhook callback processing error:', err);
      return res.status(500).send(CallbackController.renderErrorPage(`Internal Server Error: ${err.message}`));
    }
  }

  /**
   * GET/POST /api/callback/bitlabs
   */
  static async bitlabs(req, res) {
    try {
      const getParams = { ...req.query, ...req.body };
      CallbackController.logToFile('bitlabs_callback.txt', `${new Date().toISOString()} - Parameters: ${JSON.stringify(getParams)}`);

      const uuid = getParams.uid || '';
      const status = getParams.status || '';
      const offerId = getParams.offer_id ? String(getParams.offer_id).toUpperCase() : '';
      const offerName = getParams.offer_name ? String(getParams.offer_name).toUpperCase() : '';
      let cpiVal = Number(getParams.cpi) || 0;

      if (!uuid) {
        return res.status(400).send('1'); // Standard rejection
      }

      const txnId = crypto.createHash('md5').update(uuid).digest('hex');

      // Check if duplicate transaction
      const existing = await prisma.reward.findUnique({
        where: { txn_id: txnId }
      });

      if (existing) {
        if (status === 'RECONCILIATION') {
          await prisma.reward.update({
            where: { reward_id: existing.reward_id },
            data: { reward_status: 1 }
          });
        } else if (status === 'SCREENOUT') {
          await prisma.reward.update({
            where: { reward_id: existing.reward_id },
            data: { reward_status: 2 }
          });
        }
        return res.send('1');
      }

      const platform = await prisma.platform.findUnique({
        where: { platform_sign: 'Bitlabs' }
      });
      const flowing = await prisma.flowing.findUnique({
        where: { uuid: uuid }
      });

      if (!platform || !flowing) {
        return res.status(404).send('Platform or flowing session not found');
      }

      const member = await prisma.member.findUnique({ where: { member_id: flowing.member_id } });
      const team = member ? await prisma.team.findUnique({ where: { team_id: member.team_id } }) : null;
      const platformAuth = member ? await prisma.platformAuth.findFirst({
        where: { platform_id: platform.platform_id, team_id: member.team_id }
      }) : null;

      if (!member || !team || !platformAuth) {
        return res.status(400).send('Authorization or Member components missing.');
      }

      if (status === 'COMPLETE') {
        const usdCurrency = await prisma.currency.findFirst({ where: { currency_code: 'USD' } });
        const coinsExchange = usdCurrency?.currency_coins || 100.00;

        const payout = cpiVal * coinsExchange;
        const teamPayout = payout * ((100 - team.commission_ratio) / 100) * ((100 - platformAuth.auth_rate) / 100);
        const memberPayout = payout * ((100 - member.rate) / 100);

        await prisma.reward.create({
          data: {
            txn_id: txnId,
            member_id: member.member_id,
            team_id: team.team_id,
            platform_id: platform.platform_id,
            project_pno: '',
            project_no: offerId,
            project_name: offerName || 'Bitlabs Offer',
            payout: Number(payout.toFixed(4)),
            team_payout: Number(teamPayout.toFixed(4)),
            member_payout: Number(memberPayout.toFixed(4)),
            usd_currency_coins: coinsExchange,
            uuid: uuid,
            front_rs: flowing.rs_content,
            address: flowing.country,
            ip: flowing.ip,
            ua: flowing.ua,
            reward_status: 1,
            create_uid: member.member_id,
            start_time: flowing.create_time,
            create_time: new Date()
          }
        });
      }

      return res.send('1');
    } catch (err) {
      console.error('Bitlabs callback error:', err);
      return res.status(500).send('0');
    }
  }

  /**
   * Helper status text mappings
   */
  static getStatusText(status) {
    switch (status) {
      case 1: return 'Success (Completed)';
      case 2: return 'Disqualified (Screenout)';
      case 3: return 'Overquota (Quota Full)';
      case 4: return 'Terminated (Disallowed)';
      case 6: return 'Reconciliation (Reversed)';
      default: return 'Outcome Pending Audit';
    }
  }

  /**
   * Premium glassmorphic outcome rendering
   */
  static renderSuccessPage({ uuid, statusText, payout, isDuplicate, saved = true }) {
    const isSuccess = statusText.includes('Success');
    const accentColor = isSuccess ? '#0eff4e' : '#f87171';
    const softAccent = isSuccess ? 'rgba(14, 255, 78, 0.15)' : 'rgba(248, 113, 113, 0.15)';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SurveyStream Outcome Logged</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0b0e;
      --card-bg: rgba(255, 255, 255, 0.03);
      --card-border: rgba(255, 255, 255, 0.07);
      --accent: ${accentColor};
      --text: #ffffff;
      --text-muted: #8b8b9f;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Outfit', sans-serif;
    }
    body {
      background: var(--bg);
      color: var(--text);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      overflow: hidden;
      position: relative;
    }
    /* Animated glow backgrounds */
    body::before {
      content: '';
      position: absolute;
      width: 300px;
      height: 300px;
      background: var(--accent);
      filter: blur(140px);
      opacity: 0.15;
      top: 15%;
      left: 20%;
      border-radius: 50%;
      pointer-events: none;
    }
    body::after {
      content: '';
      position: absolute;
      width: 250px;
      height: 250px;
      background: #3b82f6;
      filter: blur(130px);
      opacity: 0.12;
      bottom: 20%;
      right: 25%;
      border-radius: 50%;
      pointer-events: none;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 40px;
      width: 100%;
      max-width: 460px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      z-index: 10;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: ${softAccent};
      border: 2px solid var(--accent);
      margin-bottom: 24px;
    }
    .status-badge svg {
      width: 36px;
      height: 36px;
      fill: none;
      stroke: var(--accent);
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .subtitle {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 32px;
    }
    .details {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.03);
      border-radius: 16px;
      padding: 20px;
      text-align: left;
      margin-bottom: 24px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    .detail-row:not(:last-child) {
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .label {
      color: var(--text-muted);
    }
    .value {
      font-weight: 600;
    }
    .payout-value {
      color: var(--accent);
      font-weight: 700;
    }
    .footer-note {
      font-size: 11px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="status-badge">
      ${isSuccess ? 
        `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>` : 
        `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
      }
    </div>
    <h1>Outcome Processed</h1>
    <div class="subtitle">Your conversion survey transaction details</div>
    <div class="details">
      <div class="detail-row">
        <span class="label">Session ID</span>
        <span class="value">${uuid.substring(0, 8)}...${uuid.substring(uuid.length - 8)}</span>
      </div>
      <div class="detail-row">
        <span class="label">Survey Status</span>
        <span class="value" style="color: var(--accent);">${statusText}</span>
      </div>
      <div class="detail-row">
        <span class="label">Credit Allocation</span>
        <span class="payout-value">${payout} Coins</span>
      </div>
      <div class="detail-row">
        <span class="label">Audited State</span>
        <span class="value">${isDuplicate ? 'Duplicate (Verified)' : (saved ? 'Logged Successfully' : 'Skipped (Settings)')}</span>
      </div>
    </div>
    <div class="footer-note">You can safely close this browser window.</div>
  </div>
</body>
</html>`;
  }

  /**
   * Premium error rendering
   */
  static renderErrorPage(message) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SurveyStream Error</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      background: #0b0b0e;
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.07);
      backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 40px;
      width: 100%;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .icon {
      color: #ef4444;
      font-size: 48px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      margin-bottom: 12px;
    }
    p {
      font-size: 14px;
      color: #8b8b9f;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>Processing Error</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
  }
}

module.exports = CallbackController;
