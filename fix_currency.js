const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Get or create a currency
    let currency = await prisma.currency.findFirst();
    if (!currency) {
      console.log('No currency found in DB. Creating a default USD currency...');
      currency = await prisma.currency.create({
        data: {
          currency_code: 'USD',
          currency_name: 'US Dollar',
          currency_coins: 100.00
        }
      });
    }
    console.log(`Using Currency: ${currency.currency_name} (ID: ${currency.currency_id})`);

    // 2. Update TMDPanel platform
    const platform = await prisma.platform.findUnique({
      where: { platform_sign: 'TMDPanel' }
    });

    if (!platform) {
      console.log('TMDPanel platform not found in DB!');
      return;
    }

    if (platform.platform_currency === currency.currency_id) {
      console.log('TMDPanel already has the correct currency set.');
    } else {
      await prisma.platform.update({
        where: { platform_id: platform.platform_id },
        data: { platform_currency: currency.currency_id }
      });
      console.log(`Successfully updated TMDPanel's currency to ID ${currency.currency_id}.`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
