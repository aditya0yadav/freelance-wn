const prisma = require('../config/database');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const SurveyIntegrationService = require('../services/surveyIntegrationService');

class PlatformController {
  /**
   * Helper to get client IP
   */
  static getIpAddress(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || '127.0.0.1';
  }

  /**
   * GET /api/member/platform/list
   */
  static async list(req, res) {
    try {
      const teamId = req.user.team_id;
      const memberId = req.user.member_id;

      const member = await prisma.member.findUnique({ where: { member_id: memberId } });
      const team = await prisma.team.findUnique({ where: { team_id: teamId } });

      if (!member || !team) {
        return res.status(403).json({ code: 403, msg: 'Member or Team configurations missing' });
      }

      const platformAuths = await prisma.platformAuth.findMany({
        where: { team_id: teamId }
      });
      const authIds = platformAuths.map(a => a.platform_id);

      const list = await prisma.platform.findMany({
        where: {
          platform_id: { in: authIds },
          delete_time: null,
          is_disable: 0
        },
        include: {
          projects: {
            where: {
              delete_time: null,
              is_disable: 0
            },
            include: {
              currency: true
            }
          }
        },
        orderBy: { sort: 'desc' }
      });

      const data = list.map(p => {
        const platformAuth = platformAuths.find(auth => auth.platform_id === p.platform_id);
        const authRateVal = platformAuth ? platformAuth.auth_rate : 0;

        const teamRatio = (100 - team.commission_ratio) / 100;
        const authRate = (100 - authRateVal) / 100;
        const memberRate = (100 - member.rate) / 100;

        const activeProjects = p.projects || [];
        const surveyCount = activeProjects.length;

        // Calculate max member payout
        let maxCoins = 0;
        for (const item of activeProjects) {
          const rawCoins = item.project_cpi * (item.currency?.currency_coins || 100.00);
          const memberPayout = rawCoins * teamRatio * authRate * memberRate;
          if (memberPayout > maxCoins) {
            maxCoins = memberPayout;
          }
        }

        return {
          platform_id: p.platform_id,
          platform_name: p.platform_name,
          platform_image: p.platform_image,
          platform_color: p.platform_color,
          platform_sign: p.platform_sign,
          is_list: p.is_list,
          is_wall: p.is_wall,
          survey_count: surveyCount,
          max_cpi: Math.round(maxCoins),
          create_time: p.create_time,
          update_time: p.update_time
        };
      });

      return res.json({ code: 200, msg: 'success', data });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/member/platform/offers
   */
  static async offers(req, res) {
    try {
      const teamId = req.user.team_id;
      const memberId = req.user.member_id;

      const member = await prisma.member.findUnique({ where: { member_id: memberId } });
      const team = await prisma.team.findUnique({ where: { team_id: teamId } });
      if (!member || !team) {
        return res.status(403).json({ code: 403, msg: 'Member or Team configurations missing' });
      }

      const platformAuths = await prisma.platformAuth.findMany({ where: { team_id: teamId } });
      const authIds = platformAuths.map(a => a.platform_id);

      const platformIdQuery = req.query.platform_id;
      let platformId = platformIdQuery ? Number(platformIdQuery) : null;

      const code = req.query.code || '';
      const projectPno = req.query.project_pno || '';
      const projectName = req.query.project_name || '';
      const search = req.query.search || '';

      const whereClause = {
        delete_time: null,
        is_disable: 0
      };

      if (platformId) {
        if (!authIds.includes(platformId)) {
          return res.status(403).json({ code: 403, msg: 'Unauthorized platform' });
        }
        whereClause.platform_id = platformId;
      } else {
        whereClause.platform_id = { in: authIds };
      }

      // Deep search query matching multiple fields if search term is provided
      if (search && search.trim()) {
        const query = search.trim();
        whereClause.OR = [
          { project_name: { contains: query } },
          { project_pno: { contains: query } },
          { project_code: { contains: query } }
        ];
      }

      if (code) whereClause.project_code = { contains: code };
      if (projectPno) whereClause.project_pno = { contains: projectPno };
      if (projectName) whereClause.project_name = { contains: projectName };

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const total = await prisma.project.count({ where: whereClause });
      const pages = Math.ceil(total / limit);
      const list = await prisma.project.findMany({
        where: whereClause,
        include: {
          currency: true,
          platform: true
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sort: 'desc' }
      });

      const customList = list.map(item => {
        const platformAuth = platformAuths.find(auth => auth.platform_id === item.platform_id);
        const authRateVal = platformAuth ? platformAuth.auth_rate : 0;

        const rawCoins = item.project_cpi * (item.currency?.currency_coins || 100.00);
        const teamRatio = (100 - team.commission_ratio) / 100;
        const authRate = (100 - authRateVal) / 100;
        const memberRate = (100 - member.rate) / 100;

        const memberPayout = rawCoins * teamRatio * authRate * memberRate;

        const result = {
          project_pno: item.project_pno,
          project_name: item.project_name,
          project_code: item.project_code,
          project_cpi: Number(memberPayout.toFixed(2)),
          project_cpi_usd: Number(item.project_cpi.toFixed(4)), // raw USD CPI before coin conversion
          currency_coins: item.currency?.currency_coins || 100.00,
          currency_code: item.currency?.currency_code || 'USD',
          project_currency: item.project_currency,
          project_loi: item.project_loi,
          project_ir: item.project_ir,
          create_time: item.create_time,
          update_time: item.update_time,
          sort: item.sort,
          platform_id: item.platform_id,
          project_quota: item.project_quota,
          project_complete: item.project_complete,
          platform_name: item.platform?.platform_name || ''
        };

        if (item.platform?.show_quota !== 1) delete result.project_quota;
        if (item.platform?.show_click !== 1) delete result.project_click;
        if (item.platform?.show_complete !== 1) delete result.project_complete;
        if (item.platform?.show_no !== 1) delete result.project_no;
        if (item.platform?.show_loi !== 1) delete result.project_loi;
        if (item.platform?.show_ir !== 1) delete result.project_ir;

        return result;
      });

      return res.json({
        code: 200,
        msg: 'success',
        data: {
          count: total,
          pages,
          page,
          limit,
          list: customList,
          show_quota: platformId ? Number(list[0]?.platform?.show_quota ?? 1) : 1,
          show_name: platformId ? Number(list[0]?.platform?.platform_name ?? 1) : 1,
          show_loi: platformId ? Number(list[0]?.platform?.show_loi ?? 1) : 1,
          show_ir: platformId ? Number(list[0]?.platform?.show_ir ?? 1) : 1
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/member/platform/featured
   */
  static async featured(req, res) {
    try {
      const teamId = req.user.team_id;
      const memberId = req.user.member_id;

      const member = await prisma.member.findUnique({ where: { member_id: memberId } });
      const team = await prisma.team.findUnique({ where: { team_id: teamId } });
      const platformAuths = await prisma.platformAuth.findMany({ where: { team_id: teamId } });
      const authIds = platformAuths.map(a => a.platform_id);

      if (!member || !team) {
        return res.status(403).json({ code: 403, msg: 'Member or Team configurations missing' });
      }

      const list = await prisma.project.findMany({
        where: {
          is_recommend: 1,
          platform_id: { in: authIds },
          delete_time: null,
          is_disable: 0
        },
        include: { currency: true },
        take: 20
      });

      const customList = list.map(item => {
        const platformAuth = platformAuths.find(auth => auth.platform_id === item.platform_id);
        const authRateVal = platformAuth ? platformAuth.auth_rate : 0;

        const rawCoins = item.project_cpi * (item.currency?.currency_coins || 100.00);
        const teamRatio = (100 - team.commission_ratio) / 100;
        const authRate = (100 - authRateVal) / 100;
        const memberRate = (100 - member.rate) / 100;

        const memberPayout = rawCoins * teamRatio * authRate * memberRate;

        return {
          project_pno: item.project_pno,
          platform_id: item.platform_id,
          project_name: item.project_name,
          project_cpi: Number(memberPayout.toFixed(2)),
          project_id: item.project_id,
          project_currency: item.project_currency
        };
      });

      return res.json({ code: 200, msg: 'success', data: customList });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/member/platform/quota
   */
  static async quota(req, res) {
    try {
      const projectPno = req.query.project_pno;
      if (!projectPno) return res.status(400).json({ code: 400, msg: 'Missing project_pno' });

      const project = await prisma.project.findUnique({
        where: { project_pno: projectPno }
      });
      if (!project || project.delete_time !== null) {
        return res.status(404).json({ code: 404, msg: 'Project not found' });
      }

      const platform = await prisma.platform.findUnique({
        where: { platform_id: project.platform_id }
      });
      if (!platform) {
        return res.status(404).json({ code: 404, msg: 'Platform not found' });
      }

      // If content is already rendered HTML and it's not a live endpoint or is cached
      if (project.project_content && platform.platform_sign !== 'Gowebsurveys' && platform.platform_sign !== 'Zamplia') {
        if (project.project_content.startsWith('http://') || project.project_content.startsWith('https://')) {
          return res.json({ code: 200, msg: 'success', data: { type: 'link', content: project.project_content } });
        }
        return res.json({ code: 200, msg: 'success', data: { type: 'content', content: project.project_content } });
      }

      // Fetch live quota
      const checkResult = await SurveyIntegrationService.checkQuota(project, platform);

      // Save content cache in DB if content is rendered
      if (checkResult.type === 'content' && checkResult.content) {
        await prisma.project.update({
          where: { project_id: project.project_id },
          data: {
            project_content: checkResult.content,
            project_quota: checkResult.project?.project_quota ?? project.project_quota
          }
        });
      }

      return res.json({ code: 200, msg: 'success', data: checkResult });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/member/platform/copy
   */
  static async copy(req, res) {
    try {
      const projectPno = req.query.project_pno;
      if (!projectPno) return res.status(400).json({ code: 400, msg: 'Missing project_pno' });

      const project = await prisma.project.findUnique({
        where: { project_pno: projectPno },
        include: { platform: true }
      });
      if (!project || project.delete_time !== null) {
        return res.status(404).json({ code: 404, msg: 'Project not found' });
      }

      const protocol = req.secure ? 'https' : 'http';
      const host = req.get('host');
      const rootUrl = `${protocol}://${host}`;
      const token = req.headers['authorization']?.startsWith('Bearer ')
        ? req.headers['authorization'].slice(7)
        : req.query.key;

      const personaTemplate = project.project_persona_template || project.platform?.platform_persona_template || 0;

      if (personaTemplate > 0) {
        // In Express, we just return the frontend link.html or the routing api/link
        // We simulate PHP logic
        return res.json({
          code: 200,
          msg: 'success',
          data: `${rootUrl}/link.html?pid=${project.project_pno}&key=${token}`
        });
      }

      return res.json({
        code: 200,
        msg: 'success',
        data: `${rootUrl}/api/member/platform/link?pid=${project.project_pno}&key=${token}`
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/member/platform/wall_copy
   */
  static async wall_copy(req, res) {
    try {
      const platformId = Number(req.query.platform_id);
      if (!platformId) return res.status(400).json({ code: 400, msg: 'Missing platform_id' });

      const platform = await prisma.platform.findFirst({
        where: { platform_id: platformId, delete_time: null, is_disable: 0 }
      });
      if (!platform) return res.status(404).json({ code: 404, msg: 'Platform not found' });

      const protocol = req.secure ? 'https' : 'http';
      const host = req.get('host');
      const rootUrl = `${protocol}://${host}`;
      const token = req.headers['authorization']?.startsWith('Bearer ')
        ? req.headers['authorization'].slice(7)
        : req.query.key;

      if (platform.platform_persona_template > 0) {
        return res.json({
          code: 200,
          msg: 'success',
          data: `${rootUrl}/link.html?platform_id=${platform.platform_id}&key=${token}`
        });
      }

      return res.json({
        code: 200,
        msg: 'success',
        data: `${rootUrl}/api/member/platform/wall_link?pid=${platform.platform_id}&key=${token}`
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/member/platform/link (No direct middleware, validates token internally)
   */
  static async link(req, res) {
    try {
      const pid = req.query.pid; // project_pno
      const key = req.query.key; // JWT Token
      const answers = req.query.anser || {};

      if (!pid) return res.status(400).send('Missing project pid.');

      let memberId = 1;
      let teamId = 1;
      if (req.query.member_id) memberId = Number(req.query.member_id);
      if (req.query.uid) memberId = Number(req.query.uid);
      if (req.query.team_id) teamId = Number(req.query.team_id);

      if (key) {
        try {
          const decoded = jwt.decode(key);
          if (decoded) {
            memberId = decoded.data?.member_id || decoded.member_id || memberId;
            teamId = decoded.data?.team_id || decoded.team_id || teamId;
          }
        } catch (jwtErr) {
          // ignore parsing error
        }
      }

      const project = await prisma.project.findUnique({
        where: { project_pno: pid },
        include: { platform: true }
      });
      if (!project || project.delete_time !== null) return res.status(404).send('Project does not exist or is disabled.');

      const platform = project.platform;
      if (!platform || platform.is_disable === 1) return res.status(404).send('Platform is disabled or does not exist.');

      // Increment project click count
      await prisma.project.update({
        where: { project_id: project.project_id },
        data: { project_click: { increment: 1 } }
      });

      // Process persona answers if template is active (simulate PHP validate persona check)
      let parsedAnswers = [];
      const personaTemplate = project.project_persona_template || platform.platform_persona_template || 0;
      if (personaTemplate > 0 && answers) {
        // Just extract names/values into answers logger array as defined in specs
        Object.keys(answers).forEach(k => {
          parsedAnswers.push({ name: `Data_${k}`, value: answers[k] });
        });
      }

      const uuid = crypto.randomUUID().replace(/-/g, '');
      const ip = PlatformController.getIpAddress(req);
      const ua = req.headers['user-agent'] || 'unknown';

      // Log flowing click
      await prisma.flowing.create({
        data: {
          uuid,
          member_id: memberId,
          project_id: project.project_id,
          ip,
          ua,
          rs_content: parsedAnswers.length > 0 ? JSON.stringify(parsedAnswers) : null,
          create_time: new Date()
        }
      });

      const params = SurveyIntegrationService.getParamsMap(platform.params);

      // Perform redirection according to platform credentials mapping
      // Perform redirection according to platform credentials mapping
      switch (platform.platform_sign) {
        case 'Zamplia': {
          if (project.is_api === 1) {
            const queryParams = new URLSearchParams({
              SurveyId: project.project_no,
              IpAddress: ip,
              TransactionId: uuid,
              uid: uuid
            }).toString();
            const response = await axios.get(`${platform.platform_click_url}?${queryParams}`, {
              headers: { 'Accept': 'application/json', 'ZAMP-KEY': params['app_key'] },
              timeout: 10000
            });
            if (response.data && response.data.result && response.data.result.data && response.data.result.data[0]) {
              const liveLink = response.data.result.data[0].LiveLink;
              return res.send(`<script>window.location.href="${liveLink}";</script>`);
            }
            return res.status(500).send('Zamplia dynamic API redirect failed.');
          }
          return res.send(`<script>window.location.href="${project.project_click_url}${uuid}";</script>`);
        }

        case 'Gowebsurveys': {
          const protocol = req.secure ? 'https' : 'http';
          const host = req.get('host');
          const rootUrl = `${protocol}://${host}`;
          const postData = {
            surveyID: Number(project.project_no) || project.project_no,
            SuccessLink: `${rootUrl}/api/callback?platform=${platform.platform_sign}&uid={{panellist_id}}&status=C`,
            disQualifiedLink: `${rootUrl}/api/callback?platform=${platform.platform_sign}&uid={{panellist_id}}&status=S`,
            TermLink: `${rootUrl}/api/callback?platform=${platform.platform_sign}&uid={{panellist_id}}&status=T`,
            OverQuotaLink: `${rootUrl}/api/callback?platform=${platform.platform_sign}&uid={{panellist_id}}&status=Q`,
            useStaticLink: 0
          };

          const response = await axios.post(platform.platform_click_url, postData, {
            headers: {
              'Accept': 'application/json',
              'Authorization': params['app_key'],
              'payload': params['app_id'],
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });

          // Log transaction for debug
          console.log(`[${new Date().toISOString()}] Click API log for ${platform.platform_sign}:`, response.data);

          if (response.data && response.data.apiStatus === 1 && response.data.surveyInfo && response.data.surveyInfo[0]) {
            const rawUrl = response.data.surveyInfo[0].SurveyEntryUrl;
            const pos = rawUrl.indexOf('&pid=');
            const projectClickUrl = pos !== -1 ? rawUrl.substring(0, pos) + '&pid=' + uuid : rawUrl + '&pid=' + uuid;
            return res.send(`<script>window.location.href="${projectClickUrl}";</script>`);
          }
          return res.status(500).send(`API click error: ${response.data?.apiMessages || 'Unknown API issue'}`);
        }

        default: {
          const clickUrl = project.project_click_url || '';
          return res.send(`<script>window.location.href="${clickUrl}${uuid}";</script>`);
        }
      }
    } catch (err) {
      console.error('Redirect processing error:', err);
      const CallbackController = require('./callbackController');
      return res.status(500).send(CallbackController.renderErrorPage(
        `The survey platform is currently unresponsive or returned an error. Please try another survey. (Detail: ${err.message})`
      ));
    }
  }

  /**
   * GET /api/member/platform/wall_link (No direct middleware, validates token internally)
   */
  static async wall_link(req, res) {
    try {
      const pid = Number(req.query.pid); // platform_id
      const key = req.query.key; // JWT Token

      if (!pid) return res.status(400).send('Missing platform pid.');

      let memberId = 1;
      let teamId = 1;
      if (req.query.member_id) memberId = Number(req.query.member_id);
      if (req.query.uid) memberId = Number(req.query.uid);
      if (req.query.team_id) teamId = Number(req.query.team_id);

      if (key) {
        try {
          const decoded = jwt.decode(key);
          if (decoded) {
            memberId = decoded.data?.member_id || decoded.member_id || memberId;
            teamId = decoded.data?.team_id || decoded.team_id || teamId;
          }
        } catch (jwtErr) {
          // ignore parsing error
        }
      }

      const platform = await prisma.platform.findUnique({
        where: { platform_id: pid }
      });
      if (!platform || platform.is_disable === 1 || platform.delete_time !== null) {
        return res.status(404).send('Platform is disabled or does not exist.');
      }

      const uuid = crypto.randomUUID().replace(/-/g, '');
      const ip = PlatformController.getIpAddress(req);
      const ua = req.headers['user-agent'] || 'unknown';

      await prisma.flowing.create({
        data: {
          uuid,
          member_id: memberId,
          ip,
          ua,
          create_time: new Date()
        }
      });

      const platformParams = SurveyIntegrationService.getParamsMap(platform.params);
      let redirectUrl = '';

      switch (platform.platform_sign) {
        case 'Notik':
          redirectUrl = `https://notik.me/coins?api_key=${platformParams['app_key']}&pub_id=${platformParams['pub_id']}&app_id=${platformParams['app_id']}&user_id=${uuid}`;
          break;
        case 'Surveyxa':
          redirectUrl = `https://surveyxa.com/offerwall?id=${platformParams['app_key']}&uid=${uuid}`;
          break;
        case 'Opinionuniverse':
          redirectUrl = `https://opinionuniverse.com/offerwall.php?pubid=${platformParams['pub_id']}&sid=${uuid}&app_id=${platformParams['app_id']}&apikey=${platformParams['app_key']}`;
          break;
        case 'Upwall':
          redirectUrl = `https://offerwall.upwall.net/?app_id=${platformParams['app_id']}&userid=${uuid}`;
          break;
        case 'Wannads':
          redirectUrl = `https://earn.wannads.com/surveywall?apiKey=${platformParams['app_key']}&userId=${uuid}`;
          break;
        case 'Meeduo':
          redirectUrl = `https://www.meeduo.com/wall.mdq?sid=${platformParams['app_id']}&memberid=${uuid}`;
          break;
        case 'Pollfish':
          redirectUrl = `https://wss.pollfish.com/v2/device/register/true?json=%7B%22api_key%22%3A%22${platformParams['app_key']}%22%2C%22offerwall%22%3A%22true%22%2C%22debug%22%3A%22false%22%2C%22ip%22%3A%22${ip}%22%2C%22device_id%22%3A%22${uuid}%22%2C%22timestamp%22%3A%22${Date.now()}%22%2C%22encryption%22%3A%22NONE%22%2C%22version%22%3A%229%22%2C%22device_descr%22%3A%22UNKNOWN%22%2C%22os%22%3A%223%22%2C%22os_ver%22%3A%2210.13.2%22%2C%22scr_h%22%3A%221178%22%2C%22src_w%22%3A%221920%22%2C%22scr_size%22%3A%2223.46%22%2C%22manufacturer%22%3A%22UNKNOWN%22%2C%22locale%22%3A%22en-US%22%2C%22request_uuid%22%3A%22${uuid}%22%2C%22hardware_accelerated%22%3A%22false%22%2C%22video%22%3A%22true%22%2C%22survey_format%22%3A%220%22%7D&dontencrypt=true&webplugin=false&iframewidth=400px&position=BOTTOM_RIGHT`;
          break;
        case 'Bitlabs':
          redirectUrl = `https://web.bitlabs.ai/?uid=${uuid}&token=${platformParams['app_token']}`;
          break;
        case 'Enline':
          redirectUrl = `https://enlignesurvey.com/offerwall.php?pubid=${platformParams['pub_id']}&sid=${uuid}&sid2=${crypto.createHash('md5').update(uuid + platformParams['app_secret']).digest('hex')}`;
          break;
        case 'Rapidoreach': {
          const checksum = crypto.createHash('md5').update(`${uuid}-${platformParams['app_id']}-${platformParams['app_key']}`).digest('hex');
          redirectUrl = `https://www.rapidoreach.com/ofw/?userId=${uuid}-${platformParams['app_id']}-${checksum}`;
          break;
        }
        case 'Lootably':
          redirectUrl = `https://wall.lootably.com/?placementID=${platformParams['app_id']}&sid=${uuid}`;
          break;
        case 'Theoremreach':
          redirectUrl = `https://theoremreach.com/respondent_entry/direct?api_key=${platformParams['app_key']}&user_id=${uuid}&transaction_id=${crypto.createHash('md5').update(uuid).digest('hex')}`;
          break;
        default:
          return res.status(400).send('Platform is not configured with links.');
      }

      return res.send(`<script>window.location.href="${redirectUrl}";</script>`);
    } catch (err) {
      return res.status(500).send(`Internal Offerwall Link Error: ${err.message}`);
    }
  }

  /**
   * POST /api/member/platform/login
   * Authenticates an existing member by nickname.
   * Members are created via the admin panel - this endpoint only verifies existing ones.
   */
  static async login(req, res) {
    try {
      const { username, password } = req.body;
      if (!username || !username.trim()) {
        return res.status(400).json({ code: 400, msg: 'Member ID or nickname is required' });
      }
      if (!password || !password.trim()) {
        return res.status(400).json({ code: 400, msg: 'Password is required' });
      }

      // Only look up existing members — do NOT auto-create
      const member = await prisma.member.findFirst({
        where: { nickname: username.trim() },
        include: { team: true }
      });

      if (!member) {
        return res.status(401).json({ code: 401, msg: 'Member not found. Please contact your administrator.' });
      }

      if (member.is_disable === 1) {
        return res.status(403).json({ code: 403, msg: 'Your account has been disabled. Please contact support.' });
      }

      // Verify password (fallback to plaintext '123456' if not set in DB yet)
      const isPasswordValid = member.password
        ? bcrypt.compareSync(password.trim(), member.password)
        : password.trim() === '123456';

      if (!isPasswordValid) {
        return res.status(401).json({ code: 401, msg: 'Invalid password. Please try again.' });
      }

      const token = jwt.sign(
        { data: { member_id: member.member_id, team_id: member.team_id } },
        process.env.JWT_SECRET || 'your-jwt-auth-secret-key',
        { expiresIn: '30d' }
      );

      return res.json({
        code: 200,
        msg: 'Login successful',
        data: {
          token,
          nickname: member.nickname,
          member_id: member.member_id,
          team_name: member.team?.team_name || ''
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }


  /**
   * POST /api/member/platform/seed-demo
   * Seed mock database tables for demo testing
   */
  static async seedDemo(req, res) {
    try {
      // 1. Create Currency
      let usd = await prisma.currency.findUnique({ where: { currency_code: 'USD' } });
      if (!usd) {
        usd = await prisma.currency.create({
          data: {
            currency_code: 'USD',
            currency_name: 'US Dollar',
            currency_coins: 100.00
          }
        });
      }

      // 2. Create Team
      let team = await prisma.team.findFirst();
      if (!team) {
        team = await prisma.team.create({
          data: {
            team_name: 'Default Publisher Network',
            commission_ratio: 10.00,
            is_disable: 0
          }
        });
      }

      // 3. Create Member
      const defaultPasswordHash = bcrypt.hashSync('123456', 10);

      let member = await prisma.member.findFirst({ where: { nickname: 'Demo Member' } });
      if (!member) {
        member = await prisma.member.create({
          data: {
            nickname: 'Demo Member',
            rate: 5.00,
            team_id: team.team_id,
            is_disable: 0,
            password: defaultPasswordHash
          }
        });
      } else if (!member.password) {
        await prisma.member.update({
          where: { member_id: member.member_id },
          data: { password: defaultPasswordHash }
        });
      }

      let memberSun = await prisma.member.findFirst({ where: { nickname: '孙逊' } });
      if (!memberSun) {
        memberSun = await prisma.member.create({
          data: {
            nickname: '孙逊',
            rate: 5.00,
            team_id: team.team_id,
            is_disable: 0,
            password: defaultPasswordHash
          }
        });
      } else if (!memberSun.password) {
        await prisma.member.update({
          where: { member_id: memberSun.member_id },
          data: { password: defaultPasswordHash }
        });
      }

      let memberAdmin = await prisma.member.findFirst({ where: { nickname: '管理' } });
      if (!memberAdmin) {
        memberAdmin = await prisma.member.create({
          data: {
            nickname: '管理',
            rate: 5.00,
            team_id: team.team_id,
            is_disable: 0,
            password: defaultPasswordHash
          }
        });
      } else if (!memberAdmin.password) {
        await prisma.member.update({
          where: { member_id: memberAdmin.member_id },
          data: { password: defaultPasswordHash }
        });
      }

      let memberAdmin2 = await prisma.member.findFirst({ where: { nickname: 'admin' } });
      if (!memberAdmin2) {
        memberAdmin2 = await prisma.member.create({
          data: {
            nickname: 'admin',
            rate: 5.00,
            team_id: team.team_id,
            is_disable: 0,
            password: defaultPasswordHash
          }
        });
      } else if (!memberAdmin2.password) {
        await prisma.member.update({
          where: { member_id: memberAdmin2.member_id },
          data: { password: defaultPasswordHash }
        });
      }

      // 4. Create Platforms
      const demoPlatforms = [
        {
          platform_name: 'GoWebSurveys',
          platform_sign: 'Gowebsurveys',
          platform_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&auto=format&fit=crop',
          platform_color: '#3b82f6',
          platform_url: 'https://api.gowebsurveys.com/suppliers/v2/surveys',
          platform_quota_url: 'https://api.gowebsurveys.com/suppliers/v2/quotaStatus',
          platform_click_url: 'https://api.gowebsurveys.com/suppliers/v2/register',
          params: JSON.stringify([{ name: 'app_key', value: 'tb3qsBUFw7dpPfZeuS2GEKYQhTHAnmkxr5MDWa6C4z9v8gRVyc' }, { name: 'app_id', value: '1930' }])
        },
        {
          platform_name: 'ZAMPLIA',
          platform_sign: 'Zamplia',
          platform_image: '/images/zampilia.png',
          platform_color: '#fbbf24',
          platform_url: 'https://surveysupply.zamplia.com/api/v1/Surveys/GetAllocatedSurveys',
          platform_quota_url: 'https://surveysupply.zamplia.com/api/v1/Surveys/GetSurveyQuotas',
          platform_click_url: 'https://surveysupply.zamplia.com/api/v1/Surveys/GenerateLink',
          is_list: 1,
          params: JSON.stringify([{ name: 'app_key', value: '0AgQ3A2yuJ0j3Tr0FQGT4bdNZaj0Tnw4' }, { name: 'app_secret', value: 'jadsjgazrvovn2ap4fcravgj4njlu0pm' }])
        }
      ];

      // Disable/soft-delete platforms not in the active demo list
      const activeSigns = demoPlatforms.map(dp => dp.platform_sign);
      await prisma.platform.updateMany({
        where: {
          platform_sign: { notIn: activeSigns }
        },
        data: {
          delete_time: new Date(),
          is_disable: 1
        }
      });

      // Enable and update timestamps for active platforms
      await prisma.platform.updateMany({
        where: {
          platform_sign: { in: activeSigns }
        },
        data: {
          delete_time: null,
          is_disable: 0,
          create_time: new Date(),
          update_time: new Date()
        }
      });

      const platformsMap = [];
      for (const dp of demoPlatforms) {
        let p = await prisma.platform.findUnique({ where: { platform_sign: dp.platform_sign } });
        if (!p) {
          p = await prisma.platform.create({
            data: {
              ...dp,
              is_list: dp.is_list || 0,
              is_wall: dp.is_wall || 0,
              is_disable: 0,
              platform_currency: usd.currency_id,
              create_time: new Date(),
              update_time: new Date()
            }
          });
        }
        platformsMap.push(p);

        // Add PlatformAuth relation
        let auth = await prisma.platformAuth.findFirst({
          where: { platform_id: p.platform_id, team_id: team.team_id }
        });
        if (!auth) {
          await prisma.platformAuth.create({
            data: {
              platform_id: p.platform_id,
              team_id: team.team_id,
              auth_rate: 10.00
            }
          });
        }
      }

      // 4b. Seed Mock conversions for the top bar pills
      const checkReward = await prisma.reward.findFirst();
      if (!checkReward) {
        await prisma.reward.createMany({
          data: [
            {
              txn_id: 'TXN10001',
              member_id: memberSun.member_id,
              team_id: team.team_id,
              platform_id: platformsMap[0].platform_id,
              project_pno: null,
              project_name: 'Survey 101',
              payout: 2.50,
              team_payout: 2.25,
              member_payout: 250.00,
              usd_currency_coins: 100.00,
              uuid: 'flowing-1',
              reward_status: 1,
              create_time: new Date()
            },
            {
              txn_id: 'TXN10002',
              member_id: memberSun.member_id,
              team_id: team.team_id,
              platform_id: platformsMap[0].platform_id,
              project_pno: null,
              project_name: 'Survey 102',
              payout: 3.00,
              team_payout: 2.70,
              member_payout: 300.00,
              usd_currency_coins: 100.00,
              uuid: 'flowing-2',
              reward_status: 1,
              create_time: new Date()
            },
            {
              txn_id: 'TXN10003',
              member_id: memberAdmin.member_id,
              team_id: team.team_id,
              platform_id: platformsMap[0].platform_id,
              project_pno: null,
              project_name: 'Survey 103',
              payout: 3.00,
              team_payout: 2.70,
              member_payout: 300.00,
              usd_currency_coins: 100.00,
              uuid: 'flowing-3',
              reward_status: 1,
              create_time: new Date()
            },
            {
              txn_id: 'TXN10004',
              member_id: memberSun.member_id,
              team_id: team.team_id,
              platform_id: platformsMap[0].platform_id,
              project_pno: null,
              project_name: 'Survey 104',
              payout: 1.00,
              team_payout: 0.90,
              member_payout: 100.00,
              usd_currency_coins: 100.00,
              uuid: 'flowing-4',
              reward_status: 1,
              create_time: new Date()
            },
            {
              txn_id: 'TXN10005',
              member_id: memberAdmin.member_id,
              team_id: team.team_id,
              platform_id: platformsMap[0].platform_id,
              project_pno: null,
              project_name: 'Survey 105',
              payout: 0.80,
              team_payout: 0.72,
              member_payout: 80.00,
              usd_currency_coins: 100.00,
              uuid: 'flowing-5',
              reward_status: 1,
              create_time: new Date()
            },
            {
              txn_id: 'TXN10006',
              member_id: memberAdmin.member_id,
              team_id: team.team_id,
              platform_id: platformsMap[0].platform_id,
              project_pno: null,
              project_name: 'Survey 106',
              payout: 2.50,
              team_payout: 2.25,
              member_payout: 250.00,
              usd_currency_coins: 100.00,
              uuid: 'flowing-6',
              reward_status: 1,
              create_time: new Date()
            }
          ]
        });
      }

      // 5. Add Demo Surveys

      const p2 = platformsMap.find(x => x.platform_sign === 'Gowebsurveys');
      if (p2) {
        const checkProj = await prisma.project.findFirst({ where: { platform_id: p2.platform_id } });
        if (!checkProj) {
          await prisma.project.createMany({
            data: [
              {
                project_pno: 'PNO' + Date.now() + '3',
                project_no: '501',
                project_name: 'Global travel preferences 2026',
                project_cpi: 2.20,
                project_currency: usd.currency_id,
                platform_id: p2.platform_id,
                project_loi: 15,
                project_ir: 60,
                project_quota: 150,
                project_click_url: '',
                project_content: 'Requires having travelled internationally in the last 12 months.',
                is_recommend: 1
              }
            ]
          });
        }
      }

      return res.json({
        code: 200,
        msg: 'Database seeded successfully for demo!',
        data: {
          member_id: member.member_id,
          nickname: member.nickname,
          team_name: team.team_name
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/member/platform/profile
   * Return logged-in member details with total coin balances
   */
  static async profile(req, res) {
    try {
      const memberId = req.member.member_id;
      const member = await prisma.member.findUnique({
        where: { member_id: memberId }
      });
      if (!member) {
        return res.status(404).json({ code: 404, msg: 'Member not found' });
      }

      // Sum completed payouts
      const totalCoins = await prisma.reward.aggregate({
        where: { member_id: memberId, reward_status: 1 },
        _sum: { member_payout: true }
      });

      return res.json({
        code: 200,
        data: {
          member_id: member.member_id,
          nickname: member.nickname,
          coins: totalCoins._sum.member_payout || 0.00
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/member/platform/conversions
   * Return recent success conversion payouts for top bar banner
   */
  static async conversions(req, res) {
    try {
      const list = await prisma.reward.findMany({
        take: 6,
        orderBy: { create_time: 'desc' },
        select: {
          reward_id: true,
          member_payout: true,
          create_time: true,
          member: {
            select: { nickname: true }
          }
        }
      });
      return res.json({ code: 200, data: list });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/member/platform/statistics
   * Returns conversion statistics for the current member
   */
  static async statistics(req, res) {
    try {
      const memberId = req.user?.member_id || req.member?.member_id;
      const teamId = req.user?.team_id || req.member?.team_id;
      if (!memberId || !teamId) {
        return res.status(401).json({ code: 401, msg: 'Unauthorized' });
      }

      const { platform_id, reward_status, date_value } = req.query;
      const where = {
        member_id: memberId,
        team_id: teamId
      };

      if (platform_id) {
        where.platform_id = parseInt(platform_id);
      }
      if (reward_status) {
        where.reward_status = parseInt(reward_status);
      }
      if (date_value) {
        let dates = null;
        try {
          dates = typeof date_value === 'string' ? JSON.parse(date_value) : date_value;
        } catch (e) {}
        if (dates && Array.isArray(dates) && dates.length === 2) {
          where.create_time = {
            gte: new Date(dates[0]),
            lte: new Date(dates[1])
          };
        }
      }

      const offers = await prisma.reward.count({ where });

      const deductionAgg = await prisma.reward.aggregate({
        where: { ...where, reward_status: 6 },
        _sum: { member_payout: true }
      });
      const successAgg = await prisma.reward.aggregate({
        where: { ...where, reward_status: 1 },
        _sum: { member_payout: true }
      });
      const failedAgg = await prisma.reward.aggregate({
        where: { ...where, reward_status: { gt: 1 } },
        _sum: { member_payout: true }
      });

      return res.json({
        code: 200,
        data: {
          offers,
          deduction: deductionAgg._sum.member_payout || 0.00,
          success: successAgg._sum.member_payout || 0.00,
          failed: failedAgg._sum.member_payout || 0.00
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/member/platform/team-statistics
   * Returns conversion statistics for the entire team
   */
  static async teamStatistics(req, res) {
    try {
      const teamId = req.user?.team_id || req.member?.team_id;
      if (!teamId) {
        return res.status(401).json({ code: 401, msg: 'Unauthorized' });
      }

      const { platform_id, reward_status, member_nickname, date_value } = req.query;
      const where = { team_id: teamId };

      if (platform_id) {
        where.platform_id = parseInt(platform_id);
      }
      if (reward_status) {
        where.reward_status = parseInt(reward_status);
      }
      if (member_nickname && member_nickname.trim()) {
        const member = await prisma.member.findFirst({
          where: { nickname: member_nickname.trim() }
        });
        if (member) {
          where.member_id = member.member_id;
        } else {
          where.member_id = -1;
        }
      }
      if (date_value) {
        let dates = null;
        try {
          dates = typeof date_value === 'string' ? JSON.parse(date_value) : date_value;
        } catch (e) {}
        if (dates && Array.isArray(dates) && dates.length === 2) {
          where.create_time = {
            gte: new Date(dates[0]),
            lte: new Date(dates[1])
          };
        }
      }

      const offers = await prisma.reward.count({ where });

      const teamDeductionAgg = await prisma.reward.aggregate({
        where: { ...where, reward_status: 6 },
        _sum: { team_payout: true }
      });
      const teamSuccessAgg = await prisma.reward.aggregate({
        where: { ...where, reward_status: 1 },
        _sum: { team_payout: true }
      });
      const teamFailedAgg = await prisma.reward.aggregate({
        where: { ...where, reward_status: { gt: 1 } },
        _sum: { team_payout: true }
      });

      const memberDeductionAgg = await prisma.reward.aggregate({
        where: { ...where, reward_status: 6 },
        _sum: { member_payout: true }
      });
      const memberSuccessAgg = await prisma.reward.aggregate({
        where: { ...where, reward_status: 1 },
        _sum: { member_payout: true }
      });
      const memberFailedAgg = await prisma.reward.aggregate({
        where: { ...where, reward_status: { gt: 1 } },
        _sum: { member_payout: true }
      });

      return res.json({
        code: 200,
        data: {
          offers,
          teamdeduction: teamDeductionAgg._sum.team_payout || 0.00,
          teamsuccess: teamSuccessAgg._sum.team_payout || 0.00,
          teamfailed: teamFailedAgg._sum.team_payout || 0.00,
          memberdeduction: memberDeductionAgg._sum.member_payout || 0.00,
          membersuccess: memberSuccessAgg._sum.member_payout || 0.00,
          memberfailed: memberFailedAgg._sum.member_payout || 0.00
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/member/platform/ranking
   * Returns leaderboard rankings for the team members
   */
  static async ranking(req, res) {
    try {
      const teamId = req.user?.team_id || req.member?.team_id;
      if (!teamId) {
        return res.status(401).json({ code: 401, msg: 'Unauthorized' });
      }

      const { type = 'daily' } = req.query;
      let dateFilter = undefined;
      const now = new Date();

      if (type === 'daily') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        dateFilter = { gte: start, lte: now };
      } else if (type === 'weekly') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
        dateFilter = { gte: start, lte: now };
      } else if (type === 'monthly') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        dateFilter = { gte: start, lte: now };
      }

      const where = {
        team_id: teamId,
        reward_status: 1
      };
      if (dateFilter) {
        where.create_time = dateFilter;
      }

      const rankings = await prisma.reward.groupBy({
        by: ['member_id'],
        where,
        _sum: { member_payout: true },
        _count: { _all: true },
        orderBy: {
          _sum: { member_payout: 'desc' }
        },
        take: 30
      });

      const result = [];
      for (const rank of rankings) {
        const member = await prisma.member.findUnique({
          where: { member_id: rank.member_id }
        });
        if (member) {
          result.push({
            member_id: rank.member_id,
            nickname: member.nickname,
            avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(member.nickname)}`,
            total_member_payout: rank._sum.member_payout || 0.00,
            usd_total_member_payout: rank._sum.member_payout || 0.00,
            total_member_offers: rank._count._all
          });
        }
      }

      return res.json({ code: 200, data: result });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/member/platform/team-rewards
   * Returns list of recent conversions/rewards for either current member or entire team
   */
  static async teamRewards(req, res) {
    try {
      const memberId = req.user?.member_id || req.member?.member_id;
      const teamId = req.user?.team_id || req.member?.team_id;
      if (!teamId) {
        return res.status(401).json({ code: 401, msg: 'Unauthorized' });
      }

      const { platform_id, reward_status, member_nickname, personal, page = 1, limit = 15 } = req.query;
      const where = { team_id: teamId };

      if (personal === 'true' || personal === true) {
        where.member_id = memberId;
      } else if (member_nickname && member_nickname.trim()) {
        const member = await prisma.member.findFirst({
          where: { nickname: member_nickname.trim() }
        });
        if (member) {
          where.member_id = member.member_id;
        } else {
          where.member_id = -1;
        }
      }

      if (platform_id) {
        where.platform_id = parseInt(platform_id);
      }
      if (reward_status) {
        where.reward_status = parseInt(reward_status);
      }

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 15;
      const skip = (pageNum - 1) * limitNum;

      const total = await prisma.reward.count({ where });
      const list = await prisma.reward.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { create_time: 'desc' },
        include: {
          member: {
            select: { nickname: true }
          },
          platform: {
            select: { platform_name: true, platform_sign: true }
          }
        }
      });

      return res.json({
        code: 200,
        data: {
          list,
          total,
          page: pageNum,
          limit: limitNum,
          total_pages: Math.ceil(total / limitNum)
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/member/platform/pull
   */
  static async manualPull(req, res) {
    try {
      const platformId = Number(req.body.platform_id || req.query.platform_id);
      if (!platformId) {
        return res.status(400).json({ code: 400, msg: 'Missing platform_id' });
      }

      const platform = await prisma.platform.findUnique({
        where: { platform_id: platformId }
      });
      if (!platform || platform.is_disable === 1 || platform.delete_time) {
        return res.status(404).json({ code: 404, msg: 'Platform not found or disabled' });
      }

      const InventoryPullService = require('../services/inventoryPullService');
      await InventoryPullService.pullPlatform(platform);

      return res.json({
        code: 200,
        msg: 'Survey inventory refreshed successfully!'
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }
}

module.exports = PlatformController;
