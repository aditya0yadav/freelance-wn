const axios = require('axios');
const { buildSurveyExtractionPrompt } = require('../prompts/surveyExtractionPrompt');

class OllamaService {
  constructor() {
    // Primary Model: Qwen3.8-Flash (OpenAI-compatible protocol)
    this.qwenApiKey = process.env.QWEN_API_KEY || '';
    this.qwenBaseUrl = (process.env.QWEN_BASE_URL || 'https://maas.qianwenaiapi.com/compatible-mode/v1').replace(/\/+$/, '');
    this.qwenModel = process.env.QWEN_MODEL || 'qwen3.8-flash';

    // Secondary Model: Gemini Cloud API
    this.geminiApiKey = process.env.GEMINI_API_KEY || '';
    this.geminiModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    this.geminiFallbackModels = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3-flash-preview,gemini-flash-latest,gemini-pro-latest')
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);

    // Fallback: Local Ollama
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
   * Primary Extraction via Qwen3.8-Flash (OpenAI-compatible protocol)
   */
  async extractViaQwen(prompt) {
    if (!this.qwenApiKey) {
      throw new Error('Qwen API key is not configured');
    }

    // Candidate base URLs (handles official qianwenaiapi.com and user input)
    const candidateUrls = [
      `${this.qwenBaseUrl}/chat/completions`,
      'https://maas.qianwenaiapi.com/compatible-mode/v1/chat/completions'
    ];

    const uniqueUrls = Array.from(new Set(candidateUrls));
    let lastErr = null;

    for (const url of uniqueUrls) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[AI Engine] Attempting extraction via Qwen3.8-Flash (${this.qwenModel}, attempt ${attempt})...`);
          const res = await axios.post(url, {
            model: this.qwenModel,
            messages: [
              {
                role: 'system',
                content: 'You are an expert automated data extraction agent. Analyze the survey invitation email and output ONLY valid JSON matching the requested schema.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.qwenApiKey}`
            },
            timeout: 30000
          });

          const choice = res.data?.choices?.[0]?.message;
          const rawText = choice?.content;
          if (!rawText) throw new Error('Empty response from Qwen API');

          const parsed = this.parseJsonSafe(rawText);
          console.log(`[AI Engine] Successfully parsed survey email via Qwen3.8-Flash (${this.qwenModel})`);
          return parsed;
        } catch (err) {
          lastErr = err;
          const status = err.response?.status;
          const isBusy = status === 503 || status === 429 || err.code === 'ECONNABORTED';

          if (isBusy && attempt < 2) {
            console.warn(`[AI Engine] Qwen3.8-Flash is busy/rate-limited (status: ${status || err.message}). Waiting 2s before retry...`);
            await this.sleep(2000);
          } else {
            break;
          }
        }
      }
    }

    throw new Error(`Qwen3.8-Flash extraction failed: ${lastErr?.response?.data?.error?.message || lastErr?.message}`);
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
   * 1. Try Qwen3.8-Flash first (fast, multi-modal, official production choice)
   * 2. If Qwen fails or key missing, fallback to Gemini Cloud
   * 3. If Gemini fails, check and fallback to local Ollama
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
    let qwenErr = null;
    let geminiErr = null;

    // Step 1: Try Qwen3.8-Flash first
    if (this.qwenApiKey) {
      try {
        parsed = await this.extractViaQwen(prompt);
      } catch (err) {
        qwenErr = err;
        console.warn(`[AI Engine] Qwen3.8-Flash request could not complete (${err.message}). Trying Gemini cloud fallback...`);
      }
    }

    // Step 2: Try Gemini if Qwen failed or key not configured
    if (!parsed && this.geminiApiKey) {
      try {
        parsed = await this.extractViaGemini(prompt);
      } catch (err) {
        geminiErr = err;
        console.warn(`[AI Engine] Gemini request could not complete (${err.message}). Checking for local Ollama fallback...`);
      }
    }

    // Step 3: Fallback to local Ollama if cloud APIs failed
    if (!parsed) {
      const ollamaRunning = await this.checkOllamaExists();
      if (ollamaRunning) {
        try {
          parsed = await this.extractViaOllama(prompt);
        } catch (ollamaErr) {
          console.error('[AI Engine] Local Ollama fallback also failed:', ollamaErr.message);
          throw new Error(`AI extraction failed on Qwen (${qwenErr?.message}), Gemini (${geminiErr?.message}) and Ollama (${ollamaErr.message})`);
        }
      } else {
        const errorDetails = [
          qwenErr ? `Qwen: ${qwenErr.message}` : null,
          geminiErr ? `Gemini: ${geminiErr.message}` : null,
          `Local Ollama is not running on ${this.baseUrl}`
        ].filter(Boolean).join(' | ');
        throw new Error(`All AI models failed: ${errorDetails}`);
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
      project_content: String(parsed.project_content || ''),
      age_range: String(parsed.age_range || '18-65'),
      occupation: String(parsed.occupation || 'General / All Industries'),
      is_update: Boolean(parsed.is_update),
      excluded_groups: Array.isArray(parsed.excluded_groups) ? parsed.excluded_groups : []
    };
  }
}

module.exports = new OllamaService();

