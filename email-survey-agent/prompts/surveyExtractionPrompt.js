function buildSurveyExtractionPrompt({ from, subject, date, bodyText, folderName }) {
  const folderGuidance = folderName && folderName !== 'INBOX'
    ? `\n- The email was found in the company folder "${folderName}". Use "${folderName}" as the primary platform/client name unless the email body specifies a different verified market research provider.`
    : '';

  return `You are an expert automated data extraction AI agent for an online market research survey platform.
Your task is to analyze an incoming email and determine if it contains an online market research survey invitation, offer, feasibility request, or live project dispatch.

### INSTRUCTIONS:
1. Determine if the email represents a survey invitation/offer/project dispatch.
2. If it is NOT a survey (e.g. newsletter, generic advertisement, account alert, personal conversation, spam, or invoice):
   Return JSON with "is_survey_invitation": false.
3. If it IS a survey, extract the relevant fields accurately.
   - "project_no": Survey ID, Project ID, Bid ID, or Study Number. If absent, invent a short alphanumeric identifier based on the subject.
   - "project_name": Concise, clean title of the survey/study.
   - "platform_name": The company/client sending the survey (e.g., Cint, Toluna, Zamplia, Dynata, PureSpectrum, Lucid, InnovateMR, etc.).${folderGuidance}
   - "project_cpi": Cost per complete / incentive payout as a number (float). If given as range like "$1.50 - $2.00", take the average or maximum. Default to 1.00 if unspecified.
   - "currency": 3-letter currency code (e.g. "USD", "EUR", "GBP", "INR"). Default "USD".
   - "project_quota": Total sample needed (n=) or required completes as an integer. Default 100 if unspecified.
   - "project_loi": Length of interview in minutes as an integer. Default 15 if unspecified.
   - "project_ir": Incidence rate percentage (0-100) as an integer. Default 50 if unspecified.
   - "target_country": Target geography or 2-letter country code (e.g. "US", "UK", "Global").
   - "project_click_url": The direct survey entry link, live link, or test link found in the email.
   - "project_content": Key qualification criteria, audience description, or quota requirements summarized in 1-2 sentences.

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
  "is_survey_invitation": true or false,
  "confidence": 0.0 to 1.0,
  "project_no": "string",
  "project_name": "string",
  "platform_name": "string",
  "project_cpi": number,
  "currency": "string",
  "project_quota": number,
  "project_loi": number,
  "project_ir": number,
  "target_country": "string",
  "project_click_url": "string",
  "project_content": "string"
}`;
}

module.exports = { buildSurveyExtractionPrompt };
