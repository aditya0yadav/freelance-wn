# SurveyStream Portal - 13. System Mistakes, Inconsistencies, & Bug Audit

This document compiles the logic flaws, code inconsistencies, and critical bugs discovered in the codebase relating to the Platform, Team, and Member modules. Fixing these issues is required to guarantee system integrity, secure authentication, and prevent application crashes.

---

## 1. Critical Backend Crashes & Logical Faults

### 1.1 Unhandled Null Relations on Commission Calculation
*   **Location**: [Index.php (callback() & index() methods)](file:///Users/aditya/Documents/freelance%20wn/%E6%BA%90%E4%BB%A3%E7%A0%81/backend/app/api/controller/Index.php#L145-L147)
*   **Description**: The system attempts to read platform authorizations for a team via:
    ```php
    $platformAuth = $platformAuthModel->where(['platform_id' => $platform['platform_id'], 'team_id' => $member['team_id']])->find();
    ```
    If no custom override exists in the database for the given team/platform combination, `$platformAuth` will be `null`. However, the code proceeds to calculate the commission splits directly using `$platformAuth->auth_rate` without checking if the relation exists:
    ```php
    'team_payout' => round($cpi * ((100 - $team->commission_ratio) / 100) * ((100 - $platformAuth->auth_rate) / 100), 2)
    ```
*   **Consequence**: Trying to read property `auth_rate` on a `null` object causes a fatal runtime PHP error. This crashes the postback pipeline, causing callbacks from survey providers to fail and preventing the system from recording legitimate user rewards.
*   **Remediation**: Add a null fallback verification. E.g.:
    ```php
    $authRate = $platformAuth ? $platformAuth->auth_rate : 0.00; // Use 0% if no override exists
    ```

### 1.2 Dead/Useless Domain Verification Logic
*   **Location**: [ApiTokenMiddleware.php](file:///Users/aditya/Documents/freelance%20wn/%E6%BA%90%E4%BB%A3%E7%A0%81/backend/app/api/middleware/ApiTokenMiddleware.php#L43-L46)
*   **Description**: When checking whether a token is present, the middleware executes:
    ```php
    if (empty($api_token)) {
        domain_verify();
        exception('请登录', RetCodeUtils::LOGIN_INVALID);
    }
    ```
*   **Consequence**: The function `domain_verify()` is called but its return value (authorized team ID or validation state) is completely ignored. Instead, the middleware immediately throws a `"请登录"` (Please Log In) exception unconditionally, rendering the entire referer-matching domain verification routine completely useless.
*   **Remediation**: Adjust the logic to verify if the domain is authorized first, or bind the returned team ID if valid:
    ```php
    if (empty($api_token)) {
        $verified_team_id = domain_verify();
        if (!$verified_team_id) {
            exception('Access denied: Unauthorized domain referer.', RetCodeUtils::LOGIN_INVALID);
        }
    }
    ```

---

## 2. API Header Mismatch (Frontend vs. Backend)

### 2.1 Standard Bearer Headers vs. Custom Token Keys
*   **Location**: Mismatch between [api.js](file:///Users/aditya/Documents/freelance%20wn/frontend/src/utils/api.js#L3) and [common.php](file:///Users/aditya/Documents/freelance%20wn/%E6%BA%90%E4%BB%A3%E7%A0%81/backend/app/common.php#L522-L525)
*   **Description**: The frontend React app attaches authentication tokens using the standard bearer scheme:
    ```javascript
    if (token) headers['Authorization'] = `Bearer ${token}`;
    ```
    However, the ThinkPHP backend expects the token value inside a header whose name is stored inside the database configurations (defaulting to `ApiToken` or `AdminToken`), and does not implement bearer extraction:
    ```php
    $api_token = Request::header($setting['token_name'], '');
    ```
*   **Consequence**: The backend looks for a header literally named `ApiToken`. Since the frontend sends `Authorization: Bearer <token>`, the backend will fail to detect the token, causing all authenticated API calls to fail with a `LOGIN_INVALID` status.
*   **Remediation**: Unify the token transmission protocol. Either update the frontend to pass the custom header token key or update the backend helper to parse standard Bearer tokens:
    ```php
    // In backend/app/common.php:
    $authHeader = Request::header('Authorization', '');
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $api_token = $matches[1];
    }
    ```

---

## 3. Pre-Screening Demographic Validation Bypasses

### 3.1 Undefined Array Index Risks on Survey Redirects
*   **Location**: [Platform.php (link() method)](file:///Users/aditya/Documents/freelance%20wn/%E6%BA%90%E4%BB%A3%E7%A0%81/backend/app/api/controller/member/Platform.php#L928-L932)
*   **Description**: When validating demographics for pre-screening templates, the code evaluates:
    ```php
    if (isset($param['anser'][$row['persona_data_id']])) {
       ...
    } else {
        return 'illegal request';
    }
    ```
    If the template is configured as required (`persona_data_must = 1`) but the question identifier is missing from the payload `anser`, the system throws an `'illegal request'` error. However, if the field is not marked as required, but the frontend misses sending the key, it completely bypasses the demographic validation check.
*   **Consequence**: Users can answer surveys without demographic validations occurring, or conversely, cause runtime validation failures due to unstructured payload validation.
