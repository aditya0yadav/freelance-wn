const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateZamplia() {
  try {
    const key = '0AgQ3A2yuJ0j3Tr0FQGT4bdNZaj0Tnw4';
    const secret = 'jadsjgazrvovn2ap4fcravgj4njlu0pm';

    const updated = await prisma.platform.updateMany({
      where: {
        platform_sign: 'Zamplia'
      },
      data: {
        platform_url: 'https://surveysupply.zamplia.com/api/v1/Surveys/GetAllocatedSurveys',
        platform_quota_url: 'https://surveysupply.zamplia.com/api/v1/Surveys/GetSurveyQuotas',
        platform_click_url: 'https://surveysupply.zamplia.com/api/v1/Surveys/GenerateLink',
        params: JSON.stringify([
          { name: 'app_key', value: key },
          { name: 'app_secret', value: secret }
        ])
      }
    });

    console.log('Update result:', updated);

    // Verify it
    const platform = await prisma.platform.findFirst({
      where: { platform_sign: 'Zamplia' }
    });
    console.log('Updated Zamplia platform fields:');
    console.log(JSON.stringify(platform, null, 2));

  } catch (error) {
    console.error('Error updating platform:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateZamplia();
