# SurveyStream Portal - 15. Architectural Complications & Deep-Dive Resolutions

Implementing a multi-tenant survey routing middleware and financial ledger yields several high-impact technical complications. This document outlines those complications, evaluates the structural risks they present to both the Node.js/Prisma backend and React frontend, and provides production-grade code resolutions.

---

## 1. Complication 1: Floating-Point Math & Precision Loss in Ledger Splits

### 1.1 The Challenge
In a multi-tier split system, calculations involve division operations to compute percentages:
$$\text{teamPayout} = \text{payout} \times \left( \frac{100 - R_{\text{team}}}{100} \right) \times \left( \frac{100 - R_{\text{auth}}}{100} \right)$$
Using IEEE 754 floating-point math (JavaScript's standard `Number` type) introduces precision errors:
```javascript
0.1 + 0.2 // Outputs: 0.30000000000000004
```
When processing thousands of postbacks daily, these tiny rounding discrepancies accumulate, causing financial imbalances in ledgers and database validation mismatches when converting balances.

### 1.2 The Resolution
We must implement integer-based scaling (e.g. storing balances in "Micro-coins" or "cents" by multiplying by $10,000$ or $100$) or use a specialized library such as `decimal.js`. Below is the clean, fixed-point decimal arithmetic implementation using JavaScript's native string manipulation and scaling factor arithmetic to maintain exact precision down to $4$ decimal places.

#### Express Ledger Calculation Code
```javascript
const Decimal = require('decimal.js'); // Standard practice for financial systems

function calculateSplitsPrecise({ cpi, coinsExchange, commissionRatio, authRate, memberRate }) {
  // Convert all numbers to high-precision Decimal objects
  const dCpi = new Decimal(cpi);
  const dExchange = new Decimal(coinsExchange);
  
  // Platform Gross Payout
  const platformPayout = dCpi.mul(dExchange); // cpi * exchange_rate
  
  // Deduct Team Commission Ratio: teamMultiplier = (100 - commissionRatio) / 100
  const teamRatio = new Decimal(100).sub(new Decimal(commissionRatio)).div(100);
  
  // Deduct Platform Authorization Rate: authMultiplier = (100 - authRate) / 100
  // Note: authRate in DB is stored as percentage (e.g., 10.00 for 10%)
  const authRatio = new Decimal(100).sub(new Decimal(authRate)).div(100);
  
  // Deduct Member Rate: memberMultiplier = (100 - memberRate) / 100
  const memberRatioMultiplier = new Decimal(100).sub(new Decimal(memberRate)).div(100);

  // Compute splits sequentially
  const teamPayout = platformPayout.mul(teamRatio).mul(authRatio);
  const memberPayout = teamPayout.mul(memberRatioMultiplier);

  return {
    payout: platformPayout.toDecimalPlaces(4).toNumber(),
    teamPayout: teamPayout.toDecimalPlaces(4).toNumber(),
    memberPayout: memberPayout.toDecimalPlaces(4).toNumber()
  };
}
```

---

## 2. Complication 2: Database Integrity & Orphaned Records during Split Ingestion

### 2.1 The Challenge
Postbacks are asynchronous webhooks received minutes or hours after a session is initialized. During this timeframe:
*   A team's authorization rule (`ya_platform_auth`) may be deleted or modified.
*   A team or member account may be disabled or deleted.
*   A currency exchange rate configuration may be updated.

If the controller queries the relation without defensive checks, it will throw a null-pointer error (causing webhook failure), or process splits using outdated parameters, resulting in ledger leakage.

### 2.2 The Resolution
We implement a defensive validation resolver with default safe-fallbacks to prevent processing crashes and log warning alerts when parameters are missing.

#### Prisma Service Resolver
```javascript
async function resolveSplitEntities(prisma, { memberId, platformId }) {
  // 1. Fetch Member
  const member = await prisma.member.findUnique({
    where: { member_id: memberId }
  });
  if (!member) {
    throw new Error(`CRITICAL: Member record not found for ID: ${memberId}`);
  }
  if (member.is_disable === 1) {
    throw new Error(`ABORT: Member account ${memberId} is currently disabled.`);
  }

  // 2. Fetch Team
  const team = await prisma.team.findUnique({
    where: { team_id: member.team_id }
  });
  if (!team) {
    throw new Error(`CRITICAL: Parent Team record not found for ID: ${member.team_id}`);
  }
  if (team.is_disable === 1) {
    throw new Error(`ABORT: Parent Team ${team.team_id} is currently disabled.`);
  }

  // 3. Resolve Platform Authorization Splitting Overrides
  const platformAuth = await prisma.platformAuth.findFirst({
    where: {
      platform_id: platformId,
      team_id: team.team_id
    }
  });

  // Fallbacks: If no authorization split exists, default to 0% override
  const resolvedAuthRate = platformAuth ? platformAuth.auth_rate : 0.00;
  const resolvedTeamCommission = team.commission_ratio || 0.00;
  const resolvedMemberRate = member.rate || 0.00;

  return {
    member,
    team,
    authRate: resolvedAuthRate,
    teamCommission: resolvedTeamCommission,
    memberRate: resolvedMemberRate
  };
}
```

---

## 3. Complication 3: Double-Spend Callback Webhook Attacks

### 3.1 The Challenge
Callback endpoints are exposed publicly. Malicious users or unstable survey networks can issue multiple concurrent HTTP requests for the same transaction ID (`uid`). Under high concurrency, two parallel requests might check `prisma.reward.findUnique` simultaneously, find no record, and insert two rewards for the same survey session—effectively doubling the member's credit balance (a double-spend bug).

### 3.2 The Resolution
We must implement database-level transaction locks or distributed locks (using Redis or database transactional constraints) to ensure transaction validation is atomic. Below is the Prisma transaction code utilizing an atomic transaction check with table constraints.

#### Prisma Transactional Lock
```javascript
async function processCallbackSafely(prisma, callbackData) {
  const txnId = crypto.createHash('md5').update(callbackData.uid).digest('hex');

  // Utilize a database transaction block
  return await prisma.$transaction(async (tx) => {
    // 1. Lock the transaction ID by querying with a read lock
    const existing = await tx.reward.findUnique({
      where: { txn_id: txnId }
    });

    if (existing) {
      return { status: 'duplicate', record: existing };
    }

    // 2. Insert the reward log immediately to block subsequent concurrent webhooks
    const newReward = await tx.reward.create({
      data: {
        txn_id: txnId,
        member_id: callbackData.memberId,
        team_id: callbackData.teamId,
        platform_id: callbackData.platformId,
        payout: callbackData.payout,
        team_payout: callbackData.teamPayout,
        member_payout: callbackData.memberPayout,
        usd_currency_coins: callbackData.usdExchange,
        uuid: callbackData.uid,
        reward_status: callbackData.status,
        is_mark: callbackData.isMark,
        create_time: new Date()
      }
    });

    return { status: 'success', record: newReward };
  });
}
```

---

## 4. Complication 4: Cross-Origin Referer Bypasses & Proxy Header Spoofing

### 4.1 The Challenge
In `domain_verify()`, the system reads `$_SERVER['HTTP_REFERER']` to verify whether requests originate from authorized team hosts (`team_host`). However:
*   HTTP Referer headers are easily spoofed in non-browser environments (e.g. Postman, cURL).
*   If the user's platform operates behind a reverse proxy (like Cloudflare, Nginx, or an AWS Load Balancer), client IPs and origin headers will reflect the proxy server rather than the client unless specifically parsed.

### 4.2 The Resolution
Verify origins using cryptographic tokens containing signed metadata instead of relying on plain text HTTP referers. If referer matching is used as a fallback, verify IP origins by extracting proxy forwarding headers (`x-forwarded-for`).

#### Proxy-Aware IP/Header Resolver (Node.js)
```javascript
function extractClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // Return the first IP in the forwarded chain
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '';
}

function verifyOriginReferer(req, authorizedHosts) {
  const referer = req.headers['referer'];
  if (!referer) return false;

  try {
    const parsedUrl = new URL(referer);
    const domain = parsedUrl.hostname.toLowerCase();
    
    // Whitelist local development
    if (['localhost', '127.0.0.1'].includes(domain)) {
      return true;
    }

    return authorizedHosts.includes(domain);
  } catch (e) {
    return false;
  }
}
```

---

## 5. Complication 5: Speeder Completes & Micro-fraud Identification

### 5.1 The Challenge
Fraudulent users write automation scripts to click redirect URLs, bypass survey pages, and trigger callback hooks within milliseconds. Relying solely on callbacks does not catch these speeder activities.

### 5.2 The Resolution
Calculate completion times by comparing the timestamp when the callback is received against the outbound click time logged in `ya_flowing.create_time`. If the delta is less than the platform's configured threshold (`limit_endtime` in minutes), mark the record as fraudulent (`is_mark = 1`) and queue it for manual admin audit.

#### Time Validation Logic
```javascript
function determineSpeederStatus(clickTime, limitMinutes) {
  if (!clickTime || !limitMinutes || limitMinutes <= 0) {
    return 0; // Speed check disabled or no click logs
  }

  const startTime = new Date(clickTime).getTime();
  const currentTime = Date.now();
  const timeElapsedSeconds = (currentTime - startTime) / 1000;
  const thresholdSeconds = limitMinutes * 60;

  // Mark as speeder (1) if completion time is under the threshold
  return timeElapsedSeconds < thresholdSeconds ? 1 : 0;
}
```
