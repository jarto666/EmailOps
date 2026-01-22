/**
 * Campaign SDK tests
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { useTestClient, getClient } from './setup';
import type { EmailOps } from '../src';

describe('Campaigns', () => {
  let client: EmailOps;

  useTestClient(beforeAll, afterAll);
  let templateId: string;
  let segmentId: string;
  let senderProfileId: string;
  let dataConnectorId: string;
  let emailConnectorId: string;

  beforeAll(async () => {
    client = getClient();

    // Create required dependencies for campaigns
    // 1. Data connector (needed for segment)
    const dataConnector = await client.dataConnectors.create({
      name: 'Test DB',
      type: 'POSTGRES',
      config: {
        connectionString: 'postgresql://test:test@localhost:5432/test',
      },
    });
    dataConnectorId = dataConnector.id;

    // 2. Email connector (needed for sender profile)
    const emailConnector = await client.emailConnectors.create({
      name: 'Test SMTP',
      type: 'SMTP',
      config: {
        host: 'localhost',
        port: 1025,
        secure: false,
      },
    });
    emailConnectorId = emailConnector.id;

    // 3. Template
    const template = await client.templates.create({
      key: 'test-campaign-template',
      name: 'Test Campaign Template',
    });
    templateId = template.id;

    // Create a version for the template
    await client.templates.createVersion(templateId, {
      subject: 'Test Subject',
      bodyHtml: '<h1>Hello {{name}}</h1>',
      mode: 'RAW_HTML',
    });

    // 4. Segment
    const segment = await client.segments.create({
      name: 'Test Segment',
      dataConnectorId,
      sqlQuery: 'SELECT 1 as id, \'test@example.com\' as email',
    });
    segmentId = segment.id;

    // 5. Sender Profile
    const senderProfile = await client.senderProfiles.create({
      name: 'Test Sender',
      fromEmail: 'test@example.com',
      fromName: 'Test',
      emailProviderConnectorId: emailConnectorId,
    });
    senderProfileId = senderProfile.id;
  });

  it('should create a campaign', async () => {
    const campaign = await client.campaigns.create({
      name: 'Test Campaign',
      description: 'A test campaign',
      templateId,
      segmentId,
      senderProfileId,
    });

    expect(campaign).toBeDefined();
    expect(campaign.id).toBeDefined();
    expect(campaign.name).toBe('Test Campaign');
    expect(campaign.status).toBe('DRAFT');
  });

  it('should list campaigns', async () => {
    const campaigns = await client.campaigns.list();

    expect(Array.isArray(campaigns)).toBe(true);
    expect(campaigns.length).toBeGreaterThan(0);
  });

  it('should get a campaign by ID', async () => {
    const created = await client.campaigns.create({
      name: 'Get Test Campaign',
      templateId,
      segmentId,
      senderProfileId,
    });

    const campaign = await client.campaigns.get(created.id);

    expect(campaign.id).toBe(created.id);
    expect(campaign.name).toBe('Get Test Campaign');
  });

  it('should update a campaign', async () => {
    const created = await client.campaigns.create({
      name: 'Update Test Campaign',
      templateId,
      segmentId,
      senderProfileId,
    });

    const updated = await client.campaigns.update(created.id, {
      name: 'Updated Campaign Name',
      description: 'Updated description',
    });

    expect(updated.name).toBe('Updated Campaign Name');
    expect(updated.description).toBe('Updated description');
  });

  it('should activate and pause a campaign', async () => {
    const campaign = await client.campaigns.create({
      name: 'Activate Test Campaign',
      templateId,
      segmentId,
      senderProfileId,
    });

    const activated = await client.campaigns.activate(campaign.id);
    expect(activated.status).toBe('ACTIVE');

    const paused = await client.campaigns.pause(campaign.id);
    expect(paused.status).toBe('PAUSED');
  });

  it('should delete a campaign', async () => {
    const campaign = await client.campaigns.create({
      name: 'Delete Test Campaign',
      templateId,
      segmentId,
      senderProfileId,
    });

    const result = await client.campaigns.delete(campaign.id);
    expect(result.ok).toBe(true);

    // Verify it's deleted
    await expect(client.campaigns.get(campaign.id)).rejects.toThrow();
  });

  it('should get campaign runs', async () => {
    const campaign = await client.campaigns.create({
      name: 'Runs Test Campaign',
      templateId,
      segmentId,
      senderProfileId,
    });

    const runs = await client.campaigns.getRuns(campaign.id);
    expect(Array.isArray(runs)).toBe(true);
  });
});
