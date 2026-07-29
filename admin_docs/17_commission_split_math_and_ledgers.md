# SurveyStream Portal - 17. Commission Split Mathematics, Flow of Funds, & Ledger Allocations

This document provides a detailed breakdown of the multi-layered commission and payout structure within the SurveyStream ecosystem. It defines the exact financial path of survey revenue from the moment a third-party partner callback (Webhook) is received to the final ledger distribution.

---

## 1. Core Commission Variables & Data Models

The revenue split is determined by four relational parameters located across the database schemas:

1.  **Platform Conversion Rate (`CoinsRate`)**:
    *   *Source*: `ya_currency.currency_coins` (associated with the survey's project currency, e.g., USD = `100.00` coins per dollar).
2.  **Global Team Commission Ratio ($R_{\text{team}}$)**:
    *   *Source*: `ya_team.commission_ratio` (percentage deduction, e.g., `15.00` for 15%). This is the base cut retained by the platform owner for all traffic originating from this publisher network.
3.  **Platform Authorization Split Rate ($R_{\text{auth}}$)**:
    *   *Source*: `ya_platform_auth.auth_rate` (percentage deduction, e.g., `10.00` for 10%). This is a custom platform-specific commission adjustment applied to a team for a specific survey provider.
4.  **Member-Specific Deduction Rate ($R_{\text{member}}$)**:
    *   *Source*: `ya_member.rate` (percentage deduction, e.g., `5.00` for 5%). This is the share retained by the publisher team before crediting their end-user member.

---

## 2. The Payout Flow of Funds (Step-by-Step)

When a member completes a survey, the total earnings are divided into three distinct destinations:
*   **Platform Owner Share (Revenue/Profit)**: Retained in the platform's central treasury.
*   **Publisher Team Share**: Credited to the team's net wallet balance.
*   **Member Share**: Credited to the end-user member's account.

```
       [ Gross Survey Revenue ] (Platform Payout)
                 |
                 v
      - Deduct Team Commission (R_team) 
      - Deduct Platform Authorization (R_auth)
                 |
                 +---> [ Platform Net Profit ] (Platform Owner keeps this)
                 |
                 v
         [ Team Net Payout ]
                 |
                 v
      - Deduct Member Rate (R_member)
                 |
                 +---> [ Publisher Team Profit ] (Publisher keeps this)
                 |
                 v
       [ Member Net Payout ] (User's Wallet Balance)
```

---

## 3. Mathematical Formula Blueprint

The ledger calculations follow a sequential deduction model:

### Step 3.1: Calculate Platform Gross Payout
Convert the external CPI (usually in USD) to the internal system coin equivalent:
$$\text{Platform Payout} = \text{CPI} \times \text{CoinsRate}$$

### Step 3.2: Calculate Team Net Payout
The publisher network's net share is calculated by applying both the team's global commission deduction and their platform-specific authorization override deduction:
$$\text{Team Payout} = \text{Platform Payout} \times \left( \frac{100 - R_{\text{team}}}{100} \right) \times \left( \frac{100 - R_{\text{auth}}}{100} \right)$$

### Step 3.3: Calculate Member Net Payout
The final amount credited to the end user is derived by applying the member's specific split rate to the team's net share:
$$\text{Member Payout} = \text{Team Payout} \times \left( \frac{100 - R_{\text{member}}}{100} \right)$$

### Step 3.4: Derive Platform Owner Profit & Team Profit
*   **Platform Owner Profit**:
    $$\text{Platform Profit} = \text{Platform Payout} - \text{Team Payout}$$
*   **Publisher Team Profit**:
    $$\text{Team Profit} = \text{Team Payout} - \text{Member Payout}$$

---

## 4. Concrete Examples & Scenarios

### Scenario A: Standard Split (No Platform Authorization Override)
*   **Survey CPI**: $1.50
*   **Exchange Rate**: 100.00 coins / $1.00
*   **Global Team Commission ($R_{\text{team}}$)**: 15%
*   **Platform Auth Override ($R_{\text{auth}}$)**: 0% (Not configured/defaults to 0)
*   **Member Rate ($R_{\text{member}}$)**: 10%

#### Calculations:
1.  **Platform Payout**:
    $$\text{Platform Payout} = 1.50 \times 100 = 150.00\text{ coins}$$
2.  **Team Payout**:
    $$\text{Team Payout} = 150 \times \left( \frac{100 - 15}{100} \right) \times \left( \frac{100 - 0}{100} \right) = 150 \times 0.85 \times 1.00 = 127.50\text{ coins}$$
3.  **Member Payout**:
    $$\text{Member Payout} = 127.50 \times \left( \frac{100 - 10}{100} \right) = 127.50 \times 0.90 = 114.75\text{ coins}$$
4.  **Profits Distribution**:
    *   **Platform Owner keeps**: $150.00 - 127.50 = 22.50\text{ coins}$
    *   **Publisher Team keeps**: $127.50 - 114.75 = 12.75\text{ coins}$
    *   **Member gets credited**: $114.75\text{ coins}$

---

### Scenario B: Custom Premium Split (With Platform Authorization Override)
*   **Survey CPI**: $2.00
*   **Exchange Rate**: 100.00 coins / $1.00
*   **Global Team Commission ($R_{\text{team}}$)**: 12%
*   **Platform Auth Override ($R_{\text{auth}}$)**: 8% (Additional custom platform split)
*   **Member Rate ($R_{\text{member}}$)**: 5%

#### Calculations:
1.  **Platform Payout**:
    $$\text{Platform Payout} = 2.00 \times 100 = 200.00\text{ coins}$$
2.  **Team Payout**:
    $$\text{Team Payout} = 200 \times \left( \frac{100 - 12}{100} \right) \times \left( \frac{100 - 8}{100} \right) = 200 \times 0.88 \times 0.92 = 161.92\text{ coins}$$
3.  **Member Payout**:
    $$\text{Member Payout} = 161.92 \times \left( \frac{100 - 5}{100} \right) = 161.92 \times 0.95 = 153.824 \rightarrow 153.82\text{ coins}$$
4.  **Profits Distribution**:
    *   **Platform Owner keeps**: $200.00 - 161.92 = 38.08\text{ coins}$
    *   **Publisher Team keeps**: $161.92 - 153.82 = 8.10\text{ coins}$
    *   **Member gets credited**: $153.82\text{ coins}$
