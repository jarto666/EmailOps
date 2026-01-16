"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const supertest_1 = __importDefault(require("supertest"));
const test_database_1 = require("../utils/test-database");
const test_fixtures_1 = require("../utils/test-fixtures");
const templates_controller_1 = require("../../src/templates/templates.controller");
const templates_service_1 = require("../../src/templates/templates.service");
const template_versions_controller_1 = require("../../src/templates/template-versions.controller");
const template_versions_service_1 = require("../../src/templates/template-versions.service");
const rendering_service_1 = require("../../src/templates/rendering.service");
const prisma_service_1 = require("../../src/prisma/prisma.service");
describe('Templates API (Integration)', () => {
    let app;
    let testDb;
    let prisma;
    let fixtures;
    let workspaceId;
    beforeAll(async () => {
        // Start test database
        testDb = await (0, test_database_1.getTestDatabase)();
        prisma = testDb.getClient();
        fixtures = new test_fixtures_1.TestFixtures(prisma);
        // Create test workspace
        const workspace = await fixtures.createWorkspace({ name: 'Test Workspace' });
        workspaceId = workspace.id;
        // Create NestJS test module
        const moduleFixture = await testing_1.Test.createTestingModule({
            controllers: [templates_controller_1.TemplatesController, template_versions_controller_1.TemplateVersionsController],
            providers: [
                templates_service_1.TemplatesService,
                template_versions_service_1.TemplateVersionsService,
                rendering_service_1.RenderingService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: prisma,
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
        // Clean templates between tests (but keep workspace)
        await prisma.templateVersion.deleteMany({});
        await prisma.template.deleteMany({});
    });
    describe('POST /templates', () => {
        it('should create a new template', async () => {
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/templates')
                .send({
                workspaceId,
                key: 'welcome-email',
                name: 'Welcome Email',
                category: 'TRANSACTIONAL',
            })
                .expect(201);
            expect(response.body).toMatchObject({
                key: 'welcome-email',
                name: 'Welcome Email',
                category: 'TRANSACTIONAL',
            });
            expect(response.body.id).toBeDefined();
        });
        it('should reject duplicate template keys', async () => {
            // Create first template
            await fixtures.createTemplate(workspaceId, { key: 'unique-template' });
            // Try to create duplicate
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/templates')
                .send({
                workspaceId,
                key: 'unique-template',
                name: 'Duplicate Template',
                category: 'MARKETING',
            })
                .expect(400); // Bad request (unique constraint)
        });
        it('should validate required fields', async () => {
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/templates')
                .send({
                workspaceId,
                // Missing key, name, and category
            })
                .expect(400);
        });
    });
    describe('GET /templates', () => {
        it('should list all templates', async () => {
            // Create test templates
            await fixtures.createTemplate(workspaceId, { key: 'template-1', name: 'Template 1' });
            await fixtures.createTemplate(workspaceId, { key: 'template-2', name: 'Template 2' });
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .get('/templates')
                .query({ workspaceId })
                .expect(200);
            expect(response.body).toHaveLength(2);
            expect(response.body.map((t) => t.key)).toContain('template-1');
            expect(response.body.map((t) => t.key)).toContain('template-2');
        });
        it('should include version count', async () => {
            await fixtures.createTemplate(workspaceId, { key: 'with-version' });
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .get('/templates')
                .query({ workspaceId })
                .expect(200);
            expect(response.body[0]._count?.versions || response.body[0].versions?.length).toBeGreaterThan(0);
        });
    });
    describe('GET /templates/:id', () => {
        it('should get template by ID with versions', async () => {
            const template = await fixtures.createTemplate(workspaceId, {
                key: 'test-template',
                name: 'Test Template',
            });
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .get(`/templates/${template.id}`)
                .query({ workspaceId })
                .expect(200);
            expect(response.body.key).toBe('test-template');
            expect(response.body.versions).toBeDefined();
            expect(response.body.versions.length).toBeGreaterThan(0);
        });
        it('should return 404 for non-existent template', async () => {
            await (0, supertest_1.default)(app.getHttpServer())
                .get('/templates/non-existent-id')
                .query({ workspaceId })
                .expect(404);
        });
    });
    describe('POST /templates/:id/versions', () => {
        it('should create a new version', async () => {
            const template = await fixtures.createTemplate(workspaceId, { key: 'versioned' });
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post(`/templates/${template.id}/versions`)
                .query({ workspaceId })
                .send({
                subject: 'New Subject Line',
                bodyHtml: '<h1>New Content</h1>',
                mode: 'RAW_HTML',
            })
                .expect(201);
            expect(response.body.version).toBe(2); // First version is 1, this should be 2
            expect(response.body.subject).toBe('New Subject Line');
        });
    });
    describe('POST /templates/:id/versions/:versionId/render', () => {
        it('should render template with variables', async () => {
            const template = await fixtures.createTemplate(workspaceId, {
                key: 'render-test',
                subject: 'Hello {{first_name}}!',
                bodyHtml: '<h1>Welcome, {{first_name}} {{last_name}}!</h1>',
            });
            const version = template.versions[0];
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post(`/templates/${template.id}/versions/${version.id}/render`)
                .query({ workspaceId })
                .send({
                variables: {
                    first_name: 'John',
                    last_name: 'Doe',
                },
            })
                .expect(201);
            expect(response.body.subject).toBe('Hello John!');
            expect(response.body.html).toContain('Welcome, John Doe!');
        });
    });
    describe('DELETE /templates/:id', () => {
        it('should delete template and its versions', async () => {
            const template = await fixtures.createTemplate(workspaceId, { key: 'to-delete' });
            await (0, supertest_1.default)(app.getHttpServer())
                .delete(`/templates/${template.id}`)
                .query({ workspaceId })
                .expect(200);
            // Verify deletion
            const found = await prisma.template.findUnique({
                where: { id: template.id },
            });
            expect(found).toBeNull();
        });
    });
});
