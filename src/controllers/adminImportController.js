const prisma = require('../config/database');
const bcrypt = require('bcryptjs');

class AdminImportController {
  /**
   * GET /api/admin/import/template?type=rewards|members
   */
  static async downloadTemplate(req, res) {
    try {
      const type = req.query.type || 'rewards';
      let csvContent = '';
      let filename = 'template.csv';

      if (type === 'rewards') {
        filename = 'rewards_import_template.csv';
        const headers = ['txn_id', 'uuid', 'member_nickname', 'team_name', 'platform_name', 'project_no', 'payout_usd', 'reward_status', 'start_time', 'completion_time'];
        const sampleRow = ['TXN99887766', 'a1b2c3d4-e5f6-7890', 'test_user', 'Default Publisher Network', 'GoWebSurveys', '335386', '1.50', '1', '2026-07-31 10:00:00', '2026-07-31 10:15:00'];
        csvContent = `${headers.join(',')}\n${sampleRow.join(',')}\n`;
      } else if (type === 'members') {
        filename = 'members_import_template.csv';
        const headers = ['nickname', 'password', 'team_name', 'rate'];
        const sampleRow = ['new_member_01', '123456', 'Default Publisher Network', '10.0'];
        csvContent = `${headers.join(',')}\n${sampleRow.join(',')}\n`;
      } else {
        return res.status(400).json({ code: 400, msg: 'Invalid template type' });
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * Helper to parse CSV lines into array of objects using headers
   */
  static parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      if (values.length < headers.length) continue;
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });
      rows.push(obj);
    }
    return rows;
  }

  /**
   * POST /api/admin/import/rewards
   * Expects CSV content in body or file upload
   */
  static async importRewards(req, res) {
    try {
      let csvContent = '';
      if (req.file) {
        csvContent = req.file.buffer.toString('utf-8');
      } else if (req.body && req.body.csv_data) {
        csvContent = req.body.csv_data;
      } else {
        return res.status(400).json({ code: 400, msg: 'No CSV file or csv_data payload provided' });
      }

      const rows = AdminImportController.parseCSV(csvContent);
      if (rows.length === 0) {
        return res.status(400).json({ code: 400, msg: 'CSV file is empty or formatted incorrectly' });
      }

      // Pre-fetch lookups
      const [members, teams, platforms] = await Promise.all([
        prisma.member.findMany(),
        prisma.team.findMany(),
        prisma.platform.findMany()
      ]);

      const memberMap = new Map(members.map(m => [m.nickname.toLowerCase(), m]));
      const teamMap = new Map(teams.map(t => [t.team_name.toLowerCase(), t]));
      const platformMap = new Map(platforms.map(p => [p.platform_name.toLowerCase(), p]));

      const defaultTeam = teams[0];
      const defaultPlatform = platforms[0];

      let successNum = 0;
      let failNum = 0;
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNo = i + 2;

        try {
          const txnId = row.txn_id || `IMP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
          const uuid = row.uuid || `UUID-${Date.now()}-${i}`;
          
          const memberNickname = (row.member_nickname || '').toLowerCase();
          const member = memberMap.get(memberNickname);
          if (!member) {
            failNum++;
            errors.push({ line: lineNo, msg: `Member nickname "${row.member_nickname}" not found` });
            continue;
          }

          const team = teamMap.get((row.team_name || '').toLowerCase()) || defaultTeam;
          const platform = platformMap.get((row.platform_name || '').toLowerCase()) || defaultPlatform;

          const payoutUsd = parseFloat(row.payout_usd || '0.00');
          const coinsPerUsd = 100.0;
          const totalCoins = payoutUsd * coinsPerUsd;

          const status = parseInt(row.reward_status || '1', 10);

          await prisma.reward.upsert({
            where: { txn_id: txnId },
            update: {
              reward_status: status,
              payout: totalCoins,
              team_payout: totalCoins * 0.9,
              member_payout: totalCoins * 0.8,
              create_time: row.completion_time ? new Date(row.completion_time) : new Date()
            },
            create: {
              txn_id: txnId,
              uuid: uuid,
              member_id: member.member_id,
              team_id: team ? team.team_id : member.team_id,
              platform_id: platform ? platform.platform_id : 1,
              project_no: row.project_no || null,
              project_name: row.project_no ? `Project #${row.project_no}` : 'Imported Reward',
              payout: totalCoins,
              team_payout: totalCoins * 0.9,
              member_payout: totalCoins * 0.8,
              usd_currency_coins: coinsPerUsd,
              reward_status: status,
              start_time: row.start_time ? new Date(row.start_time) : new Date(),
              create_time: row.completion_time ? new Date(row.completion_time) : new Date()
            }
          });

          successNum++;
        } catch (err) {
          failNum++;
          errors.push({ line: lineNo, msg: err.message });
        }
      }

      return res.json({
        code: 200,
        msg: `Import completed: ${successNum} succeeded, ${failNum} failed.`,
        data: {
          total: rows.length,
          success_num: successNum,
          fail_num: failNum,
          errors: errors
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  /**
   * POST /api/admin/import/members
   * Expects CSV content in body or file upload
   */
  static async importMembers(req, res) {
    try {
      let csvContent = '';
      if (req.file) {
        csvContent = req.file.buffer.toString('utf-8');
      } else if (req.body && req.body.csv_data) {
        csvContent = req.body.csv_data;
      } else {
        return res.status(400).json({ code: 400, msg: 'No CSV file or csv_data payload provided' });
      }

      const rows = AdminImportController.parseCSV(csvContent);
      if (rows.length === 0) {
        return res.status(400).json({ code: 400, msg: 'CSV file is empty or formatted incorrectly' });
      }

      const teams = await prisma.team.findMany();
      const teamMap = new Map(teams.map(t => [t.team_name.toLowerCase(), t]));
      const defaultTeam = teams[0];

      let successNum = 0;
      let failNum = 0;
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNo = i + 2;

        try {
          const nickname = (row.nickname || '').trim();
          if (!nickname) {
            failNum++;
            errors.push({ line: lineNo, msg: 'Nickname is required' });
            continue;
          }

          const plainPassword = (row.password || '123456').trim();
          const hashedPassword = bcrypt.hashSync(plainPassword, 10);

          const team = teamMap.get((row.team_name || '').toLowerCase()) || defaultTeam;
          const rate = parseFloat(row.rate || '0.00');

          const existing = await prisma.member.findUnique({ where: { nickname } });
          if (existing) {
            await prisma.member.update({
              where: { member_id: existing.member_id },
              data: {
                team_id: team ? team.team_id : existing.team_id,
                rate: isNaN(rate) ? existing.rate : rate
              }
            });
          } else {
            await prisma.member.create({
              data: {
                nickname,
                password: hashedPassword,
                team_id: team ? team.team_id : 1,
                rate: isNaN(rate) ? 0.00 : rate,
                is_disable: 0,
                create_time: new Date()
              }
            });
          }

          successNum++;
        } catch (err) {
          failNum++;
          errors.push({ line: lineNo, msg: err.message });
        }
      }

      return res.json({
        code: 200,
        msg: `Members import completed: ${successNum} succeeded, ${failNum} failed.`,
        data: {
          total: rows.length,
          success_num: successNum,
          fail_num: failNum,
          errors: errors
        }
      });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }
}

module.exports = AdminImportController;
