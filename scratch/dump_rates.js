const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const members = await prisma.member.findMany({
    include: { team: true }
  });
  console.log('--- MEMBERS & TEAMS ---');
  for (const m of members) {
    console.log(`Member: ${m.nickname} (ID: ${m.member_id}), Rate: ${m.rate}`);
    if (m.team) {
      console.log(`  Team: ${m.team.team_name} (ID: ${m.team.team_id}), Commission Ratio: ${m.team.commission_ratio}`);
    }
  }

  const auths = await prisma.platformAuth.findMany({
    include: { platform: true, team: true }
  });
  console.log('\n--- PLATFORM AUTHS ---');
  for (const a of auths) {
    console.log(`Platform: ${a.platform.platform_name}, Team: ${a.team.team_name}, Auth Rate: ${a.auth_rate}`);
  }

  const projects = await prisma.project.findMany({
    take: 3,
    include: { currency: true }
  });
  console.log('\n--- SAMPLE PROJECTS ---');
  console.log(JSON.stringify(projects, null, 2));

  await prisma.$disconnect();
}

run();
