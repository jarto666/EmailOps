import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root (or .env.demo if it exists)
config({ path: resolve(__dirname, '../../../.env.demo') });
config({ path: resolve(__dirname, '../../../.env') });

import { PrismaClient, EmailProviderType, DataConnectorType, AuthoringMode, CollisionPolicy } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as crypto from 'crypto';

const DEFAULT_WORKSPACE_ID = 'ws_default';

// Encryption matching EncryptionService
function encrypt(text: string, secret: string): string {
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const encryptionSecret = process.env.ENCRYPTION_SECRET || 'demo-secret-change-in-production';
  const isDemoMode = process.env.DEMO_MODE === 'true';

  console.log('Seeding database...');
  console.log(`Demo mode: ${isDemoMode}`);

  // Create default workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: DEFAULT_WORKSPACE_ID },
    update: {},
    create: {
      id: DEFAULT_WORKSPACE_ID,
      name: 'EmailOps',
    },
  });
  console.log(`✓ Workspace: ${workspace.name}`);

  // Only seed demo data if DEMO_MODE is enabled
  if (isDemoMode) {
    // 1. Email Provider Connector (SMTP to Mailpit)
    const smtpConfig = {
      host: 'localhost',
      port: 3314,
      secure: false,
    };
    const emailConnector = await prisma.emailProviderConnector.upsert({
      where: { id: 'demo_smtp_connector' },
      update: {
        config: { encrypted: encrypt(JSON.stringify(smtpConfig), encryptionSecret) },
      },
      create: {
        id: 'demo_smtp_connector',
        workspaceId: DEFAULT_WORKSPACE_ID,
        name: 'Demo Mailpit (SMTP)',
        type: EmailProviderType.SMTP,
        config: { encrypted: encrypt(JSON.stringify(smtpConfig), encryptionSecret) },
      },
    });
    console.log(`✓ Email Connector: ${emailConnector.name}`);

    // 2. Data Connector (Postgres to demo database)
    const pgConfig = {
      connectionString: 'postgresql://demo:demo@localhost:3311/demo',
    };
    const dataConnector = await prisma.dataConnector.upsert({
      where: { id: 'demo_pg_connector' },
      update: {
        config: { encrypted: encrypt(JSON.stringify(pgConfig), encryptionSecret) },
      },
      create: {
        id: 'demo_pg_connector',
        workspaceId: DEFAULT_WORKSPACE_ID,
        name: 'Demo Users Database',
        type: DataConnectorType.POSTGRES,
        config: { encrypted: encrypt(JSON.stringify(pgConfig), encryptionSecret) },
      },
    });
    console.log(`✓ Data Connector: ${dataConnector.name}`);

    // 3. Sender Profile
    const senderProfile = await prisma.senderProfile.upsert({
      where: { id: 'demo_sender' },
      update: {},
      create: {
        id: 'demo_sender',
        workspaceId: DEFAULT_WORKSPACE_ID,
        emailProviderConnectorId: emailConnector.id,
        name: 'Demo Sender',
        fromEmail: 'hello@demo.emailops.com',
        fromName: 'EmailOps Demo',
        replyTo: 'reply@demo.emailops.com',
      },
    });
    console.log(`✓ Sender Profile: ${senderProfile.name}`);

    // 4. Template
    const template = await prisma.template.upsert({
      where: { id: 'demo_template' },
      update: {},
      create: {
        id: 'demo_template',
        workspaceId: DEFAULT_WORKSPACE_ID,
        key: 'demo-welcome',
        name: 'Demo Welcome Email',
        category: 'MARKETING',
      },
    });
    console.log(`✓ Template: ${template.name}`);

    // 5. Template Version
    const mjmlContent = `
<mjml>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="20px">
      <mj-column>
        <mj-text font-size="24px" font-weight="bold" color="#333333">
          Welcome, {{first_name}}!
        </mj-text>
        <mj-text font-size="16px" color="#666666" line-height="1.5">
          Thanks for being part of our demo. You're currently on the <strong>{{plan_type}}</strong> plan.
        </mj-text>
        <mj-text font-size="14px" color="#999999">
          This email was sent to {{email}} as part of the EmailOps demo.
        </mj-text>
        <mj-button background-color="#4F46E5" color="#ffffff" href="https://github.com/your-org/email-ops">
          Learn More
        </mj-button>
      </mj-column>
    </mj-section>
    <mj-section padding="10px">
      <mj-column>
        <mj-text font-size="12px" color="#999999" align="center">
          EmailOps Demo • Sent with ❤️
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`.trim();

    await prisma.templateVersion.upsert({
      where: { id: 'demo_template_v1' },
      update: {},
      create: {
        id: 'demo_template_v1',
        templateId: template.id,
        version: 1,
        subject: 'Welcome to the Demo, {{first_name}}!',
        preheader: 'See what EmailOps can do',
        mode: AuthoringMode.RAW_MJML,
        bodyMjml: mjmlContent,
        active: true,
      },
    });
    console.log(`✓ Template Version: v1 (active)`);

    // 6. Segment
    const segment = await prisma.segment.upsert({
      where: { id: 'demo_segment' },
      update: {},
      create: {
        id: 'demo_segment',
        workspaceId: DEFAULT_WORKSPACE_ID,
        dataConnectorId: dataConnector.id,
        name: 'Demo: Active Marketing Users',
        description: 'Users who have opted in to marketing emails',
        sqlQuery: `SELECT
  id as subject_id,
  email,
  json_build_object(
    'first_name', first_name,
    'last_name', last_name,
    'plan_type', plan_type
  ) as vars
FROM users
WHERE receive_marketing = true
  AND email_verified = true
LIMIT 10`,
      },
    });
    console.log(`✓ Segment: ${segment.name}`);

    // 7. Campaign Group
    const campaignGroup = await prisma.campaignGroup.upsert({
      where: { id: 'demo_campaign_group' },
      update: {},
      create: {
        id: 'demo_campaign_group',
        workspaceId: DEFAULT_WORKSPACE_ID,
        name: 'Demo Campaigns',
        description: 'Campaign group for demo purposes',
        collisionWindow: 86400, // 24 hours
        collisionPolicy: CollisionPolicy.HIGHEST_PRIORITY_WINS,
      },
    });
    console.log(`✓ Campaign Group: ${campaignGroup.name}`);

    // 8. Single Send (Campaign)
    const singleSend = await prisma.singleSend.upsert({
      where: { id: 'demo_single_send' },
      update: {},
      create: {
        id: 'demo_single_send',
        workspaceId: DEFAULT_WORKSPACE_ID,
        name: 'Demo Welcome Campaign',
        description: 'A demo campaign to showcase EmailOps features',
        templateId: template.id,
        segmentId: segment.id,
        senderProfileId: senderProfile.id,
        campaignGroupId: campaignGroup.id,
        status: 'DRAFT',
        scheduleType: 'MANUAL',
        priority: 100,
      },
    });
    console.log(`✓ Campaign: ${singleSend.name}`);

    console.log('\n✅ Demo data seeded successfully!');
    console.log('\nYou can now:');
    console.log('  1. Open http://localhost:3030/campaigns');
    console.log('  2. Click on "Demo Welcome Campaign"');
    console.log('  3. Click "Trigger" to send emails');
    console.log('  4. View emails at http://localhost:3313 (Mailpit)');
    console.log('  5. Use Demo Tools at http://localhost:3030/demo-tools');
  }

  await prisma.$disconnect();
  await pool.end();

  console.log('\nSeeding complete!');
}

main().catch((e) => {
  console.error('Seeding failed:', e);
  process.exit(1);
});
