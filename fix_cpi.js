const prisma = require('./src/config/database');

/**
 * Migration & repair script:
 * Scans ya_project for any surveys where project_cpi was defaulted to 1.0 or overwritten,
 * and restores the real CPI from timeline base_requirements or verbatim project specifications.
 */
async function fixCpi() {
  try {
    console.log('[Fix CPI] Scanning ya_project for surveys with overwritten or defaulted CPI...');
    const projects = await prisma.project.findMany({
      where: {
        delete_time: null
      },
      select: {
        project_id: true,
        project_pno: true,
        project_no: true,
        project_name: true,
        project_cpi: true,
        project_content: true,
        platform_id: true
      }
    });

    let fixedCount = 0;
    for (const p of projects) {
      if (!p.project_content) continue;
      let realCpi = null;

      // 1. Check if timeline has initial_cpi in base_requirements
      try {
        const parsed = typeof p.project_content === 'string' ? JSON.parse(p.project_content) : p.project_content;
        if (parsed?.base_requirements?.initial_cpi && Number(parsed.base_requirements.initial_cpi) > 0) {
          realCpi = Number(parsed.base_requirements.initial_cpi);
        }
      } catch {}

      // 2. Check for explicit dollar pattern in specs/content
      if (!realCpi) {
        const text = typeof p.project_content === 'string' ? p.project_content : JSON.stringify(p.project_content);
        const match = text.match(/(?:CPI[^\$]*|[\s\w])\$\s*([0-9]+(?:\.[0-9]+)?)/i);
        if (match) {
          const val = parseFloat(match[1]);
          if (val > 0 && val <= 100) realCpi = val;
        }
      }

      // 3. If recovered real CPI differs from 1.0 / 0.0, update database
      if (realCpi && (p.project_cpi === 1.0 || p.project_cpi <= 0) && realCpi !== p.project_cpi) {
        console.log(`[Fix CPI] Updating Project ${p.project_id} [${p.project_no}]: ${p.project_cpi} -> ${realCpi} USD`);
        await prisma.project.update({
          where: { project_id: p.project_id },
          data: { project_cpi: realCpi }
        });
        fixedCount++;
      }
    }

    console.log(`[Fix CPI] Scan completed. Successfully repaired ${fixedCount} project(s).`);
  } catch (err) {
    console.error('[Fix CPI] Error running CPI repair:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fixCpi();
}

module.exports = fixCpi;
