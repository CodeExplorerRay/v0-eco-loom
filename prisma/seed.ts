import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { DEMO_COMPANY_ID, seedDemoWorkspace } from '../src/lib/demo-workspace-seed';

const prisma = new PrismaClient();

function hashAccessToken(token: string) {
  const secret = process.env.ECO_LOOM_AUTH_SECRET || 'eco-loom-local-auth-secret-change-me';
  return createHash('sha256').update(`${secret}:${token}`).digest('hex');
}

async function main() {
  console.log('Seeding Eco-Loom demo workspace...');

  await prisma.user.deleteMany({
    where: {
      companyId: DEMO_COMPANY_ID,
    },
  });

  const summary = await seedDemoWorkspace(prisma, { clearExisting: true });

  await Promise.all([
    prisma.user.create({
      data: {
        email: (process.env.ECO_LOOM_ADMIN_EMAIL || 'admin@eco-loom.local').toLowerCase(),
        name: process.env.ECO_LOOM_ADMIN_NAME || 'Eco-Loom Admin',
        role: 'admin',
        status: 'active',
        companyId: DEMO_COMPANY_ID,
        accessTokenHash: hashAccessToken(process.env.ECO_LOOM_API_TOKEN || 'eco-loom-local-admin'),
      },
    }),
    prisma.user.create({
      data: {
        email: (process.env.ECO_LOOM_STANDARD_USER_EMAIL || 'analyst@eco-loom.local').toLowerCase(),
        name: process.env.ECO_LOOM_STANDARD_USER_NAME || 'Sustainability Analyst',
        role: 'standard',
        status: 'active',
        companyId: DEMO_COMPANY_ID,
        accessTokenHash: hashAccessToken(
          process.env.ECO_LOOM_STANDARD_USER_TOKEN || 'eco-loom-standard-user'
        ),
      },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      action: 'seed',
      entityType: 'database',
      entityId: 'demo-workspace',
      details: JSON.stringify({
        actor: 'prisma-seed',
        ...summary,
      }),
    },
  });

  console.log(`Company: ${summary.company}`);
  console.log(`Facilities: ${summary.departments}`);
  console.log(`Ledger entries: ${summary.ledgerEntries}`);
  console.log(`Goals: ${summary.goals}`);
  console.log(`Reports: ${summary.reports}`);
  console.log(`Emission factors: ${summary.emissionFactors}`);
}

main()
  .catch((error) => {
    console.error('Prisma seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
