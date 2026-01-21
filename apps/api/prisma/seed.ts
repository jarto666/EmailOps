import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../../../.env') });
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const DEFAULT_WORKSPACE_ID = 'ws_default';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Seeding database...');

  // Create default workspace if it doesn't exist
  const workspace = await prisma.workspace.upsert({
    where: { id: DEFAULT_WORKSPACE_ID },
    update: {},
    create: {
      id: DEFAULT_WORKSPACE_ID,
      name: 'EmailOps',
    },
  });

  console.log(`✓ Workspace created: ${workspace.name} (${workspace.id})`);

  await prisma.$disconnect();
  await pool.end();

  console.log('Seeding complete!');
}

main().catch((e) => {
  console.error('Seeding failed:', e);
  process.exit(1);
});
