import { PrismaClient } from '@prisma/client';

/**
 * Simple random string generator
 */
function randomString(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

function randomEmail(): string {
  return `test-${randomString()}@example.com`;
}

function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Test fixtures factory
 * Creates test data in the database for integration tests
 */
export class TestFixtures {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a workspace with all necessary base data
   */
  async createWorkspace(overrides: { name?: string } = {}) {
    return this.prisma.workspace.create({
      data: {
        name: overrides.name ?? `Test Workspace ${randomString(6)}`,
      },
    });
  }

  /**
   * Create an email provider connector (SES)
   */
  async createEmailConnector(
    workspaceId: string,
    overrides: {
      name?: string;
      type?: 'SES' | 'RESEND' | 'SMTP';
    } = {}
  ) {
    return this.prisma.emailProviderConnector.create({
      data: {
        workspaceId,
        name: overrides.name ?? 'Test SES',
        type: overrides.type ?? 'SES',
        config: {
          region: 'us-east-1',
          accessKeyId: 'fake-key',
          secretAccessKey: 'fake-secret',
        },
      },
    });
  }

  /**
   * Create a data connector (Postgres)
   */
  async createDataConnector(
    workspaceId: string,
    overrides: {
      name?: string;
      type?: 'POSTGRES' | 'BIGQUERY';
    } = {}
  ) {
    return this.prisma.dataConnector.create({
      data: {
        workspaceId,
        name: overrides.name ?? 'Test Database',
        type: overrides.type ?? 'POSTGRES',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'test',
          user: 'test',
          password: 'test',
        },
      },
    });
  }

  /**
   * Create a sender profile
   */
  async createSenderProfile(
    workspaceId: string,
    emailConnectorId: string,
    overrides: {
      name?: string;
      fromEmail?: string;
      fromName?: string;
    } = {}
  ) {
    return this.prisma.senderProfile.create({
      data: {
        workspaceId,
        emailProviderConnectorId: emailConnectorId,
        name: overrides.name ?? 'Test Sender',
        fromEmail: overrides.fromEmail ?? 'test@example.com',
        fromName: overrides.fromName ?? 'Test Sender',
        replyTo: 'reply@example.com',
      },
    });
  }

  /**
   * Create a template with an active version
   */
  async createTemplate(
    workspaceId: string,
    overrides: {
      key?: string;
      name?: string;
      category?: 'MARKETING' | 'TRANSACTIONAL' | 'BOTH';
      subject?: string;
      bodyHtml?: string;
    } = {}
  ) {
    const template = await this.prisma.template.create({
      data: {
        workspaceId,
        key: overrides.key ?? `template-${randomString(8)}`,
        name: overrides.name ?? 'Test Template',
        category: overrides.category ?? 'MARKETING',
      },
    });

    // Create an active version
    await this.prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        subject: overrides.subject ?? 'Hello {{first_name}}!',
        bodyHtml: overrides.bodyHtml ?? '<h1>Hello {{first_name}}!</h1><p>Welcome to our platform.</p>',
        mode: 'RAW_HTML',
        active: true,
      },
    });

    return this.prisma.template.findUnique({
      where: { id: template.id },
      include: { versions: true },
    });
  }

  /**
   * Create a segment
   */
  async createSegment(
    workspaceId: string,
    dataConnectorId: string,
    overrides: {
      name?: string;
      sqlQuery?: string;
    } = {}
  ) {
    return this.prisma.segment.create({
      data: {
        workspaceId,
        dataConnectorId,
        name: overrides.name ?? 'Test Segment',
        description: 'Test segment for integration tests',
        sqlQuery:
          overrides.sqlQuery ??
          `SELECT id, email, first_name, last_name FROM users WHERE plan = 'pro'`,
      },
    });
  }

  /**
   * Create a campaign group
   */
  async createCampaignGroup(
    workspaceId: string,
    overrides: {
      name?: string;
      collisionWindow?: number;
      collisionPolicy?: 'HIGHEST_PRIORITY_WINS' | 'FIRST_QUEUED_WINS' | 'SEND_ALL';
    } = {}
  ) {
    return this.prisma.campaignGroup.create({
      data: {
        workspaceId,
        name: overrides.name ?? `Campaign Group ${randomString(6)}`,
        description: 'Test campaign group',
        collisionWindow: overrides.collisionWindow ?? 86400,
        collisionPolicy: overrides.collisionPolicy ?? 'HIGHEST_PRIORITY_WINS',
      },
    });
  }

  /**
   * Create a single send (campaign)
   */
  async createSingleSend(
    workspaceId: string,
    templateId: string,
    segmentId: string,
    senderProfileId: string,
    overrides: {
      name?: string;
      status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'COMPLETED';
      campaignGroupId?: string;
      priority?: number;
    } = {}
  ) {
    return this.prisma.singleSend.create({
      data: {
        workspaceId,
        name: overrides.name ?? 'Test Campaign',
        description: 'Test campaign for integration tests',
        status: overrides.status ?? 'DRAFT',
        templateId,
        segmentId,
        senderProfileId,
        campaignGroupId: overrides.campaignGroupId,
        priority: overrides.priority ?? 100,
        scheduleType: 'MANUAL',
      },
    });
  }

  /**
   * Create a complete test setup with all related entities
   */
  async createCompleteSetup() {
    const workspace = await this.createWorkspace();
    const emailConnector = await this.createEmailConnector(workspace.id);
    const dataConnector = await this.createDataConnector(workspace.id);
    const senderProfile = await this.createSenderProfile(workspace.id, emailConnector.id);
    const template = await this.createTemplate(workspace.id);
    const segment = await this.createSegment(workspace.id, dataConnector.id);
    const campaignGroup = await this.createCampaignGroup(workspace.id);

    return {
      workspace,
      emailConnector,
      dataConnector,
      senderProfile,
      template: template!,
      segment,
      campaignGroup,
    };
  }

  /**
   * Create a single send with all dependencies
   */
  async createSingleSendWithDeps(
    overrides: {
      segmentQuery?: string;
      templateSubject?: string;
      templateBody?: string;
    } = {}
  ) {
    const setup = await this.createCompleteSetup();

    // Update segment if custom query provided
    if (overrides.segmentQuery) {
      await this.prisma.segment.update({
        where: { id: setup.segment.id },
        data: { sqlQuery: overrides.segmentQuery },
      });
    }

    // Update template if custom content provided
    if (overrides.templateSubject || overrides.templateBody) {
      await this.prisma.templateVersion.updateMany({
        where: { templateId: setup.template.id, active: true },
        data: {
          subject: overrides.templateSubject ?? 'Hello {{first_name}}!',
          bodyHtml: overrides.templateBody ?? '<h1>Hello</h1>',
        },
      });
    }

    const singleSend = await this.createSingleSend(
      setup.workspace.id,
      setup.template.id,
      setup.segment.id,
      setup.senderProfile.id,
      { campaignGroupId: setup.campaignGroup.id }
    );

    return {
      ...setup,
      singleSend,
    };
  }
}
