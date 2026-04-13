import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roleConfigs = await prisma.actTeamRoleConfig.findMany({
    where: {
      role: 'hero',
      openVoting: false,
    },
    select: {
      team: { select: { actId: true } },
      candidates: { select: { userId: true } },
    },
  });

  let createdOrUpdated = 0;

  for (const cfg of roleConfigs) {
    // Backfill only fixed-assignment legacy records (single candidate).
    if (cfg.candidates.length !== 1) continue;

    const heroUserId = cfg.candidates[0].userId;

    await prisma.actParticipant.upsert({
      where: {
        actId_userId_role: {
          actId: cfg.team.actId,
          userId: heroUserId,
          role: 'hero',
        },
      },
      create: {
        actId: cfg.team.actId,
        userId: heroUserId,
        role: 'hero',
        status: 'active',
      },
      update: {
        status: 'active',
        leftAt: null,
      },
    });

    createdOrUpdated += 1;
  }

  console.log(`Backfill done. Upserted hero participants: ${createdOrUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
