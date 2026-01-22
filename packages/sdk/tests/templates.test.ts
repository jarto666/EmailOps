/**
 * Template SDK tests
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { useTestClient, getClient } from './setup';
import type { EmailOps } from '../src';

describe('Templates', () => {
  let client: EmailOps;

  useTestClient(beforeAll, afterAll);

  beforeAll(() => {
    client = getClient();
  });

  it('should create a template', async () => {
    const template = await client.templates.create({
      key: 'test-template-' + Date.now(),
      name: 'Test Template',
      category: 'transactional',
    });

    expect(template).toBeDefined();
    expect(template.id).toBeDefined();
    expect(template.name).toBe('Test Template');
    expect(template.category).toBe('transactional');
  });

  it('should list templates', async () => {
    const templates = await client.templates.list();

    expect(Array.isArray(templates)).toBe(true);
  });

  it('should get a template by ID', async () => {
    const created = await client.templates.create({
      key: 'get-test-template-' + Date.now(),
      name: 'Get Test Template',
    });

    const template = await client.templates.get(created.id);

    expect(template.id).toBe(created.id);
    expect(template.name).toBe('Get Test Template');
  });

  it('should create a template version', async () => {
    const template = await client.templates.create({
      key: 'version-test-template-' + Date.now(),
      name: 'Version Test Template',
    });

    const version = await client.templates.createVersion(template.id, {
      subject: 'Hello {{name}}',
      bodyHtml: '<h1>Welcome, {{name}}!</h1><p>Thanks for signing up.</p>',
      mode: 'RAW_HTML',
    });

    expect(version).toBeDefined();
    expect(version.id).toBeDefined();
    expect(version.subject).toBe('Hello {{name}}');
    expect(version.active).toBe(true);
  });

  it('should create multiple versions and activate specific one', async () => {
    const template = await client.templates.create({
      key: 'multi-version-template-' + Date.now(),
      name: 'Multi Version Template',
    });

    // Create first version (automatically active)
    const v1 = await client.templates.createVersion(template.id, {
      subject: 'Version 1',
      bodyHtml: '<p>Version 1</p>',
      mode: 'RAW_HTML',
    });

    // Create second version (becomes active)
    const v2 = await client.templates.createVersion(template.id, {
      subject: 'Version 2',
      bodyHtml: '<p>Version 2</p>',
      mode: 'RAW_HTML',
    });

    // Activate first version again
    const activated = await client.templates.activateVersion(template.id, v1.id);
    expect(activated.active).toBe(true);
  });

  it('should delete a template', async () => {
    const template = await client.templates.create({
      key: 'delete-test-template-' + Date.now(),
      name: 'Delete Test Template',
    });

    const result = await client.templates.delete(template.id);
    expect(result.ok).toBe(true);

    // Verify it's deleted
    await expect(client.templates.get(template.id)).rejects.toThrow();
  });

  it('should create MJML template version', async () => {
    const template = await client.templates.create({
      key: 'mjml-template-' + Date.now(),
      name: 'MJML Template',
    });

    const version = await client.templates.createVersion(template.id, {
      subject: 'MJML Test',
      bodyMjml: `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-text>Hello {{name}}</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `,
      mode: 'RAW_MJML',
    });

    expect(version.mode).toBe('RAW_MJML');
  });
});
