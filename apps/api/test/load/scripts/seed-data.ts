/**
 * Seed database with test data for load testing
 *
 * Usage: DATABASE_URL="..." ENCRYPTION_SECRET="..." npx ts-node test/load/scripts/seed-data.ts --recipients=10000
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createCipheriv, createHash, randomBytes } from 'crypto';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

// Simple encryption matching the API's EncryptionService
function encrypt(text: string, secret: string): string {
  const key = createHash('sha256').update(secret).digest();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function encryptConfig(config: Record<string, any>): { encrypted: string } {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable is required');
  }
  return { encrypted: encrypt(JSON.stringify(config), secret) };
}

interface SeedOptions {
  recipients: number;
  campaigns: number;
  campaignGroups: number;
}

function parseArgs(): SeedOptions {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    recipients: 1000,
    campaigns: 10,
    campaignGroups: 3,
  };

  for (const arg of args) {
    const [key, value] = arg.replace('--', '').split('=');
    if (key === 'recipients') options.recipients = parseInt(value, 10);
    if (key === 'campaigns') options.campaigns = parseInt(value, 10);
    if (key === 'groups') options.campaignGroups = parseInt(value, 10);
  }

  return options;
}

function generateEmail(index: number): string {
  return `user${index}@loadtest.example.com`;
}

function generateRecipientData(count: number): Array<{ id: string; email: string; first_name: string; last_name: string }> {
  const recipients = [];
  for (let i = 0; i < count; i++) {
    recipients.push({
      id: `recipient-${i}`,
      email: generateEmail(i),
      first_name: `User`,
      last_name: `${i}`,
    });
  }
  return recipients;
}

async function seed(options: SeedOptions) {
  console.log('Seeding load test data...');
  console.log(`  Recipients: ${options.recipients}`);
  console.log(`  Campaigns: ${options.campaigns}`);
  console.log(`  Campaign Groups: ${options.campaignGroups}`);

  // Create workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'load-test-workspace' },
    update: {},
    create: {
      id: 'load-test-workspace',
      name: 'Load Test Workspace',
    },
  });
  console.log(`Created workspace: ${workspace.id}`);

  // Create email connector (SMTP pointing to mailpit)
  const smtpConfig = encryptConfig({
    host: 'localhost',
    port: 1026,
    secure: false,
  });
  const emailConnector = await prisma.emailProviderConnector.upsert({
    where: { id: 'load-test-smtp' },
    update: { config: smtpConfig },
    create: {
      id: 'load-test-smtp',
      workspaceId: workspace.id,
      name: 'Load Test SMTP',
      type: 'SMTP',
      config: smtpConfig,
    },
  });
  console.log(`Created email connector: ${emailConnector.id}`);

  // Create sender profile
  const senderProfile = await prisma.senderProfile.upsert({
    where: { id: 'load-test-sender' },
    update: {},
    create: {
      id: 'load-test-sender',
      workspaceId: workspace.id,
      emailProviderConnectorId: emailConnector.id,
      name: 'Load Test Sender',
      fromEmail: 'loadtest@example.com',
      fromName: 'Load Test',
    },
  });
  console.log(`Created sender profile: ${senderProfile.id}`);

  // Create data connector pointing to the load test database
  const dbConfig = encryptConfig({
    host: 'localhost',
    port: 5477,
    database: 'emailops_load',
    user: 'emailops',
    password: 'emailops',
  });
  const dataConnector = await prisma.dataConnector.upsert({
    where: { id: 'load-test-data' },
    update: { config: dbConfig },
    create: {
      id: 'load-test-data',
      workspaceId: workspace.id,
      name: 'Load Test Data',
      type: 'POSTGRES',
      config: dbConfig,
    },
  });
  console.log(`Created data connector: ${dataConnector.id}`);

  // Create template
  const template = await prisma.template.upsert({
    where: { id: 'load-test-template' },
    update: {},
    create: {
      id: 'load-test-template',
      workspaceId: workspace.id,
      key: 'load-test-email',
      name: 'Load Test Email',
      category: 'MARKETING',
    },
  });

  await prisma.templateVersion.upsert({
    where: {
      templateId_version: {
        templateId: template.id,
        version: 1,
      }
    },
    update: {},
    create: {
      templateId: template.id,
      version: 1,
      subject: 'Load Test - Hello {{first_name}}',
      bodyHtml: `
        <html>
          <body>
            <h1>Hello {{first_name}} {{last_name}}</h1>
            <p>This is a load test email.</p>
            <p>Sent at: {{sent_at}}</p>
          </body>
        </html>
      `,
      mode: 'RAW_HTML',
      active: true,
    },
  });
  console.log(`Created template: ${template.id}`);

  // Create segment
  const segment = await prisma.segment.upsert({
    where: { id: 'load-test-segment' },
    update: { sqlQuery: `SELECT id, email, first_name, last_name FROM load_test_recipients LIMIT ${options.recipients}` },
    create: {
      id: 'load-test-segment',
      workspaceId: workspace.id,
      dataConnectorId: dataConnector.id,
      name: `Load Test Segment (${options.recipients} recipients)`,
      description: 'Segment for load testing',
      sqlQuery: `SELECT id, email, first_name, last_name FROM load_test_recipients LIMIT ${options.recipients}`,
    },
  });
  console.log(`Created segment: ${segment.id}`);

  // Create campaign groups
  const groups = [];
  for (let i = 0; i < options.campaignGroups; i++) {
    const group = await prisma.campaignGroup.upsert({
      where: { id: `load-test-group-${i}` },
      update: {},
      create: {
        id: `load-test-group-${i}`,
        workspaceId: workspace.id,
        name: `Load Test Group ${i}`,
        description: `Campaign group ${i} for load testing`,
        collisionWindow: 86400,
        collisionPolicy: i === 0 ? 'HIGHEST_PRIORITY_WINS' : i === 1 ? 'FIRST_QUEUED_WINS' : 'SEND_ALL',
      },
    });
    groups.push(group);
    console.log(`Created campaign group: ${group.id} (${group.collisionPolicy})`);
  }

  // Create campaigns
  for (let i = 0; i < options.campaigns; i++) {
    const groupIndex = i % options.campaignGroups;
    const campaign = await prisma.singleSend.upsert({
      where: { id: `load-test-campaign-${i}` },
      update: {},
      create: {
        id: `load-test-campaign-${i}`,
        workspaceId: workspace.id,
        name: `Load Test Campaign ${i}`,
        description: `Campaign ${i} for load testing`,
        status: 'ACTIVE',
        templateId: template.id,
        segmentId: segment.id,
        senderProfileId: senderProfile.id,
        campaignGroupId: groups[groupIndex].id,
        priority: (i % 10) + 1, // Priority 1-10
        scheduleType: 'MANUAL',
      },
    });
    console.log(`Created campaign: ${campaign.id} (group: ${groupIndex}, priority: ${campaign.priority})`);
  }

  // Create recipients table and populate with test data
  console.log(`\nCreating ${options.recipients} test recipients...`);

  // Create the recipients table if it doesn't exist
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS load_test_recipients (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      first_name VARCHAR(255),
      last_name VARCHAR(255)
    )
  `);

  // Clear existing data
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE load_test_recipients`);

  // Insert in batches
  const batchSize = 1000;
  const recipients = generateRecipientData(options.recipients);

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const values = batch
      .map(r => `('${r.id}', '${r.email}', '${r.first_name}', '${r.last_name}')`)
      .join(',');

    await prisma.$executeRawUnsafe(`
      INSERT INTO load_test_recipients (id, email, first_name, last_name)
      VALUES ${values}
    `);

    if ((i + batchSize) % 10000 === 0 || i + batchSize >= recipients.length) {
      console.log(`  Inserted ${Math.min(i + batchSize, recipients.length)} / ${recipients.length} recipients`);
    }
  }

  console.log('\nLoad test data seeding complete!');
  console.log('\nTest entities created:');
  console.log(`  - Workspace: ${workspace.id}`);
  console.log(`  - Email Connector: ${emailConnector.id}`);
  console.log(`  - Sender Profile: ${senderProfile.id}`);
  console.log(`  - Template: ${template.id}`);
  console.log(`  - Segment: ${segment.id}`);
  console.log(`  - Campaign Groups: ${groups.length}`);
  console.log(`  - Campaigns: ${options.campaigns}`);
  console.log(`  - Recipients: ${options.recipients}`);
}

async function main() {
  const options = parseArgs();

  try {
    await seed(options);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
