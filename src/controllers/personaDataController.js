const prisma = require('../config/database');

class PersonaDataController {
  static async list(req, res) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const personaId = Number(req.query.persona_id);
      if (!personaId) return res.status(400).json({ code: 400, msg: 'Missing persona_id' });

      const where = { persona_id: personaId, delete_time: null };

      const total = await prisma.personaData.count({ where });
      const pages = Math.ceil(total / limit);

      const list = await prisma.personaData.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sort: 'desc' }
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

  static async info(req, res) {
    try {
      const id = Number(req.query.persona_data_id || req.body.persona_data_id);
      if (!id) return res.status(400).json({ code: 400, msg: 'Missing persona_data_id' });

      const info = await prisma.personaData.findUnique({
        where: { persona_data_id: id }
      });

      if (!info || info.delete_time) {
        return res.status(404).json({ code: 404, msg: 'Persona data not found' });
      }

      return res.json({ code: 200, msg: 'success', data: info });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  static async add(req, res) {
    try {
      const { persona_id, persona_data_name, persona_data_type, persona_data_values, persona_data_holder, persona_data_must, sort } = req.body;
      if (!persona_id || !persona_data_name || !persona_data_type) {
        return res.status(400).json({ code: 400, msg: 'Missing required parameters' });
      }

      const created = await prisma.personaData.create({
        data: {
          persona_id: Number(persona_id),
          persona_data_name,
          persona_data_type,
          persona_data_values: persona_data_values || '',
          persona_data_holder: persona_data_holder || '',
          persona_data_must: Number(persona_data_must) || 0,
          sort: Number(sort) || 0
        }
      });

      return res.json({ code: 200, msg: 'success', data: created });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  static async edit(req, res) {
    try {
      const id = Number(req.body.persona_data_id);
      if (!id) return res.status(400).json({ code: 400, msg: 'Missing persona_data_id' });

      const { persona_data_name, persona_data_type, persona_data_values, persona_data_holder, persona_data_must, sort } = req.body;

      const updated = await prisma.personaData.update({
        where: { persona_data_id: id },
        data: {
          ...(persona_data_name && { persona_data_name }),
          ...(persona_data_type && { persona_data_type }),
          ...(persona_data_values !== undefined && { persona_data_values }),
          ...(persona_data_holder !== undefined && { persona_data_holder }),
          ...(persona_data_must !== undefined && { persona_data_must: Number(persona_data_must) }),
          ...(sort !== undefined && { sort: Number(sort) })
        }
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

      await prisma.personaData.updateMany({
        where: { persona_data_id: { in: idsArray } },
        data: { delete_time: new Date() }
      });

      return res.json({ code: 200, msg: 'Success' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }
}

module.exports = PersonaDataController;
