const prisma = require('../config/database');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const SurveyIntegrationService = require('../services/surveyIntegrationService');
const RedirectLinkService = require('../services/redirectLinkService');

class PlatformController {
  /**
   * Helper to get client IP
   */
  static getIpAddress(req) {
    // 1. Cloudflare real IP header
    if (req.headers['cf-connecting-ip']) {
      return req.headers['cf-connecting-ip'];
    }
    // 2. Nginx Real IP header
    if (req.headers['x-real-ip']) {
      return req.headers['x-real-ip'];
    }
    // 3. Standard Forwarded For list
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const parts = forwarded.split(',');
      if (parts.length > 0) {
        const clientIp = parts[0].trim();
        if (clientIp) return clientIp;
      }
    }
    // 4. Socket fallback
    let ip = req.socket.remoteAddress || '127.0.0.1';
    if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
      // Local development or unconfigured proxy fallback
      return '8.8.8.8'; 
    }
    return ip;
  }

  /**
   * Sanitizes automated project titles to remove price/dollar mentions (e.g. "- $8.00", "$2.50", "WAN $7")
   */
  static cleanProjectTitle(title) {
    if (!title) return '';
    let cleaned = String(title);
    cleaned = cleaned.replace(/[-\s]*(?:CPI\s*[:=\s]*)?\$[0-9]+(?:\.[0-9]+)?(?:\s*(?:&|and|,)\s*\$[0-9]+(?:\.[0-9]+)?)?(?:\s*(?:USD|EUR|GBP|AUD|CAD))?/gi, ' ');
    cleaned = cleaned.replace(/[-\s]*[0-9]+(?:\.[0-9]+)?\s*(?:USD|EUR|GBP)\b/gi, ' ');
    cleaned = cleaned.replace(/\s*\|\|\s*\|\|\s*/g, ' || ');
    cleaned = cleaned.replace(/\s*-\s*\|\|\s*/g, ' || ');
    cleaned = cleaned.replace(/\s*\|\|\s*-\s*/g, ' || ');
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    cleaned = cleaned.replace(/^\s*[-|]+\s*/, '');
    cleaned = cleaned.replace(/\s*[-|]+\s*$/, '');
    return cleaned.trim() || title;
  }

  /**
   * Helper to resolve the effective CPI, recovering actual rate if overwritten or defaulted to 1.0
   */
  static getEffectiveCpi(item) {
    if (!item) return 0;
    let cpi = Number(item.project_cpi) || 0;
    if (cpi === 1.0 || cpi <= 0) {
      if (item.project_content) {
        try {
          const parsed = typeof item.project_content === 'string' ? JSON.parse(item.project_content) : item.project_content;
          if (parsed?.base_requirements?.initial_cpi && Number(parsed.base_requirements.initial_cpi) > 0) {
            return Number(parsed.base_requirements.initial_cpi);
          }
        } catch {}

        const text = typeof item.project_content === 'string' ? item.project_content : JSON.stringify(item.project_content);
        const match = text.match(/(?:CPI[^\$]*|[\s\w])\$\s*([0-9]+(?:\.[0-9]+)?)/i);
        if (match) {
          const parsedVal = parseFloat(match[1]);
          if (parsedVal > 0 && parsedVal <= 100) {
            return parsedVal;
          }
        }
      }
    }
    return cpi;
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

      const customPlatforms = await prisma.platform.findMany({
        where: { is_custom: 1, delete_time: null, is_disable: 0 },
        select: { platform_id: true }
      });
      const effectiveAuthIds = Array.from(new Set([...authIds, ...customPlatforms.map(c => c.platform_id)]));

      const list = await prisma.platform.findMany({
        where: {
          platform_id: { in: effectiveAuthIds },
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

        const memberRate = (100 - (member.rate || 0.00)) / 100;
        const teamCommissionRatio = team ? team.commission_ratio : 0.00;

        const activeProjects = p.projects || [];
        const surveyCount = activeProjects.length;

        // Calculate max member payout
        let maxCoins = 0;
        for (const item of activeProjects) {
          const effectiveCpi = PlatformController.getEffectiveCpi(item);
          const rawCoins = effectiveCpi * (item.currency?.currency_coins || 100.00);
          const teamPayout = rawCoins * ((100 - teamCommissionRatio) / 100) * ((100 - authRateVal) / 100);
          const memberPayout = teamPayout * memberRate;
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
          is_custom: p.is_custom,
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

      const customPlatforms = await prisma.platform.findMany({
        where: { is_custom: 1, delete_time: null, is_disable: 0 },
        select: { platform_id: true }
      });
      const effectiveAuthIds = Array.from(new Set([...authIds, ...customPlatforms.map(c => c.platform_id)]));

      // Allow any active platforms, relying on team authorization (authIds) for restriction
      const allowedPlatforms = await prisma.platform.findMany({
        where: {
          is_disable: 0,
          delete_time: null
        }
      });
      const allowedPlatformIds = allowedPlatforms.map(p => p.platform_id);

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

      // Only display projects active or created within the last 1 month (30 days) to present
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      whereClause.AND = [
        {
          OR: [
            { create_time: { gte: oneMonthAgo } },
            { update_time: { gte: oneMonthAgo } }
          ]
        }
      ];

      if (platformId) {
        if (!effectiveAuthIds.includes(platformId) || !allowedPlatformIds.includes(platformId)) {
          return res.status(403).json({ code: 403, msg: 'Unauthorized platform' });
        }
        whereClause.platform_id = platformId;
      } else {
        const filteredAuthIds = effectiveAuthIds.filter(id => allowedPlatformIds.includes(id));
        whereClause.platform_id = { in: filteredAuthIds };
      }

      // Deep search query matching multiple fields if search term is provided
      if (search && search.trim()) {
        const query = search.trim();
        whereClause.AND.push({
          OR: [
            { project_name: { contains: query } },
            { project_pno: { contains: query } },
            { project_code: { contains: query } },
            { platform: { platform_name: { contains: query } } }
          ]
        });
      }

      // Country filter support
      const countryQuery = req.query.country || '';
      if (countryQuery && countryQuery !== 'all') {
        const cTerm = countryQuery.trim();
        const orConditions = [
          { project_code: { contains: cTerm } },
          { project_name: { contains: cTerm } },
          { project_content: { contains: cTerm } }
        ];
        if (cTerm.toLowerCase() === 'us') {
          orConditions.push({ project_content: { contains: 'United States' } });
        } else if (cTerm.toLowerCase() === 'uk') {
          orConditions.push({ project_code: { contains: 'GB' } });
          orConditions.push({ project_content: { contains: 'United Kingdom' } });
        }
        whereClause.AND.push({ OR: orConditions });
      }

      if (code) whereClause.project_code = { contains: code };
      if (projectPno) whereClause.project_pno = { contains: projectPno };
      if (projectName) whereClause.project_name = { contains: projectName };

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const sortOption = req.query.sort || 'default';

      let orderBy = { project_id: 'desc' };
      if (sortOption === 'cpi-desc') {
        orderBy = { project_cpi: 'desc' };
      } else if (sortOption === 'cpi-asc') {
        orderBy = { project_cpi: 'asc' };
      } else if (sortOption === 'loi-asc') {
        orderBy = { project_loi: 'asc' };
      }

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
        orderBy: orderBy
      });

      const customList = list.map(item => {
        const platformAuth = platformAuths.find(auth => auth.platform_id === item.platform_id);
        const authRateVal = platformAuth ? platformAuth.auth_rate : 0;

        const effectiveCpi = PlatformController.getEffectiveCpi(item);
        const rawCoins = effectiveCpi * (item.currency?.currency_coins || 100.00);
        const memberRate = (100 - (member.rate || 0.00)) / 100;
        const teamCommissionRatio = team ? team.commission_ratio : 0.00;

        const teamPayout = rawCoins * ((100 - teamCommissionRatio) / 100) * ((100 - authRateVal) / 100);
        const memberPayout = teamPayout * memberRate;

        let projectCode = item.project_code || '';
        let targetCountry = '';
        let countryCode = '';

        if (item.project_content) {
          try {
            const parsed = JSON.parse(item.project_content);
            if (parsed?.base_requirements) {
              targetCountry = parsed.base_requirements.target_country || parsed.base_requirements.country || '';
              countryCode = parsed.base_requirements.country_code || '';
            }
          } catch {}
        }

        // If countryCode is still missing or EMAIL_SURVEY, inspect project_code
        if (!countryCode || countryCode === 'EMAIL_SURVEY') {
          if (projectCode && projectCode !== 'EMAIL_SURVEY') {
            if (projectCode.length === 2) {
              countryCode = projectCode.toUpperCase();
            } else {
              // Handle patterns like "English-GB|54", "En-US|4", "pt-BR"
              const localeMatch = projectCode.match(/[-_]([A-Za-z]{2})(?:\||\b|$)/);
              if (localeMatch) {
                countryCode = localeMatch[1].toUpperCase();
              } else if (!targetCountry) {
                targetCountry = projectCode.split('|')[0].trim();
              }
            }
          }
        }

        // Inspect project_name for explicit tags (e.g. "B2C - QA", "B2B - USA", "[Australia]")
        const pName = item.project_name || '';
        if (pName) {
          const bracketMatch = pName.match(/\[([A-Za-z0-9\s_-]+)\]/);
          if (bracketMatch) {
            const inside = bracketMatch[1].trim();
            if (inside.length === 2) countryCode = inside.toUpperCase();
            else if (!targetCountry) targetCountry = inside;
          }
          const segments = pName.split(/\|\||\|/).map(s => s.trim());
          for (const seg of segments) {
            const segTagMatch = seg.match(/\b(?:B2B|B2C|WANS?)[-\s]+([A-Za-z]{2,3})\b/i);
            if (segTagMatch) {
              const tag = segTagMatch[1].trim().toUpperCase();
              if (tag === 'USA') countryCode = 'US';
              else if (tag.length === 2) countryCode = tag;
              break;
            }
          }
        }

        const finalCountryCode = (countryCode && countryCode !== 'EMAIL_SURVEY')
          ? countryCode
          : (projectCode && projectCode !== 'EMAIL_SURVEY' && projectCode.length === 2 ? projectCode.toUpperCase() : '');

        const result = {
          project_pno: item.project_pno,
          project_id: item.project_id,
          project_name: PlatformController.cleanProjectTitle(item.project_name || 'Survey Campaign'),
          project_code: finalCountryCode || item.project_code,
          country_code: finalCountryCode,
          target_country: targetCountry || finalCountryCode || 'United States',
          project_cpi: Number(memberPayout.toFixed(2)),
          project_cpi_usd: Number((memberPayout / (item.currency?.currency_coins || 100.00)).toFixed(4)), // sanitized USD CPI post coin and splits conversion
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

        const effectiveCpi = PlatformController.getEffectiveCpi(item);
        const rawCoins = effectiveCpi * (item.currency?.currency_coins || 100.00);
        const memberRate = (100 - member.rate) / 100;

        const memberPayout = rawCoins * memberRate;

        return {
          project_pno: item.project_pno,
          platform_id: item.platform_id,
          project_name: PlatformController.cleanProjectTitle(item.project_name || 'Survey Campaign'),
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
   * Sanitizes specifications text by removing client prices, rates, and dispatch CPI mentions
   */
  static sanitizeSpecsText(text) {
    if (!text) return '';
    let str = String(text);
    // Remove partner dispatch link / CPI headers (e.g. "Country CPI(INC ALL Taxes) Link Germany$ 6.5https...")
    str = str.replace(/Country\s+CPI[^\n\r]*Link[^\n\r]*/gi, '');
    // Remove CPI / price mentions: e.g. "CPI: $6.5", "CPI 7.00", "Rate: $5", "Incentive: $4.5"
    str = str.replace(/(?:CPI\s*(?:\(INC[^\)]*\))?|Incentive|Rate|Price|Payout)\s*[:=]?\s*\$?\s*[0-9]+(?:\.[0-9]+)?(?:\s*(?:USD|cpi|\/complete|per complete))?/gi, '');
    // Remove standalone dollar amounts: e.g. "$6.50", "$ 4.5", "$7"
    str = str.replace(/\$\s*[0-9]+(?:\.[0-9]+)?(?:\s*(?:USD|EUR|GBP))?/gi, '');
    // Remove [Tag: Email Survey] tag
    str = str.replace(/\[Tag:\s*Email Survey\]\s*/gi, '');
    // Clean redundant empty lines
    str = str.replace(/\n{3,}/g, '\n\n');
    return str.trim();
  }

  /**
   * Universal HTML generator for desktop and legacy clients that render via type: 'content'
   */
  static renderSpecsHtml(timeline, project, platform) {
    const baseReq = timeline?.base_requirements || {};
    const updateLogs = Array.isArray(timeline?.update_logs) ? timeline.update_logs : [];

    const totalQuota = (project.project_quota > 0 ? project.project_quota : (baseReq.initial_quota || 'N/A'));
    const completes = project.project_complete || 0;
    const remaining = totalQuota !== 'N/A' && Number(totalQuota) > 0 ? Math.max(0, Number(totalQuota) - completes) : 'N/A';

    const country = baseReq.target_country || baseReq.country || project.target_country || project.project_code || 'Global';
    const ageRange = baseReq.age_range || '18 - 65';
    const occupation = baseReq.occupation || baseReq.target_demographics || 'General Audience';

    const rawSpecs = baseReq.raw_specs || baseReq.description || baseReq.summary || 'Live survey specifications.';
    const cleanSpecs = PlatformController.sanitizeSpecsText(rawSpecs);

    let html = `
<div style="font-family: inherit; color: var(--t1, #0f172a); line-height: 1.5;">
  <!-- Quota Metrics Bar -->
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;">
    <div style="background: var(--bg-3, #f1f5f9); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 10px; text-align: center;">
      <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--t3, #64748b); display: block; margin-bottom: 2px;">Total Quota</span>
      <strong style="font-size: 18px; font-weight: 700; color: var(--t1, #0f172a);">${totalQuota}</strong>
    </div>
    <div style="background: var(--bg-3, #f1f5f9); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 10px; text-align: center;">
      <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--t3, #64748b); display: block; margin-bottom: 2px;">Completes</span>
      <strong style="font-size: 18px; font-weight: 700; color: #10b981;">${completes}</strong>
    </div>
    <div style="background: var(--bg-3, #f1f5f9); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 10px; text-align: center;">
      <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--t3, #64748b); display: block; margin-bottom: 2px;">Remaining</span>
      <strong style="font-size: 18px; font-weight: 700; color: #3b82f6;">${remaining}</strong>
    </div>
  </div>

  <!-- Demographics Constraints -->
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;">
    <div style="background: var(--surface, #ffffff); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 10px;">
      <span style="font-size: 10.5px; text-transform: uppercase; font-weight: 600; color: var(--t3, #64748b); display: block;">Country / Region</span>
      <strong style="font-size: 13px; color: var(--t1, #0f172a); word-break: break-word;">${country}</strong>
    </div>
    <div style="background: var(--surface, #ffffff); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 10px;">
      <span style="font-size: 10.5px; text-transform: uppercase; font-weight: 600; color: var(--t3, #64748b); display: block;">Age Range</span>
      <strong style="font-size: 13px; color: var(--t1, #0f172a); word-break: break-word;">${ageRange}</strong>
    </div>
    <div style="background: var(--surface, #ffffff); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 10px;">
      <span style="font-size: 10.5px; text-transform: uppercase; font-weight: 600; color: var(--t3, #64748b); display: block;">Target Audience</span>
      <strong style="font-size: 13px; color: var(--t1, #0f172a); word-break: break-word;">${occupation}</strong>
    </div>
  </div>

  <!-- Locked Base Specs -->
  <div style="margin-bottom: 14px;">
    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--t3, #64748b); margin-bottom: 6px; letter-spacing: 0.04em;">
      📋 Initial Base Requirements & Specs (Locked)
    </div>
    <div style="padding: 12px 14px; background: var(--bg-3, #f8fafc); border: 1px solid var(--border, #cbd5e1); border-radius: 8px; font-size: 12.5px; color: var(--t1, #1e293b); line-height: 1.6; white-space: pre-wrap; word-break: break-word;">${cleanSpecs}</div>
  </div>
`;

    if (updateLogs.length > 0) {
      html += `
  <!-- Chronological Updates -->
  <div style="margin-top: 14px;">
    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--t3, #64748b); margin-bottom: 8px; letter-spacing: 0.04em;">
      ⏱️ Chronological Update Log (${updateLogs.length})
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
`;
      for (const log of updateLogs) {
        const isPaused = log.status === 'PAUSED';
        const isClosed = log.status === 'CLOSED';
        const borderColor = isPaused ? '#ef4444' : isClosed ? '#64748b' : '#10b981';
        const statusBadge = isPaused
          ? '<span style="background: #fee2e2; color: #b91c1c; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">⏸️ Paused</span>'
          : isClosed
          ? '<span style="background: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">🛑 Closed</span>'
          : '<span style="background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">▶️ Active</span>';

        const dateStr = log.date ? new Date(log.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : (log.date_str || 'Update');
        const note = PlatformController.sanitizeSpecsText(log.notes || log.summary || log.action_reason || '');

        html += `
      <div style="background: var(--surface, #ffffff); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 10px 12px; border-left: 3px solid ${borderColor};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11.5px; font-weight: 600; color: var(--t2, #64748b);">${dateStr}</span>
          ${statusBadge}
        </div>
        ${note ? `<div style="font-size: 12px; color: var(--t1, #334155); line-height: 1.5; white-space: pre-wrap; word-break: break-word;">${note}</div>` : ''}
      </div>
`;
      }
      html += `
    </div>
  </div>
`;
    }

    html += `</div>`;
    return html.trim();
  }

  /**
   * GET /api/member/platform/quota
   */
  static async quota(req, res) {
    try {
      const projectPno = (req.query.project_pno || '').trim();
      const projectId = req.query.project_id ? Number(req.query.project_id) : null;
      if (!projectPno && !projectId) return res.status(400).json({ code: 400, msg: 'Missing project_pno or project_id' });

      let project = null;
      if (projectPno) {
        // 1. Try exact project_pno match
        project = await prisma.project.findFirst({
          where: { project_pno: projectPno },
          include: { platform: true, currency: true }
        });

        // 2. Fallback: search by partial PNO or project_no
        if (!project) {
          project = await prisma.project.findFirst({
            where: {
              OR: [
                { project_pno: { contains: projectPno } },
                { project_no: projectPno },
                { project_name: { contains: projectPno } }
              ]
            },
            include: { platform: true, currency: true }
          });
        }
      }
      if (!project && projectId) {
        project = await prisma.project.findUnique({
          where: { project_id: projectId },
          include: { platform: true, currency: true }
        });
      }
      if (!project) {
        return res.status(404).json({ code: 404, msg: 'Project not found' });
      }

      const platform = project.platform || await prisma.platform.findUnique({
        where: { platform_id: project.platform_id }
      });
      if (!platform) {
        return res.status(404).json({ code: 404, msg: 'Platform not found' });
      }

      // If content is a direct survey link URL
      if (project.project_content && (project.project_content.startsWith('http://') || project.project_content.startsWith('https://'))) {
        return res.json({ code: 200, msg: 'success', data: { type: 'link', content: project.project_content } });
      }

      // 1. Try to parse existing structured timeline from project_content
      let timeline = null;
      if (project.project_content) {
        try {
          const parsed = typeof project.project_content === 'string' ? JSON.parse(project.project_content) : project.project_content;
          if (parsed && (parsed.is_timeline || parsed.base_requirements)) {
            timeline = parsed;
          }
        } catch {}
      }

      // 2. If not already a timeline, synthesize full timeline from specs / content / platform
      if (!timeline) {
        let rawText = project.project_content ? String(project.project_content).replace(/<[^>]+>/g, '').trim() : '';

        // If content is empty or generic, check live API if available
        if (!rawText && (platform.platform_sign === 'TMDPanel' || platform.platform_sign === 'Gowebsurveys' || platform.platform_sign === 'Zamplia')) {
          try {
            const liveResult = await SurveyIntegrationService.checkQuota(project, platform);
            if (liveResult && liveResult.content && typeof liveResult.content === 'string') {
              rawText = liveResult.content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '').trim();
            }
          } catch {}
        }

        let targetCountry = project.project_code || 'United States';
        const cMatch = rawText.match(/(?:Country|Market|Target|Geography)\s*[:=-]?\s*([^.\n,]+)/i);
        if (cMatch) targetCountry = cMatch[1].replace(/[()]/g, '').trim();

        let ageRange = '18 - 65';
        const aMatch = rawText.match(/(?:age|ages|between)\s*(\d{1,2}\s*[-–to]\s*\d{1,2})/i) || rawText.match(/(\d{1,2}\s*[-–]\s*\d{1,2})\s*years?/i);
        if (aMatch) ageRange = aMatch[1].trim();

        let occupation = 'General Audience';
        const oMatch = rawText.match(/(?:Industry|Audience|Occupation|Target)\s*:\s*([^.\n]+)/i);
        if (oMatch) {
          occupation = oMatch[1].replace(/[()]/g, '').trim();
        } else {
          const kwMatch = rawText.match(/(?:Decision-Makers|ITDMs|BDMs|Managers|Executives|Owners|Doctors|Healthcare|Patients|Consumers|Engineers)[^.\n]*/i);
          if (kwMatch) occupation = kwMatch[0].trim();
        }

        const cleanedSpecs = PlatformController.sanitizeSpecsText(rawText);

        timeline = {
          is_timeline: true,
          target_country: targetCountry,
          base_requirements: {
            target_country: targetCountry,
            country: targetCountry,
            age_range: ageRange,
            occupation: occupation,
            target_demographics: occupation || 'General Population',
            initial_quota: project.project_quota || 100,
            summary: cleanedSpecs || 'Live project dispatch specifications.',
            description: cleanedSpecs || 'Live project dispatch specifications.',
            raw_specs: cleanedSpecs || ''
          },
          update_logs: []
        };
      }

      // 3. Strictly sanitize timeline: remove ALL CPI and price mentions
      if (timeline.base_requirements) {
        delete timeline.base_requirements.initial_cpi;
        delete timeline.base_requirements.cpi;
        delete timeline.base_requirements.updated_cpi;
        if (timeline.base_requirements.raw_specs) {
          timeline.base_requirements.raw_specs = PlatformController.sanitizeSpecsText(timeline.base_requirements.raw_specs);
        }
        if (timeline.base_requirements.description) {
          timeline.base_requirements.description = PlatformController.sanitizeSpecsText(timeline.base_requirements.description);
        }
        if (timeline.base_requirements.summary) {
          timeline.base_requirements.summary = PlatformController.sanitizeSpecsText(timeline.base_requirements.summary);
        }
      }

      if (Array.isArray(timeline.update_logs)) {
        timeline.update_logs = timeline.update_logs.map(log => {
          const cleanedLog = { ...log };
          delete cleanedLog.cpi;
          delete cleanedLog.updated_cpi;
          if (cleanedLog.summary) cleanedLog.summary = PlatformController.sanitizeSpecsText(cleanedLog.summary);
          if (cleanedLog.notes) cleanedLog.notes = PlatformController.sanitizeSpecsText(cleanedLog.notes);
          if (cleanedLog.action_reason) cleanedLog.action_reason = PlatformController.sanitizeSpecsText(cleanedLog.action_reason);
          if (cleanedLog.subject) cleanedLog.subject = PlatformController.cleanProjectTitle(cleanedLog.subject);
          if (cleanedLog.email_subject) cleanedLog.email_subject = PlatformController.cleanProjectTitle(cleanedLog.email_subject);
          return cleanedLog;
        });
      }

      const projectMeta = {
        project_id: project.project_id,
        project_pno: project.project_pno,
        project_name: PlatformController.cleanProjectTitle(project.project_name || 'Survey Campaign'),
        project_quota: project.project_quota,
        project_complete: project.project_complete,
        project_loi: project.project_loi,
        project_ir: project.project_ir,
        platform_name: platform.platform_name,
        platform_color: platform.platform_color,
        target_country: timeline.target_country || timeline.base_requirements?.target_country || project.project_code || 'United States'
      };

      // Generate HTML content for desktop app and legacy clients
      const htmlContent = PlatformController.renderSpecsHtml(timeline, projectMeta, platform);

      return res.json({
        code: 200,
        msg: 'success',
        data: {
          type: 'content',
          content: htmlContent,
          timeline: timeline,
          project: projectMeta
        }
      });
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

      const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
      let protocol = isSecure ? 'https' : 'http';
      let host = req.get('host') || '';
      if (host.includes(':443')) {
        protocol = 'https';
        host = host.replace(':443', '');
      } else if (host.includes(':80')) {
        host = host.replace(':80', '');
      }
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

      const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
      let protocol = isSecure ? 'https' : 'http';
      let host = req.get('host') || '';
      if (host.includes(':443')) {
        protocol = 'https';
        host = host.replace(':443', '');
      } else if (host.includes(':80')) {
        host = host.replace(':80', '');
      }
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

      if (project.project_quota > 0 && project.project_complete >= project.project_quota) {
        const CallbackController = require('./callbackController');
        return res.status(400).send(CallbackController.renderErrorPage('This survey has reached its maximum completion quota. Please try another survey.'));
      }

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
      const ua = (req.headers['user-agent'] || 'unknown').substring(0, 190);

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

      const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
      let protocol = isSecure ? 'https' : 'http';
      let host = req.get('host') || '';
      if (host.includes(':443')) {
        protocol = 'https';
        host = host.replace(':443', '');
      } else if (host.includes(':80')) {
        host = host.replace(':80', '');
      }
      const rootUrl = `${protocol}://${host}`;

      const redirectResult = await RedirectLinkService.generateRedirectLink({
        platformIdentifier: platform.platform_sign,
        clickUrl: project.project_click_url || platform.platform_click_url,
        uuid,
        projectNo: project.project_no,
        rootUrl,
        ip,
        platformParams: params,
        isApi: project.is_api
      });

      return res.send(PlatformController.renderRedirectPage(redirectResult.redirectUrl));
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
      const ua = (req.headers['user-agent'] || 'unknown').substring(0, 190);

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
   * POST /api/member/platform/generate-link
   * Automatically generate dynamic live redirect links for any research company / platform identifier
   */
  static async generateLink(req, res) {
    try {
      const { platform_sign, platformIdentifier, click_url, clickUrl, uuid, project_no, projectNo, is_api, isApi, params } = req.body;
      const targetPlatform = platform_sign || platformIdentifier || '';
      const targetClickUrl = click_url || clickUrl || '';
      
      const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
      let protocol = isSecure ? 'https' : 'http';
      let host = req.get('host') || '';
      if (host.includes(':443')) host = host.replace(':443', '');
      else if (host.includes(':80')) host = host.replace(':80', '');
      const rootUrl = `${protocol}://${host}`;

      const trackingUuid = uuid || crypto.randomUUID().replace(/-/g, '');

      const result = await RedirectLinkService.generateRedirectLink({
        platformIdentifier: targetPlatform,
        clickUrl: targetClickUrl,
        uuid: trackingUuid,
        projectNo: project_no || projectNo || '',
        rootUrl,
        ip: PlatformController.getIpAddress(req),
        platformParams: params || {},
        isApi: Number(is_api ?? isApi) || 0
      });

      return res.json({
        code: 200,
        msg: 'success',
        data: result
      });
    } catch (err) {
      console.error('generateLink API error:', err);
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * GET /api/member/platform/check-update
   * Serves latest release information from version.json
   */
  static async checkUpdate(req, res) {
    try {
      const fs = require('fs');
      const path = require('path');
      const versionFile = path.join(__dirname, '../../version.json');
      if (fs.existsSync(versionFile)) {
        const raw = fs.readFileSync(versionFile, 'utf8');
        return res.json({ code: 200, msg: 'success', data: JSON.parse(raw) });
      }
      return res.json({
        code: 200,
        msg: 'success',
        data: {
          version: '1.0.1',
          releaseDate: '2026-10-19',
          title: 'v1.0.1 - Real-time Quota Timeline & Partner Redirect Engine',
          releaseUrl: 'https://github.com/aditya0yadav/freelance-wn/releases/latest'
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
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
   * Render a branded loading screen during redirects instead of a blank white page
   */
  static renderRedirectPage(targetUrl) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Transferring to survey...</title>
  <style>
    body { background: #0b0b0e; color: #ffffff; font-family: 'Outfit', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
    .loader { border: 4px solid rgba(255,255,255,0.1); border-left-color: #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .container { text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="loader"></div>
    <p style="color: #8b8b9f;">Securely transferring you to the survey partner...</p>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = "${targetUrl}";
    }, 500);
  </script>
</body>
</html>`;
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
              payout: 250.00,
              team_payout: 225.00,
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
              payout: 300.00,
              team_payout: 270.00,
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
              payout: 300.00,
              team_payout: 270.00,
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
              payout: 100.00,
              team_payout: 90.00,
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
              payout: 80.00,
              team_payout: 72.00,
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
              payout: 250.00,
              team_payout: 225.00,
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
      const memberId = req.user?.member_id || req.member?.member_id;
      const member = await prisma.member.findUnique({
        where: { member_id: memberId }
      });
      if (!member) {
        return res.status(404).json({ code: 404, msg: 'Member not found' });
      }

      // Sum completed payouts
      const successCoins = await prisma.reward.aggregate({
        where: { member_id: memberId, reward_status: 1 },
        _sum: { member_payout: true }
      });

      // Sum deduction payouts
      const deductionCoins = await prisma.reward.aggregate({
        where: { member_id: memberId, reward_status: 6 },
        _sum: { member_payout: true }
      });

      const coinsBalance = (successCoins._sum.member_payout || 0.00) - (deductionCoins._sum.member_payout || 0.00);

      return res.json({
        code: 200,
        data: {
          member_id: member.member_id,
          nickname: member.nickname,
          coins: Number(coinsBalance.toFixed(2))
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
   * GET /api/member/platform/notifications
   * Returns recent project updates (new projects and updated projects)
   * to alert employees of fresh survey opportunities and rate/quota changes.
   */
  static async notifications(req, res) {
    try {
      const teamId = req.user?.team_id || req.member?.team_id || 1;
      const memberId = req.user?.member_id || req.member?.member_id || 1;

      const member = await prisma.member.findUnique({ where: { member_id: memberId } });
      const team = await prisma.team.findUnique({ where: { team_id: teamId } });

      const platformAuths = await prisma.platformAuth.findMany({
        where: { team_id: teamId }
      });
      const authIds = platformAuths.map(a => a.platform_id);

      const customPlatforms = await prisma.platform.findMany({
        where: { is_custom: 1, delete_time: null, is_disable: 0 },
        select: { platform_id: true }
      });
      const effectiveAuthIds = Array.from(new Set([...authIds, ...customPlatforms.map(c => c.platform_id)]));

      // Fetch recent project creations or updates from the last 1 month (including paused surveys)
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const projects = await prisma.project.findMany({
        where: {
          platform_id: { in: effectiveAuthIds },
          delete_time: null,
          OR: [
            { update_time: { gte: oneMonthAgo } },
            { create_time: { gte: oneMonthAgo } }
          ]
        },
        include: {
          platform: true,
          currency: true
        },
        orderBy: [
          { update_time: 'desc' },
          { create_time: 'desc' }
        ],
        take: 25
      });

      const memberRate = (100 - (member?.rate || 0.00)) / 100;
      const teamCommissionRatio = team ? team.commission_ratio : 0.00;

      const list = projects.map(p => {
        const platformAuth = platformAuths.find(auth => auth.platform_id === p.platform_id);
        const authRateVal = platformAuth ? platformAuth.auth_rate : 0;
        const effectiveCpi = PlatformController.getEffectiveCpi(p);
        const rawCoins = effectiveCpi * (p.currency?.currency_coins || 100.00);
        const teamPayout = rawCoins * ((100 - teamCommissionRatio) / 100) * ((100 - authRateVal) / 100);
        const memberPayout = Math.round(teamPayout * memberRate);

        const createMs = p.create_time ? new Date(p.create_time).getTime() : 0;
        const updateMs = p.update_time ? new Date(p.update_time).getTime() : createMs;
        const isNew = Math.abs(updateMs - createMs) < 180000;

        let changeType = isNew ? 'NEW_PROJECT' : 'PROJECT_UPDATED';
        let changeSummary = '';
        let exclusions = [];
        let isEmailSurvey = p.project_code === 'EMAIL_SURVEY' || p.platform?.is_custom === 1;

        if (p.project_content) {
          try {
            const parsed = JSON.parse(p.project_content);
            if (parsed && (parsed.is_timeline || parsed.base_requirements)) {
              isEmailSurvey = true;
              const logs = Array.isArray(parsed.update_logs) ? parsed.update_logs : [];
              if (logs.length > 0) {
                const latestLog = logs[logs.length - 1];
                const prevLog = logs.length > 1 ? logs[logs.length - 2] : null;
                const baseQuota = Number(parsed.base_requirements?.initial_quota) || 0;
                const prevQuota = prevLog ? (Number(prevLog.updated_quota) || Number(prevLog.quota) || baseQuota) : baseQuota;
                const currQuota = Number(latestLog.updated_quota) || Number(latestLog.quota) || Number(p.project_quota) || 0;

                if (latestLog.status === 'PAUSED' || latestLog.action === 'pause') {
                  changeType = 'SURVEY_PAUSED';
                  changeSummary = `⏸️ Project Paused: ${latestLog.action_reason || 'Client requested pause'}`;
                } else if (latestLog.action === 'resume') {
                  changeType = 'SURVEY_RESUMED';
                  changeSummary = `▶️ Project Resumed: ${latestLog.action_reason || (currQuota > 0 ? `Open with ${currQuota} quota` : 'Traffic active')}`;
                } else if (latestLog.status === 'CLOSED' || latestLog.action === 'close') {
                  changeType = 'SURVEY_CLOSED';
                  changeSummary = `🛑 Project Closed: ${latestLog.action_reason || 'Survey finished'}`;
                } else if (currQuota > 0 && prevQuota > 0 && currQuota > prevQuota) {
                  changeType = 'QUOTA_INCREASE';
                  changeSummary = `Quota increased: ${prevQuota} → ${currQuota} (+${currQuota - prevQuota} slots)`;
                } else if (currQuota > 0 && prevQuota > 0 && currQuota < prevQuota) {
                  changeType = 'QUOTA_DECREASE';
                  changeSummary = `Quota adjusted: ${prevQuota} → ${currQuota}`;
                } else if (exclusions.length > 0) {
                  changeType = 'EXCLUSION_UPDATE';
                  changeSummary = `New restrictions: ${exclusions.slice(0, 2).join(', ')}`;
                } else if (latestLog.updated_cpi && Number(latestLog.updated_cpi) !== Number(p.project_cpi)) {
                  changeType = 'CPI_CHANGED';
                  changeSummary = `Reward adjusted to $${latestLog.updated_cpi}`;
                } else if (currQuota > 0) {
                  changeType = 'QUOTA_UPDATED';
                  changeSummary = `Target Quota: ${currQuota}`;
                } else if (latestLog.summary || latestLog.notes) {
                  changeType = 'EMAIL_UPDATE';
                  changeSummary = String(latestLog.summary || latestLog.notes).slice(0, 80);
                }
              }
            }
          } catch {}
        }

        const cleanTitle = PlatformController.cleanProjectTitle(p.project_name || 'Survey Campaign');
        let messageText = isNew 
          ? `New project "${cleanTitle}" available on ${p.platform?.platform_name || 'Platform'}`
          : `Project "${cleanTitle}" on ${p.platform?.platform_name || 'Platform'} updated`;

        if (changeSummary) {
          messageText = `${p.platform?.platform_name || 'Email'}: ${changeSummary} (${cleanTitle})`;
        }

        return {
          id: p.project_id,
          project_pno: p.project_pno,
          project_no: p.project_no,
          project_name: cleanTitle,
          platform_id: p.platform_id,
          platform_name: p.platform?.platform_name || 'General',
          platform_color: p.platform?.platform_color || '#3b82f6',
          project_cpi: p.project_cpi,
          coins: memberPayout,
          project_loi: p.project_loi,
          project_ir: p.project_ir,
          project_quota: p.project_quota,
          type: changeType,
          change_type: changeType,
          change_summary: changeSummary,
          exclusions: exclusions,
          is_email_survey: isEmailSurvey,
          time: p.update_time || p.create_time,
          message: messageText
        };
      });

      return res.json({
        code: 200,
        msg: 'success',
        data: {
          total: list.length,
          list
        }
      });
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
        where: { ...where, reward_status: { in: [2, 3, 4, 5] } },
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
        where: { ...where, reward_status: { in: [2, 3, 4, 5] } },
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
        where: { ...where, reward_status: { in: [2, 3, 4, 5] } },
        _sum: { member_payout: true }
      });

      return res.json({
        code: 200,
        data: {
          offers,
          teamdeduction: memberDeductionAgg._sum.member_payout || 0.00,
          teamsuccess: memberSuccessAgg._sum.member_payout || 0.00,
          teamfailed: memberFailedAgg._sum.member_payout || 0.00,
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
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
        dateFilter = { gte: start, lte: now };
      } else if (type === 'weekly') {
        const day = now.getUTCDay();
        const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0));
        dateFilter = { gte: start, lte: now };
      } else if (type === 'monthly') {
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
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

      const sanitizedList = list.map(item => ({
        reward_id: item.reward_id,
        txn_id: item.txn_id,
        project_pno: item.project_pno,
        project_no: item.project_no,
        member_payout: item.member_payout,
        create_time: item.create_time,
        ip: item.ip,
        reward_status: item.reward_status,
        member: item.member,
        platform: item.platform
      }));

      return res.json({
        code: 200,
        data: {
          list: sanitizedList,
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
