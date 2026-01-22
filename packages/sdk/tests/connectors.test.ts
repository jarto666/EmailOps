/**
 * Data and Email Connector SDK tests
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { useTestClient, getClient } from './setup';
import type { EmailOps } from '../src';

describe('Data Connectors', () => {
  let client: EmailOps;

  useTestClient(beforeAll, afterAll);

  beforeAll(() => {
    client = getClient();
  });

  it('should create a Postgres data connector', async () => {
    const connector = await client.dataConnectors.create({
      name: 'Test Postgres Connector',
      type: 'POSTGRES',
      config: {
        connectionString: 'postgresql://user:pass@localhost:5432/db',
      },
    });

    expect(connector).toBeDefined();
    expect(connector.id).toBeDefined();
    expect(connector.name).toBe('Test Postgres Connector');
    expect(connector.type).toBe('POSTGRES');
  });

  it('should create a BigQuery data connector', async () => {
    const connector = await client.dataConnectors.create({
      name: 'Test BigQuery Connector',
      type: 'BIGQUERY',
      config: {
        projectId: 'test-project',
        credentials: { type: 'service_account' },
      },
    });

    expect(connector.type).toBe('BIGQUERY');
  });

  it('should list data connectors', async () => {
    const connectors = await client.dataConnectors.list();

    expect(Array.isArray(connectors)).toBe(true);
    expect(connectors.length).toBeGreaterThan(0);
  });

  it('should get a data connector by ID', async () => {
    const created = await client.dataConnectors.create({
      name: 'Get Test Connector',
      type: 'POSTGRES',
      config: { connectionString: 'postgresql://localhost/test' },
    });

    const connector = await client.dataConnectors.get(created.id);

    expect(connector.id).toBe(created.id);
    expect(connector.name).toBe('Get Test Connector');
  });

  it('should update a data connector', async () => {
    const created = await client.dataConnectors.create({
      name: 'Update Test Connector',
      type: 'POSTGRES',
      config: { connectionString: 'postgresql://localhost/test' },
    });

    const updated = await client.dataConnectors.update(created.id, {
      name: 'Updated Connector Name',
    });

    expect(updated.name).toBe('Updated Connector Name');
  });

  it('should delete a data connector', async () => {
    const connector = await client.dataConnectors.create({
      name: 'Delete Test Connector',
      type: 'POSTGRES',
      config: { connectionString: 'postgresql://localhost/test' },
    });

    const result = await client.dataConnectors.delete(connector.id);
    expect(result.ok).toBe(true);
  });
});

describe('Email Connectors', () => {
  let client: EmailOps;

  useTestClient(beforeAll, afterAll);

  beforeAll(() => {
    client = getClient();
  });

  it('should create an SMTP email connector', async () => {
    const connector = await client.emailConnectors.create({
      name: 'Test SMTP Connector',
      type: 'SMTP',
      config: {
        host: 'smtp.example.com',
        port: 587,
        secure: true,
        username: 'user',
        password: 'pass',
      },
    });

    expect(connector).toBeDefined();
    expect(connector.id).toBeDefined();
    expect(connector.name).toBe('Test SMTP Connector');
    expect(connector.type).toBe('SMTP');
  });

  it('should create a Resend email connector', async () => {
    const connector = await client.emailConnectors.create({
      name: 'Test Resend Connector',
      type: 'RESEND',
      config: {
        apiKey: 're_test_key',
      },
    });

    expect(connector.type).toBe('RESEND');
  });

  it('should create an SES email connector', async () => {
    const connector = await client.emailConnectors.create({
      name: 'Test SES Connector',
      type: 'SES',
      config: {
        region: 'us-east-1',
        accessKeyId: 'AKIATEST',
        secretAccessKey: 'secret',
      },
    });

    expect(connector.type).toBe('SES');
  });

  it('should list email connectors', async () => {
    const connectors = await client.emailConnectors.list();

    expect(Array.isArray(connectors)).toBe(true);
    expect(connectors.length).toBeGreaterThan(0);
  });

  it('should get an email connector by ID', async () => {
    const created = await client.emailConnectors.create({
      name: 'Get Test Email Connector',
      type: 'SMTP',
      config: { host: 'localhost', port: 1025 },
    });

    const connector = await client.emailConnectors.get(created.id);

    expect(connector.id).toBe(created.id);
    expect(connector.name).toBe('Get Test Email Connector');
  });

  it('should update an email connector', async () => {
    const created = await client.emailConnectors.create({
      name: 'Update Test Email Connector',
      type: 'SMTP',
      config: { host: 'localhost', port: 1025 },
    });

    const updated = await client.emailConnectors.update(created.id, {
      name: 'Updated Email Connector',
    });

    expect(updated.name).toBe('Updated Email Connector');
  });

  it('should delete an email connector', async () => {
    const connector = await client.emailConnectors.create({
      name: 'Delete Test Email Connector',
      type: 'SMTP',
      config: { host: 'localhost', port: 1025 },
    });

    const result = await client.emailConnectors.delete(connector.id);
    expect(result.ok).toBe(true);
  });
});
