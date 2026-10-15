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

      // 3. Check for existing project with this project_no under this platform
      const existing = await prisma.project.findFirst({
        where: {
          platform_id: platform.platform_id,
          project_no: String(survey.project_no)
        }
      });

      if (existing) {
        console.log(`[Sync] Survey already exists in ya_project: PNO ${existing.project_pno}`);
        return existing.project_id;
      }

      // 4. Generate unique Project PNO
      const projectPno = `M_${platform.platform_id}_${survey.project_no}_${Date.now().toString().slice(-6)}`;

      // 5. Insert into ya_project with clear Email Survey tag
      const project = await prisma.project.create({
        data: {
          project_pno: projectPno,
          project_no: String(survey.project_no),
          platform_id: platform.platform_id,
          project_name: survey.project_name || 'Email Survey Offer',
          project_code: 'EMAIL_SURVEY', // Explicit platform tag
          project_cpi: Number(survey.project_cpi) || 0.0,
          project_currency: currencyId,
          project_quota: Number(survey.project_quota) || 100,
          project_loi: Number(survey.project_loi) || 15,
          project_ir: Number(survey.project_ir) || 50,
          project_click_url: survey.project_click_url || '',
          project_content: `[Tag: Email Survey] ${survey.project_content || ''} (Target: ${survey.target_country || 'General'})`,
          is_disable: 0,
          is_api: 0, // Flagged explicitly as Manual/Custom Survey
          create_time: new Date()
        }
      });

      console.log(`[Sync] Successfully saved to ya_project: ${project.project_name} [${project.project_pno}]`);
      return project.project_id;
    } catch (err) {
      console.error('[Sync] Failed to sync survey to MySQL ya_project:', err.message);
      return null;
    }
  }
}

module.exports = MySQLSyncService;
