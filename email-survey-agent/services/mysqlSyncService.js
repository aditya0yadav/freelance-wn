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

        // Update existing project in ya_project without altering base specifications
        await prisma.project.update({
          where: { project_id: existing.project_id },
          data: {
            is_disable: newIsDisable,
            project_content: JSON.stringify(timeline),
            update_time: emailDate,
            ...(Number(survey.project_cpi) > 0 ? { project_cpi: Number(survey.project_cpi) } : {}),
            ...(Number(survey.project_quota) > 0 ? { project_quota: Number(survey.project_quota) } : {}),
            ...(survey.project_click_url ? { project_click_url: survey.project_click_url } : {})
          }
        });

        console.log(`[Sync] Appended chronological update log (Status: ${statusLabel}) to ya_project for PNO ${existing.project_pno}`);
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
      const countryVal = survey.target_country && survey.target_country !== 'Global' ? survey.target_country : 'United States';

      // 6. Build Initial Base Requirements with Chronological Timeline
      const initialTimeline = {
        is_timeline: true,
        base_requirements: {
          created_at: emailDate.toISOString(),
          target_country: countryVal,
          country: countryVal,
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

      // 7. Insert into ya_project with actual email timestamp and correct is_disable state
      const project = await prisma.project.create({
        data: {
          project_pno: projectPno,
          project_no: rawNo,
          platform_id: platform.platform_id,
          project_name: survey.project_name || 'Email Survey Offer',
          project_code: 'EMAIL_SURVEY',
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

      console.log(`[Sync] Successfully saved to ya_project: ${project.project_name} [${project.project_pno}] (is_disable: ${project.is_disable})`);
      return project.project_id;
    } catch (err) {
      console.error('[Sync] Failed to sync survey to MySQL ya_project:', err.message);
      return null;
    }
  }
}

module.exports = MySQLSyncService;
