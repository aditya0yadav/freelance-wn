function buildSurveyExtractionPrompt({ from, subject, date, bodyText, folderName }) {
  const folderGuidance = folderName && folderName !== 'INBOX'
    ? `\n- The email was found in the company folder "${folderName}". Use "${folderName}" as the primary platform/client name unless the email body specifies a different verified market research provider.`
    : '';

  return `You are an expert automated data extraction AI agent for an online market research survey platform.
Your task is to analyze an incoming email and determine if it contains an online market research survey invitation, offer, feasibility request, or live project dispatch update.

### INSTRUCTIONS:
1. Determine if the email represents a survey invitation/offer/project dispatch.
2. If it is NOT a survey (e.g. newsletter, generic advertisement, account alert, personal conversation, spam, or invoice):
   Return JSON with "is_survey_invitation": false.
3. If it IS a survey, extract the relevant fields accurately:
   - "project_no": Survey ID, Project ID, Bid ID, or Study Number. Look for codes like "WI19674", "WI19206", "19674", etc. If absent, invent a short alphanumeric identifier based on the subject.
   - "project_name": Clean title of the survey/study WITHOUT ANY PRICE OR DOLLAR AMOUNT (e.g. for "PF0012882 || WANS - $8.00 || B2B - USA", return "PF0012882 || WANS || B2B - USA"; strip out "- $8.00", "$2.50", "$7", etc.). NEVER include prices in project_name.
   - "platform_name": The company/client sending the survey (e.g., Cint, Toluna, Zamplia, Dynata, PureSpectrum, Lucid, InnovateMR, PF, WI, etc.).${folderGuidance}
   - "project_cpi": Cost per complete / incentive payout as a number (float). Look in table or text for "$7", "CPI: 7.00", etc. Default 1.00 if unspecified.
   - "currency": 3-letter currency code (e.g. "USD", "EUR", "GBP", "INR"). Default "USD".
   - "project_quota": Total sample needed (n=) or required completes as an integer. Default 100 if unspecified.
   - "project_loi": Length of interview in minutes as an integer. Default 15 if unspecified.
   - "project_ir": Incidence rate percentage (0-100) as an integer. Default 50 if unspecified.
   - "target_country": EXACT target country name (e.g. "United States", "United Kingdom", "Spain", "Brazil", "Canada", "Australia", "Germany", "France", "Japan", "China", "India", "Mexico", etc.). Inspect tables, "Geography:", "Country:", "Market:", or subject lines. NEVER return "Global" unless the email explicitly states "Global" or "Worldwide".
   - "country_code": Standard 2-letter uppercase ISO country code (e.g. "US", "GB", "ES", "BR", "CA", "AU", "DE", "FR", "JP", "CN", "IN", "MX", "IT").
   - "project_click_url": The direct survey entry link, live link, or test link found in the email table or body.
   
   ### KEY DEMOGRAPHIC & VERBATIM SPECS REQUIREMENTS:
   - "age_range": Base target age constraint (e.g. "18-65", "21-55", "All ages").
   - "occupation": Target industry, profession, or target audience (e.g. "IT Decision Makers", "Healthcare", "General Population / All", "Open").
   - "raw_specs": VERBATIM SPECIFICATIONS: For survey invitations/dispatches with survey links, COPY THE ENTIRE PROJECT REQUIREMENTS AND SPECS TEXT VERBATIM DIRECTLY FROM THE EMAIL BODY. Do NOT summarize. Copy all bullet points and lines under "Specs:", "Requirements:", "Criteria:", etc. (e.g. Geography, Language, LOI, Field Time, Device, PII, Target criteria).
   - "update_text": If this email is a subsequent update, quota change, or pause notice, extract the exact newly received content to be added in the update field verbatim (e.g. "Please launch 10 completes as soon as possible" or "Please pause.").
   - "is_update": true if this email is an update, quota change, pause/resume notice, or reminder for an ongoing survey; false if it is a brand new project launch.
   - "action": Lifecycle action detected in the email:
       - "launch": New project dispatch or initial invitation with survey link.
       - "pause": Email asks to pause, hold, stop sends, or halt traffic (e.g. "Please pause", "Put on hold").
       - "resume": Email asks to restart, resume, reopen, or go live again.
       - "close": Email states project is fully completed, expired, or permanently closed.
       - "quota_update": Quota increased, decreased, or refreshed.
   - "status": Resulting survey status: "active", "paused", or "closed".
   - "action_reason": Brief explanation of the action or update (e.g. "Please pause.", "Please launch 10 completes as soon as possible.").
   - "excluded_groups": Specific age groups, professions, regions, or quotas mentioned as CLOSED, EXCLUDED, or FULL. If none, empty array [].
   - "project_content": The verbatim specifications or update instructions directly from the email body.

### EMAIL TO ANALYZE:
Company Folder: ${folderName || 'INBOX'}
From: ${from}
Subject: ${subject}
Date: ${date}

Body Content:
${bodyText}

### OUTPUT FORMAT:
You MUST respond ONLY with a valid JSON object matching this schema. Do NOT include markdown code fences, commentary, or text outside the JSON object:
{
  "is_survey_invitation": true,
  "confidence": 0.99,
  "project_no": "string",
  "project_name": "string",
  "platform_name": "string",
  "project_cpi": 1.5,
  "currency": "USD",
  "project_quota": 100,
  "project_loi": 15,
  "project_ir": 50,
  "target_country": "United States",
  "country_code": "US",
  "project_click_url": "string",
  "age_range": "18-65",
  "occupation": "string",
  "raw_specs": "string",
  "update_text": "string",
  "is_update": false,
  "action": "launch",
  "status": "active",
  "action_reason": "string",
  "excluded_groups": ["string"],
  "project_content": "string"
}`;
}

module.exports = { buildSurveyExtractionPrompt };
