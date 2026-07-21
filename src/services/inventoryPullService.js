const prisma = require('../config/database');
const axios = require('axios');
const crypto = require('crypto');

class InventoryPullService {
  /**
   * Run sync operations across all active platforms
   */
  static async pullAll() {
    const platforms = await prisma.platform.findMany({
      where: {
        delete_time: null,
        is_disable: 0,
        platform_sign: { in: ['Gowebsurveys', 'Zamplia'] }
      }
    });

    for (const platform of platforms) {
      try {
        await this.pullPlatform(platform);
      } catch (err) {
        console.error(`Failed to pull from platform: ${platform.platform_name}`, err.message);
      }
    }
  }

  /**
   * Sync single platform based on its unique signing strategy
   */
  static async pullPlatform(platform) {
    if (platform.platform_sign !== 'Gowebsurveys' && platform.platform_sign !== 'Zamplia') {
      console.log(`Platform ${platform.platform_name} does not support automated inventory pull.`);
      return;
    }

    const platformParams = platform.params ? JSON.parse(platform.params) : [];
    const paramsMap = {};
    platformParams.forEach(p => { paramsMap[p.name] = p.value; });

    const currency = await prisma.currency.findUnique({
      where: { currency_id: platform.platform_currency }
    });
    if (!currency) {
      throw new Error(`Currency configuration ${platform.platform_currency} not found`);
    }

    // Flag previous API inventory as deleted to prevent serving stale items
    await prisma.project.updateMany({
      where: { platform_id: platform.platform_id, is_api: 1 },
      data: { delete_time: new Date(), is_disable: 1 }
    });

    switch (platform.platform_sign) {
      case 'Gowebsurveys':
        await this.pullGowebsurveys(platform, paramsMap, currency);
        break;
      case 'Zamplia':
        await this.pullZamplia(platform, paramsMap, currency);
        break;
    }
  }

  /**
   * Pull Gowebsurveys surveys
   */
  static async pullGowebsurveys(platform, params, currency) {
    const res = await axios.get(platform.platform_url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': params['app_key'] || '',
        'payload': params['app_id'] || ''
      }
    });

    if (res.data && res.data.surveys) {
      const allSurveys = res.data.surveys;
      const liveSurveys = [];

      // Query quota status in batches of 25 to see which ones are live (surveyStatus = 3)
      const batchSize = 25;
      for (let i = 0; i < allSurveys.length; i += batchSize) {
        const batch = allSurveys.slice(i, i + batchSize);
        const surveyIDs = batch.map(s => s.surveyID).join(',');

        try {
          const quotaRes = await axios.post(platform.platform_quota_url, {
            surveyIDs: surveyIDs
          }, {
            headers: {
              'Accept': 'application/json',
              'Authorization': params['app_key'] || '',
              'payload': params['app_id'] || '',
              'Content-Type': 'application/json'
            },
            timeout: 30000
          });

          if (quotaRes.data && quotaRes.data.apiStatus === 1 && quotaRes.data.surveyInfo) {
            const surveyInfoList = quotaRes.data.surveyInfo;
            // Map surveyID to its status
            const statusMap = new Map();
            surveyInfoList.forEach(info => {
              statusMap.set(String(info.surveyID), Number(info.surveyStatus));
            });

            // Filter batch items where surveyStatus is 2
            batch.forEach(survey => {
              const status = statusMap.get(String(survey.surveyID));
              if (status === 2) {
                liveSurveys.push(survey);
              }
            });
          }
        } catch (err) {
          console.error(`Failed to fetch quotaStatus for Gowebsurveys batch starting at index ${i}:`, err.message);
        }
      }

      await this.saveOffers(platform.platform_id, currency.currency_id, liveSurveys.map(survey => ({
        project_no: String(survey.surveyID),
        project_name: String(survey.surveyID),
        project_code: survey.countrieISOcode,
        project_cpi: Number(survey.surveyCPI),
        project_loi: Number(survey.LOI),
        project_ir: Number(survey.IR),
        project_quota: Number(survey.surveyTargetCount),
        project_click_url: '',
        project_content: '',
        signature: `${platform.platform_id}_${survey.surveyID}_${survey.countrieISOcode}`
      })));
    }
  }

  /**
   * Pull Zamplia surveys
   */
  static async pullZamplia(platform, params, currency) {
    const res = await axios.get(platform.platform_url, {
      headers: {
        'Accept': 'application/json',
        'ZAMP-KEY': params['app_key'] || ''
      }
    });

    if (res.data && res.data.success && res.data.result && res.data.result.data) {
      await this.saveOffers(platform.platform_id, currency.currency_id, res.data.result.data.map(survey => ({
        project_no: String(survey.SurveyId),
        project_name: survey.Name,
        project_code: survey.LanguageCode && survey.LanguageId ? `${survey.LanguageCode}|${survey.LanguageId}` : (survey.LanguageCode || ''),
        project_cpi: Number(survey.CPI),
        project_loi: Number(survey.LOI),
        project_ir: Number(survey.IR),
        project_click_url: '',
        project_content: '',
        signature: `${platform.platform_id}_${survey.SurveyId}_${survey.LanguageCode || ''}`
      })));
    }
  }

  /**
   * Helper to batch insert/update standard projects
   */
  static async saveOffers(platformId, currencyId, offers) {
    // 1. Fetch all existing projects for this platform
    const existing = await prisma.project.findMany({
      where: { platform_id: platformId }
    });
    const existingMap = new Map(existing.map(p => [p.project_sign, p]));

    const toCreate = [];
    const toUpdate = [];

    for (const item of offers) {
      const projectSign = crypto.createHash('md5').update(item.signature).digest('hex');
      const payload = {
        platform_id: platformId,
        project_sign: projectSign,
        project_no: item.project_no,
        project_name: item.project_name,
        project_code: item.project_code,
        project_cpi: item.project_cpi,
        project_loi: item.project_loi || 0,
        project_ir: item.project_ir || 0,
        project_quota: item.project_quota || 0,
        project_currency: currencyId,
        project_click_url: item.project_click_url || '',
        project_content: item.project_content || '',
        is_api: 1,
        is_disable: 0,
        delete_time: null
      };

      const existingRecord = existingMap.get(projectSign);
      if (existingRecord) {
        toUpdate.push({
          project_id: existingRecord.project_id,
          payload: {
            ...payload,
            update_time: new Date()
          }
        });
      } else {
        const uniquePno = 'PNO' + crypto.randomBytes(8).toString('hex').toUpperCase();
        toCreate.push({
          ...payload,
          project_pno: uniquePno,
          create_time: new Date(),
          update_time: new Date()
        });
      }
    }

    // 2. Perform bulk create in chunks
    if (toCreate.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < toCreate.length; i += chunkSize) {
        const chunk = toCreate.slice(i, i + chunkSize);
        await prisma.project.createMany({ data: chunk });
      }
    }

    // 3. Perform bulk update via transaction chunks to keep it fast
    if (toUpdate.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < toUpdate.length; i += chunkSize) {
        const chunk = toUpdate.slice(i, i + chunkSize);
        await prisma.$transaction(
          chunk.map(item => prisma.project.update({
            where: { project_id: item.project_id },
            data: item.payload
          }))
        );
      }
    }
  }
}

module.exports = InventoryPullService;
