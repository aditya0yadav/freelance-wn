const prisma = require('../config/database');

class PlatformService {
  /**
   * Get single platform info with decrypted/parsed parameter arrays
   */
  static async getInfo(platformId) {
    const platform = await prisma.platform.findUnique({
      where: { platform_id: platformId }
    });
    if (!platform) throw new Error('Platform not found');

    const result = { ...platform };
    if (typeof result.params === 'string') {
      try {
        result.params = JSON.parse(result.params);
      } catch (e) {
        result.params = [];
      }
    }
    if (typeof result.project_params === 'string') {
      try {
        result.project_params = JSON.parse(result.project_params);
      } catch (e) {
        result.project_params = [];
      }
    }
    return result;
  }

  /**
   * Calculate aggregated platform conversions statistics
   */
  static async getStatistics(platformId, filters = {}) {
    const where = { platform_id: platformId };

    if (filters.date_value && Array.isArray(filters.date_value) && filters.date_value.length === 2) {
      where.create_time = {
        gte: new Date(filters.date_value[0]),
        lte: new Date(filters.date_value[1])
      };
    }

    const [completes, screenouts, overquotas, terminations] = await Promise.all([
      prisma.reward.count({ where: { ...where, reward_status: 1 } }),
      prisma.reward.count({ where: { ...where, reward_status: 2 } }),
      prisma.reward.count({ where: { ...where, reward_status: 3 } }),
      prisma.reward.count({ where: { ...where, reward_status: 4 } })
    ]);

    const payoutSums = await prisma.reward.aggregate({
      _sum: {
        payout: true,
        team_payout: true,
        member_payout: true
      },
      where: { ...where, reward_status: 1 }
    });

    return {
      platform_id: platformId,
      metrics: {
        completes,
        screenouts,
        overquotas,
        terminations,
        total_clicks: await prisma.flowing.count({
          where: {
            project: { platform_id: platformId },
            ...(where.create_time ? { create_time: where.create_time } : {})
          }
        })
      },
      financials: {
        total_payout: payoutSums._sum.payout || 0,
        team_payout: payoutSums._sum.team_payout || 0,
        member_payout: payoutSums._sum.member_payout || 0,
        profit: (payoutSums._sum.payout || 0) - (payoutSums._sum.team_payout || 0)
      }
    };
  }
}

module.exports = PlatformService;
