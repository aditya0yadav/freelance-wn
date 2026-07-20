const prisma = require('../config/database');
const PlatformService = require('../services/platformService');
const InventoryPullService = require('../services/inventoryPullService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AdminPlatformController {
  /**
   * GET /api/admin/platform/list
   * Returns list of platforms with paging parameters
   */
  static async list(req, res) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const keyword = req.query.search || '';

      const whereClause = { delete_time: null };
      if (keyword) {
        whereClause.platform_name = { contains: keyword };
      }

      const total = await prisma.platform.count({ where: whereClause });
      const pages = Math.ceil(total / limit);
      const list = await prisma.platform.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sort: 'desc' }
      });

      return res.json({
        code: 200,
        msg: 'success',
        data: { count: total, pages, page, limit, list }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/admin/platform/info
   */
  static async info(req, res) {
    try {
      const id = Number(req.query.platform_id);
      if (!id) return res.status(400).json({ code: 400, msg: 'Missing platform_id' });

      const data = await PlatformService.getInfo(id);
      return res.json({ code: 200, msg: 'success', data });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/add
   */
  static async add(req, res) {
    try {
      const payload = req.body;
      if (!payload.platform_name || !payload.platform_sign) {
        return res.status(400).json({ code: 400, msg: 'Missing name or sign' });
      }

      const paramsStr = payload.params ? JSON.stringify(payload.params) : null;
      const projParamsStr = payload.project_params ? JSON.stringify(payload.project_params) : null;

      const platform = await prisma.platform.create({
        data: {
          platform_name: payload.platform_name,
          platform_sign: payload.platform_sign,
          platform_image: payload.platform_image || null,
          platform_color: payload.platform_color || null,
          platform_url: payload.platform_url || null,
          platform_quota_url: payload.platform_quota_url || null,
          platform_click_url: payload.platform_click_url || null,
          platform_level: Number(payload.platform_level) || 5,
          platform_currency: Number(payload.platform_currency) || 0,
          params: paramsStr,
          project_params: projParamsStr,
          is_list: Number(payload.is_list) || 0,
          is_wall: Number(payload.is_wall) || 0,
          is_persona: Number(payload.is_persona) || 0,
          platform_persona_template: Number(payload.platform_persona_template) || 0,
          platform_persona_backend: Number(payload.platform_persona_backend) || 0,
          is_quota: Number(payload.is_quota) || 0,
          show_quota: Number(payload.show_quota) || 1,
          show_click: Number(payload.show_click) || 1,
          show_complete: Number(payload.show_complete) || 1,
          show_loi: Number(payload.show_loi) || 1,
          show_ir: Number(payload.show_ir) || 1,
          show_no: Number(payload.show_no) || 1,
          is_disable: Number(payload.is_disable) || 0,
          is_custom: Number(payload.is_custom) || 0,
          is_accept_error: Number(payload.is_accept_error) || 0,
          is_hand: Number(payload.is_hand) || 0,
          model_type: Number(payload.model_type) || 0,
          pay_type: Number(payload.pay_type) || 0,
          sort: Number(payload.sort) || 0,
          limit_endtime: Number(payload.limit_endtime) || 0,
          create_uid: req.user ? req.user.user_id : 0,
          create_time: new Date()
        }
      });

      return res.json({ code: 200, msg: 'Platform added successfully', data: platform });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/edit
   */
  static async edit(req, res) {
    try {
      const id = Number(req.body.platform_id);
      if (!id) return res.status(400).json({ code: 400, msg: 'Missing platform_id' });

      const payload = { ...req.body };
      delete payload.platform_id;

      if (payload.params) payload.params = JSON.stringify(payload.params);
      if (payload.project_params) payload.project_params = JSON.stringify(payload.project_params);

      payload.update_uid = req.user ? req.user.user_id : 0;
      payload.update_time = new Date();

      // Convert fields to correct type if present
      if (payload.platform_level !== undefined) payload.platform_level = Number(payload.platform_level);
      if (payload.platform_currency !== undefined) payload.platform_currency = Number(payload.platform_currency);
      if (payload.is_list !== undefined) payload.is_list = Number(payload.is_list);
      if (payload.is_wall !== undefined) payload.is_wall = Number(payload.is_wall);
      if (payload.is_persona !== undefined) payload.is_persona = Number(payload.is_persona);
      if (payload.platform_persona_template !== undefined) payload.platform_persona_template = Number(payload.platform_persona_template);
      if (payload.platform_persona_backend !== undefined) payload.platform_persona_backend = Number(payload.platform_persona_backend);
      if (payload.is_quota !== undefined) payload.is_quota = Number(payload.is_quota);
      if (payload.show_quota !== undefined) payload.show_quota = Number(payload.show_quota);
      if (payload.show_click !== undefined) payload.show_click = Number(payload.show_click);
      if (payload.show_complete !== undefined) payload.show_complete = Number(payload.show_complete);
      if (payload.show_loi !== undefined) payload.show_loi = Number(payload.show_loi);
      if (payload.show_ir !== undefined) payload.show_ir = Number(payload.show_ir);
      if (payload.show_no !== undefined) payload.show_no = Number(payload.show_no);
      if (payload.is_disable !== undefined) payload.is_disable = Number(payload.is_disable);
      if (payload.is_custom !== undefined) payload.is_custom = Number(payload.is_custom);
      if (payload.is_accept_error !== undefined) payload.is_accept_error = Number(payload.is_accept_error);
      if (payload.is_hand !== undefined) payload.is_hand = Number(payload.is_hand);
      if (payload.model_type !== undefined) payload.model_type = Number(payload.model_type);
      if (payload.pay_type !== undefined) payload.pay_type = Number(payload.pay_type);
      if (payload.sort !== undefined) payload.sort = Number(payload.sort);
      if (payload.limit_endtime !== undefined) payload.limit_endtime = Number(payload.limit_endtime);

      const platform = await prisma.platform.update({
        where: { platform_id: id },
        data: payload
      });

      return res.json({ code: 200, msg: 'Platform updated successfully', data: platform });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/dele
   */
  static async dele(req, res) {
    try {
      const ids = req.body.ids;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ code: 400, msg: 'Missing ids list' });
      }

      await prisma.platform.updateMany({
        where: { platform_id: { in: ids.map(Number) } },
        data: {
          delete_time: new Date(),
          is_disable: 1
        }
      });

      return res.json({ code: 200, msg: 'Platforms soft deleted successfully' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/disable
   */
  static async disable(req, res) {
    try {
      const ids = req.body.ids;
      const isDisable = Number(req.body.is_disable) || 0;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ code: 400, msg: 'Missing ids list' });
      }

      await prisma.platform.updateMany({
        where: { platform_id: { in: ids.map(Number) } },
        data: { is_disable: isDisable }
      });

      return res.json({ code: 200, msg: 'Platforms disable status updated' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/admin/platform/currency/list
   */
  static async currencyList(req, res) {
    try {
      const list = await prisma.currency.findMany();
      return res.json({ code: 200, msg: 'success', data: { list } });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/currency/add
   */
  static async currencyAdd(req, res) {
    try {
      const { currency_name, currency_code, currency_coins } = req.body;
      const coinsVal = Number(currency_coins);

      if (!currency_name || !currency_code || isNaN(coinsVal)) {
        return res.status(400).json({ code: 400, msg: 'Invalid parameters' });
      }

      const currency = await prisma.currency.create({
        data: {
          currency_name,
          currency_code,
          currency_coins: coinsVal
        }
      });

      return res.json({ code: 200, msg: 'Currency added', data: currency });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/currency/edit
   */
  static async currencyEdit(req, res) {
    try {
      const id = Number(req.body.currency_id);
      const { currency_name, currency_code, currency_coins } = req.body;

      if (!id) return res.status(400).json({ code: 400, msg: 'Missing currency_id' });

      const updateData = {};
      if (currency_name) updateData.currency_name = currency_name;
      if (currency_code) updateData.currency_code = currency_code;
      if (currency_coins !== undefined) updateData.currency_coins = Number(currency_coins);

      const currency = await prisma.currency.update({
        where: { currency_id: id },
        data: updateData
      });

      return res.json({ code: 200, msg: 'Currency updated', data: currency });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/currency/dele
   */
  static async currencyDele(req, res) {
    try {
      const id = Number(req.body.currency_id);
      if (!id) return res.status(400).json({ code: 400, msg: 'Missing currency_id' });

      await prisma.currency.delete({ where: { currency_id: id } });
      return res.json({ code: 200, msg: 'Currency deleted successfully' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/admin/platform/auth/list
   */
  static async authList(req, res) {
    try {
      const platformId = Number(req.query.platform_id);
      const where = {};
      if (platformId) where.platform_id = platformId;

      const list = await prisma.platformAuth.findMany({
        where,
        include: {
          platform: true,
          team: true
        }
      });
      return res.json({ code: 200, msg: 'success', data: { list } });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/auth/add
   */
  static async authAdd(req, res) {
    try {
      const { platform_id, team_id, auth_rate } = req.body;
      const rateVal = Number(auth_rate);

      if (!platform_id || !team_id || isNaN(rateVal)) {
        return res.status(400).json({ code: 400, msg: 'Invalid authorization parameters' });
      }

      const auth = await prisma.platformAuth.create({
        data: {
          platform_id: Number(platform_id),
          team_id: Number(team_id),
          auth_rate: rateVal
        }
      });

      return res.json({ code: 200, msg: 'Platform authorization created', data: auth });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/auth/edit
   */
  static async authEdit(req, res) {
    try {
      const id = Number(req.body.platform_auth_id);
      const { auth_rate } = req.body;

      if (!id || isNaN(Number(auth_rate))) {
        return res.status(400).json({ code: 400, msg: 'Invalid authentication keys' });
      }

      const auth = await prisma.platformAuth.update({
        where: { platform_auth_id: id },
        data: { auth_rate: Number(auth_rate) }
      });

      return res.json({ code: 200, msg: 'Platform authorization updated', data: auth });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/auth/dele
   */
  static async authDele(req, res) {
    try {
      const id = Number(req.body.platform_auth_id);
      if (!id) return res.status(400).json({ code: 400, msg: 'Missing platform_auth_id' });

      await prisma.platformAuth.delete({ where: { platform_auth_id: id } });
      return res.json({ code: 200, msg: 'Authorization deleted successfully' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/admin/platform/statistic
   */
  static async platformStatistic(req, res) {
    try {
      const platformId = Number(req.query.platform_id);
      const dateValue = req.query.date_value; // Array format: [startDate, endDate]

      if (!platformId) return res.status(400).json({ code: 400, msg: 'Missing platform_id' });

      const chartData = await PlatformService.getStatistics(platformId, { date_value: dateValue });
      return res.json({ code: 200, msg: 'success', data: chartData });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/pull
   * Manually triggers a pull job for a platform's survey inventory
   */
  static async manualPull(req, res) {
    try {
      const platformId = Number(req.body.platform_id);
      if (!platformId) return res.status(400).json({ code: 400, msg: 'Missing platform_id' });

      const platform = await prisma.platform.findUnique({ where: { platform_id: platformId } });
      if (!platform) return res.status(404).json({ code: 404, msg: 'Platform not found' });

      // Run pull script asynchronously to prevent connection timeout
      InventoryPullService.pullPlatform(platform)
        .then(() => console.log(`Manual pull completed for ${platform.platform_name}`))
        .catch(err => console.error(`Manual pull failed for ${platform.platform_name}:`, err.message));

      return res.json({ code: 200, msg: 'Survey pull job triggered successfully.' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/login
   */
  static async login(req, res) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ code: 400, msg: 'Username and password are required' });
      }

      // Check if user is '管理' or 'admin'
      if (username.trim() !== '管理' && username.trim() !== 'admin') {
        return res.status(401).json({ code: 401, msg: 'Unauthorized admin user' });
      }

      // Find member in DB
      const member = await prisma.member.findFirst({
        where: { nickname: username.trim() }
      });

      if (!member) {
        return res.status(401).json({ code: 401, msg: 'Admin member not found in database. Seed the database first.' });
      }

      // Check password (fallback to plaintext '123456' if not set in DB yet)
      const isPasswordValid = member.password
        ? bcrypt.compareSync(password.trim(), member.password)
        : password.trim() === '123456';

      if (!isPasswordValid) {
        return res.status(401).json({ code: 401, msg: 'Invalid credentials' });
      }

      // Generate JWT Token
      const token = jwt.sign(
        { data: { member_id: member.member_id, nickname: member.nickname, is_admin: true } },
        process.env.JWT_SECRET || 'your-jwt-auth-secret-key',
        { expiresIn: '30d' }
      );

      return res.json({
        code: 200,
        msg: 'Admin login successful',
        data: {
          token,
          user: { nickname: member.nickname }
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/admin/platform/dashboard-stats
   */
  static async dashboardStats(req, res) {
    try {
      const { filter } = req.query; // 'day', 'week', 'month', or 'all'
      
      let dateFilter = {};
      if (filter && filter !== 'all') {
        const cutoff = new Date();
        if (filter === 'day') cutoff.setDate(cutoff.getDate() - 1);
        else if (filter === 'week') cutoff.setDate(cutoff.getDate() - 7);
        else if (filter === 'month') cutoff.setDate(cutoff.getDate() - 30);
        
        dateFilter = { create_time: { gte: cutoff } };
      }

      const clicks = await prisma.flowing.count({ where: dateFilter });
      const completes = await prisma.reward.count({ 
        where: { reward_status: 1, ...dateFilter } 
      });
      const conversion = clicks > 0 ? Number(((completes / clicks) * 100).toFixed(2)) : 0.00;
      
      const rewards = await prisma.reward.findMany({
        where: { reward_status: 1, ...dateFilter },
        select: { payout: true, team_payout: true, usd_currency_coins: true }
      });
      let revenue = 0.00;
      let teamPayoutSum = 0.00;
      for (const r of rewards) {
        const rate = r.usd_currency_coins || 100.00;
        revenue += r.payout / rate;
        teamPayoutSum += r.team_payout / rate;
      }
      const netEarning = revenue - teamPayoutSum;

      // Recent conversions
      const recentConversions = await prisma.reward.findMany({
        take: 20,
        orderBy: { create_time: 'desc' },
        include: {
          member: true,
          team: true,
          platform: true
        }
      });

      const formattedConversions = recentConversions.map(c => ({
        reward_id: c.reward_id,
        txn_id: c.txn_id,
        nickname: c.member?.nickname || 'Unknown',
        team_name: c.team?.team_name || 'Unknown',
        project_pno: c.project_pno || 'Manual',
        payout: Number((c.payout / (c.usd_currency_coins || 100.00)).toFixed(4)),
        reward_status: c.reward_status,
        is_mark: c.is_mark,
        platform_id: c.platform_id,
        platform_name: c.platform?.platform_name || '',
        platform_sign: c.platform?.platform_sign || '',
        create_time: c.create_time ? new Date(c.create_time).toISOString().replace('T', ' ').substring(0, 16) : ''
      }));

      return res.json({
        code: 200,
        msg: 'success',
        data: {
          clicks,
          completes,
          conversion,
          revenue,
          netEarning,
          recentConversions: formattedConversions
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/admin/platform/dashboard-chart
   * Returns live date-grouped statistics for Recharts chart
   */
  static async dashboardChart(req, res) {
    try {
      const { type = '30day', startDate, endDate } = req.query;
      const now = new Date();
      let start = new Date();
      let end = new Date();
      let isMonthly = false;

      if (type === '7day') {
        start.setUTCDate(now.getUTCDate() - 6);
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);
      } else if (type === '30day') {
        start.setUTCDate(now.getUTCDate() - 29);
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);
      } else if (type === 'annual') {
        start.setUTCMonth(now.getUTCMonth() - 11);
        start.setUTCDate(1);
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);
        isMonthly = true;
      } else if (type === 'custom') {
        if (startDate && endDate) {
          start = new Date(startDate);
          start.setUTCHours(0, 0, 0, 0);
          end = new Date(endDate);
          end.setUTCHours(23, 59, 59, 999);
        } else {
          start.setUTCDate(now.getUTCDate() - 29);
          start.setUTCHours(0, 0, 0, 0);
          end.setUTCHours(23, 59, 59, 999);
        }
      }

      // Format MySQL date grouping depending on interval
      const formatStr = isMonthly ? '%Y-%m' : '%Y-%m-%d';

      // Perform raw MySQL grouping query
      const rewards = await prisma.$queryRawUnsafe(`
        SELECT 
          DATE_FORMAT(create_time, '${formatStr}') as date_str,
          CAST(COUNT(*) AS CHAR) as completions,
          SUM(payout / usd_currency_coins) as total_payout,
          SUM(team_payout / usd_currency_coins) as team_payout,
          SUM(member_payout / usd_currency_coins) as member_payout
        FROM ya_reward
        WHERE reward_status = 1 AND create_time >= ? AND create_time <= ?
        GROUP BY date_str
        ORDER BY date_str ASC
      `, start, end);

      // Create lookup map
      const lookup = {};
      for (const r of rewards) {
        lookup[r.date_str] = {
          completions: Number(r.completions || 0),
          total_payout: Number(Number(r.total_payout || 0).toFixed(2)),
          team_payout: Number(Number(r.team_payout || 0).toFixed(2)),
          member_payout: Number(Number(r.member_payout || 0).toFixed(2))
        };
      }

      const timeline = [];
      const curr = new Date(start);

      if (isMonthly) {
        // Annual monthly increment
        while (curr <= end) {
          const year = curr.getUTCFullYear();
          const monthStr = String(curr.getUTCMonth() + 1).padStart(2, '0');
          const dateStr = `${year}-${monthStr}`;
          
          const val = lookup[dateStr] || { completions: 0, total_payout: 0, team_payout: 0, member_payout: 0 };
          timeline.push({
            date: dateStr,
            completions: val.completions,
            total_payout: val.total_payout,
            team_payout: val.team_payout,
            member_payout: val.member_payout
          });
          curr.setUTCMonth(curr.getUTCMonth() + 1);
        }
      } else {
        // Daily increment
        while (curr <= end) {
          const year = curr.getUTCFullYear();
          const monthStr = String(curr.getUTCMonth() + 1).padStart(2, '0');
          const dayStr = String(curr.getUTCDate()).padStart(2, '0');
          const dateStr = `${year}-${monthStr}-${dayStr}`;
          const labelStr = `${monthStr}-${dayStr}`;

          const val = lookup[dateStr] || { completions: 0, total_payout: 0, team_payout: 0, member_payout: 0 };
          timeline.push({
            date: labelStr,
            completions: val.completions,
            total_payout: val.total_payout,
            team_payout: val.team_payout,
            member_payout: val.member_payout
          });
          curr.setUTCDate(curr.getUTCDate() + 1);
        }
      }

      return res.json({
        code: 200,
        msg: 'success',
        data: timeline
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/member/ban
   */
  static async banMember(req, res) {
    try {
      const { nickname } = req.body;
      if (!nickname) return res.status(400).json({ code: 400, msg: 'Missing nickname' });
      await prisma.member.updateMany({
        where: { nickname },
        data: { is_disable: 1 }
      });
      return res.json({ code: 200, msg: `Member ${nickname} banned successfully` });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/reward/clear-mark
   */
  static async clearRewardMark(req, res) {
    try {
      const { reward_id } = req.body;
      if (!reward_id) return res.status(400).json({ code: 400, msg: 'Missing reward_id' });
      await prisma.reward.update({
        where: { reward_id: Number(reward_id) },
        data: { is_mark: 0 }
      });
      return res.json({ code: 200, msg: 'Speeder flag cleared successfully' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/admin/platform/project/list
   */
  static async projectList(req, res) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const search = req.query.search || '';
      const platformId = req.query.platform_id ? Number(req.query.platform_id) : null;
      const status = req.query.status || 'all'; // 'all' | 'active' | 'disabled'

      const where = { delete_time: null };
      if (search) {
        where.OR = [
          { project_pno: { contains: search } },
          { project_name: { contains: search } }
        ];
      }
      if (platformId) {
        where.platform_id = platformId;
      }
      if (status === 'active') {
        where.is_disable = 0;
      } else if (status === 'disabled') {
        where.is_disable = 1;
      }

      const total = await prisma.project.count({ where });
      const pages = Math.ceil(total / limit);

      const list = await prisma.project.findMany({
        where,
        include: {
          platform: {
            select: { platform_name: true }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { create_time: 'desc' }
      });

      return res.json({
        code: 200,
        msg: 'success',
        data: {
          count: total,
          pages,
          page,
          limit,
          list
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/project/toggle
   */
  static async projectToggle(req, res) {
    try {
      const id = Number(req.body.project_id);
      const isDisable = Number(req.body.is_disable);

      if (!id || isNaN(isDisable)) {
        return res.status(400).json({ code: 400, msg: 'Invalid parameters' });
      }

      await prisma.project.update({
        where: { project_id: id },
        data: { is_disable: isDisable }
      });

      return res.json({ code: 200, msg: 'Project status updated successfully' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/admin/platform/team/list
   */
  static async teamList(req, res) {
    try {
      const list = await prisma.team.findMany({
        where: { is_disable: 0 }
      });
      return res.json({ code: 200, msg: 'success', data: { list } });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  static async teamCreate(req, res) {
    try {
      const { team_name, team_host, commission_ratio } = req.body;
      if (!team_name) {
        return res.status(400).json({ code: 400, msg: 'Missing team_name' });
      }
      const ratio = commission_ratio !== undefined ? Number(commission_ratio) : 0.00;

      const newTeam = await prisma.team.create({
        data: {
          team_name,
          team_host: team_host || '',
          commission_ratio: ratio,
          is_disable: 0
        }
      });
      return res.json({ code: 200, msg: 'success', data: newTeam });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  static async teamUpdate(req, res) {
    try {
      const { team_id, team_name, team_host, commission_ratio, is_disable } = req.body;
      if (!team_id) {
        return res.status(400).json({ code: 400, msg: 'Missing team_id' });
      }

      const updateData = {};
      if (team_name !== undefined) updateData.team_name = team_name;
      if (team_host !== undefined) updateData.team_host = team_host;
      if (commission_ratio !== undefined) updateData.commission_ratio = Number(commission_ratio);
      if (is_disable !== undefined) updateData.is_disable = Number(is_disable);

      const updated = await prisma.team.update({
        where: { team_id: Number(team_id) },
        data: updateData
      });
      return res.json({ code: 200, msg: 'success', data: updated });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  static async teamDelete(req, res) {
    try {
      const { team_id } = req.body;
      if (!team_id) {
        return res.status(400).json({ code: 400, msg: 'Missing team_id' });
      }

      // Soft delete by setting is_disable = 1
      const deleted = await prisma.team.update({
        where: { team_id: Number(team_id) },
        data: { is_disable: 1 }
      });
      return res.json({ code: 200, msg: 'success', data: deleted });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }
  /**
   * GET /api/admin/platform/member/list
   */
  static async memberList(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 15);
      const search = req.query.search || '';
      
      const where = {};
      if (search) {
        where.nickname = { contains: search };
      }

      const total = await prisma.member.count({ where });
      const pages = Math.ceil(total / limit);

      const list = await prisma.member.findMany({
        where,
        include: {
          team: { select: { team_name: true } }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { member_id: 'desc' }
      });

      // Remove sensitive password hash from the list
      const sanitizedList = list.map(m => {
        const { password, ...rest } = m;
        return rest;
      });

      return res.json({
        code: 200,
        msg: 'success',
        data: {
          count: total,
          pages,
          page,
          limit,
          list: sanitizedList
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/member/add
   */
  static async memberAdd(req, res) {
    try {
      const { nickname, rate, team_id, password } = req.body;
      if (!nickname || !team_id || !password) {
        return res.status(400).json({ code: 400, msg: 'Missing required fields' });
      }

      const hashedPassword = bcrypt.hashSync(password.trim(), 10);
      
      await prisma.member.create({
        data: {
          nickname: nickname.trim(),
          rate: Number(rate) || 0,
          team_id: Number(team_id),
          password: hashedPassword,
          is_disable: 0
        }
      });
      return res.json({ code: 200, msg: 'Member created successfully' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/member/edit
   */
  static async memberEdit(req, res) {
    try {
      const { member_id, nickname, rate, team_id, password } = req.body;
      if (!member_id || !nickname || !team_id) {
        return res.status(400).json({ code: 400, msg: 'Missing required fields' });
      }

      const dataToUpdate = {
        nickname: nickname.trim(),
        rate: Number(rate) || 0,
        team_id: Number(team_id)
      };

      if (password && password.trim().length > 0) {
        dataToUpdate.password = bcrypt.hashSync(password.trim(), 10);
      }

      await prisma.member.update({
        where: { member_id: Number(member_id) },
        data: dataToUpdate
      });
      return res.json({ code: 200, msg: 'Member updated successfully' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/member/toggle
   */
  /**
   * POST /api/admin/platform/member/toggle
   */
  static async memberToggle(req, res) {
    try {
      const { member_id, is_disable } = req.body;
      if (!member_id || isNaN(is_disable)) {
        return res.status(400).json({ code: 400, msg: 'Invalid parameters' });
      }

      await prisma.member.update({
        where: { member_id: Number(member_id) },
        data: { is_disable: Number(is_disable) }
      });
      return res.json({ code: 200, msg: 'Status updated' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/admin/platform/export/list
   */
  static async exportList(req, res) {
    try {
      const { page = 1, limit = 20, type, status, search_field, search_value } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where = { delete_time: null };
      if (type) where.type = Number(type);
      if (status) where.status = Number(status);
      if (search_field && search_value) {
        where[search_field] = { contains: search_value };
      }

      const list = await prisma.export.findMany({
        where,
        skip,
        take,
        orderBy: { export_id: 'desc' }
      });
      const count = await prisma.export.count({ where });

      // Convert timestamps to string representation matching frontend expectations
      const formattedList = list.map(r => ({
        ...r,
        create_time: r.create_time ? new Date(r.create_time).toISOString().replace('T', ' ').substring(0, 16) : ''
      }));

      return res.json({
        code: 200,
        msg: 'success',
        data: { list: formattedList, count }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/admin/platform/export/info
   */
  static async exportInfo(req, res) {
    try {
      const { export_id, is_down } = req.query;
      if (!export_id) {
        return res.status(400).json({ code: 400, msg: 'Missing export ID' });
      }

      const record = await prisma.export.findUnique({
        where: { export_id: Number(export_id) }
      });
      if (!record) {
        return res.status(440).json({ code: 440, msg: 'Export record not found' });
      }

      if (is_down && is_down !== 'false') {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '../../public', record.file_path);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ code: 404, msg: 'Physical file not found on server' });
        }
        return res.download(filePath, record.file_name);
      }

      return res.json({
        code: 200,
        msg: 'success',
        data: record
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/export/generate
   */
  static async exportGenerate(req, res) {
    const fs = require('fs');
    const path = require('path');
    const startTime = microtime();

    try {
      const { type, export_remark } = req.body;
      if (!type) {
        return res.status(400).json({ code: 400, msg: 'Missing export type parameter' });
      }

      const exportType = Number(type);
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
      const randHex = Math.random().toString(16).substring(2, 8);
      
      let fileName = '';
      let relativePath = '';
      let csvContent = '';

      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      if (exportType === 1) {
        // Reward Completions
        fileName = `rewards-${timestamp}-${randHex}.csv`;
        relativePath = `/export/rewards-${timestamp}-${randHex}.csv`;

        const rewards = await prisma.reward.findMany({
          include: { member: true, team: true, platform: true },
          orderBy: { create_time: 'desc' }
        });

        const headers = ['ID', 'TXN ID', 'Nickname', 'Team Name', 'Platform Name', 'Project PNO', 'Payout ($)', 'Team Payout ($)', 'Member Payout ($)', 'UUID', 'Status', 'Callback Time'];
        const rows = rewards.map(r => [
          r.reward_id,
          r.txn_id,
          r.member?.nickname || 'Unknown',
          r.team?.team_name || 'Unknown',
          r.platform?.platform_name || 'Unknown',
          r.project_pno || 'Manual',
          (r.payout / r.usd_currency_coins).toFixed(2),
          (r.team_payout / r.usd_currency_coins).toFixed(2),
          (r.member_payout / r.usd_currency_coins).toFixed(2),
          r.uuid,
          r.reward_status === 1 ? 'Success' : r.reward_status === 2 ? 'Disqualified' : r.reward_status === 3 ? 'Overquota' : 'Processing',
          r.create_time ? new Date(r.create_time).toISOString().replace('T', ' ').substring(0, 16) : ''
        ]);

        csvContent = [headers.join(','), ...rows.map(row => row.map(escapeCSV).join(','))].join('\n');

      } else if (exportType === 2) {
        // Members list
        fileName = `members-${timestamp}-${randHex}.csv`;
        relativePath = `/export/members-${timestamp}-${randHex}.csv`;

        const members = await prisma.member.findMany({
          include: { team: true },
          orderBy: { member_id: 'desc' }
        });

        const headers = ['ID', 'Nickname', 'Deduction Rate (%)', 'Team Name', 'Status'];
        const rows = members.map(m => [
          m.member_id,
          m.nickname,
          m.rate.toFixed(2),
          m.team?.team_name || 'Unknown',
          m.is_disable === 1 ? 'Disabled' : 'Enabled'
        ]);

        csvContent = [headers.join(','), ...rows.map(row => row.map(escapeCSV).join(','))].join('\n');

      } else if (exportType === 3 || exportType === 4) {
        // Platform/Project specs
        fileName = `platforms-${timestamp}-${randHex}.csv`;
        relativePath = `/export/platforms-${timestamp}-${randHex}.csv`;

        const platforms = await prisma.platform.findMany({
          orderBy: { platform_id: 'desc' }
        });

        const headers = ['ID', 'Platform Name', 'Sign Key', 'Level', 'Status'];
        const rows = platforms.map(p => [
          p.platform_id,
          p.platform_name,
          p.platform_sign,
          p.platform_level,
          p.is_disable === 1 ? 'Disabled' : 'Enabled'
        ]);

        csvContent = [headers.join(','), ...rows.map(row => row.map(escapeCSV).join(','))].join('\n');
      }

      // Write physical file to public export dir
      const exportDir = path.join(__dirname, '../../public/export');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      const fullPath = path.join(exportDir, fileName);
      fs.writeFileSync(fullPath, csvContent, 'utf-8');

      const fileSize = formatBytes(fs.statSync(fullPath).size);
      const timeTaken = (microtime() - startTime) / 1000000;

      // Save Export Record
      const newExport = await prisma.export.create({
        data: {
          type: exportType,
          file_name: fileName,
          file_path: relativePath,
          file_size: fileSize,
          times: Number(timeTaken.toFixed(3)),
          remark: export_remark || '',
          status: 1 // Success
        }
      });

      return res.json({
        code: 200,
        msg: 'success',
        data: newExport
      });

    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/export/edit
   */
  static async exportEdit(req, res) {
    try {
      const { export_id, remark } = req.body;
      if (!export_id) {
        return res.status(400).json({ code: 400, msg: 'Missing export ID' });
      }

      const updated = await prisma.export.update({
        where: { export_id: Number(export_id) },
        data: { remark: remark || '' }
      });

      return res.json({
        code: 200,
        msg: 'success',
        data: updated
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/export/dele
   */
  static async exportDele(req, res) {
    try {
      const { export_id } = req.body;
      if (!export_id) {
        return res.status(400).json({ code: 400, msg: 'Missing export ID' });
      }

      await prisma.export.update({
        where: { export_id: Number(export_id) },
        data: { delete_time: new Date() }
      });

      return res.json({ code: 200, msg: 'Moved to Recycle Bin' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/admin/platform/export/recycleList
   */
  static async exportRecycleList(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where = { delete_time: { not: null } };
      const list = await prisma.export.findMany({
        where,
        skip,
        take,
        orderBy: { delete_time: 'desc' }
      });
      const count = await prisma.export.count({ where });

      const formattedList = list.map(r => ({
        ...r,
        create_time: r.create_time ? new Date(r.create_time).toISOString().replace('T', ' ').substring(0, 16) : '',
        delete_time: r.delete_time ? new Date(r.delete_time).toISOString().replace('T', ' ').substring(0, 16) : ''
      }));

      return res.json({
        code: 200,
        msg: 'success',
        data: { list: formattedList, count }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/export/recycleReco
   */
  static async exportRecycleReco(req, res) {
    try {
      const { export_id } = req.body;
      if (!export_id) {
        return res.status(400).json({ code: 400, msg: 'Missing export ID' });
      }

      await prisma.export.update({
        where: { export_id: Number(export_id) },
        data: { delete_time: null }
      });

      return res.json({ code: 200, msg: 'Restored from Recycle Bin' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/export/recycleDele
   */
  static async exportRecycleDele(req, res) {
    try {
      const { export_id } = req.body;
      if (!export_id) {
        return res.status(400).json({ code: 400, msg: 'Missing export ID' });
      }

      const record = await prisma.export.findUnique({
        where: { export_id: Number(export_id) }
      });

      if (record) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '../../public', record.file_path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        await prisma.export.delete({
          where: { export_id: Number(export_id) }
        });
      }

      return res.json({ code: 200, msg: 'Permanently deleted' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/admin/platform/member/performance
   */
  static async memberPerformance(req, res) {
    try {
      const members = await prisma.member.findMany({
        include: {
          team: true,
          rewards: {
            where: { reward_status: 1 }
          }
        }
      });

      const list = members.map(m => {
        const completions = m.rewards.length;
        const revenue = m.rewards.reduce((acc, r) => acc + (r.member_payout / r.usd_currency_coins), 0);
        
        let lastDate = 'No Activity';
        if (m.rewards.length > 0) {
          const sorted = [...m.rewards].sort((a, b) => new Date(b.create_time || 0) - new Date(a.create_time || 0));
          if (sorted[0].create_time) {
            lastDate = new Date(sorted[0].create_time).toISOString().split('T')[0];
          }
        }

        return {
          nickname: m.nickname,
          team_name: m.team?.team_name || 'N/A',
          completions,
          revenue: Number(revenue.toFixed(2)),
          rate: m.rate,
          date: lastDate
        };
      });

      // Sort by completions desc
      list.sort((a, b) => b.completions - a.completions);

      return res.json({
        code: 200,
        msg: 'success',
        data: { list }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/admin/platform/reward/list
   */
  static async rewardList(req, res) {
    try {
      const { page = 1, limit = 20, status, platform_id, team_id, member_id, search_field, search_value, start_date, end_date } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where = {};
      if (status) where.reward_status = Number(status);
      if (platform_id) where.platform_id = Number(platform_id);
      if (team_id) where.team_id = Number(team_id);
      if (member_id) where.member_id = Number(member_id);

      if (start_date && end_date) {
        where.create_time = {
          gte: new Date(`${start_date}T00:00:00.000Z`),
          lte: new Date(`${end_date}T23:59:59.999Z`)
        };
      }

      if (search_field && search_value) {
        if (search_field === 'nickname') {
          where.member = { nickname: { contains: search_value } };
        } else {
          where[search_field] = { contains: search_value };
        }
      }

      const list = await prisma.reward.findMany({
        where,
        skip,
        take,
        include: {
          member: true,
          team: true,
          platform: true
        },
        orderBy: { reward_id: 'desc' }
      });

      const count = await prisma.reward.count({ where });

      const formattedList = list.map(r => ({
        ...r,
        create_time: r.create_time ? new Date(r.create_time).toISOString().replace('T', ' ').substring(0, 16) : '',
        start_time: r.start_time ? new Date(r.start_time).toISOString().replace('T', ' ').substring(0, 16) : ''
      }));

      return res.json({
        code: 200,
        msg: 'success',
        data: { list: formattedList, count }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  static async rewardUpdateStatus(req, res) {
    try {
      const { reward_id, reward_status } = req.body;
      if (!reward_id) {
        return res.status(400).json({ code: 400, msg: 'Missing reward_id' });
      }

      const statusVal = Number(reward_status);
      if (![1, 2, 3, 4, 6].includes(statusVal)) {
        return res.status(400).json({ code: 400, msg: 'Invalid status. Must be 1 (Success), 2 (Disqualified), 3 (Overquota), 4 (Terminated), or 6 (Reconciliation)' });
      }

      const updatedReward = await prisma.reward.update({
        where: { reward_id: Number(reward_id) },
        data: { reward_status: statusVal }
      });

      return res.json({
        code: 200,
        msg: 'success',
        data: updatedReward
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  static async rewardBulkUpdateStatus(req, res) {
    try {
      const { reward_ids, reward_status } = req.body;
      if (!reward_ids || !Array.isArray(reward_ids) || reward_ids.length === 0) {
        return res.status(400).json({ code: 400, msg: 'Missing or invalid reward_ids' });
      }

      const statusVal = Number(reward_status);
      if (![1, 2, 3, 4, 6].includes(statusVal)) {
        return res.status(400).json({ code: 400, msg: 'Invalid status. Must be 1 (Success), 2 (Disqualified), 3 (Overquota), 4 (Terminated), or 6 (Reconciliation)' });
      }

      const updated = await prisma.reward.updateMany({
        where: { reward_id: { in: reward_ids.map(Number) } },
        data: { reward_status: statusVal }
      });

      return res.json({
        code: 200,
        msg: 'success',
        data: { count: updated.count }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/project/add
   */
  static async projectAdd(req, res) {
    try {
      const {
        project_no,
        platform_id,
        project_name,
        project_cpi,
        project_currency,
        project_quota,
        project_loi,
        project_ir,
        project_click_url,
        project_content,
        is_disable
      } = req.body;

      if (!project_no || !platform_id || !project_name || !project_currency || !project_click_url) {
        return res.status(400).json({ code: 400, msg: 'Missing required project parameters' });
      }

      // Generate a unique project_pno
      const project_pno = `M_${platform_id}_${project_no}_${Date.now().toString().slice(-6)}`;

      // Check if project_pno exists or is unique
      const existing = await prisma.project.findFirst({
        where: { project_pno }
      });
      if (existing) {
        return res.status(400).json({ code: 400, msg: 'Generated Project PNO is not unique, try again' });
      }

      const project = await prisma.project.create({
        data: {
          project_pno,
          project_no: String(project_no),
          platform_id: Number(platform_id),
          project_name,
          project_cpi: Number(project_cpi) || 0.00,
          project_currency: Number(project_currency),
          project_quota: Number(project_quota) || 0,
          project_loi: Number(project_loi) || 0,
          project_ir: Number(project_ir) || 0,
          project_click_url,
          project_content: project_content || null,
          is_disable: Number(is_disable) || 0,
          is_api: 0, // Manual project
          create_time: new Date()
        }
      });

      return res.json({ code: 200, msg: 'success', data: project });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/project/edit
   */
  static async projectEdit(req, res) {
    try {
      const id = Number(req.body.project_id);
      if (!id) return res.status(400).json({ code: 400, msg: 'Missing project_id' });

      const {
        project_no,
        platform_id,
        project_name,
        project_cpi,
        project_currency,
        project_quota,
        project_loi,
        project_ir,
        project_click_url,
        project_content,
        is_disable
      } = req.body;

      const updateData = {};
      if (project_no !== undefined) updateData.project_no = String(project_no);
      if (platform_id !== undefined) updateData.platform_id = Number(platform_id);
      if (project_name !== undefined) updateData.project_name = project_name;
      if (project_cpi !== undefined) updateData.project_cpi = Number(project_cpi);
      if (project_currency !== undefined) updateData.project_currency = Number(project_currency);
      if (project_quota !== undefined) updateData.project_quota = Number(project_quota);
      if (project_loi !== undefined) updateData.project_loi = Number(project_loi);
      if (project_ir !== undefined) updateData.project_ir = Number(project_ir);
      if (project_click_url !== undefined) updateData.project_click_url = project_click_url;
      if (project_content !== undefined) updateData.project_content = project_content || null;
      if (is_disable !== undefined) updateData.is_disable = Number(is_disable);

      updateData.update_time = new Date();

      const updated = await prisma.project.update({
        where: { project_id: id },
        data: updateData
      });

      return res.json({ code: 200, msg: 'success', data: updated });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/platform/project/delete
   */
  static async projectDelete(req, res) {
    try {
      const id = Number(req.body.project_id);
      if (!id) return res.status(400).json({ code: 400, msg: 'Missing project_id' });

      // Soft delete by setting delete_time
      const updated = await prisma.project.update({
        where: { project_id: id },
        data: {
          delete_time: new Date(),
          is_disable: 1
        }
      });

      return res.json({ code: 200, msg: 'success', data: updated });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }
}

// Helper utilities for file metrics and execution timing
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function microtime() {
  const hrTime = process.hrtime();
  return hrTime[0] * 1000000 + hrTime[1] / 1000;
}

module.exports = AdminPlatformController;
