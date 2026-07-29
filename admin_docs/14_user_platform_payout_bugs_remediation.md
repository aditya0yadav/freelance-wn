# SurveyStream Portal - 14. Payout Calculation & Commission Split Bug Audit (User Backend)

This document details critical logic flaws discovered in the user's Node.js Express backend (`/Users/aditya/Documents/freelance wn/src`) regarding payout calculations, compared to the reference ThinkPHP codebase (`源代码`).

---

## 1. Discovered Vulnerabilities & Mismatches

### 1.1 Complete Bypass of Team Commission splits in Callbacks
*   **Target Files**:
    *   [src/controllers/callbackController.js:134-136](file:///Users/aditya/Documents/freelance%20wn/src/controllers/callbackController.js#L134-L136) (General callback)
    *   [src/controllers/callbackController.js:256-258](file:///Users/aditya/Documents/freelance%20wn/src/controllers/callbackController.js#L256-L258) (Bitlabs callback)
*   **The Issue**:
    The user's Express backend calculates the `teamPayout` and `memberPayout` as follows:
    ```javascript
    const payout = cpi * coinsExchange;
    const teamPayout = payout;
    const memberPayout = payout * ((100 - member.rate) / 100);
    ```
    This misses two crucial parameters that exist in the reference PHP codebase:
    1.  **`team.commission_ratio`**: The global platform commission split taken from the publisher team.
    2.  **`platformAuth.auth_rate`**: The team-specific platform-specific authorization commission split.
*   **Impact**:
    By ignoring these parameters, the system credits the team with the full gross platform payout and calculates the member's reward directly off this gross amount. This completely eliminates the platform's cut, resulting in the platform losing money on every completion.

---

### 1.2 Mismatched Frontend Payout Displays
*   **Target Files**:
    *   [src/controllers/platformController.js:80-96](file:///Users/aditya/Documents/freelance%20wn/src/controllers/platformController.js#L80-L96) (`list()` method)
    *   [src/controllers/platformController.js:210-218](file:///Users/aditya/Documents/freelance%20wn/src/controllers/platformController.js#L210-L218) (`offers()` method)
*   **The Issue**:
    When compiling the listing of platforms or active offers to show on the user facing frontend, the controller queries `platformAuth` and computes `authRateVal = platformAuth ? platformAuth.auth_rate : 0;` but then fails to use it:
    ```javascript
    const memberPayout = rawCoins * memberRate; // authRateVal is ignored!
    ```
*   **Impact**:
    The user frontend displays inflated payout numbers (gross minus only the individual member rate adjustment) to users. However, when the callback arrives, if splits are applied correctly later, the user will receive far fewer coins than they were promised on screen, leading to a critical UX discrepancy.

---

## 2. Mathematical Remediation Plan

To match the reference codebase, payouts must be updated to apply the multi-layer commission split model.

### Correct Formula (Reference PHP logic):
$$\text{teamPayout} = \text{payout} \times \left( \frac{100 - R_{\text{team}}}{100} \right) \times \left( \frac{100 - R_{\text{auth}}}{100} \right)$$

$$\text{memberPayout} = \text{teamPayout} \times \left( \frac{100 - R_{\text{member}}}{100} \right)$$

---

## 3. Concrete Code Replacements

### 3.1 Update Callback Controller (General Callback)

Replace the payout section in [callbackController.js](file:///Users/aditya/Documents/freelance%20wn/src/controllers/callbackController.js#L134-L136):
```javascript
// Calculate payout rate details
const usdCurrency = await prisma.currency.findFirst({ where: { currency_code: 'USD' } });
const coinsExchange = project?.currency?.currency_coins ?? (usdCurrency?.currency_coins || 100.00);

const cpi = project ? project.project_cpi : 0;
const payout = cpi * coinsExchange;

// Correct Multi-layer Payout Split
const authRateVal = platformAuth ? platformAuth.auth_rate : 0.00;
const teamPayout = payout * ((100 - team.commission_ratio) / 100) * ((100 - authRateVal) / 100);
const memberPayout = teamPayout * ((100 - member.rate) / 100);
```

### 3.2 Update Callback Controller (Bitlabs Callback)

Replace the payout section in [callbackController.js](file:///Users/aditya/Documents/freelance%20wn/src/controllers/callbackController.js#L256-L258):
```javascript
const payout = cpiVal * coinsExchange;

// Correct Multi-layer Payout Split
const authRateVal = platformAuth ? platformAuth.auth_rate : 0.00;
const teamPayout = payout * ((100 - team.commission_ratio) / 100) * ((100 - authRateVal) / 100);
const memberPayout = teamPayout * ((100 - member.rate) / 100);
```

### 3.3 Update Platform Controller Offers API

Replace the display calculation in [platformController.js](file:///Users/aditya/Documents/freelance%20wn/src/controllers/platformController.js#L210-L218):
```javascript
const platformAuth = platformAuths.find(auth => auth.platform_id === item.platform_id);
const authRateVal = platformAuth ? platformAuth.auth_rate : 0.00;
const teamCommissionRatio = team ? team.commission_ratio : 0.00;

const rawCoins = item.project_cpi * (item.currency?.currency_coins || 100.00);
const memberRate = (100 - member.rate) / 100;

const teamPayout = rawCoins * ((100 - teamCommissionRatio) / 100) * ((100 - authRateVal) / 100);
const memberPayout = teamPayout * memberRate;
```
