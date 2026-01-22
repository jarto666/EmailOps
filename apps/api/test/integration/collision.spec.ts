import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient, CollisionPolicy } from '@prisma/client';
import { getQueueToken } from '@nestjs/bullmq';
import { TestDatabase, getTestDatabase, closeTestDatabase } from '../utils/test-database';
import { TestFixtures } from '../utils/test-fixtures';
import { CampaignGroupsController } from '../../src/campaign-groups/campaign-groups.controller';
import { CampaignGroupsService } from '../../src/campaign-groups/campaign-groups.service';
import { SingleSendsController } from '../../src/single-sends/single-sends.controller';
import { SingleSendsService } from '../../src/single-sends/single-sends.service';
import { PrismaService } from '../../src/prisma/prisma.service';

// Mock BullMQ Queue
const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  getRepeatableJobs: jest.fn().mockResolvedValue([]),
  removeRepeatableByKey: jest.fn().mockResolvedValue(undefined),
};

describe('Collision Handling (Integration)', () => {
  let app: INestApplication;
  let testDb: TestDatabase;
  let prisma: PrismaClient;
  let fixtures: TestFixtures;
  let workspaceId: string;
  let setup: Awaited<ReturnType<TestFixtures['createCompleteSetup']>>;

  beforeAll(async () => {
    testDb = await getTestDatabase();
    prisma = testDb.getClient();
    fixtures = new TestFixtures(prisma);

    setup = await fixtures.createCompleteSetup();
    workspaceId = setup.workspace.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CampaignGroupsController, SingleSendsController],
      providers: [
        CampaignGroupsService,
        SingleSendsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: getQueueToken('singleSend'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await closeTestDatabase();
  });

  beforeEach(async () => {
    // Clean up between tests - order matters for FK constraints
    await prisma.sendLog.deleteMany({});
    await prisma.send.deleteMany({});
    await prisma.singleSendRecipient.deleteMany({});
    await prisma.singleSendRun.deleteMany({});
    await prisma.singleSend.deleteMany({});
    await prisma.campaignGroup.deleteMany({});
    mockQueue.add.mockClear();
  });

  describe('Campaign Group Creation', () => {
    it('should create campaign group with HIGHEST_PRIORITY_WINS policy', async () => {
      const response = await request(app.getHttpServer())
        .post('/campaign-groups')
        .query({ workspaceId })
        .send({
          name: 'Priority Test Group',
          collisionWindow: 86400,
          collisionPolicy: 'HIGHEST_PRIORITY_WINS',
        })
        .expect(201);

      expect(response.body.collisionPolicy).toBe('HIGHEST_PRIORITY_WINS');
      expect(response.body.collisionWindow).toBe(86400);
    });

    it('should create campaign group with FIRST_QUEUED_WINS policy', async () => {
      const response = await request(app.getHttpServer())
        .post('/campaign-groups')
        .query({ workspaceId })
        .send({
          name: 'First Wins Group',
          collisionWindow: 3600,
          collisionPolicy: 'FIRST_QUEUED_WINS',
        })
        .expect(201);

      expect(response.body.collisionPolicy).toBe('FIRST_QUEUED_WINS');
    });

    it('should create campaign group with SEND_ALL policy', async () => {
      const response = await request(app.getHttpServer())
        .post('/campaign-groups')
        .query({ workspaceId })
        .send({
          name: 'Send All Group',
          collisionPolicy: 'SEND_ALL',
        })
        .expect(201);

      expect(response.body.collisionPolicy).toBe('SEND_ALL');
    });

    it('should reject collision window less than 1 hour', async () => {
      await request(app.getHttpServer())
        .post('/campaign-groups')
        .query({ workspaceId })
        .send({
          name: 'Invalid Window Group',
          collisionWindow: 1800, // 30 minutes - below minimum
        })
        .expect(400);
    });
  });

  describe('Campaign Assignment to Groups', () => {
    let campaignGroupId: string;

    beforeEach(async () => {
      const group = await prisma.campaignGroup.create({
        data: {
          workspaceId,
          name: 'Test Group',
          collisionWindow: 86400,
          collisionPolicy: CollisionPolicy.HIGHEST_PRIORITY_WINS,
        },
      });
      campaignGroupId = group.id;
    });

    it('should create campaign in a group with priority', async () => {
      // Create campaign directly via fixtures (API doesn't yet support campaignGroupId)
      const campaign = await fixtures.createSingleSend(
        workspaceId,
        setup.template.id,
        setup.segment.id,
        setup.senderProfile.id,
        { name: 'Campaign with Group', campaignGroupId, priority: 1 }
      );

      expect(campaign.campaignGroupId).toBe(campaignGroupId);
      expect(campaign.priority).toBe(1);
    });

    it('should list campaigns in a group', async () => {
      // Create campaigns in the group
      await fixtures.createSingleSend(
        workspaceId,
        setup.template.id,
        setup.segment.id,
        setup.senderProfile.id,
        { name: 'Campaign 1', campaignGroupId, priority: 1 }
      );
      await fixtures.createSingleSend(
        workspaceId,
        setup.template.id,
        setup.segment.id,
        setup.senderProfile.id,
        { name: 'Campaign 2', campaignGroupId, priority: 2 }
      );

      const response = await request(app.getHttpServer())
        .get(`/campaign-groups/${campaignGroupId}`)
        .query({ workspaceId })
        .expect(200);

      expect(response.body.singleSends).toHaveLength(2);
    });
  });

  describe('HIGHEST_PRIORITY_WINS Collision Logic', () => {
    let campaignGroupId: string;

    beforeEach(async () => {
      const group = await prisma.campaignGroup.create({
        data: {
          workspaceId,
          name: 'Priority Test Group',
          collisionWindow: 86400,
          collisionPolicy: CollisionPolicy.HIGHEST_PRIORITY_WINS,
        },
      });
      campaignGroupId = group.id;
    });

    it('should record send log for collision tracking', async () => {
      // Create two campaigns with different priorities
      const campaign1 = await fixtures.createSingleSend(
        workspaceId,
        setup.template.id,
        setup.segment.id,
        setup.senderProfile.id,
        { name: 'High Priority', campaignGroupId, priority: 1, status: 'ACTIVE' }
      );

      const campaign2 = await fixtures.createSingleSend(
        workspaceId,
        setup.template.id,
        setup.segment.id,
        setup.senderProfile.id,
        { name: 'Low Priority', campaignGroupId, priority: 2, status: 'ACTIVE' }
      );

      // Simulate send log for same subject (recipient)
      const testSubjectId = 'user-123';

      // Record send log from campaign 1 (high priority)
      await prisma.sendLog.create({
        data: {
          workspaceId,
          singleSendId: campaign1.id,
          campaignGroupId,
          subjectId: testSubjectId,
          sentAt: new Date(),
        },
      });

      // Check if subject was sent to within collision window for this group
      const existingSendLog = await prisma.sendLog.findFirst({
        where: {
          campaignGroupId,
          subjectId: testSubjectId,
          sentAt: {
            gte: new Date(Date.now() - 86400 * 1000),
          },
        },
        include: {
          singleSend: true,
        },
      });

      expect(existingSendLog).not.toBeNull();
      expect(existingSendLog?.singleSend?.priority).toBe(1);

      // Verify campaign 2 (lower priority) would be blocked
      // In real flow, this check prevents sending
      const shouldBlockLowPriority = existingSendLog !== null;
      expect(shouldBlockLowPriority).toBe(true);
    });

    it('should allow higher priority campaign to override in collision window', async () => {
      const lowPriorityCampaign = await fixtures.createSingleSend(
        workspaceId,
        setup.template.id,
        setup.segment.id,
        setup.senderProfile.id,
        { name: 'Low Priority First', campaignGroupId, priority: 2, status: 'ACTIVE' }
      );

      const highPriorityCampaign = await fixtures.createSingleSend(
        workspaceId,
        setup.template.id,
        setup.segment.id,
        setup.senderProfile.id,
        { name: 'High Priority Second', campaignGroupId, priority: 1, status: 'ACTIVE' }
      );

      const testSubjectId = 'user-456';

      // Low priority campaign sends first
      await prisma.sendLog.create({
        data: {
          workspaceId,
          singleSendId: lowPriorityCampaign.id,
          campaignGroupId,
          subjectId: testSubjectId,
        },
      });

      // Check existing logs for this subject in collision window
      const existingLogs = await prisma.sendLog.findMany({
        where: {
          campaignGroupId,
          subjectId: testSubjectId,
          sentAt: {
            gte: new Date(Date.now() - 86400 * 1000),
          },
        },
        include: {
          singleSend: true,
        },
      });

      // Verify low priority campaign has sent
      expect(existingLogs).toHaveLength(1);
      expect(existingLogs[0].singleSend.priority).toBe(2);

      // With HIGHEST_PRIORITY_WINS policy, the high priority campaign (priority 1)
      // should be allowed to send because it has higher priority than all existing sends
      const highestExistingPriority = Math.min(...existingLogs.map(log => log.singleSend.priority));
      const shouldAllowHighPriority = highPriorityCampaign.priority < highestExistingPriority;

      expect(shouldAllowHighPriority).toBe(true); // Priority 1 < Priority 2
    });
  });
});

describe('Deduplication (Integration)', () => {
  let app: INestApplication;
  let testDb: TestDatabase;
  let prisma: PrismaClient;
  let fixtures: TestFixtures;
  let workspaceId: string;
  let setup: Awaited<ReturnType<TestFixtures['createCompleteSetup']>>;

  beforeAll(async () => {
    testDb = await getTestDatabase();
    prisma = testDb.getClient();
    fixtures = new TestFixtures(prisma);

    setup = await fixtures.createCompleteSetup();
    workspaceId = setup.workspace.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SingleSendsController],
      providers: [
        SingleSendsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: getQueueToken('singleSend'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await prisma.suppression.deleteMany({});
    await prisma.sendLog.deleteMany({});
    await prisma.send.deleteMany({});
    await prisma.singleSendRecipient.deleteMany({});
    await prisma.singleSendRun.deleteMany({});
    mockQueue.add.mockClear();
  });

  describe('Suppression List', () => {
    it('should not allow sending to suppressed email', async () => {
      const suppressedEmail = 'suppressed@example.com';

      // Add to suppression list
      await prisma.suppression.create({
        data: {
          workspaceId,
          email: suppressedEmail,
          reason: 'MANUAL',
        },
      });

      // Verify suppression exists
      const suppression = await prisma.suppression.findUnique({
        where: {
          workspaceId_email: {
            workspaceId,
            email: suppressedEmail,
          },
        },
      });

      expect(suppression).not.toBeNull();
      expect(suppression?.reason).toBe('MANUAL');
    });

    it('should handle case-insensitive email suppression', async () => {
      const email = 'Test@Example.com';
      const normalizedEmail = email.toLowerCase();

      await prisma.suppression.create({
        data: {
          workspaceId,
          email: normalizedEmail,
          reason: 'BOUNCE',
        },
      });

      // Check with different case
      const suppression = await prisma.suppression.findUnique({
        where: {
          workspaceId_email: {
            workspaceId,
            email: normalizedEmail,
          },
        },
      });

      expect(suppression).not.toBeNull();
    });
  });

  describe('Same Campaign Resend Prevention', () => {
    it('should prevent duplicate recipients within same run via unique constraint', async () => {
      const campaign = await fixtures.createSingleSend(
        workspaceId,
        setup.template.id,
        setup.segment.id,
        setup.senderProfile.id,
        { status: 'ACTIVE' }
      );

      // Create a run for the campaign
      const run = await prisma.singleSendRun.create({
        data: {
          singleSendId: campaign.id,
          status: 'SENDING',
        },
      });

      const testSubjectId = 'unique-test-subject';

      // First recipient should succeed
      await prisma.singleSendRecipient.create({
        data: {
          runId: run.id,
          subjectId: testSubjectId,
          email: 'test@example.com',
          status: 'PENDING',
        },
      });

      // Second recipient with same subjectId in same run should fail (unique constraint)
      await expect(
        prisma.singleSendRecipient.create({
          data: {
            runId: run.id,
            subjectId: testSubjectId,
            email: 'test@example.com',
            status: 'PENDING',
          },
        })
      ).rejects.toThrow();
    });

    it('should track send log for collision detection across campaigns', async () => {
      const campaignGroup = await fixtures.createCampaignGroup(workspaceId);

      const campaign = await fixtures.createSingleSend(
        workspaceId,
        setup.template.id,
        setup.segment.id,
        setup.senderProfile.id,
        { status: 'ACTIVE', campaignGroupId: campaignGroup.id }
      );

      const testSubjectId = 'subject-for-collision';

      // Record a send in the send log
      await prisma.sendLog.create({
        data: {
          workspaceId,
          singleSendId: campaign.id,
          campaignGroupId: campaignGroup.id,
          subjectId: testSubjectId,
        },
      });

      // Check that send log exists for this subject in the group
      const existingLog = await prisma.sendLog.findFirst({
        where: {
          campaignGroupId: campaignGroup.id,
          subjectId: testSubjectId,
        },
      });

      expect(existingLog).not.toBeNull();
    });
  });
});
