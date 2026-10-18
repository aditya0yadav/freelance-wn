const axios = require('axios');
const crypto = require('crypto');

class RedirectLinkService {
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
    } catch {}
    return paramsMap;
  }

  /**
   * Universal smart placeholder replacer.
   * Accurately replaces placeholders like [identifier], {uid}, <subid>, %USER_ID%, etc.
   * without accidentally replacing parameter names like 'uid=' or 'status='.
   *
   * @param {string} url - Base URL
   * @param {string} uuid - Tracking UUID
   * @param {string} defaultParam - Default param name to append if no placeholder exists
   * @returns {string} Processed URL
   */
  static replaceTrackingPlaceholder(url, uuid, defaultParam = 'uid') {
    let target = String(url || '').trim();
    if (!target) return '';

    // 1. Bracketed placeholders: [identifier], [uid], {uid}, <subid>, %USER_ID%, etc.
    const bracketedRegex = /(?:\[|\{|\<|%)(?:identifier|uid|user_id|panellist_id|clickid|click_id|subid|rid|trans_id|session_id|id|respondent_id|panellistid)(?:\]|\}|\>|%)/gi;
    if (bracketedRegex.test(target)) {
      return target.replace(bracketedRegex, uuid);
    }

    // 2. URL already ends with '=' (e.g. https://domain.com/survey?uid= or &rid=)
    if (target.endsWith('=')) {
      return `${target}${uuid}`;
    }

    // 3. Query string has empty parameter or literal placeholder value like &uid= or &rid=uid
    const paramValRegex = /([?&](?:uid|rid|subid|click_id|clickid|user_id|panellist_id|identifier|gid|trans_id|pid)=)(?:uid|subid|rid|identifier|user_id|pid)?(?=&|$)/i;
    if (paramValRegex.test(target)) {
      return target.replace(paramValRegex, `$1${uuid}`);
    }

    // 4. No placeholder found; append defaultParam=uuid
    const sep = target.includes('?') ? '&' : '?';
    return `${target}${sep}${defaultParam}=${uuid}`;
  }

  /**
   * Primary Engine:
   * Automatically generates the live redirect link according to the platform identifiers
   * of different research companies (PF, GoWebSurveys, Zamplia, TMDPanel, Cint, Dynata, Toluna, PureSpectrum, Lucid, etc.).
   *
   * @param {Object} options
   * @param {string} options.platformIdentifier - e.g. 'pf', 'Gowebsurveys', 'Zamplia', 'TMDPanel', 'cint', 'dynata', 'toluna', etc.
   * @param {string} options.clickUrl - Raw project click URL / entry link
   * @param {string} options.uuid - Unique respondent session tracking ID (e.g. 32-char hex)
   * @param {string} options.projectNo - Partner project / survey number
   * @param {string} options.rootUrl - Backend base URL for callbacks (e.g. https://wanhongsurvey.com)
   * @param {string} [options.ip] - Respondent IP address
   * @param {Object} [options.platformParams] - Decoded platform credentials (app_id, app_key, etc.)
   * @param {number} [options.isApi] - 1 for API live link, 0 for static URL
   * @returns {Promise<{ redirectUrl: string, method: string, platform: string, callbackUrls?: Object, trackingUuid: string }>}
   */
  static async generateRedirectLink({
    platformIdentifier,
    clickUrl,
    uuid,
    projectNo = '',
    rootUrl = 'https://wanhongsurvey.com',
    ip = '127.0.0.1',
    platformParams = {},
    isApi = 0
  }) {
    const cleanSign = String(platformIdentifier || '').trim().toLowerCase();
    const rawUrl = String(clickUrl || '').trim();

    // 1. PanelFocus / PureProfile ('pf', 'panelfocus', 'pureprofile')
    if (['pf', 'panelfocus', 'pureprofile'].includes(cleanSign)) {
      const finalUrl = this.replaceTrackingPlaceholder(rawUrl, uuid, 'uid');
      return {
        platform: 'PanelFocus / PF',
        redirectUrl: finalUrl,
        method: 'direct_replace',
        trackingUuid: uuid
      };
    }

    // 2. GoWebSurveys ('gowebsurveys', 'gws')
    if (['gowebsurveys', 'gws'].includes(cleanSign)) {
      const callbacks = {
        SuccessLink: `${rootUrl}/api/callback?platform=Gowebsurveys&uid={{panellist_id}}&status=C`,
        disQualifiedLink: `${rootUrl}/api/callback?platform=Gowebsurveys&uid={{panellist_id}}&status=S`,
        TermLink: `${rootUrl}/api/callback?platform=Gowebsurveys&uid={{panellist_id}}&status=T`,
        OverQuotaLink: `${rootUrl}/api/callback?platform=Gowebsurveys&uid={{panellist_id}}&status=Q`
      };

      if (isApi === 1 && rawUrl.includes('/getSurveyClickUrl')) {
        const postData = {
          surveyID: Number(projectNo) || projectNo,
          ...callbacks,
          useStaticLink: 0
        };

        const res = await axios.post(rawUrl, postData, {
          headers: {
            'Accept': 'application/json',
            'Authorization': platformParams['app_key'] || '',
            'payload': platformParams['app_id'] || '',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });

        if (res.data?.apiStatus === 1 && res.data.surveyInfo?.[0]?.SurveyEntryUrl) {
          const entryUrl = res.data.surveyInfo[0].SurveyEntryUrl;
          const pos = entryUrl.indexOf('&pid=');
          const finalUrl = pos !== -1 ? entryUrl.substring(0, pos) + '&pid=' + uuid : entryUrl + '&pid=' + uuid;
          return {
            platform: 'GoWebSurveys',
            redirectUrl: finalUrl,
            method: 'dynamic_api',
            trackingUuid: uuid,
            callbackUrls: callbacks
          };
        }
      }

      // Static URL fallback
      let finalUrl = rawUrl;
      if (finalUrl.includes('&pid=')) {
        finalUrl = finalUrl.replace(/&pid=[^&]*/, `&pid=${uuid}`);
      } else {
        finalUrl = this.replaceTrackingPlaceholder(rawUrl, uuid, 'pid');
      }
      return {
        platform: 'GoWebSurveys',
        redirectUrl: finalUrl,
        method: 'parameter_bind',
        trackingUuid: uuid,
        callbackUrls: callbacks
      };
    }

    // 3. Zamplia ('zamplia', 'zamp')
    if (['zamplia', 'zamp'].includes(cleanSign)) {
      if (isApi === 1 && platformParams['app_key']) {
        const qParams = new URLSearchParams({
          SurveyId: projectNo,
          IpAddress: ip,
          TransactionId: uuid,
          uid: uuid
        }).toString();

        const res = await axios.get(`${rawUrl}?${qParams}`, {
          headers: { 'Accept': 'application/json', 'ZAMP-KEY': platformParams['app_key'] },
          timeout: 30000
        });

        if (res.data?.result?.data?.[0]?.LiveLink) {
          return {
            platform: 'Zamplia',
            redirectUrl: res.data.result.data[0].LiveLink,
            method: 'dynamic_api',
            trackingUuid: uuid
          };
        }
      }

      const finalUrl = this.replaceTrackingPlaceholder(rawUrl, uuid, 'uid');
      return {
        platform: 'Zamplia',
        redirectUrl: finalUrl,
        method: 'direct_append',
        trackingUuid: uuid
      };
    }

    // 4. TMDPanel ('tmdpanel', 'tmd')
    if (['tmdpanel', 'tmd'].includes(cleanSign)) {
      const finalUrl = this.replaceTrackingPlaceholder(rawUrl, uuid, 'rid');
      return {
        platform: 'TMDPanel',
        redirectUrl: finalUrl,
        method: 'rid_parameter',
        trackingUuid: uuid
      };
    }

    // 5. Cint ('cint', 'opinionbar')
    if (['cint', 'opinionbar'].includes(cleanSign)) {
      const finalUrl = this.replaceTrackingPlaceholder(rawUrl, uuid, 'id');
      return {
        platform: 'Cint',
        redirectUrl: finalUrl,
        method: 'id_parameter',
        trackingUuid: uuid
      };
    }

    // 6. Dynata ('dynata', 'ssi')
    if (['dynata', 'ssi'].includes(cleanSign)) {
      const finalUrl = this.replaceTrackingPlaceholder(rawUrl, uuid, 'uid');
      return {
        platform: 'Dynata',
        redirectUrl: finalUrl,
        method: 'dynata_parameter',
        trackingUuid: uuid
      };
    }

    // 7. PureSpectrum ('purespectrum', 'ps')
    if (['purespectrum', 'ps'].includes(cleanSign)) {
      const finalUrl = this.replaceTrackingPlaceholder(rawUrl, uuid, 'transaction_id');
      return {
        platform: 'PureSpectrum',
        redirectUrl: finalUrl,
        method: 'purespectrum_parameter',
        trackingUuid: uuid
      };
    }

    // 8. Toluna ('toluna')
    if (cleanSign === 'toluna') {
      const finalUrl = this.replaceTrackingPlaceholder(rawUrl, uuid, 'gid');
      return {
        platform: 'Toluna',
        redirectUrl: finalUrl,
        method: 'gid_parameter',
        trackingUuid: uuid
      };
    }

    // 9. InnovateMR ('innovatemr', 'pointclub')
    if (['innovatemr', 'pointclub'].includes(cleanSign)) {
      const finalUrl = this.replaceTrackingPlaceholder(rawUrl, uuid, 'trans_id');
      return {
        platform: 'InnovateMR',
        redirectUrl: finalUrl,
        method: 'trans_id_parameter',
        trackingUuid: uuid
      };
    }

    // 10. Lucid / Samplicio ('lucid', 'samplicio')
    if (['lucid', 'samplicio'].includes(cleanSign)) {
      const finalUrl = this.replaceTrackingPlaceholder(rawUrl, uuid, 'PID');
      return {
        platform: 'Lucid',
        redirectUrl: finalUrl,
        method: 'pid_parameter',
        trackingUuid: uuid
      };
    }

    // 11. Mirats ('mirats')
    if (cleanSign === 'mirats') {
      const finalUrl = this.replaceTrackingPlaceholder(rawUrl, uuid, 'user_id');
      return {
        platform: 'Mirats',
        redirectUrl: finalUrl,
        method: 'user_id_parameter',
        trackingUuid: uuid
      };
    }

    // 12. Default / General Partner / Custom Email Survey Smart Replacement
    const finalUrl = this.replaceTrackingPlaceholder(rawUrl, uuid, 'uid');

    return {
      platform: platformIdentifier || 'General Custom',
      redirectUrl: finalUrl,
      method: 'smart_substitute',
      trackingUuid: uuid
    };
  }
}

module.exports = RedirectLinkService;
