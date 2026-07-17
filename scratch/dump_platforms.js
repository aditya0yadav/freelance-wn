const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const platforms = await prisma.platform.findMany({
    where: { delete_time: null }
  });
  console.log(JSON.stringify(platforms, null, 2));
  await prisma.$disconnect();
}

run();
