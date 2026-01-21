import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestDatabase, getTestDatabase, closeTestDatabase } from '../utils/test-database';
import { TestFixtures } from '../utils/test-fixtures';
import { TemplatesController } from '../../src/templates/templates.controller';
import { TemplatesService } from '../../src/templates/templates.service';
import { TemplateVersionsController } from '../../src/templates/template-versions.controller';
import { TemplateVersionsService } from '../../src/templates/template-versions.service';
import { RenderingService } from '../../src/templates/rendering.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Templates API (Integration)', () => {
  let app: INestApplication;
  let testDb: TestDatabase;
  let prisma: PrismaClient;
  let fixtures: TestFixtures;
  let workspaceId: string;

  beforeAll(async () => {
    // Start test database
    testDb = await getTestDatabase();
    prisma = testDb.getClient();
    fixtures = new TestFixtures(prisma);

    // Create test workspace
    const workspace = await fixtures.createWorkspace({ name: 'Test Workspace' });
    workspaceId = workspace.id;

    // Create NestJS test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController, TemplateVersionsController],
      providers: [
        TemplatesService,
        TemplateVersionsService,
        RenderingService,
        {
          provide: PrismaService,
          useValue: prisma,
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
    // Clean templates between tests (but keep workspace)
    await prisma.templateVersion.deleteMany({});
    await prisma.template.deleteMany({});
  });

  describe('POST /templates', () => {
    it('should create a new template', async () => {
      const response = await request(app.getHttpServer())
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
      await request(app.getHttpServer())
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
      await request(app.getHttpServer())
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

      const response = await request(app.getHttpServer())
        .get('/templates')
        .query({ workspaceId })
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map((t: any) => t.key)).toContain('template-1');
      expect(response.body.map((t: any) => t.key)).toContain('template-2');
    });

    it('should include version count', async () => {
      await fixtures.createTemplate(workspaceId, { key: 'with-version' });

      const response = await request(app.getHttpServer())
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

      const response = await request(app.getHttpServer())
        .get(`/templates/${template!.id}`)
        .query({ workspaceId })
        .expect(200);

      expect(response.body.key).toBe('test-template');
      expect(response.body.versions).toBeDefined();
      expect(response.body.versions.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent template', async () => {
      await request(app.getHttpServer())
        .get('/templates/non-existent-id')
        .query({ workspaceId })
        .expect(404);
    });
  });

  describe('POST /templates/:id/versions', () => {
    it('should create a new version', async () => {
      const template = await fixtures.createTemplate(workspaceId, { key: 'versioned' });

      const response = await request(app.getHttpServer())
        .post(`/templates/${template!.id}/versions`)
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

      const version = template!.versions[0];

      const response = await request(app.getHttpServer())
        .post(`/templates/${template!.id}/versions/${version.id}/render`)
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

      await request(app.getHttpServer())
        .delete(`/templates/${template!.id}`)
        .query({ workspaceId })
        .expect(200);

      // Verify deletion
      const found = await prisma.template.findUnique({
        where: { id: template!.id },
      });
      expect(found).toBeNull();
    });
  });
});
