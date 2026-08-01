const prisma = require('../config/database');

class PersonaController {
  static async list(req, res) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const search = req.query.search || '';

      const where = { delete_time: null };
      if (search) {
        where.persona_name = { contains: search };
      }

      const total = await prisma.persona.count({ where });
      const pages = Math.ceil(total / limit);

      const list = await prisma.persona.findMany({
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
      const id = Number(req.query.persona_id || req.body.persona_id);
      if (!id) return res.status(400).json({ code: 400, msg: 'Missing persona_id' });

      const info = await prisma.persona.findUnique({
        where: { persona_id: id }
      });

      if (!info || info.delete_time) {
        return res.status(404).json({ code: 404, msg: 'Persona template not found' });
      }

      return res.json({ code: 200, msg: 'success', data: info });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  static async add(req, res) {
    try {
      const { persona_name, persona_type, sort } = req.body;
      if (!persona_name) return res.status(400).json({ code: 400, msg: 'Missing persona_name' });

      const created = await prisma.persona.create({
        data: {
          persona_name,
          persona_type: Number(persona_type) || 0,
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
      const id = Number(req.body.persona_id);
      if (!id) return res.status(400).json({ code: 400, msg: 'Missing persona_id' });

      const { persona_name, persona_type, sort } = req.body;

      const updated = await prisma.persona.update({
        where: { persona_id: id },
        data: {
          ...(persona_name && { persona_name }),
          ...(persona_type !== undefined && { persona_type: Number(persona_type) }),
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

      // Check if template is used by any platform
      const usedByPlatform = await prisma.platform.findFirst({
        where: {
          OR: [
            { platform_persona_template: { in: idsArray } }
          ]
        }
      });
      if (usedByPlatform) {
        return res.status(400).json({ code: 400, msg: 'Platform is using this template. Unbind it first.' });
      }

      await prisma.persona.updateMany({
        where: { persona_id: { in: idsArray } },
        data: { delete_time: new Date() }
      });

      return res.json({ code: 200, msg: 'Templates soft deleted successfully' });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  static async copy(req, res) {
    try {
      const id = Number(req.body.persona_id);
      if (!id) return res.status(400).json({ code: 400, msg: 'Missing persona_id' });

      const original = await prisma.persona.findUnique({ where: { persona_id: id } });
      if (!original) return res.status(404).json({ code: 404, msg: 'Original template not found' });

      // Clone Persona
      const clonedPersona = await prisma.persona.create({
        data: {
          persona_name: `${original.persona_name}_copy`,
          persona_type: original.persona_type,
          sort: original.sort
        }
      });

      // Clone Persona Data
      const originalData = await prisma.personaData.findMany({
        where: { persona_id: id, delete_time: null }
      });

      if (originalData.length > 0) {
        const batchData = originalData.map(item => ({
          persona_id: clonedPersona.persona_id,
          persona_data_name: item.persona_data_name,
          persona_data_type: item.persona_data_type,
          persona_data_values: item.persona_data_values,
          persona_data_holder: item.persona_data_holder,
          persona_data_must: item.persona_data_must,
          sort: item.sort
        }));

        await prisma.personaData.createMany({
          data: batchData
        });
      }

      return res.json({ code: 200, msg: 'Template cloned successfully', data: clonedPersona });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }
}

module.exports = PersonaController;
