const axios = require('axios');

class SurveyIntegrationService {
  /**
   * Helper to decode platform param list
   */
  static getParamsMap(paramsStr) {
    const paramsMap = {};
    if (!paramsStr) return paramsMap;
    try {
      const arr = typeof paramsStr === 'string' ? JSON.parse(paramsStr) : paramsStr;
      if (Array.isArray(arr)) {
        arr.forEach(p => {
          paramsMap[p.name] = p.value;
        });
      }
    } catch (e) {
      console.error('Failed to parse platform params:', e.message);
    }
    return paramsMap;
  }

  /**
   * Perform live quota check
   */
  static async checkQuota(project, platform) {
    const params = this.getParamsMap(platform.params);
    const sign = platform.platform_sign;

    if (sign === 'Gowebsurveys') {
      const key = params['app_key'];
      const aid = params['app_id'];
      const surveyId = isNaN(Number(project.project_no)) ? project.project_no : Number(project.project_no);

      const resQuota = await axios.post(platform.platform_quota_url, {
        surveyIDs: surveyId
      }, {
        headers: {
          'Accept': 'application/json',
          'Authorization': key,
          'payload': aid,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const baseUrl = platform.platform_quota_url.replace('/quotaStatus', '');
      let resQual = null;
      try {
        resQual = await axios.post(`${baseUrl}/getQualification`, {
          surveyID: surveyId
        }, {
          headers: {
            'Accept': 'application/json',
            'Authorization': key,
            'payload': aid,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
      } catch (e) {
        console.error('Failed to fetch Gowebsurveys qualification details:', e.message);
      }

      const quotaData = resQuota.data;
      if (quotaData && quotaData.apiStatus === 1) {
        return {
          type: 'structured',
          surveyInfo: quotaData.surveyInfo || [],
          qualData: resQual ? resQual.data : [],
          project: {
            project_quota: project.project_quota,
            project_complete: project.project_complete
          }
        };
      } else {
        return {
          type: 'content',
          content: quotaData.apiMessages || 'Unable to fetch quota details.'
        };
      }
    }

    if (sign === 'Zamplia') {
      const key = params['app_key'];
      const cleanUrl = platform.platform_quota_url.replace(/\s+/g, '');
      const quotaUrl = `${cleanUrl.replace(/\/$/, '')}?SurveyId=${project.project_no}`;

      const resQuota = await axios.get(quotaUrl, {
        headers: { 'Accept': 'application/json', 'ZAMP-KEY': key },
        timeout: 30000
      });

      const qualUrl = `${cleanUrl.replace('GetSurveyQuotas', 'GetSurveyQualifications').replace(/\/$/, '')}?SurveyId=${project.project_no}`;
      let resQual = null;
      try {
        resQual = await axios.get(qualUrl, {
          headers: { 'Accept': 'application/json', 'ZAMP-KEY': key },
          timeout: 30000
        });
      } catch (e) {
        console.error('Zamplia qualifications fetch failed:', e.message);
      }

      const codeParts = (project.project_code || '').split('|');
      const langId = codeParts[1] ? Number(codeParts[1]) : 9;
      const demoUrl = `${cleanUrl.replace('Surveys/GetSurveyQuotas', 'Attributes/GetDemoGraphics').replace('Surveys/GetSurveyQualifications', 'Attributes/GetDemoGraphics').replace(/\/$/, '')}?LanguageId=${langId}`;
      let resDemo = null;
      try {
        resDemo = await axios.get(demoUrl, {
          headers: { 'Accept': 'application/json', 'ZAMP-KEY': key },
          timeout: 30000
        });
      } catch (e) {
        console.error('Zamplia demographics fetch failed:', e.message);
      }

      const result = resQuota.data;
      if (result && result.success) {
        const qualResult = resQual ? resQual.data : {};
        const demoResult = resDemo ? resDemo.data : {};

        const demoQuestions = {};
        const demoAnswers = {};
        if (demoResult.success && demoResult.result && demoResult.result.data) {
          demoResult.result.data.forEach(d => {
            const qId = d.QuestionID;
            demoQuestions[qId] = d.QuestionText || qId;
            if (d.AnswerCodes && Array.isArray(d.AnswerCodes)) {
              d.AnswerCodes.forEach(ans => {
                const ac = ans.AnswerCode ?? '';
                const at = ans.AnswerText ?? ac;
                demoAnswers[`${qId}_${ac}`] = at;
              });
            }
          });
        }

        const css = `<style>
          .quota_table{width:100%;border-collapse:collapse;font-size:13px;}
          .quota_table th{text-align:left;padding:10px 14px;color:#888;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.04);white-space:nowrap;}
          .quota_table td{padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.04);color:inherit;vertical-align:top;}
          .quota_table tr:last-child td{border-bottom:none;}
          .quota_table tr:nth-child(even) td{background:rgba(255,255,255,0.015);}
          .qs-panel{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;}
          .qs-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;}
          .qs-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.06em;font-weight:500;margin-bottom:6px;}
          .qs-value{font-size:22px;font-weight:700;color:inherit;}
          .qs-value.ok{color:rgba(14,255,78,.85);}
          .qs-section-title{font-size:12px;font-weight:600;color:#a9a9ca;text-transform:uppercase;letter-spacing:.05em;margin:18px 0 8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);}
          .qs-panel-wrap{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;margin-bottom:16px;}
        </style>`;
        let content = css;
        const surveyData = result.result.data[0] || {};
        const totalQuota = surveyData.TotalQuotaCount || 0;

        content += `<div class="qs-panel">
          <div class="qs-card"><div class="qs-label">Total Quota</div><div class="qs-value">${totalQuota}</div></div>
          <div class="qs-card"><div class="qs-label">Completed</div><div class="qs-value">${project.project_complete}</div></div>
          <div class="qs-card"><div class="qs-label">Remaining</div><div class="qs-value ok">${Math.max(0, totalQuota - project.project_complete)}</div></div>
        </div>`;

        if (surveyData.QuotaQualifications && surveyData.QuotaQualifications.length > 0) {
          content += `<div class="qs-section-title">Quota Breakdown</div>
            <div class="qs-panel-wrap">
              <table class="quota_table">
                <thead><tr><th>Condition</th><th>Total Qualification Count</th><th>Total Quota Count</th></tr></thead>
                <tbody>`;
          surveyData.QuotaQualifications.forEach(q => {
            content += `<tr>
              <td><p style="padding-left:20px;font-size:14px;margin-top:10px;">${this.escapeHtml(q.AnswerText || '')}</p></td>
              <td><p style="padding-left:20px;font-size:14px;margin-top:10px;">${q.TotalQualificationCount || 0}</p></td>
              <td><p style="padding-left:20px;font-size:14px;margin-top:10px;">${q.TotalQuotaCount || 0}</p></td>
            </tr>`;
          });
          content += `</tbody></table></div>`;
        }

        if (qualResult.success && qualResult.result && qualResult.result.data) {
          content += `<div class="qs-section-title">Qualifications</div>
            <div class="qs-panel-wrap">
              <table class="quota_table">
                <thead><tr><th>Question</th><th>Type</th><th>Answers</th></tr></thead>
                <tbody>`;
          qualResult.result.data.forEach(q => {
            const qId = q.QuestionID || '';
            const qText = demoQuestions[qId] || qId;
            const qType = q.QuestionType || '';
            const mappedAnswers = [];
            if (q.AnswerCodes) {
              q.AnswerCodes.forEach(ac => {
                mappedAnswers.push(demoAnswers[`${qId}_${ac}`] || ac);
              });
            }
            content += `<tr>
              <td><p style="padding-left:20px;font-size:14px;margin-top:10px;">${this.escapeHtml(qText)}</p></td>
              <td><p style="padding-left:20px;font-size:14px;margin-top:10px;">${this.escapeHtml(qType)}</p></td>
              <td><p style="padding-left:20px;font-size:14px;margin-top:10px;">${this.escapeHtml(mappedAnswers.join(', '))}</p></td>
            </tr>`;
          });
          content += `</tbody></table></div>`;
        }

        return { type: 'content', content: content, surveyInfo: result, qualData: qualResult };
      } else {
        return { type: 'content', content: result.message || 'Failed to fetch Zamplia quota.' };
      }
    }

    if (project.project_content && (project.project_content.startsWith('http://') || project.project_content.startsWith('https://'))) {
      return { type: 'link', content: project.project_content };
    }
    return { type: 'content', content: project.project_content || 'No live qualifications requirements defined.' };
  }

  /**
   * Escape HTML helpers
   */
  static escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

module.exports = SurveyIntegrationService;
