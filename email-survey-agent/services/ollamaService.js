const axios = require('axios');
const { buildSurveyExtractionPrompt } = require('../prompts/surveyExtractionPrompt');

class OllamaService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY || '';
    this.geminiModel = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
    this.geminiFallbackModels = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-flash-latest,gemini-3.5-flash-lite,gemini-pro-latest')
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);

    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3:latest';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
   * Checks if local Ollama server is running and responding
   */
  async checkOllamaExists() {
    try {
      const res = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 2000 });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Attempts extraction via Gemini API with retry and model fallbacks on busy/503/429
   */
  async extractViaGemini(prompt) {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const candidateModels = [this.geminiModel, ...this.geminiFallbackModels];
    let lastErr = null;

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[AI Engine] Attempting extraction via Gemini (${model}, attempt ${attempt})...`);
          const res = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          }, {
            headers: {
              'Content-Type': 'application/json',
              'X-goog-api-key': this.geminiApiKey
            },
            timeout: 25000
          });

          const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) throw new Error('Empty response from Gemini API');

          const parsed = this.parseJsonSafe(rawText);
          console.log(`[AI Engine] Successfully parsed survey email via Gemini (${model})`);
          return parsed;
        } catch (err) {
          lastErr = err;
          const status = err.response?.status;
          const isBusy = status === 503 || status === 429 || err.code === 'ECONNABORTED';

          if (isBusy) {
            console.warn(`[AI Engine] Gemini (${model}) is currently busy / high demand (status: ${status || err.message}). Waiting 2.5s before retry...`);
            await this.sleep(2500);
          } else {
            // Not a temporary busy error (e.g. 404 model not found) -> try next model candidate immediately
            break;
          }
        }
      }
    }

    throw new Error(`Gemini extraction failed across models: ${lastErr?.response?.data?.error?.message || lastErr?.message}`);
  }

  /**
   * Attempts extraction via local Ollama API
   */
  async extractViaOllama(prompt) {
    console.log(`[AI Engine] Attempting extraction via local Ollama (${this.model})...`);
    const response = await axios.post(`${this.baseUrl}/api/generate`, {
      model: this.model,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1,
        num_predict: 512
      }
    }, {
      timeout: 90000
    });

    if (!response.data || !response.data.response) {
      throw new Error('Empty response from Ollama API');
    }

    const parsed = this.parseJsonSafe(response.data.response);
    console.log(`[AI Engine] Successfully parsed survey email via local Ollama (${this.model})`);
    return parsed;
  }

  /**
   * Robust JSON parsing helper with fallback regex extraction
   */
  parseJsonSafe(rawJson) {
    const text = String(rawJson || '').trim();
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error(`Failed to parse AI JSON response: ${text.slice(0, 150)}`);
    }
  }

  /**
   * Main entry point:
   * 1. Try Gemini first (with retry/backoff on busy)
   * 2. If Gemini fails or is busy, check if Ollama exists
   * 3. Use Ollama to get the answer
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

    let parsed = null;
    let geminiErr = null;

    // Step 1: Try Gemini first
    if (this.geminiApiKey) {
      try {
        parsed = await this.extractViaGemini(prompt);
      } catch (err) {
        geminiErr = err;
        console.warn(`[AI Engine] Gemini request could not complete (${err.message}). Checking for local Ollama fallback...`);
      }
    }

    // Step 2: Fallback to local Ollama if Gemini failed or key missing
    if (!parsed) {
      const ollamaRunning = await this.checkOllamaExists();
      if (ollamaRunning) {
        try {
          parsed = await this.extractViaOllama(prompt);
        } catch (ollamaErr) {
          console.error('[AI Engine] Local Ollama fallback also failed:', ollamaErr.message);
          throw new Error(`AI extraction failed on both Gemini (${geminiErr?.message}) and Ollama (${ollamaErr.message})`);
        }
      } else {
        if (geminiErr) {
          throw new Error(`Gemini failed (${geminiErr.message}) and local Ollama is not running on ${this.baseUrl}. Please check your connection or start Ollama.`);
        }
        throw new Error(`Neither Gemini API key is configured nor local Ollama is running on ${this.baseUrl}.`);
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
  }
}

module.exports = new OllamaService();

