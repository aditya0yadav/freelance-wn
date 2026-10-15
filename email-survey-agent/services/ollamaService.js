const axios = require('axios');
const { buildSurveyExtractionPrompt } = require('../prompts/surveyExtractionPrompt');

class OllamaService {
  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3:latest';
  }

  /**
   * Pre-cleans raw email body text to optimize token usage and remove email boilerplate
   */
  cleanEmailBody(rawText) {
    if (!rawText) return '';
    let text = rawText;

    // Remove excessive blank lines
    text = text.replace(/\n{3,}/g, '\n\n');

    // Remove standard unsubscribe / privacy legal blocks often found in footer
    const footerMarkers = [
      'unsubscribe',
      'click here to unsubscribe',
      'this email was sent to',
      'confidentiality notice',
      'all rights reserved'
    ];

    const lines = text.split('\n');
    const cleanedLines = [];

    for (const line of lines) {
      const lower = line.toLowerCase();
      // If we hit common unsubscribe markers near the bottom, ignore
      if (footerMarkers.some(m => lower.includes(m)) && cleanedLines.length > 10) {
        break;
      }
      cleanedLines.push(line);
    }

    // Cap at ~4000 characters to stay within local LLM fast inference limits
    return cleanedLines.join('\n').slice(0, 4000).trim();
  }

  /**
   * Sends email to local Ollama and returns structured survey data
   */
  async extractSurvey({ from, subject, date, bodyText, folderName }) {
    const cleanedBody = this.cleanEmailBody(bodyText);
    const prompt = buildSurveyExtractionPrompt({
      from: from || '',
      subject: subject || '',
      date: date || new Date().toISOString(),
      bodyText: cleanedBody,
      folderName: folderName || 'INBOX'
    });

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1, // low temperature for deterministic structured extraction
          num_predict: 512
        }
      }, {
        timeout: 90000 // 90 seconds timeout for local LLM inference
      });

      if (!response.data || !response.data.response) {
        throw new Error('Empty response from Ollama API');
      }

      const rawJson = response.data.response.trim();
      let parsed;
      try {
        parsed = JSON.parse(rawJson);
      } catch (err) {
        // Fallback: extract JSON substring if wrapped in stray characters
        const match = rawJson.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error(`Failed to parse LLM JSON: ${rawJson}`);
        }
      }

      // If email was located in a dedicated company folder (e.g. GWS, Zamplia, GIP, PF, etc.), prefer that folder name
      let resolvedPlatform = String(parsed.platform_name || '').trim();
      if ((!resolvedPlatform || resolvedPlatform === 'EmailCustom' || resolvedPlatform === 'General') && folderName && folderName !== 'INBOX') {
        resolvedPlatform = folderName;
      } else if (folderName && folderName !== 'INBOX') {
        resolvedPlatform = folderName;
      }

      // Sanitize fields
      return {
        is_survey_invitation: Boolean(parsed.is_survey_invitation),
        confidence: Number(parsed.confidence) || 0.8,
        project_no: String(parsed.project_no || `EM_${Date.now()}`),
        project_name: String(parsed.project_name || subject || 'Survey Opportunity'),
        platform_name: resolvedPlatform || 'General',
        folder_name: folderName || 'INBOX',
        project_cpi: Number(parseFloat(parsed.project_cpi) || 1.0),
        currency: String(parsed.currency || 'USD').toUpperCase(),
        project_quota: Number(parseInt(parsed.project_quota, 10) || 100),
        project_loi: Number(parseInt(parsed.project_loi, 10) || 15),
        project_ir: Number(parseInt(parsed.project_ir, 10) || 50),
        target_country: String(parsed.target_country || 'US'),
        project_click_url: String(parsed.project_click_url || ''),
        project_content: String(parsed.project_content || '')
      };
    } catch (err) {
      console.error('Ollama extraction error:', err.message);
      throw err;
    }
  }
}

module.exports = new OllamaService();
