const path = require('path');

// Dynamically load parent prisma instance if available
let prisma = null;
try {
  prisma = require('../../src/config/database');
} catch (err) {
  console.warn('MySQL Prisma client not loaded from parent app. MySQL sync will be disabled:', err.message);
}

class MySQLSyncService {
  /**
   * Syncs an extracted survey record to the main ya_project table
   */
  static async syncSurvey(survey) {
    if (!prisma) {
      console.log('[Sync] Prisma unavailable; skipping MySQL sync.');
      return null;
    }

    if (process.env.ENABLE_MYSQL_SYNC !== 'true') {
      console.log('[Sync] ENABLE_MYSQL_SYNC is false; skipping MySQL sync.');
      return null;
    }

    try {
      // 1. Resolve or fallback Currency
      const currencyCode = (survey.currency || 'USD').toUpperCase();
      let currency = await prisma.currency.findFirst({
        where: { currency_code: currencyCode }
      });

      if (!currency) {
        currency = await prisma.currency.findFirst({
          where: { currency_code: 'USD' }
        });
      }

      const currencyId = currency ? currency.currency_id : 1;

      // 2. Resolve Company & Platform Name from Folder or AI extraction
      let companyName = (survey.folder_name && survey.folder_name !== 'INBOX')
        ? survey.folder_name.trim()
        : (survey.platform_name && survey.platform_name !== 'EmailCustom' && survey.platform_name !== 'General'
            ? survey.platform_name.trim()
            : 'General');

      // Canonical aliases for known market research partner abbreviations
      const KNOWN_FOLDER_ALIASES = {
        'gws': 'GoWebSurveys',
        'gowebsurveys': 'GoWebSurveys',
        'zamplia': 'ZAMPLIA',
        'gip': 'GIP',
        'gms': 'GMS',
        'pf': 'PF',
        't': 'T',
        'ttp': 'TTP',
        'wi': 'WI',
        'zgr': 'ZGR'
      };

      const lookupKey = companyName.toLowerCase();
      const canonicalName = KNOWN_FOLDER_ALIASES[lookupKey] || companyName;
      const cleanSign = canonicalName.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Search existing platform in ya_platform
      let platform = await prisma.platform.findFirst({
        where: {
          OR: [
            { platform_name: { equals: canonicalName } },
            { platform_sign: { equals: cleanSign } },
            { platform_name: { equals: companyName } },
            { platform_sign: { equals: lookupKey } }
          ],
          delete_time: null
        }
      });

      // If platform does not exist, create it with the company name
      if (!platform) {
        const PALETTE = ['#10B981', '#6366F1', '#EC4899', '#F59E0B', '#3B82F6', '#8B5CF6', '#14B8A6'];
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];

        platform = await prisma.platform.create({
          data: {
            platform_name: canonicalName,
            platform_sign: cleanSign || `plat_${Date.now().toString().slice(-6)}`,
            platform_color: color,
            platform_level: 5,
            platform_currency: currencyId,
            is_custom: 1,
            is_list: 1, // Visible in platform explorer for members
            is_wall: 0,
            model_type: 0,
            pay_type: 0,
            is_disable: 0,
            create_time: new Date()
          }
        });
        // Automatically authorize this custom platform for all active teams
        try {
          const activeTeams = await prisma.team.findMany({ where: { is_disable: 0 } });
          for (const team of activeTeams) {
            await prisma.platformAuth.create({
              data: {
                platform_id: platform.platform_id,
                team_id: team.team_id,
                auth_rate: 0
              }
            });
          }
        } catch (authErr) {
          console.warn(`[Sync] Notice: could not auto-create platformAuth: ${authErr.message}`);
        }
        console.log(`[Sync] Created company platform in ya_platform: "${platform.platform_name}" (ID: ${platform.platform_id})`);
      } else {
        console.log(`[Sync] Linked survey to platform in ya_platform: "${platform.platform_name}" (ID: ${platform.platform_id})`);
      }

      // 3. Flexible check for existing project under this platform
      const rawNo = String(survey.project_no || '').trim();
      const digitsOnly = rawNo.replace(/\D/g, '');
      const possibleNos = [rawNo];
      if (digitsOnly && digitsOnly !== rawNo) {
        possibleNos.push(digitsOnly);
        possibleNos.push(`${cleanSign.toUpperCase()}${digitsOnly}`);
        possibleNos.push(`WI${digitsOnly}`);
        possibleNos.push(`GI${digitsOnly}`);
        possibleNos.push(`PF${digitsOnly}`);
      }

      let existing = await prisma.project.findFirst({
        where: {
          platform_id: platform.platform_id,
          OR: [
            { project_no: { in: possibleNos } },
            ...(digitsOnly ? [{ project_no: { contains: digitsOnly } }] : []),
            { project_pno: { contains: rawNo } }
          ],
          delete_time: null
        }
      });

      // If still not found by platform, check globally across email survey projects
      if (!existing && (survey.action === 'pause' || survey.action === 'close' || survey.is_update)) {
        existing = await prisma.project.findFirst({
          where: {
            OR: [
              { project_no: { in: possibleNos } },
              ...(digitsOnly ? [{ project_no: { contains: digitsOnly } }] : [])
            ],
            project_code: 'EMAIL_SURVEY',
            delete_time: null
          }
        });
      }

      const emailDate = survey.date ? new Date(survey.date) : new Date();

      if (existing) {
        console.log(`[Sync] Updating existing project in ya_project: PNO ${existing.project_pno}`);

        // Parse existing timeline or upgrade legacy plain text
        let timeline = null;
        try {
          const parsed = JSON.parse(existing.project_content);
          if (parsed && (parsed.is_timeline || parsed.base_requirements)) {
            timeline = parsed;
          }
        } catch {
          // Legacy plain text
        }

        if (!timeline) {
          // Initialize timeline preserving initial content as base requirements
          const legacyCountry = survey.target_country || 'United States';
          timeline = {
            is_timeline: true,
            base_requirements: {
              created_at: existing.create_time || emailDate.toISOString(),
              target_country: legacyCountry,
              country: legacyCountry,
              age_range: survey.age_range || '18-65',
              occupation: survey.occupation || 'General Audience',
              target_demographics: survey.target_demographics || survey.occupation || 'General Audience',
              initial_quota: existing.project_quota || 100,
              initial_cpi: existing.project_cpi || 1.0,
              initial_loi: existing.project_loi || 15,
              initial_ir: existing.project_ir || 50,
              summary: existing.project_content || 'Initial live project dispatch specifications.',
              description: existing.project_content || 'Initial live project dispatch specifications.',
              raw_specs: existing.project_content || ''
            },
            update_logs: []
          };
        }

        // Determine lifecycle status transition (Pause vs. Resume vs. Close vs. Active)
        let newIsDisable = existing.is_disable;
        let statusLabel = existing.is_disable === 1 ? 'PAUSED' : 'ACTIVE';

        if (survey.action === 'pause' || survey.status === 'paused') {
          newIsDisable = 1;
          statusLabel = 'PAUSED';
        } else if (survey.action === 'close' || survey.status === 'closed') {
          newIsDisable = 1;
          statusLabel = 'CLOSED';
        } else if (survey.action === 'resume' || survey.status === 'active') {
          newIsDisable = 0;
          statusLabel = 'ACTIVE';
        }

        // Capture newly received update content verbatim
        const updateContent = survey.update_text || survey.action_reason || survey.project_content || `Project state updated to ${statusLabel}.`;

        // Add this email as a new chronological update log entry (NEVER overwriting base_requirements)
        const updateEntry = {
          date: emailDate.toISOString(),
          subject: survey.project_name || existing.project_name || 'Project Update Dispatch',
          email_subject: survey.project_name || existing.project_name || 'Project Update Dispatch',
          action: survey.action || 'update',
          status: statusLabel,
          action_reason: survey.action_reason || updateContent,
          summary: updateContent,
          notes: updateContent,
          excluded_groups: Array.isArray(survey.excluded_groups) ? survey.excluded_groups : [],
          age_range: survey.age_range || null,
          occupation: survey.occupation || null,
          quota: Number(survey.project_quota) || null,
          updated_quota: Number(survey.project_quota) || null,
          cpi: Number(survey.project_cpi) || null,
          updated_cpi: Number(survey.project_cpi) || null
        };

        timeline.update_logs = timeline.update_logs || [];
        timeline.update_logs.push(updateEntry);

        // Determine country code and country name
        const countryInfo = MySQLSyncService.resolveCountryInfo(survey);

        if (timeline.base_requirements) {
          if (!timeline.base_requirements.country_code || timeline.base_requirements.country_code === 'EMAIL_SURVEY') {
            timeline.base_requirements.country_code = countryInfo.code;
          }
          if (!timeline.base_requirements.target_country || timeline.base_requirements.target_country === 'Global' || (timeline.base_requirements.target_country === 'United States' && countryInfo.code !== 'US')) {
            timeline.base_requirements.target_country = countryInfo.name;
            timeline.base_requirements.country = countryInfo.name;
          }
        }

        const updateData = {
          is_disable: newIsDisable,
          project_content: JSON.stringify(timeline),
          update_time: emailDate,
          ...(Number(survey.project_cpi) > 0 ? { project_cpi: Number(survey.project_cpi) } : {}),
          ...(Number(survey.project_quota) > 0 ? { project_quota: Number(survey.project_quota) } : {}),
          ...(survey.project_click_url ? { project_click_url: survey.project_click_url } : {})
        };

        // Update project_code to valid country ISO if it was EMAIL_SURVEY, missing, or defaulted to US
        if (countryInfo.code && (existing.project_code === 'EMAIL_SURVEY' || !existing.project_code || (existing.project_code === 'US' && countryInfo.code !== 'US'))) {
          updateData.project_code = countryInfo.code;
        }

        // Clean project title if existing title contained price
        if (existing.project_name) {
          const cleanedName = MySQLSyncService.cleanProjectTitle(existing.project_name);
          if (cleanedName && cleanedName !== existing.project_name) {
            updateData.project_name = cleanedName;
          }
        }

        // Update existing project in ya_project without altering base specifications
        await prisma.project.update({
          where: { project_id: existing.project_id },
          data: updateData
        });

        console.log(`[Sync] Appended chronological update log (Status: ${statusLabel}, Country: ${countryInfo.code}) to ya_project for PNO ${existing.project_pno}`);
        return existing.project_id;
      }

      // 4. Generate unique Project PNO
      const projectPno = `M_${platform.platform_id}_${rawNo}_${Date.now().toString().slice(-6)}`;

      // 5. Determine if incoming initial email is a pause or closure notice
      const isPauseOrClose = survey.action === 'pause' || survey.status === 'paused' || survey.action === 'close' || survey.status === 'closed';
      if (isPauseOrClose) {
        console.log(`[Sync] Received pause/hold for unlaunched study "${rawNo}". Recording as paused survey (is_disable: 1) without opening live traffic.`);
      }

      const rawSpecsText = survey.raw_specs || survey.project_content || '';
      const countryInfo = MySQLSyncService.resolveCountryInfo(survey);

      // 6. Build Initial Base Requirements with Chronological Timeline
      const initialTimeline = {
        is_timeline: true,
        base_requirements: {
          created_at: emailDate.toISOString(),
          target_country: countryInfo.name,
          country: countryInfo.name,
          country_code: countryInfo.code,
          age_range: survey.age_range || '18-65',
          occupation: survey.occupation || 'General Audience',
          target_demographics: survey.target_demographics || survey.occupation || 'General Audience',
          initial_quota: Number(survey.project_quota) || 100,
          initial_cpi: Number(survey.project_cpi) || 1.0,
          initial_loi: Number(survey.project_loi) || 15,
          initial_ir: Number(survey.project_ir) || 50,
          summary: rawSpecsText || 'Initial live project dispatch specifications.',
          description: rawSpecsText || 'Initial live project dispatch specifications.',
          raw_specs: rawSpecsText
        },
        update_logs: isPauseOrClose ? [{
          date: emailDate.toISOString(),
          subject: survey.project_name || 'Project Suspended',
          email_subject: survey.project_name || 'Project Suspended',
          action: 'pause',
          status: 'PAUSED',
          action_reason: survey.action_reason || 'Client suspended project',
          summary: survey.update_text || survey.action_reason || 'Project placed on hold upon notification.',
          notes: survey.update_text || survey.action_reason || 'Project placed on hold upon notification.',
          excluded_groups: [],
          quota: Number(survey.project_quota) || null,
          cpi: Number(survey.project_cpi) || null
        }] : []
      };

      // 7. Insert into ya_project with actual email timestamp, country code in project_code, and correct is_disable state
      const project = await prisma.project.create({
        data: {
          project_pno: projectPno,
          project_no: rawNo,
          platform_id: platform.platform_id,
          project_name: MySQLSyncService.cleanProjectTitle(survey.project_name || 'Email Survey Offer'),
          project_code: countryInfo.code || 'US',
          project_cpi: Number(survey.project_cpi) || 0.0,
          project_currency: currencyId,
          project_quota: Number(survey.project_quota) || 100,
          project_loi: Number(survey.project_loi) || 15,
          project_ir: Number(survey.project_ir) || 50,
          project_click_url: survey.project_click_url || '',
          project_content: JSON.stringify(initialTimeline),
          is_disable: isPauseOrClose ? 1 : 0,
          is_api: 0,
          create_time: emailDate,
          update_time: emailDate
        }
      });

      console.log(`[Sync] Successfully saved to ya_project: ${project.project_name} [${project.project_pno}] (Country: ${countryInfo.code}, is_disable: ${project.is_disable})`);
      return project.project_id;
    } catch (err) {
      console.error('[Sync] Failed to sync survey to MySQL ya_project:', err.message);
      return null;
    }
  }

  /**
   * Sanitizes automated project titles to remove price/dollar mentions (e.g. "- $8.00", "$2.50", "WAN $7")
   */
  static cleanProjectTitle(title) {
    if (!title) return '';
    let cleaned = String(title);

    // Remove price segments: e.g. "- $8.00", "- $2.50", "-$8", " $7", "$2.50 & $8.00", "CPI: $4.50"
    cleaned = cleaned.replace(/[-\s]*(?:CPI\s*[:=\s]*)?\$[0-9]+(?:\.[0-9]+)?(?:\s*(?:&|and|,)\s*\$[0-9]+(?:\.[0-9]+)?)?(?:\s*(?:USD|EUR|GBP|AUD|CAD))?/gi, ' ');
    cleaned = cleaned.replace(/[-\s]*[0-9]+(?:\.[0-9]+)?\s*(?:USD|EUR|GBP)\b/gi, ' ');

    // Clean up dangling delimiters like "|| ||", "|| -", "- ||", extra spaces
    cleaned = cleaned.replace(/\s*\|\|\s*\|\|\s*/g, ' || ');
    cleaned = cleaned.replace(/\s*-\s*\|\|\s*/g, ' || ');
    cleaned = cleaned.replace(/\s*\|\|\s*-\s*/g, ' || ');
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    cleaned = cleaned.replace(/^\s*[-|]+\s*/, '');
    cleaned = cleaned.replace(/\s*[-|]+\s*$/, '');
    return cleaned.trim() || title;
  }

  /**
   * Resolves country ISO 2-letter code and full name from survey fields,
   * title tags, specifications text, or currency.
   */
  static resolveCountryInfo(survey = {}) {
    const COUNTRY_MAP = {
      'US': { code: 'US', name: 'United States' },
      'USA': { code: 'US', name: 'United States' },
      'UNITED STATES': { code: 'US', name: 'United States' },
      'AMERICA': { code: 'US', name: 'United States' },
      'UK': { code: 'GB', name: 'United Kingdom' },
      'GB': { code: 'GB', name: 'United Kingdom' },
      'GBR': { code: 'GB', name: 'United Kingdom' },
      'UNITED KINGDOM': { code: 'GB', name: 'United Kingdom' },
      'GREAT BRITAIN': { code: 'GB', name: 'United Kingdom' },
      'ENGLAND': { code: 'GB', name: 'United Kingdom' },
      'SCOTLAND': { code: 'GB', name: 'United Kingdom' },
      'WALES': { code: 'GB', name: 'United Kingdom' },
      'CA': { code: 'CA', name: 'Canada' },
      'CAN': { code: 'CA', name: 'Canada' },
      'CANADA': { code: 'CA', name: 'Canada' },
      'AU': { code: 'AU', name: 'Australia' },
      'AUS': { code: 'AU', name: 'Australia' },
      'AUSTRALIA': { code: 'AU', name: 'Australia' },
      'NZ': { code: 'NZ', name: 'New Zealand' },
      'NZL': { code: 'NZ', name: 'New Zealand' },
      'NEW ZEALAND': { code: 'NZ', name: 'New Zealand' },
      'ES': { code: 'ES', name: 'Spain' },
      'ESP': { code: 'ES', name: 'Spain' },
      'SPAIN': { code: 'ES', name: 'Spain' },
      'ESPANA': { code: 'ES', name: 'Spain' },
      'BR': { code: 'BR', name: 'Brazil' },
      'BRA': { code: 'BR', name: 'Brazil' },
      'BRAZIL': { code: 'BR', name: 'Brazil' },
      'BRASIL': { code: 'BR', name: 'Brazil' },
      'DE': { code: 'DE', name: 'Germany' },
      'DEU': { code: 'DE', name: 'Germany' },
      'GERMANY': { code: 'DE', name: 'Germany' },
      'DEUTSCHLAND': { code: 'DE', name: 'Germany' },
      'FR': { code: 'FR', name: 'France' },
      'FRA': { code: 'FR', name: 'France' },
      'FRANCE': { code: 'FR', name: 'France' },
      'IT': { code: 'IT', name: 'Italy' },
      'ITA': { code: 'IT', name: 'Italy' },
      'ITALY': { code: 'IT', name: 'Italy' },
      'ITALIA': { code: 'IT', name: 'Italy' },
      'JP': { code: 'JP', name: 'Japan' },
      'JPN': { code: 'JP', name: 'Japan' },
      'JAPAN': { code: 'JP', name: 'Japan' },
      'CN': { code: 'CN', name: 'China' },
      'CHN': { code: 'CN', name: 'China' },
      'CHINA': { code: 'CN', name: 'China' },
      'IN': { code: 'IN', name: 'India' },
      'IND': { code: 'IN', name: 'India' },
      'INDIA': { code: 'IN', name: 'India' },
      'MX': { code: 'MX', name: 'Mexico' },
      'MEX': { code: 'MX', name: 'Mexico' },
      'MEXICO': { code: 'MX', name: 'Mexico' },
      'NL': { code: 'NL', name: 'Netherlands' },
      'NLD': { code: 'NL', name: 'Netherlands' },
      'NETHERLANDS': { code: 'NL', name: 'Netherlands' },
      'HOLLAND': { code: 'NL', name: 'Netherlands' },
      'SE': { code: 'SE', name: 'Sweden' },
      'SWE': { code: 'SE', name: 'Sweden' },
      'SWEDEN': { code: 'SE', name: 'Sweden' },
      'NO': { code: 'NO', name: 'Norway' },
      'NOR': { code: 'NO', name: 'Norway' },
      'NORWAY': { code: 'NO', name: 'Norway' },
      'DK': { code: 'DK', name: 'Denmark' },
      'DNK': { code: 'DK', name: 'Denmark' },
      'DENMARK': { code: 'DK', name: 'Denmark' },
      'FI': { code: 'FI', name: 'Finland' },
      'FIN': { code: 'FI', name: 'Finland' },
      'FINLAND': { code: 'FI', name: 'Finland' },
      'PL': { code: 'PL', name: 'Poland' },
      'POL': { code: 'PL', name: 'Poland' },
      'POLAND': { code: 'PL', name: 'Poland' },
      'CH': { code: 'CH', name: 'Switzerland' },
      'CHE': { code: 'CH', name: 'Switzerland' },
      'SWITZERLAND': { code: 'CH', name: 'Switzerland' },
      'AT': { code: 'AT', name: 'Austria' },
      'AUT': { code: 'AT', name: 'Austria' },
      'AUSTRIA': { code: 'AT', name: 'Austria' },
      'BE': { code: 'BE', name: 'Belgium' },
      'BEL': { code: 'BE', name: 'Belgium' },
      'BELGIUM': { code: 'BE', name: 'Belgium' },
      'PT': { code: 'PT', name: 'Portugal' },
      'PRT': { code: 'PT', name: 'Portugal' },
      'PORTUGAL': { code: 'PT', name: 'Portugal' },
      'IE': { code: 'IE', name: 'Ireland' },
      'IRL': { code: 'IE', name: 'Ireland' },
      'IRELAND': { code: 'IE', name: 'Ireland' },
      'SG': { code: 'SG', name: 'Singapore' },
      'SGP': { code: 'SG', name: 'Singapore' },
      'SINGAPORE': { code: 'SG', name: 'Singapore' },
      'HK': { code: 'HK', name: 'Hong Kong' },
      'HKG': { code: 'HK', name: 'Hong Kong' },
      'HONG KONG': { code: 'HK', name: 'Hong Kong' },
      'KR': { code: 'KR', name: 'South Korea' },
      'KOR': { code: 'KR', name: 'South Korea' },
      'SOUTH KOREA': { code: 'KR', name: 'South Korea' },
      'KOREA': { code: 'KR', name: 'South Korea' },
      'TW': { code: 'TW', name: 'Taiwan' },
      'TWN': { code: 'TW', name: 'Taiwan' },
      'TAIWAN': { code: 'TW', name: 'Taiwan' },
      'TH': { code: 'TH', name: 'Thailand' },
      'THA': { code: 'TH', name: 'Thailand' },
      'THAILAND': { code: 'TH', name: 'Thailand' },
      'MY': { code: 'MY', name: 'Malaysia' },
      'MYS': { code: 'MY', name: 'Malaysia' },
      'MALAYSIA': { code: 'MY', name: 'Malaysia' },
      'ID': { code: 'ID', name: 'Indonesia' },
      'IDN': { code: 'ID', name: 'Indonesia' },
      'INDONESIA': { code: 'ID', name: 'Indonesia' },
      'PH': { code: 'PH', name: 'Philippines' },
      'PHL': { code: 'PH', name: 'Philippines' },
      'PHILIPPINES': { code: 'PH', name: 'Philippines' },
      'VN': { code: 'VN', name: 'Vietnam' },
      'VNM': { code: 'VN', name: 'Vietnam' },
      'VIETNAM': { code: 'VN', name: 'Vietnam' },
      'ZA': { code: 'ZA', name: 'South Africa' },
      'ZAF': { code: 'ZA', name: 'South Africa' },
      'SOUTH AFRICA': { code: 'ZA', name: 'South Africa' },
      'AR': { code: 'AR', name: 'Argentina' },
      'ARG': { code: 'AR', name: 'Argentina' },
      'ARGENTINA': { code: 'AR', name: 'Argentina' },
      'CL': { code: 'CL', name: 'Chile' },
      'CHL': { code: 'CL', name: 'Chile' },
      'CHILE': { code: 'CL', name: 'Chile' },
      'CO': { code: 'CO', name: 'Colombia' },
      'COL': { code: 'CO', name: 'Colombia' },
      'COLOMBIA': { code: 'CO', name: 'Colombia' },
      'PE': { code: 'PE', name: 'Peru' },
      'PER': { code: 'PE', name: 'Peru' },
      'PERU': { code: 'PE', name: 'Peru' },
      'TR': { code: 'TR', name: 'Turkey' },
      'TUR': { code: 'TR', name: 'Turkey' },
      'TURKEY': { code: 'TR', name: 'Turkey' },
      'TURKIYE': { code: 'TR', name: 'Turkey' },
      'SA': { code: 'SA', name: 'Saudi Arabia' },
      'SAU': { code: 'SA', name: 'Saudi Arabia' },
      'SAUDI ARABIA': { code: 'SA', name: 'Saudi Arabia' },
      'KSA': { code: 'SA', name: 'Saudi Arabia' },
      'AE': { code: 'AE', name: 'UAE' },
      'ARE': { code: 'AE', name: 'UAE' },
      'UAE': { code: 'AE', name: 'UAE' },
      'UNITED ARAB EMIRATES': { code: 'AE', name: 'UAE' },
      'IL': { code: 'IL', name: 'Israel' },
      'ISR': { code: 'IL', name: 'Israel' },
      'ISRAEL': { code: 'IL', name: 'Israel' },
      'RU': { code: 'RU', name: 'Russia' },
      'RUS': { code: 'RU', name: 'Russia' },
      'RUSSIA': { code: 'RU', name: 'Russia' },
      'EG': { code: 'EG', name: 'Egypt' },
      'EGY': { code: 'EG', name: 'Egypt' },
      'EGYPT': { code: 'EG', name: 'Egypt' },
      'GR': { code: 'GR', name: 'Greece' },
      'GRC': { code: 'GR', name: 'Greece' },
      'GREECE': { code: 'GR', name: 'Greece' },
      'QA': { code: 'QA', name: 'Qatar' },
      'QAT': { code: 'QA', name: 'Qatar' },
      'QATAR': { code: 'QA', name: 'Qatar' },
      'KW': { code: 'KW', name: 'Kuwait' },
      'KWT': { code: 'KW', name: 'Kuwait' },
      'KUWAIT': { code: 'KW', name: 'Kuwait' },
      'RO': { code: 'RO', name: 'Romania' },
      'ROU': { code: 'RO', name: 'Romania' },
      'ROMANIA': { code: 'RO', name: 'Romania' },
      'MA': { code: 'MA', name: 'Morocco' },
      'MAR': { code: 'MA', name: 'Morocco' },
      'MOROCCO': { code: 'MA', name: 'Morocco' },
      'VIET NAM': { code: 'VN', name: 'Vietnam' },
      'KOREA (SOUTH)': { code: 'KR', name: 'South Korea' },
      'HONG KONG, SAR CHINA': { code: 'HK', name: 'Hong Kong' }
    };

    const clean = (val) => String(val || '').trim().toUpperCase();

    // 1. Explicit country_code provided
    if (survey.country_code) {
      const codeKey = clean(survey.country_code);
      if (COUNTRY_MAP[codeKey]) return { ...COUNTRY_MAP[codeKey] };
      if (codeKey.length === 2 && codeKey !== 'GL') return { code: codeKey, name: survey.target_country || codeKey };
    }

    // 2. Target country or country provided
    const targetCountryRaw = survey.target_country || survey.country || '';
    if (targetCountryRaw) {
      // Split if comma separated (e.g. "UK, FR, DE" -> check first)
      const parts = targetCountryRaw.split(/[,/|]/).map(p => clean(p)).filter(Boolean);
      for (const part of parts) {
        if (COUNTRY_MAP[part]) return { ...COUNTRY_MAP[part] };
      }
    }

    // 3. Inspect project name / title (e.g. "[Australia] 1867967", "GI8762 [JP]", "B2C-NL", "KSA Tracker")
    const pName = survey.project_name || '';
    if (pName) {
      // Check bracketed expression: e.g. [Australia], [UK], [United Kingdom], [ES], [JP]
      const bracketMatch = pName.match(/\[([A-Za-z0-9\s_-]+)\]/);
      if (bracketMatch) {
        const inside = clean(bracketMatch[1]);
        if (COUNTRY_MAP[inside]) return { ...COUNTRY_MAP[inside] };
      }

      // Check pipe segments e.g. "|| B2C - QA", "|| B2B - USA", "|| Qatar"
      const segments = pName.split(/\|\||\|/).map(s => s.trim());
      for (const seg of segments) {
        const segTagMatch = seg.match(/\b(?:B2B|B2C|WANS?)[-\s]+([A-Za-z]{2,3})\b/i);
        if (segTagMatch) {
          const tag = clean(segTagMatch[1]);
          if (COUNTRY_MAP[tag]) return { ...COUNTRY_MAP[tag] };
        }
        const cleanSeg = clean(seg);
        if (COUNTRY_MAP[cleanSeg]) return { ...COUNTRY_MAP[cleanSeg] };
      }

      // Check hyphenated/spaced tags: e.g. "B2C-NL", "B2B US", "B2C US", "WANS-NL"
      const tagMatch = pName.match(/\b(?:B2B|B2C|WANS?)[-\s]+([A-Za-z]{2,3})\b/i);
      if (tagMatch) {
        const tag = clean(tagMatch[1]);
        if (COUNTRY_MAP[tag]) return { ...COUNTRY_MAP[tag] };
      }

      // Check standalone country keywords in title
      for (const [key, info] of Object.entries(COUNTRY_MAP)) {
        if (key.length > 2) {
          const regex = new RegExp(`\\b${key}\\b`, 'i');
          if (regex.test(pName)) return { ...info };
        }
      }
    }

    // 4. Inspect raw_specs or project_content text (e.g. "Geography: United Kingdom", "Country: Spain")
    const specsText = survey.raw_specs || survey.project_content || '';
    if (specsText) {
      const geoMatch = specsText.match(/(?:Geography|Country|Market|Location)\s*:\s*([^\r\n]+)/i);
      if (geoMatch) {
        const geoStr = geoMatch[1].trim();
        const parts = geoStr.split(/[,/|;]/).map(p => clean(p)).filter(Boolean);
        for (const part of parts) {
          if (COUNTRY_MAP[part]) return { ...COUNTRY_MAP[part] };
        }
      }
    }

    // 5. Currency heuristics (for non-USD explicit foreign currencies)
    const curr = clean(survey.currency);
    const CURR_MAP = {
      'GBP': { code: 'GB', name: 'United Kingdom' },
      'AUD': { code: 'AU', name: 'Australia' },
      'CAD': { code: 'CA', name: 'Canada' },
      'BRL': { code: 'BR', name: 'Brazil' },
      'MXN': { code: 'MX', name: 'Mexico' },
      'INR': { code: 'IN', name: 'India' },
      'JPY': { code: 'JP', name: 'Japan' },
      'SEK': { code: 'SE', name: 'Sweden' },
      'NOK': { code: 'NO', name: 'Norway' },
      'DKK': { code: 'DK', name: 'Denmark' },
      'PLN': { code: 'PL', name: 'Poland' },
      'CHF': { code: 'CH', name: 'Switzerland' },
      'NZD': { code: 'NZ', name: 'New Zealand' },
      'SGD': { code: 'SG', name: 'Singapore' },
      'HKD': { code: 'HK', name: 'Hong Kong' },
      'ZAR': { code: 'ZA', name: 'South Africa' },
      'TRY': { code: 'TR', name: 'Turkey' }
    };
    if (CURR_MAP[curr]) {
      return { ...CURR_MAP[curr] };
    }

    // Default fallback
    return { code: 'US', name: 'United States' };
  }
}

module.exports = MySQLSyncService;
