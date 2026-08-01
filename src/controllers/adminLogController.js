const prisma = require('../config/database');

class AdminLogController {
  static async list(req, res) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const search = req.query.search || '';

      const where = {};
      if (search) {
        where.OR = [
          { admin_name: { contains: search } },
          { action: { contains: search } }
        ];
      }

      const total = await prisma.adminLog.count({ where });
      const pages = Math.ceil(total / limit);

      const list = await prisma.adminLog.findMany({
        where,
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

  static async logAction(adminId, adminName, action, ip = '', ua = '') {
    try {
      await prisma.adminLog.create({
        data: {
          admin_id: Number(adminId) || 0,
          admin_name: adminName || 'Admin',
          action,
          ip,
          ua
        }
      });
    } catch (e) {
      console.error('Failed to log admin action:', e.message);
    }
  }
}

module.exports = AdminLogController;
