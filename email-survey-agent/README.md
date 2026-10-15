# On-Device Zoho Email Survey AI Agent

An automated, local-first background AI daemon that connects to Zoho Mail via IMAP, inspects incoming emails, identifies market research survey invitations using local **Ollama LLM**, and saves formatted survey data to **SQLite**, **CSV**, and the main **`ya_project`** database.

---

## Architecture Flow

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│    Zoho Mail     │       │ Email Ingestion  │       │ AI & Extraction  │       │  Local Database  │
│  (IMAP / Push)   │ ────> │  Worker Daemon   │ ────> │   Engine (LLM)   │ ────> │  & CSV Storage   │
└──────────────────┘       └──────────────────┘       └──────────────────┘       └──────────────────┘
                                    │                          │                          │
                                    ▼                          ▼                          ▼
                             Duplicate Filter         JSON Schema Enforcer          Audit Logging
```

1. **Email Ingestion**: Connects to Zoho IMAP (`imappro.zoho.com:993` or `imap.zoho.com:993`) using secure TLS/SSL.
2. **Duplicate Filter**: Checks incoming `Message-ID` against the local SQLite database. If already processed, it skips immediately.
3. **On-Device AI (Ollama)**: Cleans email body and sends it to local Ollama (e.g., `llama3:latest`) with strict JSON schema enforcement.
4. **Classification & Extraction**: Determines if the email is a survey offer. If true, extracts:
   - `project_no`, `project_name`, `platform_name`
   - `project_cpi` (incentive / payout) & `currency`
   - `project_quota` (sample size)
   - `project_loi` (length of interview in minutes)
   - `project_ir` (incidence rate %)
   - `project_click_url` (direct survey entry link)
   - `target_country` & qualification criteria
5. **Hybrid Storage**:
   - **SQLite (`data/surveys_agent.db`)**: Local audit tables `processed_emails` and `extracted_surveys`.
   - **CSV (`exports/surveys_extracted.csv`)**: Appends rows for spreadsheet review.
   - **MySQL (`ya_project`)**: Inserts directly as a custom survey (`is_api = 0`) under `ya_platform` and `ya_currency`.

---

## Quick Testing (Without Zoho Connected Yet)

You can test the entire AI extraction and database saving pipeline immediately using simulated emails:

```bash
cd email-survey-agent
npm run test:mock
```

To view current database statistics:
```bash
npm run status
```

---

## How to Connect Your Zoho Server (When Ready)

1. Open `email-survey-agent/.env`
2. Configure your Zoho credentials:
   ```env
   # For Zoho Workplace / Custom Domains: imappro.zoho.com
   # For regular Zoho: imap.zoho.com
   ZOHO_IMAP_HOST=imappro.zoho.com
   ZOHO_IMAP_PORT=993
   ZOHO_IMAP_SECURE=true

   ZOHO_EMAIL=your_email@domain.com
   ZOHO_APP_PASSWORD=your_zoho_app_password
   ```

### Generating a Zoho App Password:
If 2FA/MFA is enabled on your Zoho account:
1. Log in to [Zoho Accounts](https://accounts.zoho.com).
2. Go to **Security** $\to$ **App Passwords**.
3. Click **Generate New Password**, enter a name (e.g. `SurveyAgent`), and copy the 16-character password.
4. Paste it as `ZOHO_APP_PASSWORD` in `.env`.

---

## Running in Production / Daemon Mode

Start the live agent:
```bash
cd email-survey-agent
npm start
```

The agent will listen continuously for new emails, process them with your local Ollama LLM, and update your databases in real-time.
