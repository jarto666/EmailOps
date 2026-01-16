"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const supertest_1 = __importDefault(require("supertest"));
const bullmq_1 = require("@nestjs/bullmq");
const test_database_1 = require("../utils/test-database");
const test_fixtures_1 = require("../utils/test-fixtures");
const single_sends_controller_1 = require("../../src/single-sends/single-sends.controller");
const single_sends_service_1 = require("../../src/single-sends/single-sends.service");
const collision_service_1 = require("../../src/single-sends/collision.service");
const prisma_service_1 = require("../../src/prisma/prisma.service");
// Mock BullMQ Queue
const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    getRepeatableJobs: jest.fn().mockResolvedValue([]),
    removeRepeatableByKey: jest.fn().mockResolvedValue(undefined),
};
describe('Single Sends API (Integration)', () => {
    let app;
    let testDb;
    let prisma;
    let fixtures;
    let workspaceId;
    let setup;
    beforeAll(async () => {
        // Start test database
        testDb = await (0, test_database_1.getTestDatabase)();
        prisma = testDb.getClient();
        fixtures = new test_fixtures_1.TestFixtures(prisma);
        // Create complete test setup
        setup = await fixtures.createCompleteSetup();
        workspaceId = setup.workspace.id;
        // Create NestJS test module
        const moduleFixture = await testing_1.Test.createTestingModule({
            controllers: [single_sends_controller_1.SingleSendsController],
            providers: [
                single_sends_service_1.SingleSendsService,
                collision_service_1.CollisionService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: prisma,
                },
                {
                    provide: (0, bullmq_1.getQueueToken)('singleSend'),
                    useValue: mockQueue,
                },
            ],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new common_1.ValidationPipe({ transform: true }));
        await app.init();
    });
    afterAll(async () => {
        await app?.close();
        await (0, test_database_1.closeTestDatabase)();
    });
    beforeEach(async () => {
        // Clean single sends between tests
        await prisma.send.deleteMany({});
        await prisma.singleSendRecipient.deleteMany({});
        await prisma.singleSendRun.deleteMany({});
        await prisma.sendLog.deleteMany({});
        await prisma.singleSend.deleteMany({});
    });
    describe('POST /single-sends', () => {
        it('should create a new campaign', async () => {
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/single-sends')
                .send({
                workspaceId,
                name: 'Test Campaign',
                description: 'A test campaign',
                templateId: setup.template.id,
                segmentId: setup.segment.id,
                senderProfileId: setup.senderProfile.id,
            })
                .expect(201);
            expect(response.body).toMatchObject({
                name: 'Test Campaign',
                status: 'DRAFT',
            });
            expect(response.body.id).toBeDefined();
        });
        it('should create campaign with schedule type', async () => {
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/single-sends')
                .send({
                workspaceId,
                name: 'Scheduled Campaign',
                templateId: setup.template.id,
                segmentId: setup.segment.id,
                senderProfileId: setup.senderProfile.id,
                scheduleType: 'MANUAL',
            })
                .expect(201);
            expect(response.body.scheduleType).toBe('MANUAL');
        });
        it('should validate required references', async () => {
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/single-sends')
                .send({
                workspaceId,
                name: 'Invalid Campaign',
                templateId: 'non-existent',
                segmentId: setup.segment.id,
                senderProfileId: setup.senderProfile.id,
            })
                .expect(400);
        });
    });
    describe('GET /single-sends', () => {
        it('should list all campaigns', async () => {
            // Create test campaigns
            await fixtures.createSingleSend(workspaceId, setup.template.id, setup.segment.id, setup.senderProfile.id, { name: 'Campaign 1' });
            await fixtures.createSingleSend(workspaceId, setup.template.id, setup.segment.id, setup.senderProfile.id, { name: 'Campaign 2' });
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .get('/single-sends')
                .query({ workspaceId })
                .expect(200);
            expect(response.body).toHaveLength(2);
        });
        it('should include template and segment info', async () => {
            await fixtures.createSingleSend(workspaceId, setup.template.id, setup.segment.id, setup.senderProfile.id, { name: 'Campaign with relations' });
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .get('/single-sends')
                .query({ workspaceId })
                .expect(200);
            expect(response.body[0].template).toBeDefined();
            expect(response.body[0].segment).toBeDefined();
            expect(response.body[0].senderProfile).toBeDefined();
        });
    });
    describe('GET /single-sends/:id', () => {
        it('should get campaign with runs', async () => {
            const campaign = await fixtures.createSingleSend(workspaceId, setup.template.id, setup.segment.id, setup.senderProfile.id);
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .get(`/single-sends/${campaign.id}`)
                .query({ workspaceId })
                .expect(200);
            expect(response.body.id).toBe(campaign.id);
            expect(response.body.template).toBeDefined();
            expect(response.body.segment).toBeDefined();
        });
    });
    describe('PATCH /single-sends/:id', () => {
        it('should update campaign status', async () => {
            const campaign = await fixtures.createSingleSend(workspaceId, setup.template.id, setup.segment.id, setup.senderProfile.id, { status: 'DRAFT' });
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .patch(`/single-sends/${campaign.id}`)
                .query({ workspaceId })
                .send({ status: 'ACTIVE' })
                .expect(200);
            expect(response.body.status).toBe('ACTIVE');
        });
    });
    describe('POST /single-sends/:id/trigger', () => {
        it('should trigger a campaign and return job id', async () => {
            const campaign = await fixtures.createSingleSend(workspaceId, setup.template.id, setup.segment.id, setup.senderProfile.id, { status: 'ACTIVE' });
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post(`/single-sends/${campaign.id}/trigger`)
                .query({ workspaceId })
                .expect(201);
            expect(response.body.ok).toBe(true);
            expect(response.body.jobId).toBeDefined();
        });
        it('should return 404 for non-existent campaign', async () => {
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/single-sends/non-existent-id/trigger')
                .query({ workspaceId })
                .expect(404);
        });
    });
    describe('DELETE /single-sends/:id', () => {
        it('should delete campaign', async () => {
            const campaign = await fixtures.createSingleSend(workspaceId, setup.template.id, setup.segment.id, setup.senderProfile.id);
            await (0, supertest_1.default)(app.getHttpServer())
                .delete(`/single-sends/${campaign.id}`)
                .query({ workspaceId })
                .expect(200);
            const found = await prisma.singleSend.findUnique({
                where: { id: campaign.id },
            });
            expect(found).toBeNull();
        });
    });
});
