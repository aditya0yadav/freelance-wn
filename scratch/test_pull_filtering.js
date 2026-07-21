require('dotenv').config();
const prisma = require('../src/config/database');
const InventoryPullService = require('../src/services/inventoryPullService');

async function test() {
  try {
    const platform = await prisma.platform.findUnique({
      where: { platform_sign: 'Gowebsurveys' }
    });
    if (!platform) {
      console.log('GoWebSurveys platform not found in DB');
      return;
    }
    console.log('Found GoWebSurveys platform:', platform.platform_name);
    
    // Check how many surveys were active before pull
    const beforeCount = await prisma.project.count({
      where: { platform_id: platform.platform_id, delete_time: null, is_disable: 0 }
    });
    console.log('Surveys in DB before pull:', beforeCount);

    console.log('Running pullGowebsurveys...');
    await InventoryPullService.pullPlatform(platform);

    const afterCount = await prisma.project.count({
      where: { platform_id: platform.platform_id, delete_time: null, is_disable: 0 }
    });
    console.log('Surveys in DB after pull (only live status 3):', afterCount);

    // Let's print some sample active surveys
    const sample = await prisma.project.findMany({
      where: { platform_id: platform.platform_id, delete_time: null, is_disable: 0 },
      take: 5
    });
    console.log('Sample live surveys in DB:', sample.map(s => ({
      no: s.project_no,
      name: s.project_name,
      cpi: s.project_cpi,
      loi: s.project_loi
    })));

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
