const prisma = require('../config/database');

class TagController {
  static async list(req, res) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const search = req.query.search || '';

      const where = { delete_time: null };
      if (search) {
        where.tag_name = { contains: search };
      }

      const total = await prisma.memberTag.count({ where });
      const pages = Math.ceil(total / limit);

      const list = await prisma.memberTag.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { tag_id: 'desc' }
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

  static async add(req, res) {
    try {
      const { tag_name } = req.body;
      if (!tag_name) return res.status(400).json({ code: 400, msg: 'Missing tag_name' });

      const created = await prisma.memberTag.create({
        data: { tag_name }
      });

      return res.json({ code: 200, msg: 'success', data: created });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  static async edit(req, res) {
    try {
      const id = Number(req.body.tag_id);
      if (!id) return res.status(400).json({ code: 400, msg: 'Missing tag_id' });

      const { tag_name } = req.body;

      const updated = await prisma.memberTag.update({
        where: { tag_id: id },
        data: { tag_name }
      });

      return res.json({ code: 200, msg: 'success', data: updated });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  static async dele(req, res) {
    try {
      const ids = req.body.ids;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ code: 400, msg: 'Missing ids array' });
      }
      const idsArray = ids.map(Number);

      await prisma.memberTag.updateMany({
        where: { tag_id: { in: idsArray } },
        data: { delete_time: new Date() }
      });

      return res.json({ code: 200, msg: 'success' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }
}

module.exports = TagController;
